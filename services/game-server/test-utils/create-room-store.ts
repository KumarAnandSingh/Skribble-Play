import { Pool } from "pg";
import { RoomStore, type RedisLike } from "../src/lib/room-store";

class FakeRedis implements RedisLike {
  private sets = new Map<string, Set<string>>();

  async sadd(key: string, member: string): Promise<number> {
    const current = this.sets.get(key) ?? new Set<string>();
    const sizeBefore = current.size;
    current.add(member);
    this.sets.set(key, current);
    return current.size > sizeBefore ? 1 : 0;
  }

  async srem(key: string, member: string): Promise<number> {
    const current = this.sets.get(key);
    if (!current) return 0;
    const existed = current.delete(member);
    return existed ? 1 : 0;
  }

  async flushall(): Promise<string> {
    this.sets.clear();
    return "OK";
  }

  async quit(): Promise<string> {
    this.sets.clear();
    return "OK";
  }
}

export interface TestRoomStore {
  store: RoomStore;
  cleanup: () => Promise<void>;
}

function resolveConnectionString() {
  return (
    process.env.TEST_POSTGRES_URL ??
    process.env.POSTGRES_URL ??
    "postgresql://postgres:postgres@localhost:55432/skribble_play"
  );
}

function generateSchemaName() {
  return `room_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTestRoomStore(): Promise<TestRoomStore> {
  const connectionString = resolveConnectionString();
  const schema = generateSchemaName();

  const bootstrapPool = new Pool({ connectionString });
  await bootstrapPool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  await bootstrapPool.end();

  const pool = new Pool({ connectionString, options: `-c search_path=${schema}` });
  const redis = new FakeRedis();

  const store = new RoomStore(pool, redis);
  await store.clearAll().catch(() => undefined);
  await store.init();

  return {
    store,
    cleanup: async () => {
      await store.clearAll().catch(() => undefined);
      await store.close();

      const cleanupPool = new Pool({ connectionString });
      await cleanupPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await cleanupPool.end();
    }
  };
}
