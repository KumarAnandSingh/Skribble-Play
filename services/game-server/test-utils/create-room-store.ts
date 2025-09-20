import { randomUUID } from "node:crypto";
import type { RoomStore } from "../src/lib/room-store";

interface TestPlayer {
  id: string;
  nickname: string;
  joinedAt: string;
  isHost: boolean;
}

interface TestRoom {
  roomCode: string;
  hostToken: string;
  createdAt: string;
  players: TestPlayer[];
}

class InMemoryRoomStore {
  private rooms = new Map<string, TestRoom>();

  async init() {}
  async close() {}

  async createRoom(hostNickname: string) {
    const roomCode = randomUUID().slice(0, 6).toUpperCase();
    const hostToken = randomUUID();
    const now = new Date().toISOString();
    const hostPlayer: TestPlayer = {
      id: randomUUID(),
      nickname: hostNickname,
      joinedAt: now,
      isHost: true
    };
    this.rooms.set(roomCode, {
      roomCode,
      hostToken,
      createdAt: now,
      players: [hostPlayer]
    });
    return {
      roomCode,
      hostToken,
      hostPlayer
    };
  }

  async getRoom(roomCode: string) {
    const normalized = roomCode.toUpperCase();
    const room = this.rooms.get(normalized);
    if (!room) return null;
    return {
      roomCode: normalized,
      createdAt: room.createdAt,
      players: room.players.map(({ isHost, ...rest }) => rest)
    };
  }

  async getPlayer(roomCode: string, playerId: string) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return null;
    const { isHost, ...rest } = player;
    return rest;
  }

  async getHostToken(roomCode: string) {
    return this.rooms.get(roomCode.toUpperCase())?.hostToken ?? null;
  }

  async joinRoom(roomCode: string, nickname: string, playerId?: string) {
    const normalized = roomCode.toUpperCase();
    const room = this.rooms.get(normalized);
    if (!room) {
      throw new Error("ROOM_NOT_FOUND");
    }
    const id = playerId ?? randomUUID();
    const existing = room.players.find((p) => p.id === id);
    if (existing) {
      existing.nickname = nickname;
      return { playerId: id };
    }
    room.players.push({
      id,
      nickname,
      joinedAt: new Date().toISOString(),
      isHost: false
    });
    return { playerId: id };
  }

  async leaveRoom(roomCode: string, playerId: string) {
    const room = this.rooms.get(roomCode.toUpperCase());
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== playerId);
  }

  async clearAll() {
    this.rooms.clear();
  }
}

export interface TestRoomStore {
  store: RoomStore;
  cleanup: () => Promise<void>;
}

export async function createTestRoomStore(): Promise<TestRoomStore> {
  const store = new InMemoryRoomStore();
  await store.init();
  return {
    store: store as unknown as RoomStore,
    cleanup: async () => {
      await store.clearAll();
    }
  };
}
