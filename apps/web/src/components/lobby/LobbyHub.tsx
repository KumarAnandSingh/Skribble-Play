"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomCard } from "./RoomCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePublicRooms } from "@/hooks/usePublicRooms";
import { env } from "@/lib/env";

const createRoomSchema = z.object({
  roomName: z.string().min(3, "Room name must be at least 3 characters"),
  hostNickname: z.string().min(2, "Nickname required").max(32),
  maxPlayers: z.number().min(2).max(12),
  mode: z.string().min(3),
  privacy: z.enum(["public", "private", "kids"])
});

type CreateRoomValues = z.infer<typeof createRoomSchema>;

type FieldErrors = Partial<Record<keyof CreateRoomValues, string>>;

export function LobbyHub() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, isError, refetch } = usePublicRooms();

  const filteredRooms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!data) return [];
    if (!keyword) return data;
    return data.filter((room) => room.name.toLowerCase().includes(keyword));
  }, [data, searchTerm]);

  return (
    <section className="w-full max-w-6xl rounded-4xl border border-white/10 bg-black/30 p-8 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Find a Room</h2>
          <p className="text-sm text-white/60">Jump into a public lobby, invite friends, or spin up your own squad.</p>
        </div>
        <div className="w-full max-w-xs">
          <Label htmlFor="room-search">Search rooms</Label>
          <Input
            id="room-search"
            placeholder="Mystic Doodles…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <Tabs defaultValue="public" className="mt-8">
        <TabsList>
          <TabsTrigger value="public">Public Rooms</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="create">Create Room</TabsTrigger>
        </TabsList>

        <TabsContent value="public">
          {isError ? (
            <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
              <p>Unable to load rooms right now. Try refreshing.</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-48 animate-pulse rounded-3xl border border-white/10 bg-white/5 p-6 shadow-panel"
                    />
                  ))
                : filteredRooms.map((room) => (
                    <RoomCard
                      key={room.roomId}
                      name={room.name}
                      mode={room.mode}
                      players={room.players}
                      maxPlayers={room.maxPlayers}
                      status={room.status}
                      language={room.language}
                      roundLength={room.roundLength}
                    />
                  ))}
              {!isLoading && filteredRooms.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-dashed border-white/20 p-10 text-center text-sm text-white/60">
                  No rooms match your search just yet. Try a different mode or create your own!
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            <p>Friends rooms will appear here once you add people. Share your invite link to squad up.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="ghost">Invite friends</Button>
              <Button variant="ghost">Import from contacts</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="create">
          <CreateRoomSheet
            onCreated={(roomCode, hostPlayerId, hostToken, playerToken, nickname) => {
              const url = `/play/${roomCode}?playerId=${hostPlayerId}&token=${encodeURIComponent(
                playerToken
              )}&hostToken=${encodeURIComponent(hostToken)}&role=host&nickname=${encodeURIComponent(nickname)}` as Route;
              router.push(url);
            }}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}

interface CreateRoomSheetProps {
  onCreated: (roomCode: string, hostPlayerId: string, hostToken: string, playerToken: string, nickname: string) => void;
}

function CreateRoomSheet({ onCreated }: CreateRoomSheetProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateRoomValues>({
    roomName: "Skribble Squad",
    hostNickname: "Host Player",
    maxPlayers: 8,
    mode: "quick-play",
    privacy: "public"
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const mutation = useMutation<
    { roomCode: string; hostToken: string; hostPlayer: { id: string; token: string; nickname: string } },
    Error,
    CreateRoomValues
  >({
    mutationFn: async (values) => {
      const response = await fetch(`${env.gameServerUrl}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostNickname: values.hostNickname })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Create failed (${response.status})`);
      }
      return (await response.json()) as {
        roomCode: string;
        hostToken: string;
        hostPlayer: { id: string; token: string; nickname: string };
      };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["publicRooms"] });
      onCreated(data.roomCode, data.hostPlayer.id, data.hostToken, data.hostPlayer.token, data.hostPlayer.nickname);
    }
  });

  const handleChange = <K extends keyof CreateRoomValues>(key: K, value: CreateRoomValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmissionError(null);
    const result = createRoomSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      result.error.errors.forEach((issue) => {
        const key = issue.path[0] as keyof CreateRoomValues;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await mutation.mutateAsync(result.data);
    } catch (error) {
      setSubmissionError((error as Error).message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="room-name">Room name</Label>
          <Input
            id="room-name"
            className="mt-1"
            value={form.roomName}
            onChange={(event) => handleChange("roomName", event.target.value)}
          />
          {errors.roomName ? <p className="mt-1 text-xs text-rose-300">{errors.roomName}</p> : null}
        </div>
        <div>
          <Label htmlFor="host-nickname">Host nickname</Label>
          <Input
            id="host-nickname"
            className="mt-1"
            value={form.hostNickname}
            onChange={(event) => handleChange("hostNickname", event.target.value)}
          />
          {errors.hostNickname ? <p className="mt-1 text-xs text-rose-300">{errors.hostNickname}</p> : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="max-players">Max players</Label>
          <Input
            id="max-players"
            type="number"
            min={2}
            max={12}
            className="mt-1"
            value={form.maxPlayers}
            onChange={(event) => handleChange("maxPlayers", Number(event.target.value))}
          />
          {errors.maxPlayers ? <p className="mt-1 text-xs text-rose-300">{errors.maxPlayers}</p> : null}
        </div>
        <div>
          <Label htmlFor="mode">Mode</Label>
          <Input
            id="mode"
            className="mt-1"
            value={form.mode}
            onChange={(event) => handleChange("mode", event.target.value)}
            placeholder="quick-play | party-pack | kids"
          />
          {errors.mode ? <p className="mt-1 text-xs text-rose-300">{errors.mode}</p> : null}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Privacy</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={form.privacy === "public" ? "primary" : "ghost"}
            onClick={() => handleChange("privacy", "public")}
          >
            Public
          </Button>
          <Button
            type="button"
            size="sm"
            variant={form.privacy === "private" ? "primary" : "ghost"}
            onClick={() => handleChange("privacy", "private")}
          >
            Private
          </Button>
          <Button
            type="button"
            size="sm"
            variant={form.privacy === "kids" ? "primary" : "ghost"}
            onClick={() => handleChange("privacy", "kids")}
          >
            Kids Mode
          </Button>
        </div>
        {errors.privacy ? <p className="text-xs text-rose-300">{errors.privacy}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={mutation.isPending} disabled={mutation.isPending}>
          Create room
        </Button>
        <Dialog>
          <DialogTrigger>
            <Button type="button" variant="ghost">
              Advanced settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Advanced settings (coming soon)</DialogTitle>
              <DialogDescription>
                Pick curated prompt packs, set profanity filters, or add co-hosts. We&apos;ll wire this up once the backend endpoints land.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
      {submissionError ? <p className="text-sm text-rose-300">{submissionError}</p> : null}
    </form>
  );
}
