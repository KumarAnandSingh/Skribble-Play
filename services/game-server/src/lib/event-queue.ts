import { Queue } from "bullmq";

export type GameEventType = "room.join" | "room.leave";

export interface GameEvent {
  type: GameEventType;
  roomCode: string;
  playerId: string;
  nickname?: string;
  source: "http" | "socket";
  occurredAt: number;
}

export interface GameEventQueue {
  publish(event: GameEvent): Promise<void>;
  close(): Promise<void>;
}

function parseRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) : undefined
  };
}

export function createGameEventQueue(redisUrl: string): GameEventQueue {
  const connection = parseRedisUrl(redisUrl);
  const queue = new Queue<GameEvent>("game-events", { connection });

  return {
    async publish(event) {
      await queue.add("room-event", event, {
        removeOnComplete: true,
        removeOnFail: true
      });
    },
    async close() {
      await queue.close();
    }
  };
}
