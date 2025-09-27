import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import socketio from "fastify-socket.io";
import fastifyCors from "@fastify/cors";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { resolveConfig } from "@skribble-play/shared-config";
import { registerRoomRoutes } from "./routes/rooms";
import { createRoomStore, type RoomStore } from "./lib/room-store";
import { createGameEventQueue, type GameEventQueue } from "./lib/event-queue";
import { createPlayerToken, verifyPlayerToken, type PlayerTokenClaims } from "./lib/auth-tokens";
import type { Stroke } from "@skribble-play/drawing-engine";
import Redis from "ioredis";
import { StrokeHistory } from "./lib/stroke-history";
import { GameStateManager, type GameState } from "./lib/game-state";
import { removePresence, touchPresence, upsertPresence } from "./lib/presence";

interface PlayerJoinedPayload {
  roomCode: string;
  playerId?: string;
  nickname?: string;
  token?: string;
}

interface PlayerLeavePayload {
  roomCode: string;
  playerId: string;
}

interface CanvasStrokePayload {
  roomCode: string;
  token: string;
  stroke: Stroke;
}

function registerSocketHandlers(
  io: SocketIOServer,
  store: RoomStore,
  events: GameEventQueue,
  strokeHistory: StrokeHistory,
  gameState: GameStateManager,
  presenceClient: Redis
) {
  const socketMembership = new Map<string, { roomCode: string; playerId: string }>();
  io.on("connection", (socket: Socket) => {
    socket.emit("server:welcome", { message: "Skribble Play server online" });

    socket.on(
      "game:join",
      async (
        payload: PlayerJoinedPayload,
        ack?: (response: {
          ok: boolean;
          playerId?: string;
          token?: string;
          nickname?: string;
          state?: GameState;
          strokes?: Stroke[];
          error?: string;
        }) => void
      ) => {
        try {
          const roomCode = payload.roomCode.toUpperCase();
          let nickname = payload.nickname ?? "";
          let playerId = payload.playerId;
          let claims: PlayerTokenClaims | null = null;

          if (payload.token) {
            claims = verifyPlayerToken(payload.token);
            if (claims.roomCode !== roomCode) {
              throw new Error("INVALID_TOKEN_ROOM");
            }
            if (playerId && claims.playerId !== playerId) {
              throw new Error("INVALID_TOKEN_PLAYER");
            }
            playerId = claims.playerId;
            if (!nickname) {
              const existingPlayer = await store.getPlayer(roomCode, claims.playerId);
              nickname = existingPlayer?.nickname ?? nickname;
            }
          }

          if (!nickname && !payload.token) {
            throw new Error("NICKNAME_REQUIRED");
          }

          const result = await store.joinRoom(roomCode, nickname, playerId);
          await gameState.ensurePlayer(roomCode, result.playerId);
          await upsertPresence(presenceClient, roomCode, result.playerId, nickname, "socket");
          await socket.join(roomCode);
          socket.to(roomCode).emit("game:player-joined", { playerId: result.playerId, nickname });
          const token = createPlayerToken({ roomCode, playerId: result.playerId, role: "player" });
          await events.publish({
            type: "room.join",
            roomCode,
            playerId: result.playerId,
            nickname,
            source: "socket",
            occurredAt: Date.now()
          });
          const state = await gameState.getState(roomCode, claims?.role === "host");
          const strokes = await strokeHistory.getRecent(roomCode);
          ack?.({ ok: true, playerId: result.playerId, token, nickname, state, strokes });
          socketMembership.set(socket.id, { roomCode, playerId: result.playerId });
          if (strokes.length > 0) {
            socket.emit("canvas:history", { strokes });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown_error";
          ack?.({ ok: false, error: message });
        }
      }
    );

    socket.on("game:leave", async ({ roomCode, playerId }: PlayerLeavePayload, ack?: (response: { ok: boolean }) => void) => {
      const normalized = roomCode.toUpperCase();
      await store.leaveRoom(normalized, playerId);
      await socket.leave(normalized);
      socket.to(normalized).emit("game:player-left", { playerId });
      await removePresence(presenceClient, normalized, playerId);
      await events.publish({
        type: "room.leave",
        roomCode: normalized,
        playerId,
        source: "socket",
        occurredAt: Date.now()
      });
      const tracked = socketMembership.get(socket.id);
      if (tracked && tracked.playerId === playerId && tracked.roomCode === normalized) {
        socketMembership.delete(socket.id);
      }
      ack?.({ ok: true });
    });

    socket.on(
      "canvas:stroke",
      async (payload: CanvasStrokePayload, ack?: (response: { ok: boolean; error?: string }) => void) => {
        try {
          const claims = verifyPlayerToken(payload.token);
          const normalized = payload.roomCode.toUpperCase();
          if (claims.roomCode !== normalized) {
            throw new Error("INVALID_TOKEN_ROOM");
          }

          await strokeHistory.append(normalized, payload.stroke);
          await touchPresence(presenceClient, normalized, claims.playerId);
          socket.to(normalized).emit("canvas:stroke", { stroke: payload.stroke, playerId: claims.playerId });
          ack?.({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown_error";
          ack?.({ ok: false, error: message });
        }
      }
    );

    socket.on("disconnect", () => {
      const tracked = socketMembership.get(socket.id);
      if (!tracked) return;
      socketMembership.delete(socket.id);
      void (async () => {
        const { roomCode, playerId } = tracked;
        await store.leaveRoom(roomCode, playerId);
        await removePresence(presenceClient, roomCode, playerId);
        socket.to(roomCode).emit("game:player-left", { playerId, reason: "disconnect" });
        await events.publish({
          type: "room.leave",
          roomCode,
          playerId,
          source: "socket",
          occurredAt: Date.now()
        });
      })();
    });
  });
}

export interface CreateServerOptions {
  roomStore?: RoomStore;
  eventQueue?: GameEventQueue;
  presenceClient?: Redis;
  strokeHistory?: StrokeHistory;
  gameState?: GameStateManager;
}

export async function createServer(options: CreateServerOptions = {}) {
  const config = resolveConfig();
  const server = Fastify({
    logger: true
  });
  const serverWithIO = server as unknown as FastifyInstance & { io: SocketIOServer };

  const managedStore = options.roomStore == null;
  const roomStore =
    options.roomStore ??
    createRoomStore({
      connectionString: process.env.POSTGRES_URL ?? "postgresql://postgres:postgres@localhost:55432/skribble_play"
    });

  const managedQueue = options.eventQueue == null;
  const eventQueue =
    options.eventQueue ??
    createGameEventQueue(process.env.REDIS_URL ?? "redis://localhost:6379");

  const managedPresence = options.presenceClient == null;
  const presenceClient = options.presenceClient ?? new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
  const strokeHistory = options.strokeHistory ?? new StrokeHistory({ redis: presenceClient });
  const gameState = options.gameState ?? new GameStateManager(presenceClient);

  await roomStore.init();

  await server.register(fastifyCors, { origin: true });
  await server.register(socketio, {
    cors: {
      origin: true
    },
    path: config.realtime.path,
    pingTimeout: config.realtime.pingIntervalMs
  });

  server.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

  registerRoomRoutes(serverWithIO, roomStore, eventQueue, presenceClient, strokeHistory, gameState);
  registerSocketHandlers(serverWithIO.io, roomStore, eventQueue, strokeHistory, gameState, presenceClient);

  if (managedStore) {
    server.addHook("onClose", async () => {
      await roomStore.close();
    });
  }

  if (managedQueue) {
    server.addHook("onClose", async () => {
      await eventQueue.close();
    });
  }

  if (managedPresence) {
    server.addHook("onClose", async () => {
      await presenceClient.quit();
    });
  }

  return { server, config, roomStore, eventQueue, presenceClient, strokeHistory, gameState };
}

export async function start() {
  const { server, config } = await createServer();
  const port = Number(process.env.PORT ?? config.ports.gameServer);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await server.listen({ port, host });
    server.log.info({ port, host }, "Game server listening");
  } catch (error) {
    server.log.error(error, "Failed to start game server");
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void start();
}
