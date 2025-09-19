# Local Development Guide (Draft)

## Prerequisites
- Node.js 18.18+ (v23 supported) and npm 9+ (v11 supported).
- Docker Desktop or compatible container runtime.

## Bootstrapping
```bash
npm install
cp services/game-server/.env.example services/game-server/.env
cp services/worker/.env.example services/worker/.env
# Update `AUTH_SECRET` in `services/game-server/.env` before exposing publicly.
```

## Running Infrastructure Dependencies
Start Postgres, Redis, and LiveKit (audio SFU) locally:
```bash
docker compose up -d postgres redis livekit
```

Ports exposed:
- Postgres → `55432`
- Redis → `6379`
- LiveKit API → `7880`
- LiveKit WebRTC UDP range → `7900-7999`

> LiveKit runs in `--dev` mode with default API keys. Replace `LIVEKIT_KEYS` and networking values before exposing outside localhost.

## Workspace Commands
- Web client: `npm run dev --workspace @skribble-play/web`
- Game server: `npm run dev --workspace @skribble-play/game-server`
- Worker: `npm run dev --workspace @skribble-play/worker`

## Tests & Linting
```bash
npm run test --workspace @skribble-play/drawing-engine
npm run test --workspace @skribble-play/game-server
npm run lint --workspace @skribble-play/web
```

## Troubleshooting
- If `npm install` fails due to peer deps, ensure workspace `eslint` versions remain aligned at `8.57.0`.
- `docker compose logs <service>` helps debug Postgres/Redis/LiveKit boot issues.
- When LiveKit UDP ports conflict, adjust ranges in `docker-compose.yml` and shared config.
