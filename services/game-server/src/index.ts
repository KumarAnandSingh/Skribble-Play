import Fastify from "fastify";
import socketio from "fastify-socket.io";
import fastifyCors from "@fastify/cors";
import type { Server as SocketIOServer, Socket } from "socket.io";
import { resolveConfig } from "@skribble-play/shared-config";
import { registerRoomRoutes } from "./routes/rooms";
import { createRoomStore, RoomStore } from "./lib/room-store";
import { createGameEventQueue, GameEventQueue } from "./lib/event-queue";
import { createPlayerToken, verifyPlayerToken } from "./lib/auth-tokens";
import type { Stroke } from "@skribble-play/drawing-engine";
import Redis from "ioredis";

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

function registerSocketHandlers(io: SocketIOServer, store: RoomStore, events: GameEventQueue) {
  io.on("connection", (socket: Socket) => {
    socket.emit("server:welcome", { message: "Skribble Play server online" });

    socket.on(
      "game:join",
      async (
        payload: PlayerJoinedPayload,
        ack?: (response: { ok: boolean; playerId?: string; token?: string; nickname?: string; error?: string }) => void
      ) => {
        try {
          const roomCode = payload.roomCode.toUpperCase();
          let nickname = payload.nickname ?? "";
          let playerId = payload.playerId;

        if (payload.token) {
          const claims = verifyPlayerToken(payload.token);
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
        ack?.({ ok: true, playerId: result.playerId, token, nickname });
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
      await events.publish({
        type: "room.leave",
        roomCode: normalized,
        playerId,
        source: "socket",
        occurredAt: Date.now()
      });
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

          socket.to(normalized).emit("canvas:stroke", { stroke: payload.stroke, playerId: claims.playerId });
          ack?.({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "unknown_error";
          ack?.({ ok: false, error: message });
        }
      }
    );
  });
}

export interface CreateServerOptions {
  roomStore?: RoomStore;
  eventQueue?: GameEventQueue;
  presenceClient?: Redis;
}

export async function createServer(options: CreateServerOptions = {}) {
  const config = resolveConfig();
  const server = Fastify({
    logger: true
  });

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

  registerRoomRoutes(server, roomStore, eventQueue, presenceClient);
  registerSocketHandlers(server.io, roomStore, eventQueue);

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

  return { server, config, roomStore, eventQueue, presenceClient };
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
