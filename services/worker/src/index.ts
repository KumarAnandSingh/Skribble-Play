import { Queue } from "bullmq";

const queue = new Queue("skribble-events", {
  connection: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
  },
});

export async function enqueue(event: Record<string, unknown>) {
  await queue.add("event", event, { removeOnComplete: true });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enqueue({ type: "worker:init", timestamp: Date.now() })
    .then(() => {
      console.log("Worker bootstrap job queued");
      return queue.close();
    })
    .catch((error) => {
      console.error("Failed to enqueue bootstrap job", error);
      process.exit(1);
    });
}
