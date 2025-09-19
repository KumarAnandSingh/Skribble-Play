import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { RoomStore } from "../lib/room-store";
import type { GameEventQueue } from "../lib/event-queue";
import { createPlayerToken } from "../lib/auth-tokens";
import type { Redis } from "ioredis";

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

export function registerRoomRoutes(server: FastifyInstance, store: RoomStore, events: GameEventQueue, presenceClient: Redis) {
  server.post("/rooms", async (request, reply) => {
    const body = createRoomSchema.parse(request.body);
    const result = await store.createRoom(body.hostNickname);
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

      await events.publish({
        type: "room.join",
        roomCode: normalized,
        playerId: result.playerId,
        nickname: body.nickname,
        source: "http",
        occurredAt: Date.now()
      });

      return reply.send({ playerId: result.playerId, roomCode: normalized, playerToken: token });
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

    await events.publish({
      type: "room.leave",
      roomCode: normalized,
      playerId: body.playerId,
      source: "http",
      occurredAt: Date.now()
    });

    return reply.send({ roomCode: normalized, playerId: body.playerId });
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
}
