import { describe, expect, it } from "vitest";
import { createServer } from "./index";
import { createTestRoomStore } from "../test-utils/create-room-store";
import type { GameEvent, GameEventQueue } from "./lib/event-queue";
import type Redis from "ioredis";

describe("game-server", () => {
  it("returns ok from health endpoint", async () => {
    const { store, cleanup } = await createTestRoomStore();
    const events: GameEvent[] = [];
    const queue: GameEventQueue = {
      publish: async (event) => {
        events.push(event);
      },
      close: async () => {}
    };

    const presenceStub = {
      smembers: async () => [],
      hgetall: async () => ({}),
      quit: async () => {}
    } as unknown as Redis;

    const { server } = await createServer({ roomStore: store, eventQueue: queue, presenceClient: presenceStub });

    const response = await server.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(expect.objectContaining({ status: "ok" }));

    await server.close();
    await cleanup();
    expect(events).toHaveLength(0);
  });
});
