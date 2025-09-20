import type { Redis } from "ioredis";

type PresenceSource = "http" | "socket";

function membersKey(roomCode: string) {
  return `room:${roomCode}:members`;
}

function memberHashKey(roomCode: string, playerId: string) {
  return `room:${roomCode}:member:${playerId}`;
}

function normalize(roomCode: string) {
  return roomCode.toUpperCase();
}

export async function upsertPresence(
  redis: Redis,
  roomCode: string,
  playerId: string,
  nickname: string,
  source: PresenceSource,
  occurredAt = Date.now()
) {
  const normalized = normalize(roomCode);
  await redis.sadd(membersKey(normalized), playerId);
  await redis.hset(memberHashKey(normalized, playerId), {
    nickname,
    source,
    occurredAt: occurredAt.toString()
  });
}

export async function touchPresence(redis: Redis, roomCode: string, playerId: string, occurredAt = Date.now()) {
  const normalized = normalize(roomCode);
  await redis.sadd(membersKey(normalized), playerId);
  await redis.hset(memberHashKey(normalized, playerId), {
    occurredAt: occurredAt.toString()
  });
}

export async function removePresence(redis: Redis, roomCode: string, playerId: string) {
  const normalized = normalize(roomCode);
  await redis.srem(membersKey(normalized), playerId);
  await redis.del(memberHashKey(normalized, playerId));
}
