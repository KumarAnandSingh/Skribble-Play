import type { Redis } from "ioredis";
import type { Stroke } from "@skribble-play/drawing-engine";

export interface StrokeHistoryOptions {
  redis: Redis;
  maxEntries?: number;
}

export class StrokeHistory {
  private readonly redis: Redis;
  private readonly maxEntries: number;

  constructor({ redis, maxEntries = 500 }: StrokeHistoryOptions) {
    this.redis = redis;
    this.maxEntries = maxEntries;
  }

  private listKey(roomCode: string) {
    return `room:${roomCode}:strokes`;
  }

  async append(roomCode: string, stroke: Stroke) {
    const key = this.listKey(roomCode);
    await this.redis.rpush(key, JSON.stringify(stroke));
    await this.redis.ltrim(key, -this.maxEntries, -1);
  }

  async getRecent(roomCode: string): Promise<Stroke[]> {
    const key = this.listKey(roomCode);
    const raw = await this.redis.lrange(key, -this.maxEntries, -1);
    return raw
      .map((entry) => {
        try {
          return JSON.parse(entry) as Stroke;
        } catch (_error) {
          return null;
        }
      })
      .filter((value): value is Stroke => value != null);
  }

  async clear(roomCode: string) {
    await this.redis.del(this.listKey(roomCode));
  }
}
