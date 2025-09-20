import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReactNode } from "react";

export interface RoomCardProps {
  title?: string;
  name?: string;
  mode: string;
  players: number;
  maxPlayers: number;
  status: "open" | "in-progress" | "locked";
  language?: string;
  roundLength?: number;
  children?: ReactNode;
  onJoin?: () => void;
  onSpectate?: () => void;
}

const statusCopy: Record<RoomCardProps["status"], { label: string; variant: "default" | "warning" }> = {
  open: { label: "Open", variant: "default" },
  "in-progress": { label: "In Progress", variant: "warning" },
  locked: { label: "Locked", variant: "warning" }
};

export function RoomCard({
  title,
  mode,
  players,
  maxPlayers,
  status,
  language,
  roundLength,
  onJoin,
  onSpectate,
  children
}: RoomCardProps) {
  const statusMeta = statusCopy[status];
  const displayTitle = title ?? name ?? "Untitled Room";

  return (
    <Card className="flex h-full flex-col gap-4 p-6">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>{displayTitle}</CardTitle>
          <Badge variant={statusMeta.variant === "warning" ? "warning" : "default"}>{statusMeta.label}</Badge>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/50">
          <span>{mode}</span>
          {language ? <span>• {language}</span> : null}
          {roundLength ? <span>• {roundLength}s</span> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="text-sm text-white/70">
          <p>
            Players: <span className="font-semibold text-white">{players}</span> / {maxPlayers}
          </p>
          {children}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={onJoin} disabled={status === "locked"}>
            Join &amp; Auto-Mic
          </Button>
          <Button size="sm" variant="ghost" onClick={onSpectate}>
            Spectate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
