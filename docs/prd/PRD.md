# Skribble Play — Product Requirements Draft (v0.1)

## Problem Statement
Groups want a fast, social way to doodle together, guess prompts, and share reactions without set-up friction or lag. Existing solutions suffer from janky canvases, unreliable voice/video, and weak moderation.

## Goals & Success Metrics
- **Engagement:** D1 retention ≥ 35%, D7 retention ≥ 12%, ≥ 3 rounds/session, invite→join ≥ 15%.
- **Quality:** Stroke latency p95 < 150 ms for 6 concurrent drawers, WS disconnects < 1%/session.
- **Safety:** Profanity filter covers ≥ 95% of banned words, abuse response time < 10 minutes.
- **Growth:** WAU/MAU ≥ 0.55, referral conversion ≥ 15%.

## Target Users & JTBD
- **Friend groups / party gamers:** “We want to jump in, laugh, and draw without installing anything.”
- **Creators / streamers:** “I need predictable latency, moderation tools, and audience participation.”
- **Casual communities & classrooms:** “Give us collaborative creativity with safe interactions.”

## Scope — Milestone M0 (Core Game)
- Anonymous or named join via room code.
- Authoritative game loop: lobby, prompt selection, timed drawing, guessing, scoring, hints.
- Responsive canvas with brush, eraser, undo/redo, stroke replay.
- Chat feed with profanity filter and simple reactions.
- Baseline moderation: kick/ban, report, rate limited spam guard.
- Voice support via SFU (audio-only for M0) with device pre-flight checks.

## Out of Scope (M0)
- Custom word packs marketplace.
- Native mobile apps (PWA polish only).
- Video tiles (planned for M1).
- Monetization features.

## User Stories (M0)
1. As a host, I can create a room and share a short code for friends to join.
2. As a player, I can draw with smooth strokes and undo mistakes in real time.
3. As a guesser, I can submit guesses with immediate feedback and hints after timeouts.
4. As a moderator, I can remove disruptive players and ban slurs from chat/guesses.
5. As a player, I can enable voice chat and see who is speaking with active speaker indicators.

## Functional Requirements
- **Room Management:** create/join/leave rooms, host controls, player states (drawing, guessing, idle).
- **Game Loop:** per-round timers, prompt assignment, score calculation, hint schedule, end-of-round summary.
- **Canvas & Strokes:** deterministic stroke model, compression for transport, replay API for spectators.
- **Chat & Reactions:** WebSocket-based chat, emoji reactions, rate limiting, profanity filter.
- **Audio:** WebRTC via shared SFU, device permission & fallback, push-to-talk option.
- **Moderation:** kick, mute, ban actions; audit log for incidents; rate limiting on messages and guesses.

## Non-Functional Requirements
- **Performance:** p95 WS latency < 120 ms (game), < 250 ms audio RTT; 60 fps canvas target.
- **Scalability:** 50 concurrent rooms × 8 players on a single game-server instance.
- **Reliability:** Graceful reconnects within 5 seconds, persisted rounds in Redis/Postgres.
- **Security:** JWT or signed tokens for room access; TLS everywhere; PII minimization.
- **Accessibility:** Keyboard navigation, ARIA labels, colorblind-safe palette, captions roadmap.

## Dependencies & Integrations
- **Persistence:** Postgres (rooms, rounds) + Redis (state + pub/sub).
- **A/V:** LiveKit Cloud or self-hosted mediasoup (decision pending).
- **Analytics:** PostHog/Amplitude for event tracking; S3 for replay storage (M1).
- **Auth:** Anonymous IDs with optional OAuth (M1).

## Risks & Open Questions
- SFU vendor choice (feature parity vs operational overhead).
- Stroke synchronization across high-latency clients (investigate delta compression + reconciliation).
- Moderation scalability for public rooms (consider ML-based content filters from M1).
- Voice latency interplay with canvas updates (QoS prioritization needed).

## Next Actions
1. Validate architecture assumptions in `docs/architecture/overview.md`.
2. Confirm dependency list and create install scripts.
3. Prototype canvas engine interactions and WebSocket contracts.
4. Draft moderation policy and abuse response workflow (`runbook/moderation.md`).
5. Schedule first cross-agent architecture review.
