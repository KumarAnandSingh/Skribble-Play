# Project Memory — Skribble Game

## Today (initialization)
- Imported requirements from `/Users/priyasingh/Downloads/AGENTS_skribble_game_v0_1.md`.
- Created monorepo shell at `/Users/priyasingh/skribble-game` with git initialized.
- Drafted top-level README capturing vision, target architecture, and immediate goals.

## Immediate Next Actions
1. Wire the web client to the game server health endpoint and add local env configs.
2. Stand up initial automated tests (Vitest unit for drawing engine, integration smoke for game server).
3. Engage the UI/UX specialist agent to translate PRD flows into wireframes ahead of client development.
4. Decide on SFU vendor (LiveKit vs mediasoup) and outline infra requirements in `services/media-sfu`.
5. Run `npm install` locally to generate the root lockfile and validate workspace commands.

## Notes
- Keep commits scoped by workspace (web, server, packages) as structure materializes.
- Update this memory log at the end of each session with what’s done, blockers, and next steps.
- Leverage the UI/UX and delivery specialist agents outlined in `AGENTS.md` before major design or planning pushes.

## Session Notes
- Established workspace directories for apps, services, and shared packages.
- Stubbed Next.js apps (`apps/web`, `apps/control`) with placeholder pages.
- Set up service skeletons for `game-server` and `worker` with Fastify and BullMQ entrypoints.
- Added shared packages (`drawing-engine`, `ui-kit`, `shared-config`) with initial TypeScript exports.
- Captured documentation placeholders under `docs/`, `runbook/`, and `analytics-spec/`.
- Authored `docs/prd/PRD.md` and `docs/AGENTS.md` to ground milestones and agent ownership.
- Added ESLint configurations across services/packages and seeded GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- Checked in the full specialist playbook (`AGENTS.md`) at the repository root for quick reference.

## Open Questions
- Choose exact SFU stack (LiveKit vs mediasoup) and update `services/media-sfu` accordingly.
- Confirm lint/test command coverage once dependencies are installed (watch for Next.js version compatibility).
- Do we need shared proto/contracts between client and server for stroke events vs REST + socket payloads?
