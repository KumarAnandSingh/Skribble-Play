# Architecture Overview (Draft)

```
+-------------+      secure WebSocket      +-------------------+
|  Web Client | <------------------------> |   Game Server     |
| (Next.js)   |                           | (Fastify + WS)    |
+-------------+                           +-------------------+
        |                                           |
        | WebRTC (SFU)                              | Redis pub/sub
        v                                           v
+-------------------+                       +-------------------+
|  Media SFU (TBD)  | <--- RTP/DTLS ---->   |    Redis Cache    |
|  (LiveKit/mediasoup)                      +-------------------+
+-------------------+                               |
                                                    v
                                            +-------------------+
                                            |   Postgres DB     |
                                            +-------------------+
```

## Components
- **apps/web:** Next.js 15 app with app router, React 18, Zustand state, socket.io client, WebRTC hooks.
- **services/game-server:** Fastify + socket.io server handling rooms, rounds, scoring, chat, moderation events.
- **services/media-sfu:** Wrapper around chosen SFU (LiveKit Cloud or self-hosted mediasoup) including TURN configuration and QoS telemetry.
- **services/worker:** BullMQ worker for async jobs (notifications, analytics batching, replay persistence).
- **packages/drawing-engine:** Shared deterministic stroke model and interpolation utilities.
- **packages/shared-config:** Typed config provider for ports, URLs, feature flags, feature gating.
- **packages/ui-kit:** Design system tokens and reusable React components.

## Environment Layout
- `.env` per workspace with safe defaults; `shared-config` exposes typed getters.
- Local dev orchestrated via `docker-compose` (TBD) to bring up Postgres, Redis, optional LiveKit instance.

## Key Data Flows
1. **Room lifecycle:** REST + WebSocket events for create/join/leave, stored in Postgres, broadcast via Redis pub/sub to horizontal game-server instances.
2. **Stroke synchronization:** Clients emit `stroke:*` events; server broadcasts after validation/compression; worker optionally persists to object storage for replays.
3. **Voice:** Clients perform WebRTC handshake with SFU; SFU routes audio; game server coordinates active speaker events for UI.
4. **Analytics:** Game server and clients emit events to analytics collector (future). Worker batches to warehouse.

## Tech Stack Snapshot
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind (or CSS modules), Zustand, socket.io-client, Playwright.
- **Backend:** Fastify 4, socket.io 4, Zod for validation, Redis, Postgres via Prisma/TypeORM (TBD), Vitest & Supertest.
- **Media:** LiveKit Node SDK or mediasoup; coturn for STUN/TURN.
- **Infra:** Docker, GitHub Actions, Terraform/Helm (future), Prometheus/Grafana.

## Outstanding Decisions
- Choose SFU vendor and hosting strategy (cost vs control).
- Decide on ORM (Prisma vs drizzle vs TypeORM).
- Evaluate Canvas rendering approach (Canvas2D vs WebGL for performance).
- Confirm analytics provider (self-hosted vs SaaS).

## Upcoming Architecture Tasks
- Draft API/WebSocket contracts (`docs/architecture/contracts.md`).
- Define database schema ERD and migrations workflow.
- Create tracing/logging plan (OpenTelemetry instrumentation).
- Write resiliency checklist (socket reconnect, session persistence).
