"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Stroke } from "@skribble-play/drawing-engine";
import { env } from "@/lib/env";
import type { GameState } from "@/types/game";

export interface PresenceMember {
  playerId: string;
  nickname: string;
  source: string;
  lastSeenAt?: number;
}

export interface UseRealtimeRoomOptions {
  roomCode: string;
  playerId: string;
  token: string;
  nickname?: string;
  role?: "host" | "player";
  hostToken?: string;
}

export interface UseRealtimeRoomReturn {
  status: "connecting" | "connected" | "error";
  error: string | null;
  players: PresenceMember[];
  state: GameState | null;
  strokes: Stroke[];
  sendStroke: (stroke: Stroke) => void;
  startRound: (drawingPlayerId?: string) => Promise<void>;
  submitGuess: (guess: string) => Promise<{ correct: boolean }>;
  refreshState: () => Promise<void>;
  toggleReady: (ready: boolean) => Promise<void>;
  updateFilters: (filters: Partial<GameState["filters"]>) => Promise<void>;
}

function normalizePlayers(list: PresenceMember[]) {
  const seen = new Map<string, PresenceMember>();
  for (const member of list) {
    seen.set(member.playerId, member);
  }
  return Array.from(seen.values());
}

export function useRealtimeRoom({
  roomCode,
  playerId,
  token,
  nickname,
  role = "player",
  hostToken
}: UseRealtimeRoomOptions): UseRealtimeRoomReturn {
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PresenceMember[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const roomCodeUpper = useMemo(() => roomCode.toUpperCase(), [roomCode]);

  useEffect(() => {
    let active = true;

    async function fetchPresence() {
      try {
        const response = await fetch(`${env.gameServerUrl}/rooms/${roomCodeUpper}/presence`);
        if (!response.ok) {
          throw new Error(`Presence fetch failed (${response.status})`);
        }
        const body = (await response.json()) as Array<PresenceMember & { lastSeenAt?: number | string }>;
        if (active) {
          const normalized = body.map((member) => ({
            ...member,
            lastSeenAt: member.lastSeenAt != null ? Number(member.lastSeenAt) : undefined
          }));
          setPlayers(normalizePlayers(normalized));
        }
      } catch (err) {
        if (active) {
          console.error("presence fetch failed", err);
        }
      }
    }

    void fetchPresence();

    return () => {
      active = false;
    };
  }, [roomCodeUpper]);

  useEffect(() => {
    const gameServerUrl = env.gameServerUrl;
    const socket = io(gameServerUrl, {
      path: "/realtime",
      transports: ["websocket"],
      autoConnect: true
    });
    socketRef.current = socket;
    setStatus("connecting");
    setError(null);

    socket.on("connect", () => {
      setStatus("connected");
      socket.emit(
        "game:join",
        {
          roomCode: roomCodeUpper,
          playerId,
          token,
          nickname
        },
        (ack: {
          ok: boolean;
          playerId?: string;
          token?: string;
          nickname?: string;
          state?: GameState;
          strokes?: Stroke[];
          error?: string;
        }) => {
          const joinedPlayerId = ack.playerId;
          if (!ack.ok || !joinedPlayerId) {
            setStatus("error");
            setError(ack.error ?? "Failed to join room.");
            return;
          }
          setPlayers((prev) =>
            normalizePlayers([
              ...prev,
              {
                playerId: joinedPlayerId,
                nickname: ack.nickname ?? nickname ?? "",
                source: "socket",
                lastSeenAt: Date.now()
              }
            ])
          );
          if (ack.state) {
            setState(ack.state);
          }
          if (ack.strokes) {
            setStrokes(ack.strokes);
          }
        }
      );
    });

    socket.on("connect_error", (err) => {
      console.error("socket connect error", err);
      setStatus("error");
      setError(err.message);
    });

    socket.on("disconnect", () => {
      setStatus("connecting");
    });

    socket.on("game:player-joined", (payload: { playerId: string; nickname: string }) => {
      setPlayers((prev) =>
        normalizePlayers([
          ...prev,
          {
            playerId: payload.playerId,
            nickname: payload.nickname,
            source: "socket",
            lastSeenAt: Date.now()
          }
        ])
      );
    });

    socket.on("game:player-left", (payload: { playerId: string }) => {
      setPlayers((prev) => prev.filter((member) => member.playerId !== payload.playerId));
    });

    socket.on("canvas:history", (payload: { strokes: Stroke[] }) => {
      setStrokes(payload.strokes);
    });

    socket.on("canvas:stroke", (payload: { stroke: Stroke; playerId?: string }) => {
      if (payload.playerId) {
        setPlayers((prev) =>
          prev.map((member) =>
            member.playerId === payload.playerId
              ? { ...member, lastSeenAt: Date.now() }
              : member
          )
        );
      }
      setStrokes((prev) => [...prev, payload.stroke]);
    });

    socket.on("game:state", (nextState: GameState) => {
      setState(nextState);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [roomCodeUpper, playerId, token, nickname]);

  const sendStroke = useCallback(
    (stroke: Stroke) => {
      const socket = socketRef.current;
      if (!socket || socket.disconnected) return;
      socket.emit(
        "canvas:stroke",
        {
          roomCode: roomCodeUpper,
          token,
          stroke
        },
        (ack: { ok: boolean; error?: string }) => {
          if (!ack?.ok) {
            console.error("Failed to send stroke", ack?.error);
          } else {
            setStrokes((prev) => [...prev, stroke]);
          }
        }
      );
    },
    [roomCodeUpper, token]
  );

  const fetchState = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (role === "host" && hostToken) {
        params.set("hostToken", hostToken);
      } else {
        params.set("token", token);
      }
      const response = await fetch(`${env.gameServerUrl}/rooms/${roomCodeUpper}/state?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`State fetch failed (${response.status})`);
      }
      const body = (await response.json()) as GameState;
      setState(body);
    } catch (err) {
      console.error("failed to refresh state", err);
    }
  }, [hostToken, role, roomCodeUpper, token]);

  const startRound = useCallback(
    async (drawingPlayerId?: string) => {
      if (role !== "host" || !hostToken) return;
      try {
        const response = await fetch(`${env.gameServerUrl}/rooms/${roomCodeUpper}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostToken, hostPlayerId: playerId, drawingPlayerId })
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Start round failed (${response.status})`);
        }
        const body = (await response.json()) as GameState;
        setState(body);
      } catch (err) {
        console.error("failed to start round", err);
        throw err;
      }
    },
    [hostToken, playerId, role, roomCodeUpper]
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      try {
        const response = await fetch(`${env.gameServerUrl}/rooms/${roomCodeUpper}/guess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, guess })
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Guess failed (${response.status})`);
        }
        const body = (await response.json()) as { correct: boolean; state: GameState };
        setState(body.state);
        return { correct: body.correct };
      } catch (err) {
        console.error("failed to submit guess", err);
        throw err;
      }
    },
    [roomCodeUpper, token]
  );

  const toggleReady = useCallback(
    async (ready: boolean) => {
      try {
        const response = await fetch(`${env.gameServerUrl}/rooms/${roomCodeUpper}/ready`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ready })
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Ready toggle failed (${response.status})`);
        }
        const body = (await response.json()) as { state: GameState };
        setState(body.state);
      } catch (err) {
        console.error("failed to toggle ready", err);
        throw err;
      }
    },
    [roomCodeUpper, token]
  );

  const updateFilters = useCallback(
    async (filters: Partial<GameState["filters"]>) => {
      try {
        const response = await fetch(`${env.gameServerUrl}/rooms/${roomCodeUpper}/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, ...filters })
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Settings update failed (${response.status})`);
        }
        const body = (await response.json()) as { state: GameState };
        setState(body.state);
      } catch (err) {
        console.error("failed to update filters", err);
        throw err;
      }
    },
    [roomCodeUpper, token]
  );

  return {
    status,
    error,
    players,
    state,
    strokes,
    sendStroke,
    startRound,
    submitGuess,
    refreshState: fetchState,
    toggleReady,
    updateFilters
  };
}
