import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "./index";
import { createTestRoomStore } from "../test-utils/create-room-store";
import type { GameEvent, GameEventQueue } from "./lib/event-queue";
import { createFakeRedis } from "../test-utils/fake-redis";
import { StrokeHistory } from "./lib/stroke-history";
import { GameStateManager, type GameState } from "./lib/game-state";

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
    const presenceStub = createFakeRedis();
    const strokeHistory = new StrokeHistory({ redis: presenceStub });
    const gameState = new GameStateManager(presenceStub);
    const { server } = await createServer({
      roomStore: store,
      eventQueue: queue,
      presenceClient: presenceStub,
      strokeHistory,
      gameState
    });

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
    const membersAfterCreate = await presenceStub.smembers(`room:${createBody.roomCode}:members`);
    expect(membersAfterCreate).toContain(createBody.hostPlayer.id);

    const hostPresence = await presenceStub.hgetall(`room:${createBody.roomCode}:member:${createBody.hostPlayer.id}`);
    expect(hostPresence).toMatchObject({ nickname: "Host", source: "http" });

    const joinResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/join`,
      payload: { nickname: "Player Two" }
    });

    expect(joinResponse.statusCode).toBe(200);
    const joinBody = joinResponse.json() as { playerId: string; playerToken: string; state: unknown; strokes: unknown[] };
    expect(joinBody.playerToken).toBeTruthy();
    expect(Array.isArray(joinBody.strokes)).toBe(true);
    const membersAfterJoin = await presenceStub.smembers(`room:${createBody.roomCode}:members`);
    expect(membersAfterJoin).toEqual(expect.arrayContaining([createBody.hostPlayer.id, joinBody.playerId]));

    const readyResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/ready`,
      payload: { token: joinBody.playerToken, ready: true }
    });

    expect(readyResponse.statusCode).toBe(200);
    const readyBody = readyResponse.json() as { state: GameState };
    expect(readyBody.state.readyPlayers).toContain(joinBody.playerId);

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
    const membersAfterLeave = await presenceStub.smembers(`room:${createBody.roomCode}:members`);
    expect(membersAfterLeave).not.toContain(joinBody.playerId);

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
    const presenceStub = createFakeRedis();
    const strokeHistory = new StrokeHistory({ redis: presenceStub });
    const gameState = new GameStateManager(presenceStub);
    const { server } = await createServer({
      roomStore: store,
      eventQueue: queue,
      presenceClient: presenceStub,
      strokeHistory,
      gameState
    });

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
    const membersAfterKick = await presenceStub.smembers(`room:${createBody.roomCode}:members`);
    expect(membersAfterKick).not.toContain(joinBody.playerId);

    await server.close();
    expect(events.map((event) => event.type)).toEqual([
      "room.join",
      "room.join",
      "room.leave"
    ]);
  });

  it("supports starting rounds and submitting guesses", async () => {
    const { store, cleanup } = await createTestRoomStore();
    cleanupStore = cleanup;
    const events: GameEvent[] = [];
    const queue: GameEventQueue = {
      publish: async (event) => {
        events.push(event);
      },
      close: async () => {}
    };
    const presenceStub = createFakeRedis();
    const strokeHistory = new StrokeHistory({ redis: presenceStub });
    const gameState = new GameStateManager(presenceStub, { drawDurationMs: 1000, prompts: ["Rocket"] });
    const { server } = await createServer({
      roomStore: store,
      eventQueue: queue,
      presenceClient: presenceStub,
      strokeHistory,
      gameState
    });

    const createResponse = await server.inject({
      method: "POST",
      url: "/rooms",
      payload: { hostNickname: "Host" }
    });
    const createBody = createResponse.json() as { roomCode: string; hostToken: string; hostPlayer: { id: string; token: string } };

    const joinResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/join`,
      payload: { nickname: "Player" }
    });
    const joinBody = joinResponse.json() as { playerId: string; playerToken: string; state: unknown; strokes: unknown[] };

    const startResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/start`,
      payload: { hostToken: createBody.hostToken, hostPlayerId: createBody.hostPlayer.id }
    });

    expect(startResponse.statusCode).toBe(200);
    const startState = startResponse.json() as GameState;
    expect(startState.phase).toBe("drawing");
    expect(startState.prompt).toBe("Rocket");

    const guessResponse = await server.inject({
      method: "POST",
      url: `/rooms/${createBody.roomCode}/guess`,
      payload: { token: joinBody.playerToken, guess: "Rocket" }
    });

    expect(guessResponse.statusCode).toBe(200);
    const guessBody = guessResponse.json() as { correct: boolean; state: GameState };
    expect(guessBody.correct).toBe(true);
    expect(guessBody.state.scoreboard[joinBody.playerId]).toBe(100);

    const presenceAfterGuess = await presenceStub.hgetall(
      `room:${createBody.roomCode}:member:${joinBody.playerId}`
    );
    expect(Number(presenceAfterGuess.occurredAt)).toBeGreaterThan(0);

    await server.close();
  });
});
