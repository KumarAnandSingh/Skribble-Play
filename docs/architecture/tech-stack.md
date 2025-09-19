# Tech Stack & Dependency Breakdown

## Frontend (apps/web)
- **Framework:** Next.js 15 (App Router) with React 18.3.
- **Language:** TypeScript 5.5.
- **State Management:** Zustand for game/session state, React Query for data fetching (optional).
- **Realtime:** socket.io-client for gameplay events; WebRTC APIs for audio.
- **Styling:** Tailwind CSS + custom theme tokens from `ui-kit`.
- **Testing:** Vitest (unit), Testing Library, Playwright (E2E), Axe-core for accessibility.
- **Build Tooling:** ESLint (Next config), Prettier, SWC bundler.
- **Key Dependencies:**
  - `next`, `react`, `react-dom`
  - `socket.io-client`
  - `zustand`
  - `@tanstack/react-query` (optional)
  - `tailwindcss`, `postcss`, `autoprefixer`
  - `typescript`, `eslint`, `prettier`, `vitest`, `@testing-library/react`

## Game Server (services/game-server)
- **Runtime:** Node.js 18 (ESM).
- **Framework:** Fastify 4 with `@fastify/socket.io` for WebSocket transport.
- **Validation:** Zod schemas for payload validation.
- **Data Layer:** Prisma ORM (pending) targeting Postgres; `ioredis` for Redis interactions.
- **Queues:** BullMQ/Redis for background jobs.
- **Testing:** Vitest + Supertest for HTTP, socket.io test harness for WS.
- **Key Dependencies:**
  - `fastify`, `@fastify/socket.io`
  - `zod`
  - `ioredis`
  - `bullmq`
  - `prisma` (when schema ready)
  - `dotenv`
  - `pino` for logging

## Media SFU (services/media-sfu)
- **Option A:** LiveKit Cloud (SDK + configuration) — low ops overhead.
- **Option B:** Self-hosted mediasoup — more control, higher complexity.
- **Supporting Services:** `coturn` for STUN/TURN, Prometheus exporters, Grafana dashboards.

## Worker Service (services/worker)
- **Purpose:** Process async tasks (notifications, analytics, replay persistence).
- **Dependencies:** `bullmq`, `ioredis`, `zod`, plus instrumentation libraries.

## Shared Packages
- **drawing-engine:** Pure TypeScript utilities for strokes, interpolation, compression. Tests via Vitest.
- **ui-kit:** React component library exporting tokens, Buttons, Modals, etc. Storybook (future) for documentation.
- **shared-config:** Central config loader providing typed access to env vars/ports/flags.

## Tooling & Platform
- **Package Management:** npm workspaces (can switch to pnpm later).
- **Lint/Format:** ESLint 9, Prettier 3, TypeScript strict mode.
- **Testing:** Vitest, Playwright, Supertest, Axe.
- **CI/CD:** GitHub Actions (lint, test, typecheck, build matrices).
- **Infra:** Docker Compose for local dev (Postgres, Redis, LiveKit/mediasoup). Terraform/Helm for staging/prod (future).
- **Observability:** pino + OpenTelemetry instrumentation, Prometheus, Grafana, Loki for logs.

## External Integrations
- **Analytics:** PostHog/Amplitude for instrumentation (decision pending).
- **Auth:** Clerk/Auth0 or custom Supabase (M1).
- **Storage:** S3-compatible object storage for replay assets (M1).

## Open Dependency Questions
- Choose ORMs (Prisma vs drizzle).
- Evaluate state sync strategy (socket.io vs custom WS or Colyseus).
- Determine WebRTC SDK (LiveKit vs mediasoup toolchain).
- Confirm feature flag provider (LaunchDarkly vs open-source alternatives).
