import React from "react";
import Link from "next/link";
import { Button } from "@skribble-play/ui-kit";
import { HealthStatus } from "@/components/HealthStatus";
import { LobbyActions } from "@/components/LobbyActions";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[color:var(--color-background)] px-6 py-16 text-[color:var(--color-text)]">
      <section className="w-full max-w-2xl rounded-3xl bg-[color:var(--color-surface)] p-10 shadow-panel">
        <div className="flex flex-col items-center gap-6">
          <HealthStatus />
          <div>
            <h1 className="text-center text-4xl font-bold md:text-5xl">Skribble Play</h1>
            <p className="mt-4 text-center text-lg leading-relaxed text-white/80">
              Real-time drawing battles with audio chat, smart moderation, and meme-worthy replays.
              The core experience is under active development—follow along or jump into the first
              prototype when it lands.
            </p>
          </div>
          <div className="mt-4 flex w-full flex-col items-center gap-4 md:flex-row md:justify-center">
            <Link href="/playtest" className="w-full md:w-auto">
              <Button className="w-full md:w-auto">Join the Playtest Waitlist</Button>
            </Link>
            <Link href="/roadmap" className="w-full md:w-auto">
              <Button variant="ghost" className="w-full md:w-auto">
                View the Roadmap
              </Button>
            </Link>
          </div>
        </div>
      </section>
      <LobbyActions />
      <footer className="text-center text-sm text-white/60">
        <p>Milestone M0 in progress — track progress in the project memory log.</p>
      </footer>
    </main>
  );
}
