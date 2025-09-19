# Skribble Game

Real-time multiplayer drawing and guessing game inspired by Skribbl, featuring low-latency collaborative drawing, integrated voice/video chat, and moderation tooling.

## Vision
- Fast onboarding: friends can join and start sketching in under 10 seconds.
- Low latency: maintain <150 ms stroke latency at p95 across five to six concurrent players.
- Social loops: built-in audio/video, reactions, and meme sharing to encourage replays.

## Monorepo Layout (planned)
```
apps/
  web/          # Next.js client for players
  control/      # Admin & moderation surface
  docs/         # Playtest builds, design system previews
services/
  game-server/  # Authoritative room + scoring service
  media-sfu/    # WebRTC SFU configs, TURN integration
  worker/       # Async jobs, notifications
packages/
  drawing-engine/
  ui-kit/
  shared-config/
runbook/
analytics-spec/
``` 

## Phase 0 Goals (M0: Core Game)
1. Authoritative room management, stroke fan-out, scoring, and hints.
2. Deterministic drawing engine with replay support and 30+ FPS rendering.
3. DevOps baseline: containerized services, CI pipeline, staging environment.

## Next Steps
- Draft PRD + launch plan based on `/Users/priyasingh/Downloads/AGENTS_skribble_game_v0_1.md`.
- Stand up workspace scaffolding for web client, game server, and drawing engine.
- Configure continuous integration, linting, and testing harnesses.
- Implement first playable room with anonymous join and timed guessing rounds.

Refer to `memory/PROGRESS.md` for day-to-day context and open threads, see `docs/AGENTS.md` for the summarized agent roster, and consult the full playbook at `AGENTS.md` when coordinating cross-team work.
