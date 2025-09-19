"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { Stroke } from "@skribble-play/drawing-engine";
import { env } from "@/lib/env";

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
  onRemoteStroke?: (stroke: Stroke) => void;
}

export interface UseRealtimeRoomReturn {
  status: "connecting" | "connected" | "error";
  error: string | null;
  players: PresenceMember[];
  sendStroke: (stroke: Stroke) => void;
}

function normalizePlayers(list: PresenceMember[]) {
  const seen = new Map<string, PresenceMember>();
  for (const member of list) {
    seen.set(member.playerId, member);
  }
  return Array.from(seen.values());
}

export function useRealtimeRoom({ roomCode, playerId, token, nickname, onRemoteStroke }: UseRealtimeRoomOptions): UseRealtimeRoomReturn {
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PresenceMember[]>([]);
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
        (ack: { ok: boolean; playerId?: string; token?: string; nickname?: string; error?: string }) => {
          if (!ack.ok || !ack.playerId) {
            setStatus("error");
            setError(ack.error ?? "Failed to join room.");
            return;
          }
          setPlayers((prev) =>
            normalizePlayers([
              ...prev,
              {
                playerId: ack.playerId,
                nickname: ack.nickname ?? nickname ?? "",
                source: "socket",
                lastSeenAt: Date.now()
              }
            ])
          );
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
      onRemoteStroke?.(payload.stroke);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [roomCodeUpper, playerId, token, nickname, onRemoteStroke]);

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
          if (!ack?.ok && ack?.error) {
            console.error("Failed to send stroke", ack.error);
          }
        }
      );
    },
    [roomCodeUpper, token]
  );

  return { status, error, players, sendStroke };
}
