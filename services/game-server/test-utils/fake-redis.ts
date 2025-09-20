import { randomUUID } from "node:crypto";
import type Redis from "ioredis";

interface PresenceEntry {
  nickname: string;
  source: string;
  occurredAt: number;
}

export class FakeRedis {
  private strings = new Map<string, string>();
  private hashes = new Map<string, Map<string, string>>();
  private lists = new Map<string, string[]>();
  private sets = new Map<string, Set<string>>();

  async set(key: string, value: string) {
    this.strings.set(key, value);
    return "OK";
  }

  async get(key: string) {
    return this.strings.get(key) ?? null;
  }

  async del(key: string) {
    this.strings.delete(key);
    this.hashes.delete(key);
    this.lists.delete(key);
    this.sets.delete(key);
    return 1;
  }

  async hset(key: string, values: Record<string, string>) {
    const map = this.hashes.get(key) ?? new Map<string, string>();
    Object.entries(values).forEach(([field, value]) => {
      map.set(field, value);
    });
    this.hashes.set(key, map);
    return map.size;
  }

  async hgetall(key: string) {
    const map = this.hashes.get(key);
    if (!map) return {};
    return Object.fromEntries(map.entries());
  }

  async rpush(key: string, value: string) {
    const list = this.lists.get(key) ?? [];
    list.push(value);
    this.lists.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number) {
    const list = this.lists.get(key) ?? [];
    const trimmed = list.slice(start < 0 ? list.length + start : start, stop < 0 ? list.length + stop + 1 : stop + 1);
    this.lists.set(key, trimmed);
    return "OK";
  }

  async lrange(key: string, start: number, stop: number) {
    const list = this.lists.get(key) ?? [];
    const normalizedStart = start < 0 ? Math.max(list.length + start, 0) : start;
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    return list.slice(normalizedStart, normalizedStop + 1);
  }

  async sadd(key: string, member: string) {
    const set = this.sets.get(key) ?? new Set<string>();
    const previousSize = set.size;
    set.add(member);
    this.sets.set(key, set);
    return set.size > previousSize ? 1 : 0;
  }

  async srem(key: string, member: string) {
    const set = this.sets.get(key);
    if (!set) return 0;
    const existed = set.delete(member);
    return existed ? 1 : 0;
  }

  async smembers(key: string) {
    return Array.from(this.sets.get(key) ?? []);
  }

  async quit() {
    this.strings.clear();
    this.hashes.clear();
    this.lists.clear();
    this.sets.clear();
    return "OK";
  }

  // Convenience helpers for tests
  async addPresence(roomCode: string, playerId: string, entry: PresenceEntry) {
    await this.sadd(`room:${roomCode}:members`, playerId);
    await this.hset(`room:${roomCode}:member:${playerId}`, {
      nickname: entry.nickname,
      source: entry.source,
      occurredAt: entry.occurredAt.toString()
    });
  }
}

export function createFakeRedis() {
  return new FakeRedis() as unknown as Redis;
}
