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
import type { PublicRoom } from "@/hooks/usePublicRooms";
import { env } from "@/lib/env";

type PermissionStatus = "idle" | "allowed" | "denied" | "unsupported" | "error";

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
  const [modeFilter, setModeFilter] = useState<string | undefined>(undefined);
  const [languageFilter, setLanguageFilter] = useState<string | undefined>(undefined);
  const { data, isLoading, isError, refetch } = usePublicRooms({ mode: modeFilter, language: languageFilter });

  const filteredRooms = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const list = data ?? [];
    return list.filter((room) => {
      const matchesKeyword = !keyword || room.name.toLowerCase().includes(keyword) || room.tags?.some((tag) => tag.toLowerCase().includes(keyword));
      const matchesMode = !modeFilter || room.mode.toLowerCase() === modeFilter.toLowerCase();
      const matchesLanguage = !languageFilter || (room.language ?? "").toLowerCase() === languageFilter.toLowerCase();
      return matchesKeyword && matchesMode && matchesLanguage;
    });
  }, [data, searchTerm, modeFilter, languageFilter]);

  const [joiningRoom, setJoiningRoom] = useState<PublicRoom | null>(null);
  const [autoMicStatus, setAutoMicStatus] = useState<PermissionStatus>("idle");

  return (
    <section className="w-full max-w-6xl rounded-4xl border border-white/10 bg-black/30 p-8 shadow-panel">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Find a Room</h2>
          <p className="text-sm text-white/60">Jump into a public lobby, invite friends, or spin up your own squad.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
          <div className="w-full sm:w-48">
            <Label htmlFor="room-search">Search rooms</Label>
            <Input
              id="room-search"
              placeholder="Mystic Doodles…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div>
              <Label htmlFor="mode-filter">Mode</Label>
              <Input
                id="mode-filter"
                placeholder="quick-play"
                value={modeFilter ?? ""}
                onChange={(event) => setModeFilter(event.target.value || undefined)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lang-filter">Language</Label>
              <Input
                id="lang-filter"
                placeholder="English"
                value={languageFilter ?? ""}
                onChange={(event) => setLanguageFilter(event.target.value || undefined)}
                className="mt-1"
              />
            </div>
          </div>
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
                      tags={room.tags}
                      friendsOnline={room.friendsOnline}
                      invitesPending={room.invitesPending}
                      onJoin={() => {
                        setJoiningRoom(room);
                        setAutoMicStatus("idle");
                      }}
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
          <FriendsTab />
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

      <JoinRoomDialog
        room={joiningRoom}
        status={autoMicStatus}
        onStatusChange={setAutoMicStatus}
        onClose={() => {
          setJoiningRoom(null);
        }}
        onJoinSuccess={(path) => {
          setJoiningRoom(null);
          router.push(path as Route);
        }}
      />
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

function FriendsTab() {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/80">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Squads & invites</h3>
          <p className="text-xs text-white/60">Manage ongoing private rooms, invites, and quick hop-ins.</p>
        </div>
        <Button variant="ghost">Create friend list</Button>
      </div>

      <div className="rounded-2xl border border-dashed border-white/20 p-6 text-sm text-white/70">
        <p>No friend rooms yet. Share your invite link or import contacts to squad up instantly.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="primary">Invite friends</Button>
          <Button variant="ghost">Import from contacts</Button>
          <Button variant="ghost">Generate deep link</Button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-white/60">Pending invites</h4>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          <p>Invites will appear here once friends send them. Accept to jump straight into their lobby.</p>
        </div>
      </div>
    </div>
  );
}

interface JoinRoomDialogProps {
  room: PublicRoom | null;
  status: PermissionStatus;
  onStatusChange: (status: PermissionStatus) => void;
  onClose: () => void;
  onJoinSuccess: (path: string) => void;
}

function JoinRoomDialog({ room, status, onStatusChange, onClose, onJoinSuccess }: JoinRoomDialogProps) {
  const [nickname, setNickname] = useState("Guest Player");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const requestMedia = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      onStatusChange("unsupported");
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      onStatusChange("allowed");
    } catch (error) {
      console.error("media permission error", error);
      onStatusChange((error as DOMException).name === "NotAllowedError" ? "denied" : "error");
    }
  };

  const handleJoin = async () => {
    if (!room) return;
    setJoinError(null);
    setIsJoining(true);
    try {
      const response = await fetch(`${env.gameServerUrl}/rooms/${room.roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message ?? `Join failed (${response.status})`);
      }
      const body = (await response.json()) as {
        playerId: string;
        playerToken: string;
        roomCode: string;
        state: unknown;
        strokes: unknown[];
      };
      const path = `/play/${body.roomCode}?playerId=${body.playerId}&token=${encodeURIComponent(
        body.playerToken
      )}&role=player&nickname=${encodeURIComponent(nickname)}`;
      onJoinSuccess(path);
    } catch (error) {
      setJoinError((error as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  if (!room) return null;

  return (
    <Dialog open onOpenChange={(open) => {!open && onClose();}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join {room.name}</DialogTitle>
          <DialogDescription>
            Enable mic & camera so your squad can hear the hype. You can change permissions anytime from the toolbar.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4 text-sm text-white/80">
          <div>
            <Label htmlFor="join-nickname">Your nickname</Label>
            <Input
              id="join-nickname"
              className="mt-1"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-wide text-white/50">Voice & video</p>
            <p className="mt-1 text-white/70">Automatically connect your mic (and video if available) when the round starts.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" variant="primary" onClick={requestMedia}>
                Allow mic &amp; camera
              </Button>
              <span className="text-xs text-white/60">
                Status: {status === "idle" ? "Not requested" : status === "allowed" ? "Ready" : status === "denied" ? "Denied" : status === "unsupported" ? "Unsupported" : "Error"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={handleJoin} isLoading={isJoining} disabled={isJoining}>
              Join room
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
          {joinError ? <p className="text-sm text-rose-300">{joinError}</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
