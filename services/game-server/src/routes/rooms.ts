import type { FastifyInstance } from "fastify";
import type { Server as SocketIOServer } from "socket.io";
import { z } from "zod";
import type { RoomStore } from "../lib/room-store";
import type { GameEventQueue } from "../lib/event-queue";
import { createPlayerToken, verifyPlayerToken } from "../lib/auth-tokens";
import type { Redis } from "ioredis";
import type { StrokeHistory } from "../lib/stroke-history";
import { GameStateManager } from "../lib/game-state";
import { removePresence, touchPresence, upsertPresence } from "../lib/presence";

const createRoomSchema = z.object({
  hostNickname: z.string().min(1).max(32)
});

const joinRoomSchema = z.object({
  nickname: z.string().min(1).max(32),
  playerId: z.string().uuid().optional()
});

const leaveRoomSchema = z.object({
  playerId: z.string().uuid()
});

const kickRoomSchema = z.object({
  hostToken: z.string().uuid(),
  targetPlayerId: z.string().uuid()
});

const startRoundSchema = z.object({
  hostToken: z.string().uuid(),
  hostPlayerId: z.string().uuid(),
  drawingPlayerId: z.string().uuid().optional()
});

const guessSchema = z.object({
  token: z.string(),
  guess: z.string().min(1)
});

const readySchema = z.object({
  token: z.string(),
  ready: z.boolean()
});

const updateFiltersSchema = z.object({
  token: z.string(),
  kidsMode: z.boolean().optional(),
  profanityLevel: z.enum(["low", "medium", "high"]).optional()
});

export function registerRoomRoutes(
  server: FastifyInstance & { io: SocketIOServer },
  store: RoomStore,
  events: GameEventQueue,
  presenceClient: Redis,
  strokeHistory: StrokeHistory,
  gameState: GameStateManager
) {
  server.post("/rooms", async (request, reply) => {
    const body = createRoomSchema.parse(request.body);
    const result = await store.createRoom(body.hostNickname);
    await gameState.ensureLobby(result.roomCode);
    await gameState.ensurePlayer(result.roomCode, result.hostPlayer.id);
    await upsertPresence(presenceClient, result.roomCode, result.hostPlayer.id, result.hostPlayer.nickname, "http");
    const hostPlayerToken = createPlayerToken({
      roomCode: result.roomCode,
      playerId: result.hostPlayer.id,
      role: "host"
    });

    await events.publish({
      type: "room.join",
      roomCode: result.roomCode,
      playerId: result.hostPlayer.id,
      nickname: result.hostPlayer.nickname,
      source: "http",
      occurredAt: Date.now()
    });

    return reply.code(201).send({
      roomCode: result.roomCode,
      hostToken: result.hostToken,
      hostPlayer: {
        ...result.hostPlayer,
        token: hostPlayerToken
      }
    });
  });

  server.get("/rooms/:code", async (request, reply) => {
    const { code } = request.params as { code: string };
    const room = await store.getRoom(code);

    if (!room) {
      return reply.code(404).send({ message: "Room not found" });
    }

    return reply.send(room);
  });

  server.post("/rooms/:code/join", async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = joinRoomSchema.parse(request.body);

    try {
      const result = await store.joinRoom(code, body.nickname, body.playerId);
      const normalized = code.toUpperCase();
      const token = createPlayerToken({ roomCode: normalized, playerId: result.playerId, role: "player" });
      await gameState.ensurePlayer(normalized, result.playerId);
      await upsertPresence(presenceClient, normalized, result.playerId, body.nickname, "http");

      await events.publish({
        type: "room.join",
        roomCode: normalized,
        playerId: result.playerId,
        nickname: body.nickname,
        source: "http",
        occurredAt: Date.now()
      });

      const state = await gameState.getState(normalized, false);
      const strokes = await strokeHistory.getRecent(normalized);

      return reply.send({
        playerId: result.playerId,
        roomCode: normalized,
        playerToken: token,
        state,
        strokes
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ROOM_NOT_FOUND") {
        return reply.code(404).send({ message: "Room not found" });
      }
      throw error;
    }
  });

  server.post("/rooms/:code/leave", async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = leaveRoomSchema.parse(request.body);
    const normalized = code.toUpperCase();

    await store.leaveRoom(normalized, body.playerId);
    await removePresence(presenceClient, normalized, body.playerId);

    await events.publish({
      type: "room.leave",
      roomCode: normalized,
      playerId: body.playerId,
      source: "http",
      occurredAt: Date.now()
    });

    return reply.send({ roomCode: normalized, playerId: body.playerId });
  });

  server.post("/rooms/:code/start", async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = startRoundSchema.parse(request.body);
    const normalized = code.toUpperCase();

    const expectedHostToken = await store.getHostToken(normalized);
    if (!expectedHostToken || expectedHostToken !== body.hostToken) {
      return reply.code(403).send({ message: "Invalid host token" });
    }

    const drawingPlayerId = body.drawingPlayerId ?? body.hostPlayerId;
    await strokeHistory.clear(normalized);
    const state = await gameState.startRound(normalized, drawingPlayerId);
    const publicState = await gameState.getState(normalized, false);
    server.io.to(normalized).emit("game:state", publicState);

    return reply.send(state);
  });

  server.get("/rooms/:code/state", async (request, reply) => {
    const { code } = request.params as { code: string };
    const normalized = code.toUpperCase();
    const query = request.query as { token?: string; hostToken?: string };

    let includePrompt = false;

    if (query.hostToken) {
      const expectedHostToken = await store.getHostToken(normalized);
      if (expectedHostToken && expectedHostToken === query.hostToken) {
        includePrompt = true;
      }
    } else if (query.token) {
      try {
        const claims = verifyPlayerToken(query.token);
        includePrompt = claims.role === "host";
      } catch (error) {
        return reply.code(401).send({ message: "Invalid token" });
      }
    }

    const state = await gameState.getState(normalized, includePrompt);
    return reply.send(state);
  });

  server.post("/rooms/:code/guess", async (request, reply) => {
    const { code } = request.params as { code: string };
    const normalized = code.toUpperCase();
    const body = guessSchema.parse(request.body);

    let claims: { roomCode: string; playerId: string };
    try {
      claims = verifyPlayerToken(body.token);
    } catch (error) {
      return reply.code(401).send({ message: "Invalid token" });
    }

    if (claims.roomCode !== normalized) {
      return reply.code(403).send({ message: "Token does not match room" });
    }

    await touchPresence(presenceClient, normalized, claims.playerId);
    const result = await gameState.recordGuess(normalized, claims.playerId, body.guess);
    if (result.correct) {
      const publicState = await gameState.getState(normalized, false);
      server.io.to(normalized).emit("game:state", publicState);
    }

    return reply.send({ correct: result.correct, state: result.state });
  });

  server.post("/rooms/:code/ready", async (request, reply) => {
    const { code } = request.params as { code: string };
    const normalized = code.toUpperCase();
    const body = readySchema.parse(request.body);

    let claims: { roomCode: string; playerId: string; role: string };
    try {
      claims = verifyPlayerToken(body.token);
    } catch (error) {
      return reply.code(401).send({ message: "Invalid token" });
    }

    if (claims.roomCode !== normalized) {
      return reply.code(403).send({ message: "Token does not match room" });
    }

    const updated = await gameState.setReady(normalized, claims.playerId, body.ready);
    const publicState = await gameState.getState(normalized, false);
    server.io.to(normalized).emit("game:state", publicState);

    const scopedState = await gameState.getState(normalized, claims.role === "host");
    return reply.send({ state: scopedState });
  });

  server.post("/rooms/:code/settings", async (request, reply) => {
    const { code } = request.params as { code: string };
    const normalized = code.toUpperCase();
    const body = updateFiltersSchema.parse(request.body);

    let claims: { roomCode: string; playerId: string; role: string };
    try {
      claims = verifyPlayerToken(body.token);
    } catch (error) {
      return reply.code(401).send({ message: "Invalid token" });
    }

    if (claims.roomCode !== normalized) {
      return reply.code(403).send({ message: "Token does not match room" });
    }

    if (claims.role !== "host") {
      return reply.code(403).send({ message: "Only host can update settings" });
    }

    const updated = await gameState.updateFilters(normalized, {
      kidsMode: body.kidsMode,
      profanityLevel: body.profanityLevel
    });
    const publicState = await gameState.getState(normalized, false);
    server.io.to(normalized).emit("game:state", publicState);

    return reply.send({ state: updated });
  });

  server.post("/rooms/:code/kick", async (request, reply) => {
    const { code } = request.params as { code: string };
    const body = kickRoomSchema.parse(request.body);
    const normalized = code.toUpperCase();

    const expectedHostToken = await store.getHostToken(normalized);
    if (!expectedHostToken || expectedHostToken !== body.hostToken) {
      return reply.code(403).send({ message: "Invalid host token" });
    }

    await store.leaveRoom(normalized, body.targetPlayerId);
    await removePresence(presenceClient, normalized, body.targetPlayerId);

    await events.publish({
      type: "room.leave",
      roomCode: normalized,
      playerId: body.targetPlayerId,
      source: "http",
      occurredAt: Date.now()
    });

    server.io.to(normalized).emit("game:player-left", { playerId: body.targetPlayerId, reason: "kicked" });

    return reply.send({ ok: true });
  });

  server.get("/rooms/:code/presence", async (request, reply) => {
    const { code } = request.params as { code: string };
    const normalized = code.toUpperCase();
    const memberIds = await presenceClient.smembers(`room:${normalized}:members`);

    if (memberIds.length === 0) {
      return reply.send([]);
    }

    const records = await Promise.all(
      memberIds.map(async (playerId) => {
        const data = await presenceClient.hgetall(`room:${normalized}:member:${playerId}`);
        return {
          playerId,
          nickname: data.nickname ?? "",
          source: data.source ?? "unknown",
          lastSeenAt: data.occurredAt ? Number(data.occurredAt) : undefined
        };
      })
    );

    return reply.send(records);
  });

  server.get("/rooms/:code/strokes", async (request, reply) => {
    const { code } = request.params as { code: string };
    const normalized = code.toUpperCase();
    const strokes = await strokeHistory.getRecent(normalized);
    return reply.send(strokes);
  });
}
