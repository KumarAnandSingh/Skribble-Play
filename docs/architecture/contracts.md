# API & WebSocket Contracts (Draft v0.1)

## HTTP Endpoints — Game Server
| Method | Path        | Description                          | Notes |
|--------|-------------|--------------------------------------|-------|
| GET    | `/health`   | Liveness probe.                      | Returns `{ status: "ok", uptime: number }`. |
| POST   | `/rooms`    | Create a room.                       | Returns `{ roomCode, hostToken, hostPlayer }` with a host JWT. |
| GET    | `/rooms/:code` | Fetch room snapshot.              | Includes players array, created timestamp. |
| POST   | `/rooms/:code/join` | Join existing room.          | Accepts `{ nickname, playerId? }`; returns `{ playerId, roomCode }`. |
| POST   | `/rooms/:code/leave` | Leave a room.               | Accepts `{ playerId }`; returns `{ roomCode, playerId }`. |
| POST   | `/rooms/:code/kick`  | Moderator removes a player. | Requires host token; returns `{ ok: true }`. |
| GET    | `/rooms/:code/presence` | List active members.     | Returns `[{ playerId, nickname, source, lastSeenAt? }]` from Redis presence data. |

> **Note:** `/rooms`, `/rooms/:code`, `/rooms/:code/join`, `/rooms/:code/leave`, `/rooms/:code/kick`, and `/rooms/:code/presence` are live against the Postgres/Redis backing stores.

## WebSocket Events

All socket payloads share the envelope shape:
```ts
interface EventEnvelope<T extends string, P> {
  type: T;
  payload: P;
  timestamp: number;
}
```

### Client → Server
- `client:join`
  ```ts
  type JoinPayload = {
    roomCode: string;
    playerId?: string;
    nickname: string;
  };
  ```
- `client:stroke`
  ```ts
  type StrokePayload = {
    roomCode: string;
    stroke: import("@skribble-play/drawing-engine").Stroke;
  };
  ```
- `client:guess`
  ```ts
  type GuessPayload = {
    roomCode: string;
    playerId: string;
    guess: string;
  };
  ```
- `client:voice-state`
  ```ts
  type VoiceStatePayload = {
    roomCode: string;
    playerId: string;
    mute: boolean;
    speaking: boolean;
  };
  ```

### Server → Client
- `server:welcome` — emitted on connection with `{ message: string }` (already implemented).
- `game:state`
  ```ts
  type RoomState = {
    roomCode: string;
    phase: "lobby" | "drawing" | "results";
    roundEndsAt: number;
    activePlayerId: string;
    scores: Record<string, number>;
    hints: string[];
  };
  ```
- `game:player-joined` — `{ playerId: string; nickname: string }` (implemented for join broadcast).
- `game:player-left` — `{ playerId: string }` (implemented).
- `game:stroke` — broadcast sanitized stroke payloads.
- `game:guess-result` — `{ playerId: string; correct: boolean; scoreAwarded?: number }`.
- `moderation:action` — `{ action: "kick" | "ban" | "mute"; playerId: string; reason?: string }`.

## Error Handling
- HTTP errors follow RFC 7807 Problem Details where applicable.
- Socket errors use `server:error` with `{ code: string; message: string; retryable: boolean }`.

## Next Steps
1. Align domain model and persistence schema with these payloads.
2. Finalize authentication tokens for host vs player actions.
3. Document moderation audit logs and rate limits.
4. Add integration tests covering socket join/leave flows using socket.io testing utilities.
