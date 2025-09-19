# Delivery Roadmap (Draft)

## Milestone M0 — Core Game (Weeks 1-4)
- Web client MVP (join, lobby, drawing, guessing UI).
- Game server with scoring, hints, moderation primitives.
- Audio via selected SFU (audio-only).
- Automated tests: unit (canvas, server), integration (round flow), smoke E2E.
- Observability baseline: structured logs, health checks, SLA monitors.

## Milestone M1 — Voice + Moderation Enhancement (Weeks 5-7)
- Advanced moderation (report flows, mute/votekick, profanity enhancements).
- Reliability improvements (reconnect handling, persistence, queue-backed retries).
- Analytics instrumentation + dashboard MVP.

## Milestone M2 — Video & Social Loops (Weeks 8-10)
- Video tiles, reaction animations, meme pack support.
- Social features (friends list, invites, notifications).
- Experimentation hooks (feature flags, A/B infra).

## Milestone M3 — Teams & Monetization Prep (Weeks 11-13)
- Team-based rounds, seasonal word packs.
- PWA polish, offline scaffolding, mobile gesture tuning.
- Monetization experiments (cosmetics, premium rooms) — discovery phase.

## Cross-Cutting Initiatives
- Security & privacy review before each milestone exit.
- QA automation coverage targets: unit ≥ 80%, E2E critical flows.
- DevOps improvements (CI pipelines, staging env, release automation).

## RAID Log (snapshot)
- **Risks:** SFU vendor decision delays; canvas performance under load.
- **Assumptions:** 4 FTE equivalent capacity across agents; Postgres/Redis available locally.
- **Issues:** None yet.
- **Dependencies:** Voice stack vendor, analytics provider, moderation policy sign-off.
