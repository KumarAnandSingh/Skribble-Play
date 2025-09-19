# Architecture Overview (Draft)

```
client (Next.js PWA) --- WebSocket ---> game-server (Fastify)
        |                                  |
        |                                  +--> Redis pub/sub (state fan-out)
        |                                  +--> Postgres (rooms, players, rounds)
        |
        +--- WebRTC (via SFU) ----> media-sfu (LiveKit/mediasoup TBD)

worker (BullMQ) <-- Redis queues --> game-server (events)

shared packages: drawing-engine (TS library), ui-kit (React component lib), shared-config (environment constants)
```

This diagram will evolve as we validate SFU selection, messaging topology, and analytics pipelines.
