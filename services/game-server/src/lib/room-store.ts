import pg from "pg";
import type { Pool as PgPool } from "pg";

const { Pool } = pg;
import { randomUUID } from "node:crypto";

export interface PlayerRecord {
  id: string;
  nickname: string;
  joinedAt: string;
}

export interface RoomRecord {
  roomCode: string;
  createdAt: string;
  players: PlayerRecord[];
}

export interface CreateRoomResult {
  roomCode: string;
  hostToken: string;
  hostPlayer: PlayerRecord;
}

export interface JoinRoomResult {
  playerId: string;
}

export class RoomStore {
  private readonly pool: PgPool;
  private initialized = false;

  constructor(pool: PgPool) {
    this.pool = pool;
  }

  async init() {
    if (this.initialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_code TEXT PRIMARY KEY,
        host_token UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS room_players (
        id UUID PRIMARY KEY,
        room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
        nickname TEXT NOT NULL,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_host BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    this.initialized = true;
  }

  async close() {
    await this.pool.end();
  }

  private async generateUniqueRoomCode(): Promise<string> {
    while (true) {
      const candidate = Math.random().toString(36).slice(2, 8).toUpperCase();
      const existing = await this.pool.query("SELECT 1 FROM rooms WHERE room_code = $1", [candidate]);
      if (existing.rowCount === 0) {
        return candidate;
      }
    }
  }

  async createRoom(hostNickname: string): Promise<CreateRoomResult> {
    const roomCode = await this.generateUniqueRoomCode();
    const hostToken = randomUUID();
    const hostPlayerId = randomUUID();

    await this.pool.query("BEGIN");
    try {
      await this.pool.query("INSERT INTO rooms (room_code, host_token) VALUES ($1, $2)", [roomCode, hostToken]);
      const playerResult = await this.pool.query<{ joined_at: Date }>(
        `INSERT INTO room_players (id, room_code, nickname, is_host)
         VALUES ($1, $2, $3, TRUE)
         RETURNING joined_at`,
        [hostPlayerId, roomCode, hostNickname]
      );
      await this.pool.query("COMMIT");

      return {
        roomCode,
        hostToken,
        hostPlayer: {
          id: hostPlayerId,
          nickname: hostNickname,
          joinedAt: playerResult.rows[0].joined_at.toISOString()
        }
      };
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }
  }

  async getRoom(roomCode: string): Promise<RoomRecord | null> {
    const normalized = roomCode.toUpperCase();
    const roomResult = await this.pool.query<{ room_code: string; created_at: Date }>(
      "SELECT room_code, created_at FROM rooms WHERE room_code = $1",
      [normalized]
    );

    if (roomResult.rowCount === 0) {
      return null;
    }

    const playersResult = await this.pool.query<{ id: string; nickname: string; joined_at: Date }>(
      `SELECT id, nickname, joined_at
       FROM room_players
       WHERE room_code = $1
       ORDER BY joined_at ASC`,
      [normalized]
    );

    return {
      roomCode: roomResult.rows[0].room_code,
      createdAt: roomResult.rows[0].created_at.toISOString(),
      players: playersResult.rows.map((player: { id: string; nickname: string; joined_at: Date }) => ({
        id: player.id,
        nickname: player.nickname,
        joinedAt: player.joined_at.toISOString()
      }))
    };
  }

  async getPlayer(roomCode: string, playerId: string): Promise<PlayerRecord | null> {
    const normalized = roomCode.toUpperCase();
    const result = await this.pool.query<{ id: string; nickname: string; joined_at: Date }>(
      "SELECT id, nickname, joined_at FROM room_players WHERE room_code = $1 AND id = $2",
      [normalized, playerId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      nickname: row.nickname,
      joinedAt: row.joined_at.toISOString()
    };
  }

  async getHostToken(roomCode: string): Promise<string | null> {
    const normalized = roomCode.toUpperCase();
    const result = await this.pool.query<{ host_token: string }>(
      "SELECT host_token FROM rooms WHERE room_code = $1",
      [normalized]
    );
    return result.rowCount > 0 ? result.rows[0].host_token : null;
  }

  async joinRoom(roomCode: string, nickname: string, playerId?: string): Promise<JoinRoomResult> {
    const normalized = roomCode.toUpperCase();
    const id = playerId ?? randomUUID();

    await this.pool.query("BEGIN");
    try {
      const roomExists = await this.pool.query("SELECT 1 FROM rooms WHERE room_code = $1", [normalized]);
      if (roomExists.rowCount === 0) {
        throw new Error("ROOM_NOT_FOUND");
      }

      await this.pool.query(
        `INSERT INTO room_players (id, room_code, nickname)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname`,
        [id, normalized, nickname]
      );

      await this.pool.query("COMMIT");

      return { playerId: id };
    } catch (error) {
      await this.pool.query("ROLLBACK");
      throw error;
    }
  }

  async leaveRoom(roomCode: string, playerId: string) {
    const normalized = roomCode.toUpperCase();
    await this.pool.query("DELETE FROM room_players WHERE room_code = $1 AND id = $2", [normalized, playerId]);
  }

  async clearAll() {
    this.initialized = false;
    await this.pool.query("DROP TABLE IF EXISTS room_players CASCADE");
    await this.pool.query("DROP TABLE IF EXISTS rooms CASCADE");
  }
}

export interface RoomStoreFactoryOptions {
  connectionString: string;
}

export function createRoomStore(options: RoomStoreFactoryOptions) {
  const pool = new Pool({ connectionString: options.connectionString });
  return new RoomStore(pool);
}
