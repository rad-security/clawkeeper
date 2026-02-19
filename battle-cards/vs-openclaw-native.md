# Battle Card: Clawkeeper vs OpenClaw Native Security

## TL;DR

| | Clawkeeper (RAD Security) | OpenClaw Native (`openclaw security audit`) |
|---|---|---|
| **Type** | External scanner + fleet dashboard | Built-in CLI command |
| **Checks** | 42 automated across 5 phases | ~15 (gateway + file perms + tool access) |
| **Scope** | Full-stack: host + network + container + config + credentials + skills | OpenClaw config and runtime only |
| **Auto-Fix** | Interactive remediation for 20+ issues | `--fix` flag for some issues |
| **Dashboard** | Web dashboard with history, alerts, fleet view | None (terminal output only) |
| **Runs Without OpenClaw** | Yes (pure bash, zero dependencies) | No (requires OpenClaw installed) |
| **Grading** | A-F letter grade with 0-100 score | Pass/warn/fail per check |

---

## Positioning

OpenClaw's built-in `openclaw security audit` is a good first step -- it checks gateway exposure, file permissions, and basic tool configuration. But it only sees what OpenClaw itself can see. It cannot audit the host OS, network, container configuration, or credential hygiene.

**Clawkeeper** starts where OpenClaw's audit stops. It covers all of OpenClaw's native checks PLUS 27 additional checks across the full deployment stack.

### Key Differentiator
> "OpenClaw's audit tells you if the front door is locked. Clawkeeper checks the front door, back door, windows, foundation, roof, alarm system, and the neighborhood."

---

## Feature Comparison

### OpenClaw Native Security Features vs Clawkeeper Coverage

| OpenClaw Native Feature | Clawkeeper Coverage | Notes |
|---|---|---|
| `gateway.bind` mode check | `openclaw_config` check | Clawkeeper checks the same setting |
| Gateway auth (token/password) | `openclaw_config` check | Clawkeeper checks auth mode |
| File permissions (~/.openclaw/) | `openclaw_config` + `credential_store` | Clawkeeper also checks credentials/, OAuth profiles, session stores |
| Tool access controls (deny lists) | `gateway_advanced` check | Clawkeeper checks dangerous tool groups, elevated tools |
| Browser control exposure | `gateway_advanced` check | Clawkeeper flags browser mode != off |
| DM policy (pairing/allowlist/open) | `openclaw_hardening` check | Identical coverage |
| Session isolation (dmScope) | `openclaw_hardening` check | Identical coverage |
| Sandbox configuration | `openclaw_hardening` check | Identical coverage |
| Filesystem restriction | `openclaw_hardening` check | Identical coverage |
| Log redaction | `openclaw_config` + `openclaw_hardening` | Both basic and advanced checks |
| mDNS/discovery mode | `openclaw_config` + `mdns_bonjour` | Clawkeeper also detects active mDNS broadcasts |
| Plugin security | `gateway_advanced` check | Clawkeeper checks plugin allowlist |
| exec.ask consent mode | `openclaw_config` check | Identical coverage |
| Trusted proxy config | `gateway_advanced` check | Clawkeeper checks trustedProxies |
| Control UI exposure | `openclaw_config` check | Identical coverage |
| Credential exposure | `credential_exposure` check | Clawkeeper scans config, history, MEMORY.md, sessions |
| `--deep` gateway probe | Not replicated | OpenClaw probes live gateway connections |
| `detect-secrets` CI integration | Not replicated | CI-level secret scanning |

### What Clawkeeper Adds Beyond Native Security

| Category | Checks | Count |
|---|---|---|
| **macOS Host Hardening** | Firewall, FileVault, admin user, Bluetooth, AirDrop, Siri, analytics, auto-login, location services, spotlight, iCloud, screen sharing, remote login | 13 |
| **Linux Host Hardening** | UFW firewall, fail2ban, user account, disk encryption, SSH hardening, auto-updates, unnecessary services | 7 |
| **Network Security** | mDNS broadcast detection, network isolation, remote login, screen sharing, open ports audit | 5 |
| **Container Security** | User (non-root), capabilities, privileged mode, no-new-privileges, read-only FS, port binding, memory/CPU limits, network mode, Bonjour, volume mounts | 13 sub-checks |
| **Prerequisites** | Homebrew, Node.js, Docker, essential packages | 5 |
| **CVE Detection** | Known CVE database (gateway auth bypass, 1-click RCE) | Version-aware |
| **Skills Security** | Dangerous install commands, secret injection, data exfiltration | Static analysis |
| **SOUL.md Integrity** | Prompt injection, base64, Unicode steganography, credential leaks, file size | 5 sub-checks |
| **.env Security** | File permissions across common installation paths | Multi-path |
| **Credential Store** | credentials/ directory, OAuth profiles, session transcripts, log files | 4 sub-checks |
| **Fleet Dashboard** | Centralized monitoring, alerts, history, team management | Pro tier |

---

## Objection Handling

### "OpenClaw already has `security audit` built in"
Yes, and it's a solid baseline. But it only checks OpenClaw's own configuration. It doesn't know if your host firewall is off, your Docker container is running as root with privileged mode, or if your API keys are sitting in your bash history. Clawkeeper covers 42 checks -- roughly 3x the surface area.

### "We can just run `openclaw security audit --fix`"
`--fix` only remediates OpenClaw config issues. Clawkeeper's auto-fix covers host OS settings too: enabling firewalls, setting file permissions, installing fail2ban, disabling Bluetooth/AirDrop, hardening SSH, and more. Plus Clawkeeper's fixes are interactive -- it explains what it's about to do and asks for confirmation.

### "Why pay for Clawkeeper when the native audit is free?"
Clawkeeper's CLI is also free. The 42-check scan, auto-fix, and letter grade are completely free, forever. You only pay for the Pro dashboard ($29/mo) if you want fleet-wide monitoring, historical trends, and alerting. The native audit has no centralized view for managing multiple hosts.

### "The `--deep` flag does live gateway probing"
This is a genuine unique capability of OpenClaw's native audit -- it probes live gateway connections. Clawkeeper takes a different approach: checking the configuration statically AND detecting exposed processes/ports at the OS level. Both approaches catch different things. Use them together.

### "We prefer tools that are part of the OpenClaw ecosystem"
Clawkeeper complements the native audit -- it doesn't replace it. Think of it as a second opinion from an independent source. Security best practice is layered defense: OpenClaw's audit checks from the inside, Clawkeeper checks from the outside.

---

## Head-to-Head Summary

```
                        OpenClaw Native    Clawkeeper
Host OS checks          0                  20 (macOS + Linux)
Network checks          0                  5
Container checks        0                  13
Config checks           ~10                ~15
Credential checks       1 (file perms)     8 (multi-source)
Skills checks           0                  4
CVE checks              0                  Yes
Auto-remediation        --fix flag         Interactive 20+ fixes
Grading                 None               A-F + score
Dashboard               None               Pro web dashboard
Alerting                None               Email + webhook
Fleet management        None               50+ hosts (Pro)
                        ───────            ───────
Total checks            ~10                42
```

---

## Sales Motion

1. **Validate their effort**: "Smart that you're using `openclaw security audit`. Let's see what it misses."
2. **Run the scan**: Show the Clawkeeper scan finding issues native audit doesn't cover (container, host, network, credentials)
3. **Quantify the gap**: "Native audit covers ~10 checks. Clawkeeper covers 42. That's 32 blind spots."
4. **Show the grade**: The A-F letter grade makes it tangible for non-security stakeholders
5. **Upsell the dashboard**: "Now imagine seeing this across all 50 of your OpenClaw hosts"
6. **Enterprise motion**: "For Kubernetes, RAD Security adds eBPF runtime detection on top"

---

## Win Themes

- **Coverage depth**: 42 vs ~10 checks
- **Full-stack visibility**: Host, network, container, config, credentials
- **External validation**: Independent scanner, not marking its own homework
- **Fleet management**: Centralized dashboard vs per-host terminal output
- **Enterprise path**: K8s hardening + eBPF runtime detection
