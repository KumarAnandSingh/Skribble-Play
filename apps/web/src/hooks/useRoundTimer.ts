"use client";

import { useEffect, useMemo, useState } from "react";

export interface RoundTimer {
  remainingMs: number | null;
  secondsRemaining: number | null;
  isExpired: boolean;
}

export function useRoundTimer(roundEndsAt: number | null, enabled: boolean): RoundTimer {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !roundEndsAt) return undefined;

    setNow(Date.now());

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [enabled, roundEndsAt]);

  const remainingMs = useMemo(() => {
    if (!enabled || !roundEndsAt) return null;
    return Math.max(roundEndsAt - now, 0);
  }, [enabled, roundEndsAt, now]);

  return {
    remainingMs,
    secondsRemaining: remainingMs != null ? Math.ceil(remainingMs / 1000) : null,
    isExpired: enabled && roundEndsAt != null && remainingMs === 0
  };
}
