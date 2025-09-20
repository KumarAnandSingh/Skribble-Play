import { useQuery } from "@tanstack/react-query";
import { env } from "@/lib/env";

export interface PublicRoom {
  roomId: string;
  name: string;
  players: number;
  maxPlayers: number;
  mode: string;
  status: "open" | "in-progress" | "locked";
  language?: string;
  roundLength?: number;
  tags?: string[];
  friendsOnline?: number;
  invitesPending?: number;
}

const fallbackRooms: PublicRoom[] = [
  {
    roomId: "mystic",
    name: "Mystic Doodles",
    mode: "Quick Play",
    players: 6,
    maxPlayers: 8,
    status: "open",
    language: "English",
    roundLength: 90
  },
  {
    roomId: "speedrun",
    name: "Speedrun Sketchers",
    mode: "Party Pack",
    players: 8,
    maxPlayers: 8,
    status: "in-progress",
    language: "English",
    roundLength: 60
  },
  {
    roomId: "gallery",
    name: "Gallery Night",
    mode: "Private",
    players: 4,
    maxPlayers: 10,
    status: "locked",
    language: "Spanish",
    roundLength: 120
  }
];

async function fetchPublicRooms(signal?: AbortSignal): Promise<PublicRoom[]> {
  try {
    const url = new URL(`${env.gameServerUrl}/rooms`);
    url.searchParams.set("public", "true");
    const response = await fetch(url.toString(), { signal });
    if (!response.ok) {
      throw new Error(`Rooms fetch failed (${response.status})`);
    }
    const data = (await response.json()) as PublicRoom[];
    if (!Array.isArray(data) || data.length === 0) {
      return fallbackRooms;
    }
    return data;
  } catch (error) {
    console.warn("rooms fetch failed", error);
    return fallbackRooms;
  }
}

export function usePublicRooms(filters?: { mode?: string; language?: string }) {
  return useQuery({
    queryKey: ["publicRooms", filters],
    queryFn: ({ signal }) => fetchPublicRooms(signal),
    staleTime: 30_000
  });
}
