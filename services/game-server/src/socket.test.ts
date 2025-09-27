import { afterEach, describe, expect, it } from "vitest";
import { io, type Socket } from "socket.io-client";
import { createServer } from "./index";
import { createServer as createNetServer } from "node:net";
import { createTestRoomStore } from "../test-utils/create-room-store";
import type { GameEvent, GameEventQueue } from "./lib/event-queue";
import { createFakeRedis } from "../test-utils/fake-redis";
import { StrokeHistory } from "./lib/stroke-history";
import { GameStateManager, type GameState } from "./lib/game-state";
import type { Stroke } from "@skribble-play/drawing-engine";

let sockets: Socket[] = [];
let cleanupStore: (() => Promise<void>) | null = null;
const forceSetting = process.env.RUN_SOCKET_TESTS;
const canRunSockets = await (async () => {
  if (forceSetting === "true") {
    return true;
  }
  if (forceSetting === "false") {
    return false;
  }
  return new Promise<boolean>((resolve) => {
    const probe = createNetServer();
    const cleanup = (result: boolean) => {
      probe.removeAllListeners();
      if (probe.listening) {
        probe.close(() => resolve(result));
      } else {
        resolve(result);
      }
    };
    probe.once("error", () => cleanup(false));
    try {
      probe.listen({ port: 0, host: "127.0.0.1" }, () => cleanup(true));
    } catch (_error) {
      cleanup(false);
    }
  });
})();

const describeIf = canRunSockets ? describe : describe.skip;


function trackSocket(socket: Socket) {
  sockets.push(socket);
  socket.on("connect_error", (error) => {
    console.error("socket connect_error", error);
  });
  socket.on("error", (error) => {
    console.error("socket error", error);
  });
  return socket;
}

function waitForEvent<T>(socket: Socket, event: string, timeout = 5000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeout);

    const handler = (payload: T) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);
  });
}

function emitWithAck<T>(socket: Socket, event: string, payload: unknown, timeout = 5000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for ack on ${event}`));
    }, timeout);

    socket.emit(event, payload, (ack: T) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

afterEach(async () => {
  sockets.forEach((socket) => {
    if (socket.connected) {
      socket.disconnect();
    }
  });
  sockets = [];

  if (cleanupStore) {
    await cleanupStore();
    cleanupStore = null;
  }
});

describeIf("socket events", () => {
  it("broadcasts player join events to other participants", async () => {
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
    const gameState = new GameStateManager(presenceStub, { prompts: ["Rocket"] });
    const { server, config } = await createServer({
      roomStore: store,
      eventQueue: queue,
      presenceClient: presenceStub,
      strokeHistory,
      gameState
    });

    const host = process.env.SOCKET_TEST_HOST ?? "0.0.0.0";
    await server.listen({ port: 0, host });
    const address = server.server.address();
    if (address == null || typeof address === "string") {
      throw new Error("Expected address info");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;
    const room = await store.createRoom("Host");

    const clientA = trackSocket(io(baseUrl, {
      path: config.realtime.path,
      transports: ["websocket"],
      forceNew: true
    }));

    const welcomeA = waitForEvent(clientA, "server:welcome");
    await waitForEvent(clientA, "connect");
    await welcomeA;

    const joinAckA = await emitWithAck<{
      ok: boolean;
      playerId?: string;
      token?: string;
      nickname?: string;
      state?: unknown;
      strokes?: Stroke[];
      error?: string;
    }>(clientA, "game:join", {
      roomCode: room.roomCode,
      nickname: "PlayerA"
    });

    expect(joinAckA.ok).toBe(true);
    const playerAId = joinAckA.playerId;
    expect(playerAId).toBeDefined();
    expect(joinAckA.token).toBeDefined();

    const broadcastPromise = waitForEvent<{ playerId: string; nickname: string }>(clientA, "game:player-joined", 5000);

    const clientB = trackSocket(io(baseUrl, {
      path: config.realtime.path,
      transports: ["websocket"],
      forceNew: true
    }));

    const welcomeB = waitForEvent(clientB, "server:welcome");
    await waitForEvent(clientB, "connect");
    await welcomeB;

    const joinAckB = await emitWithAck<{
      ok: boolean;
      playerId?: string;
      token?: string;
      nickname?: string;
      state?: GameState;
      strokes?: Stroke[];
      error?: string;
    }>(clientB, "game:join", {
      roomCode: room.roomCode,
      nickname: "PlayerB"
    });

    expect(joinAckB.ok).toBe(true);
    const playerBId = joinAckB.playerId;
    expect(playerBId).toBeDefined();
    expect(joinAckB.token).toBeDefined();
    expect(joinAckB.state).toBeDefined();

    const presenceMembers = await presenceStub.smembers(`room:${room.roomCode}:members`);
    expect(presenceMembers).toEqual(expect.arrayContaining([playerAId!, playerBId!]));

    const broadcast = await broadcastPromise;
    expect(broadcast).toEqual({ playerId: playerBId, nickname: "PlayerB" });

    const strokePromise = waitForEvent<{ stroke: Stroke; playerId?: string }>(clientA, "canvas:stroke", 5000);
    const strokeAck = await emitWithAck<{ ok: boolean; error?: string }>(clientB, "canvas:stroke", {
      roomCode: room.roomCode,
      token: joinAckB.token,
      stroke: {
        id: `${playerBId}-stroke`,
        color: "#ffffff",
        brushSize: 3,
        points: [
          { x: 0.1, y: 0.1, timestamp: Date.now() },
          { x: 0.2, y: 0.2, timestamp: Date.now() + 10 }
        ]
      }
    });

    expect(strokeAck.ok).toBe(true);
    const remoteStroke = await strokePromise;
    expect(remoteStroke.playerId).toBe(playerBId);

    const presenceRecordB = await presenceStub.hgetall(`room:${room.roomCode}:member:${playerBId}`);
    expect(Number(presenceRecordB.occurredAt)).toBeGreaterThan(0);

    const persistedRoom = await store.getRoom(room.roomCode);
    expect(persistedRoom?.players.map((p) => p.id)).toEqual(
      expect.arrayContaining([room.hostPlayer.id, playerAId, playerBId])
    );

    clientA.disconnect();
    clientB.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const presenceAfterDisconnect = await presenceStub.smembers(`room:${room.roomCode}:members`);
    expect(presenceAfterDisconnect).not.toContain(playerAId);
    expect(presenceAfterDisconnect).not.toContain(playerBId);
    await server.close();

    expect(events.map((event) => event.type)).toEqual([
      "room.join",
      "room.join",
      "room.leave",
      "room.leave"
    ]);
  });
});
