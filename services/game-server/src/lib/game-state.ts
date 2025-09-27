import type { Redis } from "ioredis";

export type GamePhase = "lobby" | "drawing" | "results";

export interface Scoreboard {
  [playerId: string]: number;
}

export interface GameState {
  roomCode: string;
  phase: GamePhase;
  round: number;
  prompt: string | null;
  promptMasked: string | null;
  drawingPlayerId: string | null;
  roundEndsAt: number | null;
  scoreboard: Scoreboard;
  correctGuessers: string[];
  readyPlayers: string[];
  filters: GameFilters;
}

export interface GameFilters {
  kidsMode: boolean;
  profanityLevel: "low" | "medium" | "high";
}

export interface GameLoopConfig {
  drawDurationMs?: number;
  prompts?: string[];
}

const DEFAULT_PROMPTS = [
  "Sunset", "Rocket", "Pineapple", "Mountain", "Panda", "Spaceship", "Robot", "Rainbow"
];

const DEFAULT_STATE: GameState = {
  roomCode: "",
  phase: "lobby",
  round: 0,
  prompt: null,
  promptMasked: null,
  drawingPlayerId: null,
  roundEndsAt: null,
  scoreboard: {},
  correctGuessers: [],
  readyPlayers: [],
  filters: {
    kidsMode: false,
    profanityLevel: "medium"
  }
};

function maskPrompt(prompt: string) {
  return prompt.replace(/[A-Za-z]/g, "_");
}

export class GameStateManager {
  private readonly redis: Redis;
  private readonly drawDuration: number;
  private readonly prompts: string[];
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(redis: Redis, config: GameLoopConfig = {}) {
    this.redis = redis;
    this.drawDuration = config.drawDurationMs ?? 90_000;
    this.prompts = config.prompts ?? DEFAULT_PROMPTS;
  }

  private stateKey(roomCode: string) {
    return `room:${roomCode}:state`;
  }

  private scoreboardKey(roomCode: string) {
    return `room:${roomCode}:scoreboard`;
  }

  private sanitizeState(state: GameState, includePrompt: boolean): GameState {
    if (includePrompt) return state;
    return {
      ...state,
      prompt: null
    };
  }

  private async readScoreboard(roomCode: string): Promise<Scoreboard> {
    const data = await this.redis.hgetall(this.scoreboardKey(roomCode));
    return Object.fromEntries(
      Object.entries(data).map(([playerId, value]) => [playerId, Number(value)])
    );
  }

  private async writeScoreboard(roomCode: string, scoreboard: Scoreboard) {
    if (Object.keys(scoreboard).length === 0) {
      await this.redis.del(this.scoreboardKey(roomCode));
      return;
    }
    await this.redis.hset(
      this.scoreboardKey(roomCode),
      Object.fromEntries(Object.entries(scoreboard).map(([playerId, value]) => [playerId, value.toString()]))
    );
  }

  async getState(roomCode: string, includePrompt = false): Promise<GameState> {
    const key = this.stateKey(roomCode);
    const raw = await this.redis.get(key);
    const scoreboard = await this.readScoreboard(roomCode);
    if (!raw) {
      return this.sanitizeState(
        {
          ...DEFAULT_STATE,
          roomCode,
          scoreboard
        },
        includePrompt
      );
    }
    const parsed = JSON.parse(raw) as GameState;
    return this.sanitizeState({ ...parsed, scoreboard }, includePrompt);
  }

  async startRound(roomCode: string, drawingPlayerId: string): Promise<GameState> {
    const baseState = await this.getState(roomCode, true);
    const scoreboard = baseState.scoreboard;
    const prompt = this.prompts[Math.floor(Math.random() * this.prompts.length)];
    const state: GameState = {
      roomCode,
      phase: "drawing",
      round: Date.now(),
      prompt,
      promptMasked: maskPrompt(prompt),
      drawingPlayerId,
      roundEndsAt: Date.now() + this.drawDuration,
      scoreboard,
      correctGuessers: [],
      readyPlayers: [],
      filters: baseState.filters ?? DEFAULT_STATE.filters
    };

    await this.redis.set(this.stateKey(roomCode), JSON.stringify(state));
    await this.writeScoreboard(roomCode, scoreboard);

    this.scheduleEnd(roomCode, state.roundEndsAt);

    return state;
  }

  async endRound(roomCode: string): Promise<GameState> {
    const current = await this.getState(roomCode, true);
    const state: GameState = {
      ...current,
      phase: "results",
      roundEndsAt: Date.now(),
      readyPlayers: []
    };
    await this.redis.set(this.stateKey(roomCode), JSON.stringify(state));
    await this.writeScoreboard(roomCode, state.scoreboard);
    this.clearTimer(roomCode);
    return state;
  }

  async ensureLobby(roomCode: string) {
    await this.redis.del(this.stateKey(roomCode));
    await this.redis.del(this.scoreboardKey(roomCode));
    this.clearTimer(roomCode);
  }

  async ensurePlayer(roomCode: string, playerId: string) {
    const scoreboard = await this.readScoreboard(roomCode);
    if (scoreboard[playerId] == null) {
      scoreboard[playerId] = 0;
      await this.writeScoreboard(roomCode, scoreboard);
    }
  }

  async recordGuess(roomCode: string, playerId: string, guess: string): Promise<{ correct: boolean; state: GameState }>
  {
    const current = await this.getState(roomCode, true);
    if (current.phase !== "drawing" || !current.prompt) {
      return { correct: false, state: current };
    }

    if (current.correctGuessers.includes(playerId)) {
      return { correct: false, state: current };
    }

    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedPrompt = current.prompt.trim().toLowerCase();
    if (normalizedGuess !== normalizedPrompt) {
      return { correct: false, state: current };
    }

    const scoreboard = await this.readScoreboard(roomCode);
    scoreboard[playerId] = (scoreboard[playerId] ?? 0) + 100;

    const updated: GameState = {
      ...current,
      scoreboard,
      correctGuessers: [...current.correctGuessers, playerId]
    };

    await this.redis.set(this.stateKey(roomCode), JSON.stringify(updated));
    await this.writeScoreboard(roomCode, scoreboard);

    return { correct: true, state: updated };
  }

  async getScores(roomCode: string): Promise<Scoreboard> {
    return this.readScoreboard(roomCode);
  }

  async setReady(roomCode: string, playerId: string, ready: boolean): Promise<GameState> {
    const current = await this.getState(roomCode, true);
    const readyPlayers = new Set(current.readyPlayers);
    if (ready) {
      readyPlayers.add(playerId);
    } else {
      readyPlayers.delete(playerId);
    }
    const updated: GameState = {
      ...current,
      readyPlayers: Array.from(readyPlayers)
    };
    await this.redis.set(this.stateKey(roomCode), JSON.stringify(updated));
    return updated;
  }

  async updateFilters(roomCode: string, filters: Partial<GameFilters>): Promise<GameState> {
    const current = await this.getState(roomCode, true);
    const merged: GameFilters = {
      kidsMode: filters.kidsMode ?? current.filters.kidsMode,
      profanityLevel: filters.profanityLevel ?? current.filters.profanityLevel
    };
    const updated: GameState = {
      ...current,
      filters: merged
    };
    await this.redis.set(this.stateKey(roomCode), JSON.stringify(updated));
    return updated;
  }

  private scheduleEnd(roomCode: string, endAt: number | null) {
    this.clearTimer(roomCode);
    if (!endAt) return;
    const delay = endAt - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      this.endRound(roomCode).catch((error) => {
        console.error("failed to end round", error);
      });
    }, delay);
    this.timers.set(roomCode, timer);
  }

  private clearTimer(roomCode: string) {
    const timer = this.timers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomCode);
    }
  }
}
