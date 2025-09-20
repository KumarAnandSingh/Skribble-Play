import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export interface PlayerRosterEntry {
  id: string;
  nickname: string;
  role: "host" | "co-host" | "player" | "spectator";
  isSpeaking?: boolean;
  micMuted?: boolean;
  camOff?: boolean;
  connection?: "excellent" | "good" | "poor";
  lastSeen?: number;
  score?: number;
  isReady?: boolean;
}

interface PlayerRosterProps {
  players: PlayerRosterEntry[];
  currentUserId: string;
  hostActions?: {
    onPromote?: (playerId: string) => void;
    onKick?: (playerId: string) => void;
    onMute?: (playerId: string) => void;
  };
  selectedDrawerId?: string | null;
  onSelectDrawer?: (playerId: string) => void;
}

const roleLabel: Record<PlayerRosterEntry["role"], string> = {
  host: "Host",
  "co-host": "Co-host",
  player: "Player",
  spectator: "Spectator"
};

const connectionColor: Record<NonNullable<PlayerRosterEntry["connection"]>, string> = {
  excellent: "text-emerald-300",
  good: "text-amber-300",
  poor: "text-rose-300"
};

export function PlayerRoster({
  players,
  currentUserId,
  hostActions,
  selectedDrawerId,
  onSelectDrawer
}: PlayerRosterProps) {
  return (
    <Card className="flex flex-col gap-3 bg-black/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Players ({players.length})</h3>
        {hostActions ? (
          <span className="text-xs uppercase tracking-wide text-white/50">Host controls</span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3">
        {players.map((player) => {
          const isCurrent = player.id === currentUserId;
          const isSelectedDrawer = player.id === selectedDrawerId;

          return (
            <li
              key={player.id}
              className={cn(
                "flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2",
                isSelectedDrawer ? "border-[#8f47ff]/70 bg-[#8f47ff]/10" : undefined
              )}
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-full bg-gradient-to-br from-[#8f47ff] to-[#ff6fcb]" />
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span>{player.nickname || player.id}</span>
                    {isCurrent ? <Badge variant="outline">You</Badge> : null}
                    {player.isSpeaking ? <Badge variant="success">Speaking</Badge> : null}
                    {player.isReady ? <Badge variant="success">Ready</Badge> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                    <span>{roleLabel[player.role]}</span>
                    {player.connection ? (
                      <span className={connectionColor[player.connection]}>
                        {player.connection === "poor" ? "Unstable" : player.connection === "good" ? "Good" : "Excellent"}
                      </span>
                    ) : null}
                    {player.lastSeen ? <span>Last seen {new Date(player.lastSeen).toLocaleTimeString()}</span> : null}
                    {player.score != null ? <span>Score {player.score}</span> : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {onSelectDrawer ? (
                  <Button
                    size="sm"
                    variant={isSelectedDrawer ? "primary" : "ghost"}
                    onClick={() => onSelectDrawer(player.id)}
                    disabled={isSelectedDrawer}
                  >
                    {isSelectedDrawer ? "Drawing" : "Draw"}
                  </Button>
                ) : null}
                {hostActions && !isCurrent ? (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => hostActions.onPromote?.(player.id)}>
                      Promote
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => hostActions.onMute?.(player.id)}>
                      {player.micMuted ? "Unmute" : "Mute"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => hostActions.onKick?.(player.id)}>
                      Kick
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
