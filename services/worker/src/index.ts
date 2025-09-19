import { Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import pino from "pino";

interface GameEvent {
  type: "room.join" | "room.leave";
  roomCode: string;
  playerId: string;
  nickname?: string;
  source: "http" | "socket";
  occurredAt: number;
}

const logger = pino({ name: "worker" });

const redisUrl = process.env.REDIS_URL ?? `redis://${process.env.REDIS_HOST ?? "localhost"}:${process.env.REDIS_PORT ?? "6379"}`;
const redisConnectionUrl = new URL(redisUrl);
const redisConnection = {
  host: redisConnectionUrl.hostname,
  port: Number(redisConnectionUrl.port || 6379),
  username: redisConnectionUrl.username || undefined,
  password: redisConnectionUrl.password || undefined,
  db: redisConnectionUrl.pathname && redisConnectionUrl.pathname !== "/" ? Number(redisConnectionUrl.pathname.slice(1)) : undefined
};

const presenceRedis = new Redis(redisUrl);

const queueName = "game-events";

function presenceSetKey(roomCode: string) {
  return `room:${roomCode}:members`;
}

function presenceHashKey(roomCode: string, playerId: string) {
  return `room:${roomCode}:member:${playerId}`;
}

async function handleEvent(event: GameEvent) {
  switch (event.type) {
    case "room.join": {
      await presenceRedis.sadd(presenceSetKey(event.roomCode), event.playerId);
      await presenceRedis.hset(presenceHashKey(event.roomCode, event.playerId), {
        nickname: event.nickname ?? "",
        source: event.source,
        occurredAt: String(event.occurredAt)
      });
      break;
    }
    case "room.leave": {
      await presenceRedis.srem(presenceSetKey(event.roomCode), event.playerId);
      await presenceRedis.del(presenceHashKey(event.roomCode, event.playerId));
      break;
    }
    default: {
      logger.warn({ event }, "Unhandled event type");
    }
  }
}

const worker = new Worker<GameEvent>(
  queueName,
  async (job) => {
    logger.debug({ jobId: job.id, type: job.data.type }, "Processing event");
    await handleEvent(job.data);
  },
  { connection: redisConnection }
);

const queueEvents = new QueueEvents(queueName, { connection: redisConnection });

worker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Game event processed");
});

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Failed to process game event");
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, "Queue failure");
});

queueEvents.on("drained", () => {
  logger.debug("Game event queue drained");
});

async function shutdown() {
  logger.info("Shutting down worker");
  await worker.close();
  await queueEvents.close();
  await presenceRedis.quit();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
