# Battle Card: Clawkeeper vs ClawSec (Prompt Security)

## TL;DR

| | Clawkeeper (RAD Security) | ClawSec (Prompt Security) |
|---|---|---|
| **Type** | External security scanner + dashboard | OpenClaw skill (runs inside the agent) |
| **Checks** | 42 automated checks across 5 phases | ~12 checks (advisory feed + reputation + audit) |
| **Scope** | Full-stack: host OS + network + config + runtime + container | OpenClaw-only: skills + advisories |
| **Platform** | macOS + Linux (bare metal, Docker, K8s) | Any OS where OpenClaw runs (Node.js only) |
| **Remediation** | Auto-fix with interactive prompts | Manual (report only) + advisory-gated removal |
| **Dashboard** | Pro web dashboard with fleet monitoring | None (CLI output only) |
| **Deployment** | Independent bash script (zero deps) | Installed as OpenClaw skill via clawhub |
| **Pricing** | Free CLI / $29 Pro / Enterprise | Open source (free) |

---

## Positioning

**Clawkeeper** is an independent, external-first security scanner that treats the entire OpenClaw deployment surface as untrusted. It covers the full stack from OS hardening to container security to OpenClaw configuration. It runs outside the agent's trust boundary and reports to a centralized dashboard for fleet-wide visibility.

**ClawSec** is a first-party OpenClaw skill that runs inside the agent itself. It focuses narrowly on advisory feed monitoring and skill reputation scoring. It does not scan the host OS, network, containers, or credentials.

### Key Differentiator
> "ClawSec is like antivirus running inside a VM. Clawkeeper is the hypervisor security scanner that checks the VM itself, the host, the network, and the runtime."

---

## Feature Comparison

### What Clawkeeper Does That ClawSec Doesn't

| Category | Clawkeeper Check | ClawSec |
|---|---|---|
| **Host OS Hardening** | Firewall, FileVault/LUKS, admin user, Bluetooth, AirDrop, Siri, analytics, auto-login, location services, spotlight (13 macOS + 7 Linux) | None |
| **Network Security** | mDNS detection, network isolation audit, remote login, screen sharing, open ports | None |
| **Prerequisites** | Homebrew, Node.js, Docker, essential packages validation | None |
| **Gateway Config** | bind mode, auth mode, controlUI, mDNS discovery, exec consent, log redaction | None |
| **Advanced Gateway** | Elevated tools, browser control, group policy, plugin allowlist, trusted proxies, dangerous tool deny list | None |
| **Container Security** | User, capabilities, privileged mode, no-new-privileges, read-only FS, port binding, memory/CPU limits, network mode, volume mounts (13 sub-checks) | None |
| **Credential Scanning** | Config, shell history, MEMORY.md, session logs, credential store perms | None |
| **CVE Detection** | Known CVE database (CVE-2026-24763, CVE-2026-25253) | Advisory feed (signed, requires skill installation) |
| **.env Security** | File permission checks across common paths | None |
| **SOUL.md Integrity** | Prompt injection, base64, Unicode steganography, credential leaks, file size | None |
| **Skills Security** | Dangerous install commands, secret injection, data exfiltration patterns | Advisory matching only |
| **OpenClaw Hardening** | Sandbox mode, exec policy, DM scope/policy, filesystem restriction, log redaction | None |
| **Auto-Fix** | Interactive remediation for 20+ issues | Advisory-gated skill removal only |
| **Fleet Dashboard** | Centralized web dashboard, alerting, history | None |
| **Grading** | A-F letter grade with 0-100 score | None |

### What ClawSec Does That Clawkeeper Doesn't

| Feature | ClawSec | Clawkeeper |
|---|---|---|
| **Cryptographic Advisory Feed** | Signed JSON feed with Ed25519 signatures + SHA-256 checksums | Static CVE list in check script |
| **Skill Reputation Scoring** | 7-check reputation system (age, downloads, author, VirusTotal integration) | Pattern-based static analysis |
| **Guarded Installation Hook** | Intercepts `clawhub install` to block unsafe skills before installation | Post-install scan only |
| **Real-time Advisory Monitoring** | Heartbeat hook runs every 5 minutes | On-demand or hourly cron |
| **Feed Suppression Config** | Teams can allowlist reviewed advisories with justification | No suppression system |
| **NVD Polling Workflow** | GitHub Actions auto-polls NVD for new OpenClaw CVEs | Manual CVE list updates |

---

## Objection Handling

### "ClawSec is free and open source"
Clawkeeper's CLI is also free. The 42-check scanner, auto-fix, and letter grading are completely free. Pro adds fleet monitoring and alerting for $29/mo. ClawSec is free but only covers a fraction of the attack surface.

### "ClawSec has a signed advisory feed with cryptographic verification"
This is impressive engineering, but it only covers known skill-level vulnerabilities. It doesn't detect misconfigurations, exposed credentials, weak container settings, or host-level issues that represent 80%+ of real-world security failures. As OpenClaw's own docs say: "Most failures here are not fancy exploits -- they're someone messaged the bot and the bot did what they asked."

### "ClawSec has VirusTotal integration"
ClawSec's reputation checker includes a VirusTotal scan, which is valuable for known-malicious packages. However, Clawkeeper's SOUL.md integrity check catches prompt injection, Unicode steganography, and hidden base64 payloads -- attack vectors that VirusTotal doesn't detect because they're semantic, not binary.

### "ClawSec runs inside the agent for continuous monitoring"
Running security inside the agent is a double-edged sword. If the agent is compromised, the security tool is too. Clawkeeper runs externally, treating the agent as untrusted -- a more robust security posture. For continuous monitoring, Clawkeeper's agent uploads results every hour to a tamper-resistant dashboard.

### "We already use ClawSec, why switch?"
Don't switch -- add Clawkeeper alongside ClawSec. They're complementary:
- ClawSec: real-time advisory feed for skill-level threats
- Clawkeeper: full-stack security posture for the entire deployment

---

## Sales Motion

1. **Lead with the gap**: "ClawSec only covers skills and advisories. Who's checking your gateway config, container security, and credential exposure?"
2. **Demo the scan**: Run `curl -fsSL https://clawkeeper.dev/install.sh | bash` -- 60-second scan with immediate A-F grade
3. **Show the dashboard**: Fleet-wide visibility, trending scores, alert rules
4. **Land and expand**: Free CLI -> Pro dashboard -> Enterprise K8s with eBPF runtime detection

---

## Win Themes

- **Full-stack vs narrow**: 42 checks vs ~12
- **External trust boundary**: Scanner runs outside the agent
- **Auto-remediation**: Fix issues interactively, not just report them
- **Fleet visibility**: Centralized dashboard for multi-host monitoring
- **Enterprise path**: Kubernetes hardening with eBPF (RAD Security platform)
