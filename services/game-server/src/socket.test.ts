import { afterEach, describe, expect, it } from "vitest";
import { io, Socket } from "socket.io-client";
import { createServer } from "./index";
import { createTestRoomStore } from "../test-utils/create-room-store";
import type { GameEvent, GameEventQueue } from "./lib/event-queue";
import type Redis from "ioredis";
import type { Stroke } from "@skribble-play/drawing-engine";

let sockets: Socket[] = [];
let cleanupStore: (() => Promise<void>) | null = null;

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

describe("socket events", () => {
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
    const presenceStub = {
      smembers: async () => [],
      hgetall: async () => ({}),
      quit: async () => {}
    } as unknown as Redis;
    const { server, config } = await createServer({ roomStore: store, eventQueue: queue, presenceClient: presenceStub });

    await server.listen({ port: 0, host: "127.0.0.1" });
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

    const joinAckA = await emitWithAck<{ ok: boolean; playerId?: string; token?: string; error?: string }>(clientA, "game:join", {
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

    const joinAckB = await emitWithAck<{ ok: boolean; playerId?: string; token?: string; error?: string }>(clientB, "game:join", {
      roomCode: room.roomCode,
      nickname: "PlayerB"
    });

    expect(joinAckB.ok).toBe(true);
    const playerBId = joinAckB.playerId;
    expect(playerBId).toBeDefined();
    expect(joinAckB.token).toBeDefined();

    const broadcast = await broadcastPromise;
    expect(broadcast).toEqual({ playerId: playerBId, nickname: "PlayerB" });

    const strokePromise = waitForEvent<{ stroke: Stroke; playerId?: string }>(clientA, "canvas:stroke", 5000);
    const strokeAck = await emitWithAck<{ ok: boolean; error?: string }>(clientB, "canvas:stroke", {
      roomCode: room.roomCode,
      token: joinAckB.token,
      stroke: {
        id: `${playerBId}-stroke`,
        color: "#ffffff",
        width: 3,
        points: [
          { x: 0.1, y: 0.1, t: Date.now() },
          { x: 0.2, y: 0.2, t: Date.now() + 10 }
        ]
      }
    });

    expect(strokeAck.ok).toBe(true);
    const remoteStroke = await strokePromise;
    expect(remoteStroke.playerId).toBe(playerBId);

    const persistedRoom = await store.getRoom(room.roomCode);
    expect(persistedRoom?.players.map((p) => p.id)).toEqual(
      expect.arrayContaining([room.hostPlayer.id, playerAId, playerBId])
    );

    clientA.disconnect();
    clientB.disconnect();
    await server.close();

    expect(events.map((event) => event.type)).toEqual([
      "room.join",
      "room.join"
    ]);
  });
});
