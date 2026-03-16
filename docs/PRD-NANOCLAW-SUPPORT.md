# Product Requirements Document: NanoClaw Support in Clawkeeper

**Version:** 1.0  
**Date:** February 27, 2026  
**Author:** Clawkeeper Engineering  
**Status:** Research Complete — Ready for Review

---

## Executive Summary

This PRD outlines the requirements for extending Clawkeeper to support **NanoClaw** alongside the existing **OpenClaw** integration. NanoClaw is a lightweight, container-isolated AI agent framework that has emerged as a security-focused alternative to OpenClaw following OpenClaw's significant security incidents in early 2026.

### Key Findings

| Aspect | OpenClaw | NanoClaw |
|--------|----------|----------|
| **Codebase Size** | ~500,000 lines, 53 config files | ~500 lines, zero config files |
| **Security Model** | Application-layer permissions | OS-level container isolation |
| **CVEs (2026)** | 9+ critical CVEs, 135K+ exposed instances | 2 documented issues (unpatched network egress) |
| **Gateway Port** | 18789 | No gateway (message channel-based) |
| **Config Location** | `~/.openclaw/openclaw.json` | `~/.config/nanoclaw/mount-allowlist.json` |
| **Deployment** | Docker or npm global | Docker containers per-invocation |
| **Authentication** | Gateway token | Per-channel OAuth/API keys |

**Recommendation:** Adding NanoClaw support is **feasible** and strategically valuable. The security models are different enough that Clawkeeper can provide meaningful hardening for both while abstracting common patterns.

---

## Table of Contents

1. [Background & Motivation](#1-background--motivation)
2. [NanoClaw Architecture Deep Dive](#2-nanoclaw-architecture-deep-dive)
3. [Security Model Comparison](#3-security-model-comparison)
4. [Gap Analysis: Current Clawkeeper vs NanoClaw](#4-gap-analysis-current-clawkeeper-vs-nanoclaw)
5. [Proposed Architecture](#5-proposed-architecture)
6. [New Security Checks for NanoClaw](#6-new-security-checks-for-nanoclaw)
7. [Deployment Support](#7-deployment-support)
8. [UI/UX Changes](#8-uiux-changes)
9. [Data Model Changes](#9-data-model-changes)
10. [Migration & Compatibility](#10-migration--compatibility)
11. [Security Considerations](#11-security-considerations)
12. [Implementation Phases](#12-implementation-phases)
13. [Open Questions](#13-open-questions)
14. [Appendix: Research Sources](#14-appendix-research-sources)

---

## 1. Background & Motivation

### 1.1 Why NanoClaw?

NanoClaw emerged in early 2026 as a direct response to OpenClaw's security vulnerabilities:

- **CVE-2026-25253**: Zero-click WebSocket hijacking affecting 42,000+ instances
- **CVE-2026-28470/28391**: Command injection bypasses (CVSS 9.8)
- **1.5 million API tokens leaked** from backend misconfiguration
- **341 malicious skills** (20% of ClawHub marketplace)

NanoClaw's philosophy: **"Don't trust AI agents"** — treat agents as potentially malicious by default and use OS-level container isolation as the primary security boundary.

### 1.2 Market Adoption

- NanoClaw surpassed **20,000 GitHub stars** within 2 months of launch
- **100,000+ downloads** as of March 2026
- Docker partnership announced March 2026 (Docker Sandboxes integration)
- Growing enterprise interest due to auditable codebase (~15 source files)

### 1.3 Strategic Value for Clawkeeper

1. **Capture emerging market**: Security-conscious users migrating from OpenClaw
2. **Unified security management**: One tool for both agent frameworks
3. **Differentiation**: First security hardening tool to support both ecosystems
4. **Enterprise appeal**: Organizations running mixed fleets

---

## 2. NanoClaw Architecture Deep Dive

### 2.1 Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NanoClaw Host Process                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ WhatsApp     │  │ Telegram     │  │ Slack/Discord        │  │
│  │ Baileys      │  │ Bot API      │  │ Events API           │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └────────────────┬┴──────────────────────┘              │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Per-Group Message Queue (FIFO)               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                      │
│                          ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Container Spawner                        │  │
│  │   • Creates ephemeral container per invocation            │  │
│  │   • Mounts allowed directories (read-only by default)     │  │
│  │   • Injects whitelisted env vars only                     │  │
│  │   • Destroys container after execution                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Isolated Agent Container (Ephemeral)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Claude Code │  │ CLAUDE.md   │  │ Mounted Workspace       │  │
│  │ (Agent SDK) │  │ (Memory)    │  │ (Allowlisted paths)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  • Runs as uid 1000 (non-root)                                  │
│  • No network restrictions (known vulnerability)                │
│  • IPC namespace isolated                                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Differences from OpenClaw

| Component | OpenClaw | NanoClaw |
|-----------|----------|----------|
| **Process Model** | Long-running gateway daemon | Single Node.js process + ephemeral containers |
| **Container Lifecycle** | Persistent container | Created/destroyed per invocation |
| **Configuration** | JSON config file (`openclaw.json`) | Zero-config + conversational customization |
| **Authentication** | Gateway token (single) | Per-channel OAuth tokens |
| **Discovery** | mDNS/DNS-SD broadcast | No network discovery |
| **Skills/Plugins** | ClawHub marketplace (3,200+) | Built-in skills via Claude Code |
| **Memory** | Session-based | CLAUDE.md files (per-group) |
| **Network Binding** | Configurable port (18789) | Channel-specific (WhatsApp, Telegram APIs) |

### 2.3 File Locations

```
~/.config/nanoclaw/
├── mount-allowlist.json    # Filesystem access control
├── sessions/               # WhatsApp session data
│   └── <group-id>/
│       └── creds.json
└── data/
    └── <group-id>/
        ├── CLAUDE.md       # Agent memory/instructions
        ├── USER.md         # User preferences (planned)
        └── nanoclaw.db     # SQLite conversation store
```

### 2.4 Docker Sandboxes Integration (March 2026)

NanoClaw now supports Docker Sandboxes for enhanced isolation:
- **Two-layer isolation**: Container inside microVM
- **Hypervisor-level security**: Agents cannot touch host machine
- **Platform support**: macOS (Apple Silicon), Windows; Linux coming soon

---

## 3. Security Model Comparison

### 3.1 OpenClaw Security Model

```
┌─────────────────────────────────────────────────────────┐
│                    OpenClaw Security                    │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Application-Level Permission Checks           │
│  • tools.exec.host = sandbox                            │
│  • tools.fs.workspaceOnly = true                        │
│  • dmPolicy = pairing                                   │
│  • Skill approval workflow                              │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Gateway Configuration                         │
│  • gateway.bind = loopback                              │
│  • gateway.auth.mode = token                            │
│  • discovery.mdns.mode = off                            │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Container Hardening (Optional)                │
│  • Docker: cap_drop ALL, no-new-privileges              │
│  • Resource limits (CPU, memory)                        │
│  • Read-only root filesystem                            │
└─────────────────────────────────────────────────────────┘
```

**Weaknesses identified:**
- Application-layer checks can be bypassed (see CVE-2026-28470)
- Gateway token theft enables full remote access
- Large attack surface (500K+ lines of code)

### 3.2 NanoClaw Security Model

```
┌─────────────────────────────────────────────────────────┐
│                   NanoClaw Security                     │
├─────────────────────────────────────────────────────────┤
│  Layer 1: OS-Level Container Isolation (PRIMARY)        │
│  • Ephemeral containers (created/destroyed per run)     │
│  • Runs as unprivileged user (uid 1000)                 │
│  • IPC namespace isolation                              │
│  • Cannot escape regardless of configuration            │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Mount Allowlist (Defense-in-Depth)            │
│  • ~/.config/nanoclaw/mount-allowlist.json              │
│  • Default blocks: .ssh, .aws, .gnupg, .env, etc.       │
│  • Path traversal validation (rejects .., symlinks)     │
│  • nonMainReadOnly option for non-main groups           │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Credential Isolation                          │
│  • Only whitelisted env vars exposed to containers      │
│  • Mount allowlist never mounted into containers        │
│  • Session data (WhatsApp creds) stays on host          │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Per-Group Isolation                           │
│  • Separate CLAUDE.md memory files                      │
│  • Isolated Claude sessions                             │
│  • Independent filesystem mounts                        │
└─────────────────────────────────────────────────────────┘
```

**Known weaknesses:**
1. **Unrestricted network egress** (Issue #458): Containers can exfiltrate data
2. **Anthropic refusal string injection** (Issue #842): Web content can crash agents
3. **No rate limiting**: Runaway agents can exhaust API credits

### 3.3 Security Parity Matrix

| Security Control | OpenClaw Status | NanoClaw Status | Clawkeeper Can Help? |
|-----------------|-----------------|-----------------|---------------------|
| Non-root execution | ✅ Configurable | ✅ Default | ✅ Verify |
| Container isolation | ✅ Optional | ✅ Required | ✅ Verify/Deploy |
| Capability dropping | ✅ Configurable | ❌ Not enforced | ✅ Add check |
| Network binding | ✅ Configurable | N/A (channels) | ⚪ Different model |
| Credential separation | ⚠️ Config-based | ✅ Structural | ✅ Verify |
| Discovery/mDNS | ⚠️ Default on | ✅ None | ⚪ N/A |
| Resource limits | ✅ Configurable | ❌ Not enforced | ✅ Add check |
| Read-only rootfs | ✅ Configurable | ❌ Not enforced | ✅ Add check |
| Mount restrictions | ⚠️ Config-based | ✅ Allowlist | ✅ Verify |
| Network egress control | ❌ None | ❌ None | ✅ NEW: Add check |
| Sensitive path blocking | ⚠️ Manual | ✅ Default | ✅ Verify |

---

## 4. Gap Analysis: Current Clawkeeper vs NanoClaw

### 4.1 What Already Works

| Clawkeeper Component | OpenClaw | NanoClaw |
|---------------------|----------|----------|
| Platform detection | ✅ | ✅ (same) |
| Linux host hardening | ✅ | ✅ (same) |
| macOS host hardening | ✅ | ✅ (same) |
| Docker installation | ✅ | ✅ (same) |
| SSH hardening | ✅ | ✅ (same) |
| Firewall checks | ✅ | ✅ (same) |
| Fail2ban | ✅ | ✅ (same) |

### 4.2 What Needs to Change

| Component | Current State | Required for NanoClaw |
|-----------|--------------|----------------------|
| Agent detection | OpenClaw only | Add NanoClaw process/container detection |
| Config validation | `openclaw.json` | Add `mount-allowlist.json` validation |
| Deployment | OpenClaw Docker/npm | Add NanoClaw npm + container setup |
| Security checks | OpenClaw-specific | Create NanoClaw equivalents |
| Dashboard types | `OpenClawStatus` | Add `NanoClawStatus` or generalize to `AgentStatus` |
| Terminology | "OpenClaw" hardcoded | Generalize to "agent" abstraction |

### 4.3 Files Requiring Modification

```
lib/
├── deploy.sh           # Add NanoClaw deployment functions
├── scanner.sh          # Add agent type detection
├── orchestrator.sh     # Add NanoClaw check phases
├── ui.sh               # Add NanoClaw terminology
└── uninstall.sh        # Add NanoClaw uninstall

checks/
├── nanoclaw_config/       # NEW: mount-allowlist.json validation
├── nanoclaw_running/      # NEW: process/container detection
├── nanoclaw_hardening/    # NEW: container security settings
├── nanoclaw_network/      # NEW: egress restrictions check
├── nanoclaw_credentials/  # NEW: env var exposure check
└── nanoclaw_channels/     # NEW: channel auth verification

desktop/src/types/
└── scan.ts             # Add NanoClawStatus interface

web/src/types/
└── index.ts            # Add agent type to Host model
```

---

## 5. Proposed Architecture

### 5.1 Agent Abstraction Layer

Create a unified abstraction for both agent types:

```typescript
// Proposed: desktop/src/types/agent.ts

export type AgentType = "openclaw" | "nanoclaw";

export interface AgentStatus {
  type: AgentType;
  installed: boolean;
  install_method: "docker" | "native" | "npm" | null;
  running: boolean;
  version: string | null;
  config_path: string | null;
  
  // OpenClaw-specific
  gateway_port?: number;
  gateway_binding?: string;
  
  // NanoClaw-specific
  active_channels?: string[];
  container_runtime?: "docker" | "apple_container" | null;
}

export interface DetectedAgents {
  openclaw: AgentStatus | null;
  nanoclaw: AgentStatus | null;
}
```

### 5.2 Check Organization

```
Phase 1: Host Hardening          (shared)
Phase 2: Network                 (shared)
Phase 3: Prerequisites           (agent-specific)
Phase 4: Agent Installation      (agent-specific)
Phase 5: Security Audit          (agent-specific)
```

Proposed check flow for NanoClaw:

```bash
# Phase 3: Prerequisites
run_check "linux_essentials"      # Shared
run_check "node"                  # Node.js 22+ required
run_check "nanoclaw_docker"       # Docker for container isolation

# Phase 4: NanoClaw Installation
run_check "nanoclaw_installed"    # npm package detection
run_check "nanoclaw_channels"     # Channel configuration

# Phase 5: Security Audit
run_check "nanoclaw_running"      # Process detection
run_check "nanoclaw_config"       # mount-allowlist.json
run_check "nanoclaw_hardening"    # Container settings
run_check "nanoclaw_credentials"  # Env var exposure
run_check "nanoclaw_network"      # Network egress (warn)
```

### 5.3 Deployment Mode Selection

```
┌────────────────────────────────────────────────────────────┐
│              Clawkeeper Setup Wizard                       │
│                                                            │
│  Which AI agent are you securing?                          │
│                                                            │
│    ○ OpenClaw  — Full-featured agent gateway               │
│    ○ NanoClaw  — Lightweight container-isolated agent      │
│    ○ Both      — Multi-agent environment                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. New Security Checks for NanoClaw

### 6.1 nanoclaw_config

**Purpose:** Validate mount-allowlist.json security settings

```bash
# checks/nanoclaw_config/check.sh

config_file="$HOME/.config/nanoclaw/mount-allowlist.json"

# Check 1: Config directory permissions
# Expected: 700

# Check 2: Config file permissions  
# Expected: 600

# Check 3: Default blocked paths present
# Required: .ssh, .gnupg, .aws, .env, credentials, private_key

# Check 4: No overly permissive mounts
# Fail if: "/" or "/home" in allowlist

# Check 5: nonMainReadOnly enabled
# Recommended for multi-channel setups
```

**check.toml:**
```toml
id = "nanoclaw_config"
name = "NanoClaw Mount Allowlist Audit"
phase = "security_audit"
platform = "all"
description = "Audits ~/.config/nanoclaw/mount-allowlist.json for permissions and blocked paths."
requires_sudo = false
order = 51
```

### 6.2 nanoclaw_running

**Purpose:** Detect running NanoClaw instances

```bash
# checks/nanoclaw_running/check.sh

# Check 1: NanoClaw host process
pgrep -f "nanoclaw|nano-claw" 

# Check 2: Agent containers
docker ps --format '{{.Names}}' | grep -E "nanoclaw-agent|nc-"

# Check 3: Active channel connections
# - WhatsApp: check for Baileys process
# - Telegram: check for bot polling
```

### 6.3 nanoclaw_hardening

**Purpose:** Verify container security settings

```bash
# checks/nanoclaw_hardening/check.sh

# Check 1: Container runs as non-root
# Verify uid 1000 (node user)

# Check 2: Capabilities dropped
# Recommend: cap_drop ALL

# Check 3: Resource limits set
# Warn if no memory/CPU limits

# Check 4: Read-only rootfs
# Recommend for production

# Check 5: Docker Sandboxes available
# Inform about hypervisor-level isolation option
```

### 6.4 nanoclaw_credentials

**Purpose:** Verify credential isolation

```bash
# checks/nanoclaw_credentials/check.sh

# Check 1: Verify only whitelisted env vars
# Allowed: CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY

# Check 2: Check for plaintext secrets in CLAUDE.md
# Scan for: sk-ant-, sk-, api_key, password, secret

# Check 3: Session credentials not in mounted dirs
# WhatsApp creds should stay in ~/.config/nanoclaw/sessions
```

### 6.5 nanoclaw_network (NEW - addresses known vulnerability)

**Purpose:** Warn about unrestricted network egress

```bash
# checks/nanoclaw_network/check.sh

# Check 1: Network policy exists
# Look for iptables/nftables rules limiting container egress

# Check 2: Recommend allowlist
# Suggest: api.anthropic.com, statsig.anthropic.com only

# Check 3: Warn about data exfiltration risk
# This is a known unpatched vulnerability (Issue #458)
```

### 6.6 nanoclaw_channels

**Purpose:** Verify channel authentication security

```bash
# checks/nanoclaw_channels/check.sh

# Check 1: WhatsApp session credentials permissions
# ~/.config/nanoclaw/sessions/*/creds.json should be 600

# Check 2: Telegram bot token not in source
# Scan for hardcoded tokens

# Check 3: Slack/Discord tokens in env vars
# Not in config files or CLAUDE.md
```

---

## 7. Deployment Support

### 7.1 NanoClaw Native Deployment

```bash
# lib/deploy.sh additions

NANOCLAW_DIR="$HOME/nanoclaw"
NANOCLAW_CONFIG_DIR="$HOME/.config/nanoclaw"

setup_nanoclaw_directories() {
    # Create config directory with 700 permissions
    # Create data directory for CLAUDE.md files
    # Create sessions directory for channel credentials
}

setup_nanoclaw_mount_allowlist() {
    # Generate secure mount-allowlist.json
    # Block sensitive paths by default
    # Enable nonMainReadOnly
}

setup_nanoclaw_npm() {
    # npm install -g nanoclaw
    # Verify Node.js 22+
}

deploy_nanoclaw() {
    # Run /setup skill
    # Configure systemd/launchd service
}
```

### 7.2 NanoClaw Docker Sandboxes Deployment

```bash
setup_nanoclaw_docker_sandboxes() {
    # Check for Docker Sandboxes support
    # macOS (Apple Silicon) or Windows required
    # Enable hypervisor isolation
    
    # Note: Linux support coming Q2 2026
}
```

### 7.3 Hardened Docker Compose (Alternative)

For Linux servers without Docker Sandboxes:

```yaml
# nanoclaw-hardened/docker-compose.yml
services:
  nanoclaw:
    image: node:22-slim
    user: "1000:1000"
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    read_only: true
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4g
    volumes:
      - ~/.config/nanoclaw:/home/node/.config/nanoclaw:rw
      - ~/nanoclaw/workspace:/workspace:rw
    tmpfs:
      - /tmp:size=100m,noexec,nosuid
    networks:
      nanoclaw-restricted:
        # Add network policy for egress control
        
networks:
  nanoclaw-restricted:
    driver: bridge
    internal: false
    # TODO: Add iptables rules for egress allowlist
```

---

## 8. UI/UX Changes

### 8.1 CLI Changes

```
$ clawkeeper.sh

  ┌────────────────────────────────────────┐
  │        Clawkeeper Setup Wizard         │
  │   Harden your host. Deploy securely.   │
  └────────────────────────────────────────┘

  Detected agents:
    • OpenClaw: Not installed
    • NanoClaw: Running (Docker)

  What would you like to do?
  
    1) Scan existing agents — audit your current installation
    2) Deploy OpenClaw securely — full-featured gateway
    3) Deploy NanoClaw securely — container-isolated agent
    4) Uninstall — securely remove agents and wipe data
```

### 8.2 Desktop App Changes

Add agent type selector to HomeView and DeployView:

```tsx
// desktop/src/components/AgentSelector.tsx

export function AgentSelector({ 
  selected, 
  onChange,
  detected 
}: AgentSelectorProps) {
  return (
    <div className="agent-selector">
      <AgentCard
        type="openclaw"
        name="OpenClaw"
        description="Full-featured agent gateway with skills marketplace"
        installed={detected.openclaw?.installed}
        running={detected.openclaw?.running}
        selected={selected === "openclaw"}
        onClick={() => onChange("openclaw")}
      />
      <AgentCard
        type="nanoclaw"
        name="NanoClaw"
        description="Lightweight container-isolated agent"
        installed={detected.nanoclaw?.installed}
        running={detected.nanoclaw?.running}
        selected={selected === "nanoclaw"}
        onClick={() => onChange("nanoclaw")}
      />
    </div>
  );
}
```

### 8.3 Dashboard Changes

Add agent type to Host model and display in UI:

```tsx
// web/src/app/(dashboard)/hosts/[id]/page.tsx

export default function HostDetailPage() {
  // Display agent type badge
  // Show agent-specific security recommendations
  // Filter checks by agent type
}
```

---

## 9. Data Model Changes

### 9.1 Database Schema

```sql
-- Add agent_type to hosts table
ALTER TABLE hosts ADD COLUMN agent_type TEXT DEFAULT 'openclaw';
-- Values: 'openclaw', 'nanoclaw', 'both', 'unknown'

-- Add agent-specific check results
ALTER TABLE scan_checks ADD COLUMN agent_type TEXT;
```

### 9.2 API Changes

```typescript
// Update ScanUploadPayload
export interface ScanUploadPayload {
  hostname: string;
  platform: string;
  os_version: string;
  agent_type: "openclaw" | "nanoclaw" | "both" | "unknown"; // NEW
  // ... existing fields
}
```

---

## 10. Migration & Compatibility

### 10.1 Backward Compatibility

- Existing OpenClaw-only installations continue to work unchanged
- Agent type defaults to "openclaw" if not specified
- All existing checks remain functional

### 10.2 Migration Path

1. **Phase 1**: Add NanoClaw detection without breaking OpenClaw
2. **Phase 2**: Add NanoClaw security checks as optional
3. **Phase 3**: Add NanoClaw deployment support
4. **Phase 4**: Unified agent abstraction in dashboard

### 10.3 Version Requirements

- Clawkeeper CLI: v2.0+ for multi-agent support
- Agent upload API: v2 endpoint for agent_type field
- Dashboard: No changes required (graceful degradation)

---

## 11. Security Considerations

### 11.1 Clawkeeper's Security Posture

Clawkeeper must not introduce new attack vectors:

1. **Mount allowlist validation**: Never expose ~/.config/nanoclaw to containers
2. **Credential handling**: Don't store or log channel tokens
3. **Network recommendations**: Actively recommend egress restrictions

### 11.2 Known NanoClaw Vulnerabilities to Address

| Vulnerability | Severity | Clawkeeper Response |
|--------------|----------|---------------------|
| Unrestricted network egress | High | WARN check + remediation guide |
| Anthropic refusal string injection | Medium | INFORM in documentation |
| No resource limits | Medium | FAIL check if not configured |

### 11.3 Security Recommendations

For NanoClaw deployments, Clawkeeper should recommend:

```bash
# Network egress allowlist (iptables)
iptables -A OUTPUT -m owner --uid-owner 1000 -d api.anthropic.com -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner 1000 -d statsig.anthropic.com -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner 1000 -j DROP
```

---

## 12. Implementation Phases

### Phase 1: Detection & Scanning (2 weeks)

**Deliverables:**
- [ ] NanoClaw process/container detection
- [ ] `nanoclaw_running` check
- [ ] `nanoclaw_config` check (mount-allowlist.json)
- [ ] Agent type in scan output

**Files:**
- `lib/scanner.sh` — add `detect_nanoclaw_installed()`
- `checks/nanoclaw_running/` — new check
- `checks/nanoclaw_config/` — new check
- `lib/helpers.sh` — add NanoClaw path constants

### Phase 2: Security Checks (2 weeks)

**Deliverables:**
- [ ] `nanoclaw_hardening` check
- [ ] `nanoclaw_credentials` check
- [ ] `nanoclaw_network` check (warning)
- [ ] `nanoclaw_channels` check

**Files:**
- `checks/nanoclaw_hardening/` — new check
- `checks/nanoclaw_credentials/` — new check
- `checks/nanoclaw_network/` — new check
- `checks/nanoclaw_channels/` — new check

### Phase 3: Deployment (2 weeks)

**Deliverables:**
- [ ] NanoClaw directory setup
- [ ] Mount allowlist generation
- [ ] npm installation support
- [ ] systemd/launchd service

**Files:**
- `lib/deploy.sh` — add NanoClaw deployment functions
- `lib/orchestrator.sh` — add NanoClaw phases
- `scripts/linode-install.sh` — add NanoClaw option

### Phase 4: UI/Dashboard (2 weeks)

**Deliverables:**
- [ ] Agent selector in CLI
- [ ] Agent type in desktop app
- [ ] Agent type in dashboard
- [ ] Agent-specific recommendations

**Files:**
- `lib/ui.sh` — add agent selection
- `desktop/src/components/` — add AgentSelector
- `web/src/types/index.ts` — add agent_type
- Database migration

### Phase 5: Documentation & Testing (1 week)

**Deliverables:**
- [ ] Updated README
- [ ] NanoClaw tutorials
- [ ] E2E tests for NanoClaw checks
- [ ] Security audit of new code

---

## 13. Open Questions

### 13.1 Product Questions

1. **Should Clawkeeper support "both" agents simultaneously?**
   - Adds complexity but covers enterprise use case
   - Recommendation: Yes, in Phase 4

2. **Should NanoClaw deployment be non-interactive?**
   - NanoClaw's `/setup` skill is interactive
   - Options: Wrap with expect, or document manual setup

3. **How to handle Docker Sandboxes?**
   - Not yet available on Linux
   - Recommendation: Detect and recommend when available

### 13.2 Technical Questions

1. **How to detect NanoClaw channel configuration?**
   - WhatsApp: check for Baileys session files
   - Telegram: check for bot token in env
   - Need to research channel detection patterns

2. **Should we implement network egress restrictions?**
   - Goes beyond "hardening" into "patching"
   - Recommendation: Provide as optional remediation

3. **How to handle CLAUDE.md memory files?**
   - Should we scan for credentials?
   - Privacy considerations

### 13.3 Business Questions

1. **Pricing for multi-agent support?**
   - Same tier limits apply (hosts, not agents)?
   - Or charge per agent type?

2. **Enterprise interest validation?**
   - Survey existing customers
   - Beta program for multi-agent users

---

## 14. Appendix: Research Sources

### 14.1 NanoClaw Documentation

- Official site: https://nanoclaw.dev/
- Security model: https://nanoclaw.dev/blog/nanoclaw-security-model
- GitHub: https://github.com/qwibitai/nanoclaw
- Docker integration: https://www.docker.com/blog/nanoclaw-docker-sandboxes-agent-security/

### 14.2 Security Advisories

- Issue #458: Network egress vulnerability
- Issue #842: Anthropic refusal string injection
- Issue #584: Path traversal edge cases

### 14.3 OpenClaw Security Incidents

- CVE-2026-25253: WebSocket hijacking
- CVE-2026-28470: Command injection (exec approvals)
- CVE-2026-28391: Windows cmd.exe bypass
- CVE-2026-27487: macOS keychain injection

### 14.4 Comparison Articles

- "NanoClaw vs OpenClaw" — https://help.apiyi.com/en/nanoclaw-vs-openclaw-comparison-guide-en.html
- "AI Agent Frameworks Compared" — https://waelmansour.com/blog/ai-agent-frameworks-the-claw-ecosystem/

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-27 | Clawkeeper Engineering | Initial PRD |

---

**Next Steps:**
1. Review with product team
2. Validate with 2-3 enterprise customers
3. Prioritize phases based on feedback
4. Begin Phase 1 implementation
