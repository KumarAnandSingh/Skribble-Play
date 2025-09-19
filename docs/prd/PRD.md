# Skribble Game PRD (Draft)

## Problem Statement
Friends want a fast, low-friction way to doodle together and guess topics in real time. Existing options suffer from laggy drawing, clunky onboarding, or poor moderation.

## Goals & KPIs
- D1 retention ≥ 35%, D7 retention ≥ 12%.
- Room fill rate ≥ 80% (invites accepted / invites sent).
- Stroke latency p95 < 150 ms for 6 concurrent players.
- Abuse reports < 3 per 1k users/day with action time < 10 minutes.

## Target Users & JTBD
- Casual friend groups: “We need a goofy party game that works on laptops and phones without setup.”
- Streamers & communities: “I want to host drawing rounds with audience participation and easy moderation tools.”

## Scope v0 (M0)
- Anonymous and named join flows with room codes.
- Authoritative game server tracking rooms, rounds, guessing, scoring, and hints.
- Web client with responsive canvas, chat feed, and scoreboard.
- Basic moderation: kick/ban, profanity filter for guesses, rate limit spam.
- Telemetry for latency, disconnects, and abuse events.

## Scope v1+ (Beyond M0)
- Voice chat (M1) with SFU and consent prompts.
- Replays, meme reactions, emoji packs (M2).
- Mobile gesture support, teams mode, brand packs (M3+).

## Non-Goals
- Native mobile apps (PWA only initially).
- Monetization mechanics (ads, IAP) prior to retention validation.
- AI-generated drawings or guesses in v0.

## Success Metrics
- Average rounds per session ≥ 3.
- Drop rate during a round < 5%.
- Invite-to-join conversion ≥ 15%.

## Risks & Mitigations
- **Network latency:** Use regional deployments, delta compression for strokes, predictive smoothing client-side.
- **Toxic content:** Profanity filters, vote kick, escalation to moderators.
- **Operational complexity:** Containerized services with IaC, automated CI to enforce testing, observability dashboards.

## Dependencies & Open Questions
- Select SFU stack (LiveKit vs mediasoup) and hosting strategy.
- Confirm Redis + Postgres managed offerings vs self-host.
- Determine feature flag system for experiments.

_For full agent ownership and milestone plan, see `docs/AGENTS.md`._
