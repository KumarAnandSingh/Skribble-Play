import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { HealthStatus } from "@/components/HealthStatus";
import { LobbyHub } from "@/components/lobby/LobbyHub";
import { Button } from "@/components/ui/button";

const playtestRoute = "/playtest" as Route;
const roadmapRoute = "/roadmap" as Route;

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-12 px-6 py-16">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.2fr_1fr]">
        <section className="flex flex-col justify-center gap-6 rounded-4xl border border-white/10 bg-[color:var(--color-surface)] p-10 shadow-panel">
          <HealthStatus />
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/60">
              Real-time party game • Voice + Canvas
            </p>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Squad up for fast, meme-worthy drawing battles.
            </h1>
            <p className="text-base text-white/70 md:text-lg">
              Get from tap to canvas in under 30 seconds. Voice, video, reactions, and safety tools are built in so every round feels like a highlight reel.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href={playtestRoute} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Join the Playtest Waitlist</Button>
            </Link>
            <Link href={roadmapRoute} className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto">
                View the Roadmap
              </Button>
            </Link>
          </div>
        </section>
        <aside className="flex flex-col justify-between gap-6 rounded-4xl border border-dashed border-white/15 bg-black/20 p-8 text-sm text-white/70">
          <div>
            <h2 className="text-lg font-semibold text-white">North-star metrics</h2>
            <ul className="mt-3 space-y-2 text-white/60">
              <li>D1 retention • Avg session length • Games per session</li>
              <li>Invites sent • Share CTR • Voice/Video opt-in %</li>
              <li>Toxicity reports &lt; 0.5%</li>
            </ul>
          </div>
          <div className="rounded-3xl bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white">Safety-first fun</h3>
            <p className="mt-2 text-xs text-white/60">
              Default content filters, push-to-talk fallback, two-tap mute/report, and Kids Mode with curated prompts keep every lobby welcoming.
            </p>
          </div>
        </aside>
      </div>

      <LobbyHub />

      <footer className="text-center text-sm text-white/60">
        Milestone M0 in progress — track progress in the project memory log.
      </footer>
    </main>
  );
}
