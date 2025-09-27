# Skribble Play

Skribble Play is a real-time multiplayer drawing and guessing experience designed for fast onboarding, expressive tools, and built-in voice/video social loops. This repository hosts the end-to-end platform: web clients, realtime game services, media infrastructure, analytics, and operations playbooks.

## Vision & Objectives
- **Instant fun:** players can join a private room and begin drawing in under 10 seconds.
- **Responsive canvas:** maintain \<150 ms stroke latency at p95 for five concurrent drawers.
- **Inclusive social loop:** voice/video tiles, animated reactions, and meme packs boost replay value.
- **Safe & fair play:** moderation hooks, profanity filtering, and abuse reporting guardrails at launch.

## Repository Layout (planned)
```
apps/
  web/          # Next.js player client
  control/      # Moderation & live-ops surface
services/
  game-server/  # Authoritative game state & scoring
  media-sfu/    # WebRTC SFU orchestration (TBD vendor)
  worker/       # Background jobs, notifications, analytics fan-out
packages/
  drawing-engine/ # Deterministic canvas utilities
  shared-config/  # Typed configuration shared by services
  ui-kit/         # Shared UI primitives for clients
docs/
  prd/            # Product requirements
  architecture/   # System diagrams & RFCs
  design/         # UX guidelines & component specs
  project/        # Delivery plans, RAID logs
memory/          # Running project memory & decisions
runbook/         # Operational guides
analytics-spec/  # Tracking plans & metrics definitions
```

## Quick Start
1. Install Node.js v18.18+ and npm v9+.
2. Install workspace dependencies once packages are defined:
   ```bash
   npm install
   ```
3. Launch the core experiences (after wiring scripts inside each workspace):
   ```bash
   npm run dev --workspace @skribble-play/web       # Web client
   npm run dev --workspace @skribble-play/game-server
   ```
4. Tests will run locally via Vitest, Jest, and Playwright once suites are seeded.

### Environment

1. Copy `.env.example` to `.env` at the repo root.
2. Update `POSTGRES_URL`, `REDIS_URL`, and `NEXT_PUBLIC_GAME_SERVER_URL` if your local ports differ.
3. Set `RUN_SOCKET_TESTS=true` to exercise Socket.IO integration tests on machines that allow binding to ephemeral ports.

## Testing Locally
- **Unit & integration:** `npm run test --workspace <package>` (Vitest/Jest).
- **E2E:** Playwright specs will live under `apps/web/tests` and run with `npm run test:e2e`.
- **Linting:** `npm run lint --workspace <package>` to enforce ESLint + Prettier.

## Next Steps
- Finalize requirement breakdown with functional specs in `docs/prd/PRD.md`.
- Confirm tech stack decisions and dependencies list (`docs/architecture/tech-stack.md`).
- Scaffold core workspaces (web app, game server, shared packages).
- Set up CI, linting, and testing harnesses for predictable iteration.

Refer to `docs/AGENTS.md` (to be synced from the specialist playbook) for role definitions and hand-offs. Update `memory/PROGRESS.md` at the end of each session with achievements, blockers, and next actions.
