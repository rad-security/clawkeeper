---
name: Clawkeeper Runtime Shield
version: 1.0.0
author: Clawkeeper
homepage: https://clawkeeper.dev/docs/runtime-shield
install: npm install
permissions:
  - network
env:
  CLAWKEEPER_API_KEY: ""
  CLAWKEEPER_API_URL: "https://clawkeeper.dev/api/v1"
  SHIELD_SECURITY_LEVEL: "strict"
  SHIELD_LOG_DIR: "~/.clawkeeper/shield-logs"
---

# Clawkeeper Runtime Shield

Real-time prompt injection defense for OpenClaw agents. Monitors every message
and tool result through 5 detection layers, blocks threats locally, and reports
to your Clawkeeper dashboard for fleet-wide visibility.

## Detection Layers

1. **Regex** — 30+ patterns for known injection techniques
2. **Semantic** — Weighted anomaly scoring for persona hijack, instruction override
3. **Context Integrity** — Turn-type validation, tool response impersonation
4. **Blacklist** — Exact match + fuzzy (Levenshtein distance ≤ 2)
5. **Entropy Heuristic** — Shannon entropy, base64 detection, context flooding

## Commands

- `/shield status` — Current level, session stats, connection status
- `/shield level <level>` — Override security level (paranoid/strict/moderate/minimal)
- `/shield blacklist add/remove/list` — Manage local blacklist
- `/shield log [count]` — Show recent local events
- `/shield sync` — Force policy re-sync from dashboard
- `/shield stats` — Detection statistics since startup

## Privacy

Raw user messages **never** leave your machine. Only SHA-256 hashed inputs,
detection metadata, and verdicts are sent to the dashboard.
