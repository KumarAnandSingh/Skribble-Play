"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { InviteSheet } from "@/components/room/InviteSheet";
import { PlayerRoster } from "@/components/room/PlayerRoster";
import { useRealtimeRoom } from "@/hooks/useRealtimeRoom";
import { useRoundTimer } from "@/hooks/useRoundTimer";
import { env } from "@/lib/env";

export default function PlayRoomPage({ params }: any) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomCode = params.roomCode.toUpperCase();
  const playerId = searchParams.get("playerId") ?? "";
  const token = searchParams.get("token") ?? "";
  const role = (searchParams.get("role") as "host" | "player") ?? "player";
  const nickname = searchParams.get("nickname") ?? "";
  const hostToken = searchParams.get("hostToken") ?? undefined;

  const [guess, setGuess] = useState("");
  const [guessFeedback, setGuessFeedback] = useState<string | null>(null);
  const [roundError, setRoundError] = useState<string | null>(null);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);

  const { status, error, players, state, strokes, sendStroke, startRound, submitGuess, toggleReady, updateFilters } = useRealtimeRoom({
    roomCode,
    playerId,
    token,
    nickname,
    role,
    hostToken
  });

  const statusMessage = useMemo(() => {
    if (!playerId || !token) {
      return "Missing player credentials. Return to the lobby and try again.";
    }

    if (status === "connecting") {
      return "Connecting to the game server...";
    }

    if (status === "error") {
      return error ?? "Connection error.";
    }

    if (!state) {
      return "Waiting for the next round.";
    }

    if (state.phase === "lobby") {
      return role === "host"
        ? "Start the round when everyone is ready."
        : "Waiting for the host to start the round.";
    }

    if (state.phase === "drawing") {
      if (state.drawingPlayerId === playerId) {
        return "You're drawing! Use the canvas to sketch the prompt.";
      }
      return "Guess the drawing before time runs out.";
    }

    if (state.phase === "results") {
      return "Round results are in. Waiting for the next round.";
    }

    return "";
  }, [playerId, token, status, error, state, role]);

  const handleStartRound = useCallback(async () => {
    if (role !== "host") return;
    setRoundError(null);
    try {
      await startRound(selectedDrawerId ?? undefined);
    } catch (err) {
      setRoundError((err as Error).message);
    }
  }, [role, selectedDrawerId, startRound]);

  const handleSubmitGuess = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!guess.trim()) return;
      setGuessFeedback(null);
      try {
        const result = await submitGuess(guess.trim());
        if (result.correct) {
          setGuessFeedback("Correct! Nicely done.");
          setGuess("");
        } else {
          setGuessFeedback("Not quite. Keep guessing!");
        }
      } catch (err) {
        setGuessFeedback((err as Error).message);
      }
    },
    [guess, submitGuess]
  );

  const isDrawingPlayer = state?.drawingPlayerId === playerId;
  const canDraw = Boolean(playerId && token && status === "connected" && state?.phase === "drawing" && isDrawingPlayer);
  const promptVisible = role === "host" && state?.prompt ? state.prompt : state?.promptMasked;

  const sortedPlayers = useMemo(() => {
    if (!state) return players;
    return [...players].sort((a, b) => {
      const scoreA = state.scoreboard[a.playerId] ?? 0;
      const scoreB = state.scoreboard[b.playerId] ?? 0;
      return scoreB - scoreA;
    });
  }, [players, state]);

  const roundTimer = useRoundTimer(state?.roundEndsAt ?? null, state?.phase === "drawing");
  const roundDurationMs = useMemo(() => {
    if (!state || state.phase !== "drawing" || !state.roundEndsAt) return null;
    return state.roundEndsAt - state.round;
  }, [state]);

  const roundProgress = useMemo(() => {
    if (!roundDurationMs || roundTimer.remainingMs == null) return 0;
    const elapsed = roundDurationMs - roundTimer.remainingMs;
    return Math.min(Math.max((elapsed / roundDurationMs) * 100, 0), 100);
  }, [roundDurationMs, roundTimer.remainingMs]);

  const drawingPlayer = useMemo(
    () => (state?.drawingPlayerId ? players.find((member) => member.playerId === state.drawingPlayerId) ?? null : null),
    [players, state?.drawingPlayerId]
  );

  const correctGuessers = useMemo(() => {
    if (!state) return [] as Array<{ id: string; name: string }>;
    return state.correctGuessers.map((id) => {
      const member = players.find((player) => player.playerId === id);
      return { id, name: member?.nickname || id };
    });
  }, [players, state]);

  const startButtonLabel = state?.phase === "results" ? "Start Next Round" : "Start Round";
  const currentPhaseLabel = state?.phase ? state.phase.charAt(0).toUpperCase() + state.phase.slice(1) : "Unknown";
  const selectedDrawerMember = useMemo(
    () => (selectedDrawerId ? players.find((member) => member.playerId === selectedDrawerId) ?? null : null),
    [players, selectedDrawerId]
  );

  const readyCount = state?.readyPlayers.length ?? 0;
  const totalPlayers = sortedPlayers.length;
  const readyProgress = totalPlayers > 0 ? Math.min((readyCount / totalPlayers) * 100, 100) : 0;
  const isPlayerReady = state?.readyPlayers.includes(playerId) ?? false;
  const startDisabled =
    status !== "connected" || totalPlayers === 0 || readyCount === 0 || readyCount !== totalPlayers;
  const kidsModeEnabled = state?.filters.kidsMode ?? false;
  const profanityLevel = state?.filters.profanityLevel ?? "medium";

  useEffect(() => {
    if (role !== "host") return;
    if (selectedDrawerId && players.some((member) => member.playerId === selectedDrawerId)) {
      return;
    }
    const fallback = state?.drawingPlayerId && players.some((member) => member.playerId === state.drawingPlayerId)
      ? state.drawingPlayerId
      : players[0]?.playerId ?? null;
    setSelectedDrawerId(fallback);
  }, [players, role, selectedDrawerId, state?.drawingPlayerId]);

  return (
    <main className="flex min-h-screen flex-col gap-8 bg-[color:var(--color-background)] px-6 py-10 text-[color:var(--color-text)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Room {roomCode}</h1>
          <p className="text-white/60">Phase: {currentPhaseLabel}</p>
          <p className="text-white/70">{statusMessage}</p>
          {drawingPlayer ? (
            <p className="mt-2 text-sm text-white/70">
              Drawing player: <span className="font-medium text-white">{drawingPlayer.nickname || drawingPlayer.playerId}</span>
            </p>
          ) : null}
          {promptVisible ? (
            <p className="mt-2 text-lg font-medium text-white">Prompt: {promptVisible}</p>
          ) : null}
          {state?.roundEndsAt && state.phase === "drawing" ? (
            <div className="mt-3 w-full max-w-sm">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/50">
                <span>Time remaining</span>
                <span>{roundTimer.secondsRemaining != null ? `${roundTimer.secondsRemaining}s` : "--"}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8f47ff] to-[#ff6fcb] transition-[width]"
                  style={{ width: `${roundProgress}%` }}
                />
              </div>
            </div>
          ) : null}
          {role === "host" && selectedDrawerMember ? (
            <p className="mt-3 text-sm text-white/70">
              Next drawer: <span className="font-medium text-white">{selectedDrawerMember.nickname || selectedDrawerMember.playerId}</span>
            </p>
          ) : null}
        </div>
        <Button type="button" onClick={() => router.push("/")}>
          Back to Lobby
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-black/20 p-6 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Canvas</h2>
            <div className="flex items-center gap-2">
              {role === "host" ? (
                <InviteSheet roomCode={roomCode} hostToken={hostToken}>
                  <Button type="button" variant="ghost">
                    Share room
                  </Button>
                </InviteSheet>
              ) : null}
              {role === "host" && state?.phase !== "drawing" ? (
                <Button variant="ghost" onClick={handleStartRound} disabled={startDisabled}>
                  {startButtonLabel}
                </Button>
              ) : null}
            </div>
          </div>
          {roundError && <p className="mt-2 text-sm text-rose-400">{roundError}</p>}
          <div className="mt-6">
            {canDraw ? (
              <DrawingCanvas playerId={playerId} onStroke={sendStroke} remoteStrokes={strokes} />
            ) : (
              <div className="flex h-96 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-white/40">
                {statusMessage}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/20 p-6 shadow-panel">
          <section>
            <h2 className="text-lg font-semibold">Session Details</h2>
            <dl className="mt-3 space-y-2 text-sm text-white/80">
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
          </section>

          <section className="rounded-2xl bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Content filters</h3>
            <p className="text-xs text-white/60">Keep play friendly with curated prompts and language settings.</p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Kids Mode</span>
                {role === "host" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={kidsModeEnabled ? "primary" : "ghost"}
                    onClick={() => {
                      void updateFilters({ kidsMode: !kidsModeEnabled });
                    }}
                  >
                    {kidsModeEnabled ? "On" : "Off"}
                  </Button>
                ) : (
                  <span className="text-xs text-white/50">{kidsModeEnabled ? "Enabled" : "Disabled"}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Profanity filter</span>
                {role === "host" ? (
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <Button
                        key={level}
                        type="button"
                        size="sm"
                        variant={profanityLevel === level ? "primary" : "ghost"}
                        onClick={() => {
                          void updateFilters({ profanityLevel: level });
                        }}
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-white/50">{profanityLevel}</span>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
              <span>Ready</span>
              <span>
                {readyCount}/{totalPlayers}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8f47ff] to-[#ff6fcb] transition-[width]"
                style={{ width: `${readyProgress}%` }}
              />
            </div>
            <Button
              className="mt-3 w-full"
              variant={isPlayerReady ? "ghost" : "primary"}
              onClick={() => {
                void toggleReady(!isPlayerReady);
              }}
              disabled={status !== "connected"}
            >
              {isPlayerReady ? "Ready ✔" : "Ready up"}
            </Button>
          </section>

          <PlayerRoster
            players={sortedPlayers.map((member) => ({
              id: member.playerId,
              nickname: member.nickname || member.playerId,
              role:
                member.playerId === state?.drawingPlayerId
                  ? "co-host"
                  : member.playerId === playerId
                    ? role === "host"
                      ? "host"
                      : "player"
                    : "player",
              isSpeaking: false,
              score: state?.scoreboard[member.playerId] ?? 0,
              lastSeen: member.lastSeenAt,
              connection: "good",
              isReady: state?.readyPlayers.includes(member.playerId)
            }))}
            currentUserId={playerId}
            hostActions={role === "host" ? {
              onKick: async (targetId) => {
                if (!hostToken) return;
                setRoundError(null);
                setKickingId(targetId);
                try {
                  const response = await fetch(`${env.gameServerUrl}/rooms/${roomCode}/kick`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hostToken, targetPlayerId: targetId })
                  });
                  if (!response.ok) {
                    const body = (await response.json().catch(() => null)) as { message?: string } | null;
                    throw new Error(body?.message ?? `Kick failed (${response.status})`);
                  }
                } catch (err) {
                  setRoundError((err as Error).message);
                } finally {
                  setKickingId(null);
                }
              },
              onMute: () => {},
              onPromote: () => {}
            } : undefined}
            selectedDrawerId={selectedDrawerId}
            onSelectDrawer={role === "host" ? setSelectedDrawerId : undefined}
          />

          {correctGuessers.length > 0 ? (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Correct Guessers</h3>
              <ul className="mt-2 space-y-1 text-sm text-emerald-300">
                {correctGuessers.map((entry) => (
                  <li key={entry.id}>{entry.name}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {state?.phase === "drawing" && !isDrawingPlayer ? (
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/60">Submit Guess</h3>
              <form className="mt-2 flex gap-2" onSubmit={handleSubmitGuess}>
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  placeholder="Your guess"
                  value={guess}
                  onChange={(event) => setGuess(event.target.value)}
                  disabled={status !== "connected"}
                />
                <Button type="submit" disabled={status !== "connected"}>
                  Guess
                </Button>
              </form>
              {guessFeedback && <p className="mt-2 text-sm text-white/70">{guessFeedback}</p>}
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
