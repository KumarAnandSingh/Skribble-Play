# Project Memory — Skribble Game

## Today (initialization)
- Imported requirements from `/Users/priyasingh/Downloads/AGENTS_skribble_game_v0_1.md`.
- Created monorepo shell at `/Users/priyasingh/skribble-game` with git initialized.
- Drafted top-level README capturing vision, target architecture, and immediate goals.

## Immediate Next Actions
1. Translate AGENTS doc into actionable epics and tickets (`docs/prd/` backlog).
2. Scaffold `apps/web` (Next.js), `services/game-server` (Node/TS), and `packages/drawing-engine`.
3. Establish shared tooling: ESLint/Prettier, TypeScript configs, pnpm workspace.
4. Configure GitHub Actions CI stub to align with project guidelines.

## Notes
- Keep commits scoped by workspace (web, server, packages) as structure materializes.
- Update this memory log at the end of each session with what’s done, blockers, and next steps.

## Session Notes
- Established workspace directories for apps, services, and shared packages.
- Stubbed Next.js apps (`apps/web`, `apps/control`) with placeholder pages.
- Set up service skeletons for `game-server` and `worker` with Fastify and BullMQ entrypoints.
- Added shared packages (`drawing-engine`, `ui-kit`, `shared-config`) with initial TypeScript exports.
- Captured documentation placeholders under `docs/`, `runbook/`, and `analytics-spec/`.

## Open Questions
- Choose exact SFU stack (LiveKit vs mediasoup) and update `services/media-sfu` accordingly.
- Define CI tooling (likely GitHub Actions) once repository is published.
- Validate dependency versions once npm install is available.
