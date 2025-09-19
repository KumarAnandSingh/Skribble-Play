"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Stroke } from "@skribble-play/drawing-engine";
import { Button } from "@skribble-play/ui-kit";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";
import { env } from "@/lib/env";

interface PlayPageProps {
  params: {
    roomCode: string;
  };
}

export default function PlayRoomPage({ params }: PlayPageProps) {
  const searchParams = useSearchParams();
  const roomCode = params.roomCode.toUpperCase();
  const playerId = searchParams.get("playerId") ?? "";
  const token = searchParams.get("token") ?? "";
  const role = searchParams.get("role") ?? "player";
  const nickname = searchParams.get("nickname") ?? "";
  const hostToken = searchParams.get("hostToken") ?? "";

  const [remoteStrokes, setRemoteStrokes] = useState<Stroke[]>([]);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [kickError, setKickError] = useState<string | null>(null);

  const handleRemoteStroke = useCallback((stroke: Stroke) => {
    setRemoteStrokes((prev) => {
      const next = [...prev, stroke];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const { status, error: connectionError, players, sendStroke } = useRealtimeRoom({
    roomCode,
    playerId,
    token,
    nickname,
    onRemoteStroke: handleRemoteStroke
  });

  const statusMessage = useMemo(() => {
    if (!playerId || !token) {
      return "Missing player credentials. Return to the lobby and try again.";
    }

    if (status === "connecting") {
      return "Connecting to the game server...";
    }

    if (status === "error") {
      return connectionError ?? "Connection error.";
    }

    return role === "host"
      ? "You're hosting this room. Share the code and keep your host token safe."
      : "You're in! Grab your stylus and wait for the host to start the round.";
  }, [playerId, token, status, role, connectionError]);

  const playersList = useMemo(
    () =>
      [...players]
        .sort((a, b) => (a.nickname || a.playerId).localeCompare(b.nickname || b.playerId))
        .map((member) => ({
          ...member,
          isSelf: member.playerId === playerId
        })),
    [players, playerId]
  );

  const handleKick = useCallback(
    async (targetPlayerId: string) => {
      if (!hostToken) return;
      setKickingId(targetPlayerId);
      setKickError(null);
      try {
        const response = await fetch(`${env.gameServerUrl}/rooms/${roomCode}/kick`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hostToken, targetPlayerId })
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? `Kick failed (${response.status})`);
        }
      } catch (err) {
        setKickError((err as Error).message);
      } finally {
        setKickingId(null);
      }
    },
    [hostToken, roomCode]
  );

  const canDraw = Boolean(playerId && token && status === "connected");

  return (
    <main className="flex min-h-screen flex-col gap-8 bg-[color:var(--color-background)] px-6 py-10 text-[color:var(--color-text)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Room {roomCode}</h1>
          <p className="text-white/70">Real-time drawing surface and player presence board.</p>
        </div>
        <Button asChild>
          <Link href="/">Back to Lobby</Link>
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-panel">
          <h2 className="text-xl font-semibold">Canvas</h2>
          <p className="mt-2 text-sm text-white/70">
            Draw with your mouse or stylus. Strokes broadcast to everyone in the room in real time.
          </p>
          <div className="mt-6">
            {canDraw ? (
              <DrawingCanvas playerId={playerId} onStroke={sendStroke} remoteStrokes={remoteStrokes} />
            ) : (
              <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-white/40">
                {statusMessage}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-panel">
          <div>
            <h2 className="text-lg font-semibold">Session Details</h2>
            <p className="mt-2 text-sm text-white/70">{statusMessage}</p>
          </div>

          <dl className="space-y-3 text-sm text-white/80">
            <div>
              <dt className="font-medium text-white/90">Your role</dt>
              <dd className="text-white/70">{role}</dd>
            </div>
            <div>
              <dt className="font-medium text-white/90">Nickname</dt>
              <dd className="text-white/70">{nickname || "(anonymous)"}</dd>
            </div>
            <div>
              <dt className="font-medium text-white/90">Player ID</dt>
              <dd className="break-all text-white/70">{playerId || "unknown"}</dd>
            </div>
          </dl>

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Players</h3>
            <ul className="mt-2 space-y-2 text-sm text-white/80">
              {playersList.map((member) => (
                <li key={member.playerId} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2">
                  <div>
                    <span>{member.nickname || member.playerId}</span>
                    {member.isSelf ? <span className="text-xs uppercase text-white/40"> (you)</span> : null}
                    {member.lastSeenAt ? (
                      <div className="text-xs text-white/40">Last seen {new Date(member.lastSeenAt).toLocaleTimeString()}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase text-white/40">{member.source}</span>
                    {role === "host" && hostToken && !member.isSelf ? (
                      <Button
                        variant="ghost"
                        disabled={kickingId === member.playerId}
                        onClick={() => handleKick(member.playerId)}
                      >
                        Kick
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
              {playersList.length === 0 && <li className="text-white/50">No players visible yet.</li>}
            </ul>
            {kickError && <p className="mt-2 text-sm text-rose-400">{kickError}</p>}
          </section>
        </aside>
      </section>
    </main>
  );
}
