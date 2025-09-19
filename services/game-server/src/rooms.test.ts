import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./index";
import { createTestRoomStore } from "../test-utils/create-room-store";
import type { GameEvent, GameEventQueue } from "./lib/event-queue";
import type Redis from "ioredis";

let cleanupStore: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (cleanupStore) {
    await cleanupStore();
    cleanupStore = null;
  }
});

describe("room routes", () => {
  it("supports create/join/get/leave flow", async () => {
    const { store, cleanup } = await createTestRoomStore();
    cleanupStore = cleanup;
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

    const createResponse = await server.inject({
      method: "POST",
      url: "/rooms",
      payload: { hostNickname: "Host" }
    });

    expect(createResponse.statusCode).toBe(201);
    const createBody = createResponse.json() as {
      roomCode: string;
      hostToken: string;
      hostPlayer: { id: string; token: string };
    };
    expect(createBody.hostPlayer.token).toBeTruthy();

    const joinResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/join`,
      payload: { nickname: "Player Two" }
    });

    expect(joinResponse.statusCode).toBe(200);
    const joinBody = joinResponse.json() as { playerId: string; playerToken: string };
    expect(joinBody.playerToken).toBeTruthy();

    const getResponse = await server.inject({
      method: "GET",
      url: `/rooms/${createBody.roomCode}`
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toMatchObject({
      roomCode: createBody.roomCode,
      players: expect.arrayContaining([
        expect.objectContaining({ id: createBody.hostPlayer.id }),
        expect.objectContaining({ id: joinBody.playerId })
      ])
    });

    const leaveResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/leave`,
      payload: { playerId: joinBody.playerId }
    });

    expect(leaveResponse.statusCode).toBe(200);
    expect(leaveResponse.json()).toMatchObject({ playerId: joinBody.playerId });

    await server.close();

    expect(events.map((event) => event.type)).toEqual([
      "room.join",
      "room.join",
      "room.leave"
    ]);
  });

  it("requires host token to kick players", async () => {
    const { store, cleanup } = await createTestRoomStore();
    cleanupStore = cleanup;
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

    const createResponse = await server.inject({
      method: "POST",
      url: "/rooms",
      payload: { hostNickname: "Host" }
    });

    const createBody = createResponse.json() as {
      roomCode: string;
      hostToken: string;
      hostPlayer: { id: string; token: string };
    };

    const joinResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/join`,
      payload: { nickname: "Player Two" }
    });

    const joinBody = joinResponse.json() as { playerId: string; playerToken: string };

    const forbiddenKick = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/kick`,
      payload: {
        hostToken: "00000000-0000-0000-0000-000000000000",
        targetPlayerId: joinBody.playerId
      }
    });

    expect(forbiddenKick.statusCode).toBe(403);

    const kickResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/kick`,
      payload: {
        hostToken: createBody.hostToken,
        targetPlayerId: joinBody.playerId
      }
    });

    expect(kickResponse.statusCode).toBe(200);

    await server.close();
    expect(events.map((event) => event.type)).toEqual([
      "room.join",
      "room.join",
      "room.leave"
    ]);
  });
});
