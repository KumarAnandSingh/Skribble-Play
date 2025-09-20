# Skribble Play – Delivery Status

## Milestone Snapshot
- **M0: Lobby & Navigation** – _In progress_
- **M1: Room Core** – TODO
- **M2: Canvas & Guessing** – TODO
- **M3: Reactions & Memes** – TODO
- **M4: Voice/Video** – TODO
- **M5: Results & Sharing** – TODO
- **M6: Post-game Social** – TODO

## Global Checklist

Legend: ✅ Done · 🚧 In Progress · ⏳ Not Started

### Lobby & Navigation
- ✅ Theme scaffold (Tailwind + shadcn-style primitives) and hero + lobby shell
- 🚧 Connect lobby to live APIs (`GET /v1/rooms`, filters, skeleton states)
- 🚧 Friends/private tab with deep-link invites (UI scaffolding live, backend wiring pending)
- 🚧 Join & Auto-Mic flow with permission handling (permission prompt + join stub live)
- 🚧 Create Room modal w/ Zod validation + POST integration

### Pre-game Room
- 🚧 Player roster with host drawer selection & kick (UI done, waiting backend wiring)
- 🚧 Ready-up bar & host controls synced via WS
- ⏳ Content filter toggles (Kids Mode, profanity level)
- ⏳ Invite sheet (QR + deep link)
- ⏳ Safety menu actions (mute/block/report)

### Live Play (Canvas & Guessing)
- ⏳ Konva/Fabric canvas with tools & gestures
- ⏳ Stroke throttling + undo limits + server sync
- ⏳ Guess stream with throttling & profanity mask
- ⏳ Reaction tray (emoji/GIF/soundboard) with rate limits

### Voice & Video
- ⏳ WebRTC join flow + device selection
- ⏳ Adaptive tile layout / strip on mobile
- ⏳ Echo & noise detection, push-to-talk fallback
- ⏳ Voice/video telemetry & global mute controls

### Moderation & Safety
- ⏳ Vote-to-kick flow
- ⏳ Toxicity detection hooks / Kids Mode restrictions
- ⏳ Long-press avatar actions (mute/report/block)
- ⏳ Rate-limit feedback (guesses, reactions, brush)

### Results & Sharing
- ⏳ Results recap (timeline, MVP, reactions)
- ⏳ Tremor/Recharts score summaries
- ⏳ Share card generator with Lottie overlay
- ⏳ Rematch / Change Mode / Invite CTA wiring
- ⏳ Gallery save toggle & privacy controls

### Post-game Social
- ⏳ Gallery grid + clip exports
- ⏳ Friend suggestions + quick room hop
- ⏳ Follow/block sync across lobby

### Instrumentation & Performance
- ⏳ Event pipelines (PostHog/Amplitude) for core actions
- ⏳ Perf telemetry (WS RTT, canvas FPS, WebRTC jitter)

### Accessibility & Hardening
- ⏳ Keyboard navigation + focus management
- ⏳ Screen reader/ARIA coverage
- ⏳ TTS cues & color-blind palette
- ⏳ Offline/poor-network handling & backoff

### Engineering Ops
- 🚧 Replace stub components with real shadcn/ui (pending package install)
- ⏳ Storybook or component gallery for design QA
- ⏳ Unit/E2E tests for lobby + room flows
- ⏳ Documentation updates per milestone completion
