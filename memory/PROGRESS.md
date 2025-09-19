# Project Memory — Skribble Play

## Session: Initialization
- Created project workspace at `/Users/priyasingh/Skribble Play` with monorepo structure.
- Authored root README, .gitignore, and npm workspace configuration.
- Documented agent roster, PRD draft, architecture overview, and tech stack/dependency breakdown.

## Immediate Next Actions
1. Scaffold core applications/services (Next.js web app, Fastify game server, shared packages).
2. Define environment variables across workspaces and add `.env.example` files.
3. Install dependencies (`npm install`) and validate workspace scripts.
4. Draft initial API & WebSocket contracts and database schema.
5. Outline local dev tooling (docker-compose for Postgres/Redis, LiveKit sandbox notes).

## Notes
- Pending decisions on SFU vendor and ORM; track in architecture open questions.
- Ensure test strategy (Vitest, Playwright) is reflected in per-workspace package.json files once created.

## Open Questions
- Do we prioritize LiveKit (managed) or mediasoup (self-hosted) for M0 voice support?
- Which analytics provider fits privacy + cost constraints for early stages?
- Are we targeting mobile-first PWA experience or desktop-first with responsive breakpoints?

## Session: Health wiring & API scaffolding
- Attempted to start local docker compose; host lacks Docker CLI (`docker: command not found`).
- Added web client health badge powered by `NEXT_PUBLIC_GAME_SERVER_URL` env and health fetcher (`apps/web/src/components/HealthStatus.tsx`).
- Introduced `.env.example` for the web client and shared env helper.
- Expanded game server with in-memory room endpoints (`POST /rooms`, `GET /rooms/:code`, join/leave) and accompanying Vitest coverage.
- Documented API contract stubs (`docs/architecture/contracts.md`) and `docker-compose.yml` for Postgres/Redis/LiveKit.

## Next Actions
1. Install Docker Desktop (or CLI) locally to validate `docker compose` stack.
2. Persist room state to Postgres/Redis instead of in-memory map.
3. Hook web client lobby UI to the new room endpoints and display join flow.
4. Add socket integration tests to ensure join/leave broadcast alignment with HTTP APIs.

## Session: Infra bring-up & persistence
- Started local Postgres/Redis/LiveKit via Docker (`docker-compose up`) with Postgres exposed on `55432`.
- Replaced in-memory room storage with persistent Postgres + Redis `RoomStore`, shared across HTTP and WebSocket flows, and added schema bootstrap/cleanup helpers.
- Built lobby forms in the web client that hit `/rooms` and `/rooms/:code/join`, driven by `NEXT_PUBLIC_GAME_SERVER_URL`.
- Added socket-level integration test to verify join broadcasts and database persistence, plus Vitest config tweaks for deterministic runs.
- Documented new API contracts, Docker usage, and local env port changes.

## Follow-ups
1. Wire Redis-based presence/events into worker service for fan-out.
2. Implement authentication tokens (host vs player) and enforce during join/kick actions.
3. Extend web lobby experience with error states and room hand-off to gameplay canvas.
4. Evaluate LiveKit container health (currently restarting) before integrating audio flows.

## Session: Auth tokens & lobby hand-off
- Fixed LiveKit container startup by updating docker command flags and key formatting; container now stays healthy on port 7880.
- Introduced BullMQ-backed event queue within the game server and hooked HTTP/WebSocket join + leave flows to enqueue room membership events processed by the worker.
- Worker service now records room membership in Redis sets/hashes, and new host/player tokens (JWT-based) secure join/kick actions via the REST API and socket callbacks.
- Expanded the web lobby with create/join forms that redirect to a new `/play/[roomCode]` page, surfaced error messaging from API responses, and display issued tokens for debugging.

## Follow-ups
1. Replace the placeholder play screen with the actual canvas + WebSocket client, consuming player tokens for auth.
2. Build moderation operations (kick/ban UI) and integrate host token flow in the control surface.
3. Add end-to-end tests covering the lobby → play transition and worker-side Redis presence data.

## Session: Real-time play surface & presence
- Built `/play/[roomCode]` experience with socket-authenticated joins, live player roster, and kick controls. Added collaborative canvas using `@skribble-play/drawing-engine` with stroke broadcasting over Socket.IO.
- Added JWT issuance for players/hosts in REST + socket flows; HTTP kick endpoint now requires host token and emits presence updates.
- Implemented Redis-backed presence API (`GET /rooms/:code/presence`) fed by BullMQ worker, hooked into the web lobby and play UI.
