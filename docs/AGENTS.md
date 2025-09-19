# Agent Playbook (Summary)

Source: Adapted from `/Users/priyasingh/Downloads/AGENTS_skribble_game_v0_1.md` version 0.1 (19 Sep 2025).

## Cadence & Rituals
- Weekly planning, daily async standups, mid-sprint demos, Friday ship review.
- Design critique (Tue), architecture review (Wed), playtest (Thu), launch go/no-go (Fri).
- Environment flow: Dev → Staging → Prod with blue/green deployments.

## Stage Gates
1. PRD sign-off (PM, Legal if needed).
2. Design + architecture review (Design, FE, BE, DevOps, Security).
3. Data/model review (DS, MLE, Security).
4. Go-to-market review (PM, Marketing, Sales, Legal).
5. Launch review (Ops, QA, Security, PM).

## Core Agents (Selected)
- **Product Manager:** Owns problem framing, roadmap, KPIs. Deliverables: PRD, launch plan, experiment charters.
- **Project Manager:** Plans sprints, maintains RAID log, drives cross-team delivery. Deliverables: sprint plan, status reports.
- **UX/UI Design:** Ships flows, UI kit, accessibility guidance. Deliverables: Figma flows, tokens, prototypes.
- **Frontend Web:** Builds Next.js client, drawing UI, WebSocket integration. KPIs: stroke latency, bundle size.
- **Drawing Engine:** Maintains deterministic engine, brush tools, replay support.
- **Real-Time Game Server:** Manages rooms, timers, scoring, anti-cheat, load tests.
- **A/V Media:** Owns SFU/TURN setup, QoS, audio/video fallbacks.
- **DevOps/SRE:** IaC, CI/CD, observability, incident response.
- **Security:** Threat modeling, rate limits, privacy controls.
- **QA:** Test plans, automation, performance, launch sign-off.
- **Analytics/Data:** Event schemas, dashboards, experiment guardrails.
- Additional agents cover AI moderation, support, marketing, legal, operations, memory, and follow-ups.

## Milestones (excerpt)
- **M0 Core Game (4–6 weeks):** Canvas, state replication, chat, staging env. Exit: stable 4-player match, <150 ms stroke p95.
- **M1 Voice + Moderation:** SFU audio, consent, abuse reporting, toxicity filter. Exit: 6-player audio stable, drop <2%/10 min.
- **M2 Video + Social:** Video tiles, meme sharing, referral loop. Exit: 6 visible tiles, invite conversion >15%.
- **M3 Teams + Mobile:** Teams mode, mobile polish, brand packs.

## Shared KPIs
- **Engagement:** D1 ≥ 35%, D7 ≥ 12%, ≥ 3 rounds/session.
- **Quality:** WebSocket latency p95 < 120 ms, A/V RTT p95 < 250 ms, drops < 2%.
- **Safety:** Reports < 3/1k users/day, action time < 10 minutes.
- **Growth:** Invite → join ≥ 15%, WAU/MAU ≥ 0.55.

## Runbook & Analytics Artifacts
Maintain runbooks under `runbook/` (on-call, incidents, moderation) and analytics specs under `analytics-spec/` (events, guardrails). Keep decision logs and meeting notes synced with `memory/PROGRESS.md`.

Refer to the original document for full RACI tables, agent scopes, and command prompts when deeper detail is required.
