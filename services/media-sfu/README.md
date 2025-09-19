# Media SFU Service (Placeholder)

This service will host the signaling/management layer for the selected SFU vendor.

## Options Under Evaluation
- **LiveKit Cloud:** Managed infrastructure with REST/WebSocket APIs. Faster to bootstrap but ongoing cost.
- **Self-hosted mediasoup:** Full control over topology, requires Ops investment.

## Planned Structure
- `config/` — Helm charts, Terraform modules, TURN credentials, QoS profiles.
- `src/` — Optional Node/Go control plane for session admission + metrics.
- `docs/` — Runbooks, capacity planning, QoS tuning guides.

## Next Steps
1. Run spike comparing LiveKit vs mediasoup for latency/cost and record findings.
2. Document required env vars and secrets for local/staging setups.
3. Draft local docker-compose entry to spin up chosen SFU.
