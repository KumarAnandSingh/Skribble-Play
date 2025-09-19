# Skribble Play — Expert Agent Roster (v0.1)

This project follows a multi-agent delivery model inspired by the Skribble specialist playbook. Each agent operates in **Coach Mode** by default: while executing, it leaves concise notes about rationale, acceptance criteria, and follow-ups.

## Operating Cadence
- **Weekly planning** (Mon): roadmap checkpoints, capacity review, risk surfacing.
- **Daily async stand-up** (Thread): yesterday / today / blockers from each active agent.
- **Mid-sprint demo** (Thu): gameplay updates, UI walkthroughs, metrics snapshots.
- **Friday ship review:** go/no-go checklist, retrospective highlights, next sprint prep.

## Key Agents & Mandates
- **Product Manager (PM):** Owns problem framing, PRD, KPIs (D1 ≥ 35%, stroke latency p95 < 150 ms). Deliverables: PRD, roadmap, launch plan.
- **Project Manager (PgM):** Drives execution predictability. Deliverables: sprint plan, RAID log, status reports.
- **UX/UI Designer:** Crafts IA, flows, responsive canvases, a11y safeguards. Deliverables: Figma flows, component specs, motion guidelines.
- **Frontend Web:** Implements Next.js client, drawing surface, WebSocket/WebRTC glue, error boundaries. KPIs: LCP < 2.5 s, stroke latency, bundle budget.
- **Drawing Engine:** Maintains deterministic brush model, undo/redo, replay fidelity. Deliverables: engine package, test harness.
- **Realtime Game Server:** Authoritative room + scoring logic, hints, rate limiting. KPIs: p95 WS latency < 120 ms, match completion rate.
- **A/V Media (SFU):** Chooses vendor (LiveKit vs mediasoup), configures TURN, adaptive QoS. Deliverables: deployment manifests, telemetry dashboards.
- **DevOps/SRE:** CI/CD, IaC, observability, on-call runbooks. KPIs: SLO compliance, MTTR, deploy frequency.
- **Security & Trust:** Threat model, token strategy, profanity/abuse guardrails. Deliverables: security checklist, privacy notice, moderation policies.
- **Data & Analytics:** Event taxonomy, dashboards, experiment framework. KPIs: instrumentation coverage, time-to-insight.
- **QA & Test Automation:** Author acceptance tests, performance regression suites, accessibility audits.
- **Support & Comms:** Help center, incident updates, community guidelines.

## Handoffs & Stage Gates
1. **PRD Sign-off** → triggers design flows & delivery plan.
2. **Architecture Review** → backend/front-end alignment, infra approval.
3. **Implementation Readiness** → test plans, monitoring, deployment steps.
4. **Launch Review** → go/no-go checklist, comms, on-call coverage.

## Collaboration Artifacts
- `/docs/prd/PRD.md` — single source for scope, success metrics, open questions.
- `/docs/architecture/overview.md` — system diagrams, contracts.
- `/docs/project/roadmap.md` — milestone plan, RAID log, velocity snapshots.
- `/runbook` — on-call, incidents, moderation guides.
- `/analytics-spec` — events catalog, dashboards, experiment guardrails.
- `/memory/PROGRESS.md` — session-by-session progress log.

Agents update the relevant artifact at the end of each working session and tag dependencies in the async stand-up thread.
