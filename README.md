
<img src="https://rad-website.fly.dev/api/media/file/clawkeeper-banner-small.png" width="100%" align="center" />
<p align="center">
<pre align="center">
     ██████╗██╗      █████╗ ██╗    ██╗██╗  ██╗███████╗███████╗██████╗ ███████╗██████╗
    ██╔════╝██║     ██╔══██╗██║    ██║██║ ██╔╝██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
    ██║     ██║     ███████║██║ █╗ ██║█████╔╝ █████╗  █████╗  ██████╔╝█████╗  ██████╔╝
    ██║     ██║     ██╔══██║██║███╗██║██╔═██╗ ██╔══╝  ██╔══╝  ██╔═══╝ ██╔══╝  ██╔══██╗
    ╚██████╗███████╗██║  ██║╚███╔███╔╝██║  ██╗███████╗███████╗██║     ███████╗██║  ██║
     ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝
</pre>
<br>
<strong>Security scanner for AI agent hosts.</strong>
<br>
Audit your machine. Fix what's broken. Ship with confidence.
<br><br>
<a href="https://clawkeeper.dev"><img src="https://img.shields.io/badge/website-clawkeeper.dev-00D4AA?style=for-the-badge" alt="Website"></a>
<a href="#install"><img src="https://img.shields.io/badge/install-curl_|_bash-00D4AA?style=for-the-badge" alt="Install"></a>
<a href="https://github.com/rad-security/clawkeeper/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-blue?style=for-the-badge" alt="License"></a>
</p>

---

## The problem

You're deploying AI agents on real machines. Those machines have Bluetooth on, firewalls off, admin accounts everywhere, credentials sitting in shell history, and Docker containers running as root with every capability known to Linux.

Nobody checks this stuff. Until something goes wrong.

## The fix

One command. 42 security checks. Auto-fix for the easy ones.

```bash
curl -fsSL https://clawkeeper.dev/install.sh | bash
```

That's it. Clawkeeper scans your macOS or Linux host, finds every misconfiguration that matters when you're running AI agents, and tells you exactly what to fix — or fixes it for you.

## What it looks like

```
   ┌────────────────────────────────────────┐
   │                                        │
   │       Clawkeeper Security Scan         │
   │                                        │
   └────────────────────────────────────────┘

═══ Phase 1 of 5: macOS Host Hardening ═══

Step 1: Siri
  → Siri indexes files, contacts, messages, and app activity locally.
  → A compromised agent could query this index to enumerate sensitive data.
  ✓ Siri is disabled

Step 7: macOS Firewall
  → Host-level firewall provides defense in depth beyond network isolation.
  ⚠ macOS Firewall is OFF
  ✗ macOS Firewall is off
  → Fix now? [y/N]  y
  ✓ Firewall enabled (with stealth mode)

═══ Phase 5 of 5: Security Audit ═══

Step 23: Credential Exposure Scan
  → Scans config files, shell history, and session logs for exposed credentials.
  ✗ API key found in ~/.openclaw/config.yaml

════════════════════════════════════════════════════

  Security Grade: B (87% of checks passing)

  ✓ Passed:  22
  ✗ Failed:  3
  ⊘ Accepted: 1

════════════════════════════════════════════════════
```

## What it checks

**42 checks across 5 phases:**

### Phase 1: Host Hardening
| Check | Platform | What it catches |
|-------|----------|----------------|
| Siri | macOS | Data indexing exposure |
| Location Services | macOS | Metadata leakage |
| Bluetooth | macOS | Unnecessary radio interface |
| AirDrop & Handoff | macOS | Network-discoverable services |
| Analytics | macOS | Telemetry data exfiltration |
| Spotlight | macOS | Content indexing exposure |
| Firewall | macOS | Missing host firewall |
| FileVault | macOS | Unencrypted disk |
| User Account | macOS | Running as admin |
| iCloud | macOS | Cloud sync of agent data |
| Automatic Login | macOS | Physical access bypass |
| SSH Hardening | Linux | Weak SSH configuration |
| Firewall (UFW) | Linux | Missing firewall rules |
| Auto Security Updates | Linux | Unpatched vulnerabilities |
| Fail2ban | Linux | Brute force exposure |
| Disk Encryption | Linux | Unencrypted disk |
| Unnecessary Services | Linux | Expanded attack surface |

### Phase 2: Network
| Check | What it catches |
|-------|----------------|
| Network Isolation | Agent on shared network |
| Screen Sharing | Remote access enabled |
| Remote Login (SSH) | Unintended SSH access |
| mDNS / Bonjour | Broadcasting agent presence |
| Network Configuration | Linux network misconfig |
| Open Ports Audit | Unexpected listening ports |

### Phase 3: Prerequisites
Docker, Node.js, Homebrew, essential packages — ensures your stack is ready.

### Phase 4: Installation
Detects running OpenClaw instances — Docker containers and bare-metal processes.

### Phase 5: Security Audit
| Check | What it catches |
|-------|----------------|
| Container User | Running as root (uid 0) |
| Capabilities | Unnecessary Linux capabilities |
| Privileged Mode | Full host access from container |
| Port Binding | Ports exposed to 0.0.0.0 |
| Gateway Auth | Missing authentication |
| Gateway Bind | Accepting remote connections |
| Credential Exposure | Keys in config/history/logs |
| Skills Security | Malicious skill packages |
| SOUL.md Security | Sensitive data in system prompts |
| .env Permissions | World-readable secrets |
| Config Permissions | Insecure config files |

## Features

- **Pure bash** — zero dependencies, runs anywhere (macOS 13+, Ubuntu 22.04+, Debian 12+)
- **Interactive auto-fix** — fixes firewall, encryption, permissions, packages interactively
- **Non-interactive mode** — `clawkeeper.sh scan --non-interactive` for CI/CD pipelines
- **Report export** — `clawkeeper.sh scan --report results.txt` for audit trails
- **Agent mode** — scheduled hourly scans with dashboard upload
- **Modular checks** — each check is a standalone script in `checks/`

## Install

### One-liner (recommended)

```bash
curl -fsSL https://clawkeeper.dev/install.sh | bash
```

Downloads to `~/.local/bin/clawkeeper.sh` and adds it to your PATH.

### Manual

```bash
git clone https://github.com/rad-security/clawkeeper.git
cd clawkeeper
chmod +x clawkeeper.sh
./clawkeeper.sh
```

## Usage

```bash
# Interactive setup wizard (first run)
clawkeeper.sh

# Security scan with interactive fixes
clawkeeper.sh scan

# Non-interactive scan (CI/CD)
clawkeeper.sh scan --non-interactive

# Scan with report file
clawkeeper.sh scan --report audit.txt

# Connect to dashboard for tracking
clawkeeper.sh agent --install

# Check agent status
clawkeeper.sh agent --status

# Run scheduled scan manually
clawkeeper.sh agent run
```

## Dashboard

Free dashboard at [clawkeeper.dev](https://clawkeeper.dev) to track scores over time across your fleet:

- **Grade tracking** — letter grades A through F, trend over time
- **Fleet view** — all your hosts at a glance
- **Event timeline** — grade changes, check flips, agent activity
- **Drift detection** — know when a machine's security posture degrades

```bash
# Sign up, get an API key, then:
clawkeeper.sh agent --install
# Enter your API key — scans upload automatically every hour
```

## Project structure

```
clawkeeper.sh           # Main scanner (bundled — do not edit directly)
lib/
  helpers.sh            # JSON output helpers, shared functions
  orchestrator.sh       # CLI entrypoint, phase management, grading
checks/
  firewall/
    check.sh            # Detection logic
    check.toml          # Metadata (name, phase, platform, order)
    remediate.sh        # Auto-fix logic (optional)
  bluetooth/
    check.sh
    check.toml
  ...                   # 42 checks total
scripts/
  bundle.sh             # Concatenates lib/ + checks/ → clawkeeper.sh
  verify-parity.sh      # Verifies bundled script matches source
  e2e-cli-test.sh       # End-to-end CLI test suite
install.sh              # Installer (curl | bash target)
```

## Adding a check

Each check is a directory under `checks/` with at minimum:

**`check.toml`** — metadata:
```toml
id = "my_check"
name = "My Security Check"
phase = "security_audit"     # host_hardening | network | prerequisites | security_audit
platform = "all"             # macos | linux | all
description = "What this check verifies."
requires_sudo = false
order = 99
```

**`check.sh`** — detection logic using the helper functions:
```bash
#!/bin/bash
# Source helpers (available when bundled)
if some_bad_condition; then
    emit_fail "Something is wrong" "My Security Check"
else
    emit_pass "Everything looks good" "My Security Check"
fi
```

**`remediate.sh`** (optional) — auto-fix:
```bash
#!/bin/bash
# Fix the issue
fix_the_thing
emit_pass "Fixed it" "My Security Check"
```

Then rebuild the bundle:

```bash
bash scripts/bundle.sh
```

## Contributing

We'd love your help. Here's how:

1. **New checks** — see [Adding a check](#adding-a-check) above
2. **Platform support** — Windows/WSL, NixOS, Fedora, etc.
3. **Bug fixes** — if a check is wrong on your setup, open an issue with your OS version
4. **Documentation** — improve explanations of what checks do and why they matter

```bash
# Fork, clone, create a branch
git clone https://github.com/YOUR_USERNAME/clawkeeper.git
cd clawkeeper

# Make your changes in checks/ or lib/
# Rebuild the bundle
bash scripts/bundle.sh

# Test
bash scripts/e2e-cli-test.sh

# Open a PR
```

## License

[Apache License 2.0](LICENSE) — use it, fork it, ship it. See [LICENSE](LICENSE) for details.

## Built by

[RAD Security](https://rad.security) — Runtime-powered cloud native security.

---

<p align="center">
<sub>If Clawkeeper helped you, give it a star. It helps others find it.</sub>
</p>
