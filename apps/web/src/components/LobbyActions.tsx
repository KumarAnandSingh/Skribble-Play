"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@skribble-play/ui-kit";
import { env } from "@/lib/env";

interface CreateRoomSuccess {
  roomCode: string;
  hostToken: string;
  hostPlayer: {
    id: string;
    nickname: string;
    joinedAt: string;
    token: string;
  };
}

interface JoinRoomSuccess {
  roomCode: string;
  playerId: string;
  playerToken: string;
}

interface RequestState<T> {
  status: "idle" | "loading" | "success" | "error";
  data?: T;
  error?: string;
}

const initialCreateState: RequestState<CreateRoomSuccess> = { status: "idle" };
const initialJoinState: RequestState<JoinRoomSuccess> = { status: "idle" };

export function LobbyActions() {
  const router = useRouter();
  const [hostNickname, setHostNickname] = useState("Host Player");
  const [joinNickname, setJoinNickname] = useState("Guest Player");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [createState, setCreateState] = useState(initialCreateState);
  const [joinState, setJoinState] = useState(initialJoinState);

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateState({ status: "loading" });

    try {
      const response = await fetch(`${env.gameServerUrl}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostNickname })
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? `Create failed with status ${response.status}`);
      }

      const body = (await response.json()) as CreateRoomSuccess;
      setCreateState({ status: "success", data: body });
      setJoinRoomCode(body.roomCode);
      router.push(
        `/play/${body.roomCode}?playerId=${body.hostPlayer.id}&token=${encodeURIComponent(body.hostPlayer.token)}&hostToken=${encodeURIComponent(
          body.hostToken
        )}&role=host&nickname=${encodeURIComponent(body.hostPlayer.nickname)}`
      );
    } catch (error) {
      setCreateState({ status: "error", error: (error as Error).message });
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinState({ status: "loading" });

    const code = joinRoomCode.trim().toUpperCase();
    if (!code) {
      setJoinState({ status: "error", error: "Enter a room code" });
      return;
    }

    try {
      const response = await fetch(`${env.gameServerUrl}/rooms/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: joinNickname })
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorBody?.message ?? `Join failed with status ${response.status}`);
      }

      const body = (await response.json()) as JoinRoomSuccess;
      setJoinState({ status: "success", data: body });
      router.push(
        `/play/${body.roomCode}?playerId=${body.playerId}&token=${encodeURIComponent(body.playerToken)}&role=player&nickname=${encodeURIComponent(
          joinNickname
        )}`
      );
    } catch (error) {
      setJoinState({ status: "error", error: (error as Error).message });
    }
  }

  return (
    <section className="w-full max-w-2xl rounded-3xl bg-[color:var(--color-surface)] p-10 shadow-panel">
      <h2 className="text-center text-2xl font-semibold">Create or Join a Room</h2>
      <p className="mt-2 text-center text-sm text-white/70">
        Use the forms below to spin up a playtest lobby or hop into an existing session.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <form className="flex flex-col gap-3" onSubmit={handleCreateRoom}>
          <h3 className="text-lg font-semibold">Create a Room</h3>
          <label className="text-sm text-white/70" htmlFor="host-nickname">
            Host nickname
          </label>
          <input
            id="host-nickname"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            value={hostNickname}
            onChange={(event) => setHostNickname(event.target.value)}
            required
          />
          <Button type="submit" disabled={createState.status === "loading"}>
            {createState.status === "loading" ? "Creating..." : "Create Room"}
          </Button>
          {createState.status === "success" && createState.data && (
            <div className="rounded-lg bg-white/10 p-3 text-sm">
              <p>
                <span className="font-medium">Code:</span> {createState.data.roomCode}
              </p>
              <p className="mt-1 break-all text-white/70">
                <span className="font-medium text-white/80">Host token:</span> {createState.data.hostToken}
              </p>
              <p className="mt-1 break-all text-white/70">
                <span className="font-medium text-white/80">Host player token:</span> {createState.data.hostPlayer.token}
              </p>
              <p className="mt-1 text-white/70">
                Share this code with friends and keep the host token safe for moderation actions.
              </p>
            </div>
          )}
          {createState.status === "error" && (
            <p className="text-sm text-rose-400">{createState.error}</p>
          )}
        </form>

        <form className="flex flex-col gap-3" onSubmit={handleJoinRoom}>
          <h3 className="text-lg font-semibold">Join a Room</h3>
          <label className="text-sm text-white/70" htmlFor="room-code">
            Room code
          </label>
          <input
            id="room-code"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            value={joinRoomCode}
            onChange={(event) => setJoinRoomCode(event.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <label className="text-sm text-white/70" htmlFor="join-nickname">
            Your nickname
          </label>
          <input
            id="join-nickname"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
            value={joinNickname}
            onChange={(event) => setJoinNickname(event.target.value)}
            required
          />
          <Button type="submit" disabled={joinState.status === "loading"}>
            {joinState.status === "loading" ? "Joining..." : "Join Room"}
          </Button>
          {joinState.status === "success" && joinState.data && (
            <div className="rounded-lg bg-white/10 p-3 text-sm">
              <p>
                Joined room <span className="font-medium">{joinState.data.roomCode}</span>
              </p>
              <p className="text-white/70">Player ID: {joinState.data.playerId}</p>
              <p className="mt-1 break-all text-white/70">
                <span className="font-medium text-white/80">Player token:</span> {joinState.data.playerToken}
              </p>
            </div>
          )}
          {joinState.status === "error" && (
            <p className="text-sm text-rose-400">{joinState.error}</p>
          )}
        </form>
      </div>
    </section>
  );
}
