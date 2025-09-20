"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface InviteSheetProps {
  roomCode: string;
  hostToken?: string;
  children: React.ReactElement;
}

export function InviteSheet({ roomCode, hostToken, children }: InviteSheetProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState<string>("https://skribble.play");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("code", roomCode);
    if (hostToken) params.set("hostToken", hostToken);
    return `${origin}/?${params.toString()}`;
  }, [roomCode, hostToken, origin]);

  const inRoomLink = useMemo(() => `${origin}/play/${roomCode}`, [origin, roomCode]);

  const handleCopy = async (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("copy failed", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite friends to room {roomCode}</DialogTitle>
          <DialogDescription>
            Share the lobby link or send the instant join URL. Friends will land in this room with their mic enabled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-white/80">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Instant join link</p>
            <p className="text-xs text-white/60">Opens the game directly with voice/video prompts.</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={inRoomLink} className="bg-white/5" />
              <Button type="button" variant="ghost" onClick={() => handleCopy(inRoomLink)}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Lobby invite link</p>
            <p className="text-xs text-white/60">Sends friends to the lobby with this room highlighted.</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={shareUrl} className="bg-white/5" />
              <Button type="button" variant="ghost" onClick={() => handleCopy(shareUrl)}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const text = `Join my Skribble Play room ${roomCode}! ${inRoomLink}`;
                const mailto = `mailto:?subject=Skribble%20Play%20Invite&body=${encodeURIComponent(text)}`;
                window.open(mailto, "_blank");
              }}
            >
              Email invite
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const text = encodeURIComponent(`Join my Skribble Play room ${roomCode}! ${inRoomLink}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
            >
              Share on WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
