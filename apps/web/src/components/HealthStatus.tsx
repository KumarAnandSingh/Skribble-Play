"use client";

import React, { useEffect, useState } from "react";
import { env } from "@/lib/env";

type HealthState = "checking" | "online" | "offline";

interface HealthResult {
  status: HealthState;
  message: string;
}

const initialState: HealthResult = {
  status: "checking",
  message: "Checking game server health..."
};

export function HealthStatus() {
  const [health, setHealth] = useState<HealthResult>(initialState);

  useEffect(() => {
    const controller = new AbortController();

    async function checkHealth() {
      try {
        const response = await fetch(`${env.gameServerUrl}/health`, {
          signal: controller.signal,
          headers: {
            accept: "application/json"
          }
        });

        if (!response.ok) {
          throw new Error(`Health check responded with ${response.status}`);
        }

        const body = (await response.json()) as { status?: string };
        const healthy = body.status === "ok";

        setHealth({
          status: healthy ? "online" : "offline",
          message: healthy ? "Game server online" : "Game server reported an issue"
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setHealth({
          status: "offline",
          message: "Game server unreachable from the client"
        });
      }
    }

    void checkHealth();

    const timeoutId = setTimeout(() => controller.abort(), 5000);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/80"
      data-status={health.status}
    >
      {health.message}
    </div>
  );
}
