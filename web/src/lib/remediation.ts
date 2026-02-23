// Comprehensive remediation guidance for every check emitted by the Clawkeeper CLI.
// Keys MUST match the exact check_name strings from emit_pass / emit_fail in clawkeeper.sh.

export const REMEDIATION: Record<string, { summary: string; steps: string[] }> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // macOS Host Hardening
  // ═══════════════════════════════════════════════════════════════════════════

  "FileVault": {
    summary: "Enable full-disk encryption to protect data at rest.",
    steps: [
      "Open System Settings → Privacy & Security → FileVault",
      "Click \"Turn On FileVault…\" and follow the prompts",
      "Save your recovery key in a safe place (password manager, not iCloud)",
      "Encryption happens in the background — keep the Mac plugged in",
    ],
  },
  "Firewall": {
    summary: "Enable the firewall to block unauthorized inbound connections.",
    steps: [
      "macOS: System Settings → Network → Firewall → Turn On",
      "Enable \"Block all incoming connections\" for maximum protection",
      "CLI: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on",
      "Linux: sudo ufw enable && sudo ufw default deny incoming",
    ],
  },
  "User Account": {
    summary: "Run as a standard (non-admin) user to limit blast radius.",
    steps: [
      "Create a new standard user account named 'openclaw'",
      "macOS: System Settings → Users & Groups → Add User → Standard",
      "Linux: sudo adduser openclaw && sudo usermod -aG docker openclaw",
      "Log in as the new user and run Clawkeeper from there",
    ],
  },
  "Siri": {
    summary: "Disable Siri to prevent voice-activated data leakage.",
    steps: [
      "System Settings → Siri & Spotlight → Disable \"Ask Siri\"",
      "Also disable \"Listen for 'Hey Siri'\"",
      "Consider disabling Siri Suggestions under individual apps",
    ],
  },
  "Location Services": {
    summary: "Disable location tracking to reduce privacy exposure.",
    steps: [
      "System Settings → Privacy & Security → Location Services",
      "Turn off the master toggle, or disable per-app",
      "Also disable \"System Services\" location items you don't need",
    ],
  },
  "Bluetooth": {
    summary: "Turn off Bluetooth when not in use to reduce attack surface.",
    steps: [
      "System Settings → Bluetooth → Turn Off",
      "Or click the Bluetooth icon in the menu bar and toggle off",
      "Re-enable only when you need to pair a device",
    ],
  },
  "AirDrop & Handoff": {
    summary: "Disable AirDrop and Handoff to prevent proximity-based attacks.",
    steps: [
      "System Settings → General → AirDrop & Handoff",
      "Set AirDrop to \"No One\"",
      "Turn off \"Allow Handoff between this Mac and your iCloud devices\"",
    ],
  },
  "iCloud": {
    summary: "Sign out of iCloud on infrastructure hosts to prevent cloud sync of sensitive data.",
    steps: [
      "System Settings → Apple ID → Sign Out",
      "Choose whether to keep local copies of iCloud data",
      "This prevents automatic sync of Desktop, Documents, Keychain, etc.",
    ],
  },
  "Automatic Login": {
    summary: "Disable automatic login so the machine requires authentication at boot.",
    steps: [
      "System Settings → Users & Groups → Login Options",
      "Set \"Automatic login\" to Off",
      "This ensures someone must enter a password to access the machine",
    ],
  },
  "Analytics & Telemetry": {
    summary: "Disable analytics to prevent sending diagnostic data to Apple and app developers.",
    steps: [
      "System Settings → Privacy & Security → Analytics & Improvements",
      "Uncheck all options: Share Mac Analytics, Improve Siri, Share with App Developers, etc.",
    ],
  },
  "Spotlight Indexing": {
    summary: "Disable Spotlight indexing on servers to save CPU and prevent data leakage.",
    steps: [
      "Run: sudo mdutil -a -i off",
      "This disables Spotlight indexing on all volumes",
      "To re-enable later: sudo mdutil -a -i on",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Linux Host Hardening
  // ═══════════════════════════════════════════════════════════════════════════

  "Auto Updates": {
    summary: "Enable automatic security updates to patch vulnerabilities promptly.",
    steps: [
      "Debian/Ubuntu: sudo apt install unattended-upgrades",
      "Then: sudo dpkg-reconfigure -plow unattended-upgrades",
      "RHEL/CentOS: sudo dnf install dnf-automatic && sudo systemctl enable --now dnf-automatic.timer",
    ],
  },
  "Disk Encryption": {
    summary: "Enable LUKS full-disk encryption to protect data at rest.",
    steps: [
      "For new installs: enable encryption during OS installation",
      "For existing systems: back up data, then use cryptsetup to encrypt partitions",
      "Ensure you store the encryption passphrase securely",
    ],
  },
  "Fail2ban": {
    summary: "Install fail2ban to automatically block brute-force login attempts.",
    steps: [
      "sudo apt install fail2ban   # Debian/Ubuntu",
      "sudo systemctl enable --now fail2ban",
      "Configure /etc/fail2ban/jail.local for SSH protection",
      "Verify: sudo fail2ban-client status sshd",
    ],
  },
  "Unnecessary Services": {
    summary: "Disable services you don't need to reduce attack surface.",
    steps: [
      "List running services: systemctl list-units --type=service --state=running",
      "Disable unneeded ones: sudo systemctl disable --now <service>",
      "Common candidates: cups, avahi-daemon, bluetooth",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SSH Hardening
  // ═══════════════════════════════════════════════════════════════════════════

  "SSH Hardening": {
    summary: "Harden SSH configuration to prevent unauthorized access.",
    steps: [
      "Edit /etc/ssh/sshd_config (or create a drop-in in /etc/ssh/sshd_config.d/)",
      "Set: PermitRootLogin no",
      "Set: PasswordAuthentication no",
      "Set: X11Forwarding no",
      "Set: MaxAuthTries 3",
      "Restart: sudo systemctl restart sshd",
    ],
  },
  "PermitRootLogin": {
    summary: "Disable root SSH login to prevent direct root access.",
    steps: [
      "Edit /etc/ssh/sshd_config",
      "Set: PermitRootLogin no",
      "Restart: sudo systemctl restart sshd",
      "Use a regular user + sudo instead of logging in as root",
    ],
  },
  "PasswordAuthentication": {
    summary: "Disable password-based SSH login and use key-based auth instead.",
    steps: [
      "First, ensure your SSH key is set up: ssh-copy-id user@host",
      "Edit /etc/ssh/sshd_config",
      "Set: PasswordAuthentication no",
      "Restart: sudo systemctl restart sshd",
    ],
  },
  "X11Forwarding": {
    summary: "Disable X11 forwarding on headless servers.",
    steps: [
      "Edit /etc/ssh/sshd_config",
      "Set: X11Forwarding no",
      "Restart: sudo systemctl restart sshd",
    ],
  },
  "MaxAuthTries": {
    summary: "Limit SSH authentication attempts to slow brute-force attacks.",
    steps: [
      "Edit /etc/ssh/sshd_config",
      "Set: MaxAuthTries 3",
      "Restart: sudo systemctl restart sshd",
      "Combine with fail2ban for best protection",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Network
  // ═══════════════════════════════════════════════════════════════════════════

  "Remote Login": {
    summary: "Disable SSH/Remote Login if you don't need remote access.",
    steps: [
      "macOS: System Settings → General → Sharing → Remote Login → turn off",
      "CLI: sudo systemsetup -setremotelogin off",
      "If SSH is needed, harden it (key-only auth, no root login)",
    ],
  },
  "Screen Sharing": {
    summary: "Disable screen sharing if not needed.",
    steps: [
      "System Settings → General → Sharing → Screen Sharing → turn off",
      "If needed, restrict to specific users and require VNC password",
    ],
  },
  "Network": {
    summary: "Network information displayed for manual review.",
    steps: [
      "Review the network configuration for unexpected interfaces or routes",
      "Ensure the host is on the expected network segment",
    ],
  },
  "Network Isolation": {
    summary: "Verify the host has proper network isolation.",
    steps: [
      "Ensure the host is behind a firewall or on a private network",
      "OpenClaw should not be directly exposed to the internet",
      "Use a reverse proxy (nginx, Caddy) for any public endpoints",
    ],
  },
  "mDNS": {
    summary: "Disable mDNS/Bonjour to prevent broadcasting your presence on the LAN.",
    steps: [
      "Set OPENCLAW_DISABLE_BONJOUR=1 in your environment",
      "Or set discovery.mdns.mode: \"off\" in OpenClaw config",
      "Linux: sudo systemctl disable --now avahi-daemon",
    ],
  },
  "Open Ports": {
    summary: "Restrict exposed ports — the OpenClaw gateway should not listen on all interfaces.",
    steps: [
      "Bind the gateway to localhost: set gateway.bind: loopback",
      "If using Docker, bind ports to 127.0.0.1 only: -p 127.0.0.1:18789:18789",
      "Use a firewall to block port 18789 from external access",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Prerequisites
  // ═══════════════════════════════════════════════════════════════════════════

  "Homebrew": {
    summary: "Install Homebrew (macOS package manager).",
    steps: [
      "Run: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"",
      "Follow the post-install instructions to add brew to your PATH",
    ],
  },
  "Node.js": {
    summary: "Install Node.js 22+ (required for OpenClaw).",
    steps: [
      "macOS: brew install node@22",
      "Linux (Debian/Ubuntu): curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs",
      "Verify: node --version (should be v22+)",
    ],
  },
  "Docker": {
    summary: "Install and start Docker.",
    steps: [
      "macOS: brew install --cask docker (then open Docker Desktop)",
      "Linux: follow https://docs.docker.com/engine/install/ for your distro",
      "Verify: docker --version && docker ps",
    ],
  },
  "Docker Settings": {
    summary: "Harden Docker Desktop security settings.",
    steps: [
      "Open Docker Desktop → Settings → General",
      "Enable: Use containerd for pulling and storing images",
      "Settings → Resources: limit CPU and memory",
      "Settings → Docker Engine: review daemon.json for security options",
    ],
  },
  "Docker Group": {
    summary: "Add your user to the docker group to run Docker without sudo.",
    steps: [
      "sudo usermod -aG docker $USER",
      "Log out and back in for the group change to take effect",
      "Verify: docker ps (should work without sudo)",
    ],
  },
  "Essentials": {
    summary: "Install required system packages.",
    steps: [
      "Debian/Ubuntu: sudo apt install -y curl jq git",
      "RHEL/CentOS: sudo dnf install -y curl jq git",
      "macOS: brew install curl jq git",
    ],
  },
  "OpenClaw npm": {
    summary: "Install OpenClaw via npm.",
    steps: [
      "npm install -g openclaw",
      "Or use npx: npx openclaw",
      "Verify: openclaw --version",
    ],
  },
  "OpenClaw Version": {
    summary: "Your OpenClaw version has no known CVEs — no action needed.",
    steps: [
      "Keep OpenClaw up to date: npm update -g openclaw",
      "Check for updates periodically: npm outdated -g openclaw",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OpenClaw Gateway & Config
  // ═══════════════════════════════════════════════════════════════════════════

  "OpenClaw Gateway": {
    summary: "The gateway is listening on all interfaces — bind to localhost only.",
    steps: [
      "Edit your OpenClaw config file (usually ~/.openclaw/config.json)",
      "Set: \"gateway\": { \"bind\": \"loopback\" }",
      "Restart OpenClaw for the change to take effect",
      "Verify: the gateway should only be reachable at 127.0.0.1:18789",
    ],
  },
  "Config Permissions": {
    summary: "Set config directory permissions to 700 (owner-only).",
    steps: [
      "chmod 700 ~/.openclaw",
      "This prevents other users from reading your OpenClaw configuration",
    ],
  },
  "Config File Permissions": {
    summary: "Set config file permissions to 600 (owner-only read/write).",
    steps: [
      "chmod 600 ~/.openclaw/config.json",
      "This prevents other users from reading secrets in your config",
    ],
  },
  "gateway.bind": {
    summary: "Bind the gateway to loopback to prevent remote access.",
    steps: [
      "In your OpenClaw config, set: gateway.bind: \"loopback\"",
      "This ensures the gateway only accepts connections from localhost",
      "Remote access should go through SSH tunnel or reverse proxy instead",
    ],
  },
  "gateway.auth": {
    summary: "Enable token authentication on the gateway.",
    steps: [
      "In your OpenClaw config, set: gateway.auth.mode: \"token\"",
      "This requires a valid token for all gateway connections",
      "Tokens are managed automatically by the OpenClaw client",
    ],
  },
  "gateway.controlUi": {
    summary: "Disable the web control UI to reduce attack surface.",
    steps: [
      "In your OpenClaw config, set: gateway.controlUi.enabled: false",
      "The web UI provides a remote administration surface that should be disabled in production",
    ],
  },
  // Legacy alias (old check_name, kept for backwards compatibility with existing scan data)
  "gateway.controlUI": {
    summary: "Disable the web control UI to reduce attack surface.",
    steps: [
      "In your OpenClaw config, set: gateway.controlUi.enabled: false",
      "The web UI provides a remote administration surface that should be disabled in production",
    ],
  },
  "discovery": {
    summary: "Disable mDNS discovery to stop broadcasting on the network.",
    steps: [
      "In your OpenClaw config, set: discovery.mdns.mode: \"off\"",
      "Also set: discovery.wideArea.enabled: false",
      "This prevents the gateway from advertising via Bonjour/mDNS or DNS-SD",
    ],
  },
  // Legacy alias (old check_name)
  "gateway.discover": {
    summary: "Disable mDNS discovery to stop broadcasting on the network.",
    steps: [
      "In your OpenClaw config, set: discovery.mdns.mode: \"off\"",
      "Also set: discovery.wideArea.enabled: false",
      "This prevents the gateway from advertising via Bonjour/mDNS or DNS-SD",
    ],
  },
  // Legacy alias (removed from OpenClaw schema — kept for old scan data)
  "exec.ask": {
    summary: "This setting was removed from OpenClaw. Use tools.exec.ask instead.",
    steps: [
      "In your OpenClaw config, set: tools.exec.ask: \"always\"",
      "This ensures you are prompted before any command execution",
    ],
  },
  "logging.redactSensitive": {
    summary: "Enable sensitive log redaction to prevent secrets from appearing in logs.",
    steps: [
      "In your OpenClaw config, set: logging.redactSensitive: \"tools\"",
      "This redacts API keys, tokens, and other sensitive data from all log output",
    ],
  },
  "OpenClaw Config": {
    summary: "Harden the OpenClaw configuration file.",
    steps: [
      "Ensure config directory is 700: chmod 700 ~/.openclaw",
      "Ensure config file is 600: chmod 600 ~/.openclaw/config.json",
      "Bind gateway to loopback, enable token auth, disable control UI",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Security Audit — Sandbox & Execution
  // ═══════════════════════════════════════════════════════════════════════════

  "Sandbox Mode": {
    summary: "Set sandbox mode to 'all' so every agent action runs in the sandbox.",
    steps: [
      "In your OpenClaw config, set: agents.defaults.sandbox.mode: \"all\"",
      "This confines all agent code execution to the sandbox environment",
    ],
  },
  "Exec Policy": {
    summary: "Set exec host to 'sandbox' to prevent direct host execution.",
    steps: [
      "In your OpenClaw config, set: tools.exec.host: \"sandbox\"",
      "Never use 'gateway' or 'elevated' in production",
    ],
  },
  "DM Scope": {
    summary: "Set DM scope to 'per-channel-peer' for session isolation.",
    steps: [
      "In your OpenClaw config, set: session.dmScope: \"per-channel-peer\"",
      "This ensures DM conversations are isolated between different channels",
    ],
  },
  "DM Policy": {
    summary: "Set DM policy to 'pairing' to require mutual opt-in.",
    steps: [
      "In your OpenClaw config, set: session.dmPolicy: \"pairing\"",
      "This prevents unauthorized users from initiating DM sessions with the bot",
    ],
  },
  "Filesystem Restriction": {
    summary: "Restrict file access to workspace directory only.",
    steps: [
      "In your OpenClaw config, set: tools.fs.workspaceOnly: true",
      "This prevents agents from accessing files outside their workspace",
    ],
  },
  "Log Redaction Level": {
    summary: "Set log redaction to 'tools' for complete coverage.",
    steps: [
      "In your OpenClaw config, set: logging.redactSensitive: \"tools\"",
      "This provides the highest level of sensitive data redaction in logs",
    ],
  },
  "Elevated Tools": {
    summary: "Disable elevated tool execution.",
    steps: [
      "In your OpenClaw config, set: tools.elevated.enabled: false",
      "Or remove the tools.elevated section entirely",
      "Elevated execution grants host-level privileges to tools — avoid in production",
    ],
  },
  "Browser Control": {
    summary: "Disable browser control to prevent operator-level web access.",
    steps: [
      "In your OpenClaw config, set: browser.mode: \"off\"",
      "Browser control gives agents the ability to interact with web pages on your behalf",
    ],
  },
  "Group Mention Policy": {
    summary: "Require @mention so the bot only responds when explicitly addressed.",
    steps: [
      "In your OpenClaw config, set: channels.requireMention: true",
      "This prevents the bot from processing every message in group channels",
    ],
  },
  "Group Access Policy": {
    summary: "Restrict group access with an allowlist.",
    steps: [
      "In your OpenClaw config, set: channels.groupPolicy: \"allowlist\"",
      "Then specify allowed groups in channels.groups.allow",
    ],
  },
  "Plugin Allowlist": {
    summary: "Explicitly allowlist plugins instead of loading all.",
    steps: [
      "In your OpenClaw config, add: plugins.allow: [\"plugin-a\", \"plugin-b\"]",
      "Only trusted, reviewed plugins should be on the allowlist",
    ],
  },
  "Trusted Proxies": {
    summary: "Configure trusted proxies when the gateway is behind a reverse proxy.",
    steps: [
      "In your OpenClaw config, set: gateway.trustedProxies: [\"127.0.0.1\"]",
      "This ensures IP-based security checks use the real client IP",
    ],
  },
  "Tool Deny List": {
    summary: "Deny dangerous tool groups: automation, runtime, fs.",
    steps: [
      "In your OpenClaw config, set: tools.deny: [\"automation\", \"runtime\", \"fs\"]",
      "This blocks access to the most dangerous tool categories",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Container Security (Docker)
  // ═══════════════════════════════════════════════════════════════════════════

  "Container User": {
    summary: "Run the container as a non-root user.",
    steps: [
      "In your Dockerfile, add: USER openclaw (or any non-root user)",
      "In docker-compose.yml, add: user: \"1000:1000\"",
      "Verify: docker exec <container> id (should show non-root uid)",
    ],
  },
  "Capabilities": {
    summary: "Drop all Linux capabilities to minimize container privileges.",
    steps: [
      "In docker-compose.yml, add: cap_drop: [\"ALL\"]",
      "In docker run, add: --cap-drop ALL",
      "Only add back specific capabilities you actually need with cap_add",
    ],
  },
  "Cap Add": {
    summary: "Minimize added capabilities — only add what's strictly needed.",
    steps: [
      "Review your cap_add list and remove any capabilities you don't need",
      "Only NET_BIND_SERVICE should typically be needed (for port binding)",
      "In docker-compose.yml: cap_add: [\"NET_BIND_SERVICE\"]",
    ],
  },
  "Privileged Mode": {
    summary: "CRITICAL: Never run containers in privileged mode.",
    steps: [
      "Remove --privileged from docker run",
      "Remove privileged: true from docker-compose.yml",
      "Use specific capabilities (cap_add) instead of full privileges",
      "Privileged mode gives the container root access to the host",
    ],
  },
  "No New Privileges": {
    summary: "Prevent processes inside the container from gaining new privileges.",
    steps: [
      "In docker-compose.yml, add: security_opt: [\"no-new-privileges:true\"]",
      "In docker run, add: --security-opt no-new-privileges",
    ],
  },
  "Read-Only FS": {
    summary: "Make the container filesystem read-only.",
    steps: [
      "In docker-compose.yml, add: read_only: true",
      "In docker run, add: --read-only",
      "Use tmpfs mounts for directories that need write access: tmpfs: [/tmp, /run]",
    ],
  },
  "Port Binding": {
    summary: "Bind container ports to localhost only, not all interfaces.",
    steps: [
      "Change: ports: [\"18789:18789\"]  →  ports: [\"127.0.0.1:18789:18789\"]",
      "This prevents the port from being accessible from the network",
      "Use a reverse proxy (nginx/Caddy) for any ports that need external access",
    ],
  },
  "Memory Limit": {
    summary: "Set a memory limit to prevent the container from exhausting host RAM.",
    steps: [
      "In docker-compose.yml: deploy: { resources: { limits: { memory: 512M } } }",
      "In docker run: --memory 512m",
      "Adjust the value based on your workload requirements",
    ],
  },
  "CPU Limit": {
    summary: "Set a CPU limit to prevent the container from exhausting host CPUs.",
    steps: [
      "In docker-compose.yml: deploy: { resources: { limits: { cpus: '1.0' } } }",
      "In docker run: --cpus 1.0",
      "Adjust the value based on your workload requirements",
    ],
  },
  "Network Mode": {
    summary: "CRITICAL: Do not use host network mode — use bridge or custom networks.",
    steps: [
      "Remove: network_mode: host from docker-compose.yml",
      "Use the default bridge network or create a custom network",
      "Custom network: docker network create openclaw-net",
    ],
  },
  "Container Bonjour": {
    summary: "Disable Bonjour discovery inside the container.",
    steps: [
      "Add to your container environment: OPENCLAW_DISABLE_BONJOUR=1",
      "In docker-compose.yml: environment: [\"OPENCLAW_DISABLE_BONJOUR=1\"]",
    ],
  },
  "Volume Mounts": {
    summary: "Remove sensitive host path mounts from the container.",
    steps: [
      "Never mount /, /etc, /var/run/docker.sock, or home directories",
      "Use named volumes instead of host-path mounts where possible",
      "Mount only the specific directories the application needs",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Credentials & Secrets
  // ═══════════════════════════════════════════════════════════════════════════

  "Credential Exposure": {
    summary: "CRITICAL: Plain-text credentials detected — rotate immediately.",
    steps: [
      "1. Rotate ALL exposed credentials immediately",
      "2. Move secrets to environment variables or a secrets manager (Vault, AWS Secrets Manager)",
      "3. Add sensitive files to .gitignore",
      "4. Re-run the Clawkeeper scan to verify remediation",
    ],
  },
  "Credential Exposure Config": {
    summary: "CRITICAL: Credentials found in the OpenClaw config file.",
    steps: [
      "1. Remove credentials from openclaw.json / config.json",
      "2. Set secrets via environment variables instead",
      "3. Rotate any exposed API keys or tokens",
      "4. Re-scan to verify",
    ],
  },
  "Credential Exposure History": {
    summary: "Credentials found in shell history.",
    steps: [
      "Clear your shell history: history -c && history -w",
      "Or remove the specific lines: edit ~/.bash_history / ~/.zsh_history",
      "Add HISTIGNORE patterns for sensitive commands",
      "Rotate any credentials that appeared in history",
    ],
  },
  "Credential Exposure Memory": {
    summary: "Credentials or improper permissions found in MEMORY.md.",
    steps: [
      "Fix permissions: chmod 600 MEMORY.md",
      "Remove any embedded credentials, API keys, or tokens",
      "Rotate any secrets that were stored in plaintext",
    ],
  },
  "Credential Exposure Sessions": {
    summary: "Credentials found in session transcript logs.",
    steps: [
      "Fix session directory permissions: chmod 700 on session directories",
      "Fix session file permissions: chmod 600 on session log files",
      "Remove or redact any logged credentials",
      "Rotate any exposed secrets",
    ],
  },
  "Credential Directory": {
    summary: "Fix credential directory permissions to 700 (owner-only).",
    steps: [
      "chmod 700 ~/.openclaw/credentials",
      "Verify: ls -la ~/.openclaw/ (credentials dir should show drwx------)",
    ],
  },
  "Credential Files": {
    summary: "Fix credential file permissions to 600 (owner-only read/write).",
    steps: [
      "chmod 600 ~/.openclaw/credentials/*",
      "Verify: ls -la ~/.openclaw/credentials/ (files should show -rw-------)",
    ],
  },
  "Credential Store": {
    summary: "Ensure the credential store is properly secured.",
    steps: [
      "Set credential directory permissions: chmod 700",
      "Set credential file permissions: chmod 600",
      "Set OAuth profile permissions: chmod 600",
      "Set session directory permissions: chmod 700",
    ],
  },
  "OAuth Profiles": {
    summary: "Ensure OAuth profile files have correct permissions.",
    steps: [
      "chmod 600 on all OAuth profile files",
      "These files contain access tokens and should not be world-readable",
    ],
  },
  "Session Transcripts": {
    summary: "Ensure session transcript directories have correct permissions.",
    steps: [
      "chmod 700 on session transcript directories",
      "chmod 600 on individual session log files",
      "Session logs may contain sensitive conversation data",
    ],
  },
  "Log Files": {
    summary: "Ensure log directory and files have correct permissions.",
    steps: [
      "chmod 700 on the log directory (/tmp/openclaw or configured path)",
      "chmod 600 on individual log files",
    ],
  },
  ".env Permissions": {
    summary: "Set .env file permissions to 600 so only the owner can read it.",
    steps: [
      "chmod 600 .env",
      ".env files typically contain secrets and should not be world-readable",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUL.md
  // ═══════════════════════════════════════════════════════════════════════════

  "Session Prompt Injection": {
    summary: "CRITICAL: Prompt injection detected in session transcripts.",
    steps: [
      "Review the flagged session JSONL files for injected instructions in user messages",
      "Look for jailbreak language, base64-encoded payloads, or invisible Unicode",
      "If injection was successful, review agent actions that followed the injected message",
      "Rotate any credentials the agent may have accessed after the injection",
      "Consider restricting agent permissions (sandbox mode, exec.ask: on)",
    ],
  },
  "Session Rogue Commands": {
    summary: "CRITICAL: Suspicious commands detected in agent session history.",
    steps: [
      "Review the flagged session files for the suspicious command patterns",
      "Check if any data exfiltration (curl POST), reverse shells, or privilege escalation occurred",
      "Audit what data the commands accessed or transmitted",
      "Rotate all credentials on the affected host",
      "Enable sandbox mode and exec.ask to prevent future unauthorized commands",
      "Review agent permissions and restrict tool access",
    ],
  },
  "Memory Prompt Injection": {
    summary: "CRITICAL: Prompt injection or poisoned instructions detected in MEMORY.md.",
    steps: [
      "Open ~/.openclaw/MEMORY.md and review for injected instructions",
      "Remove any jailbreak phrases, suspicious overrides, or encoded content",
      "Check for invisible Unicode characters (use a hex editor or cat -v)",
      "Remove any IP-based URLs that could be C2 callbacks",
      "Set permissions: chmod 600 ~/.openclaw/MEMORY.md",
      "Re-scan to verify the injection is removed",
    ],
  },
  "Log File Content": {
    summary: "Suspicious content detected in OpenClaw log files.",
    steps: [
      "Review log files in /tmp/openclaw/ for credential leaks or exploitation patterns",
      "Rotate any credentials found in log files",
      "Enable log redaction: set logging.redactSensitive: tools in OpenClaw config",
      "Set proper log permissions: chmod 700 /tmp/openclaw && chmod 600 /tmp/openclaw/*.log",
    ],
  },
  "SOUL.md Permissions": {
    summary: "Set SOUL.md permissions to 600 (owner-only).",
    steps: [
      "chmod 600 SOUL.md (or your configured soul file path)",
      "SOUL.md can contain sensitive system instructions",
    ],
  },
  "SOUL.md Sensitive Data": {
    summary: "Remove sensitive data (credentials, keys) from SOUL.md.",
    steps: [
      "Inspect SOUL.md for any API keys, tokens, passwords, or secrets",
      "Move secrets to environment variables or a secrets manager",
      "Rotate any credentials that were embedded in SOUL.md",
    ],
  },
  "SOUL.md Integrity": {
    summary: "Prompt injection or suspicious content detected in SOUL.md.",
    steps: [
      "Inspect SOUL.md for unexpected instructions (prompt injection)",
      "Look for base64-encoded content and decode it to check",
      "Check for invisible Unicode characters",
      "If compromised, restore SOUL.md from a known-good backup",
    ],
  },
  "SOUL.md Size": {
    summary: "SOUL.md is unusually large — review for bloat or injection.",
    steps: [
      "Check the file size: ls -la SOUL.md",
      "Review the content for unnecessary or injected text",
      "Keep SOUL.md focused and concise (under 10KB)",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Skills Security
  // ═══════════════════════════════════════════════════════════════════════════

  "Skills Directory Permissions": {
    summary: "Set skills directory permissions to 700 (owner-only).",
    steps: [
      "chmod 700 on the skills directory",
      "This prevents other users from modifying or injecting malicious skills",
    ],
  },
  "Skills Install Commands": {
    summary: "CRITICAL: A skill has dangerous install commands that could execute arbitrary code.",
    steps: [
      "Review the skill's install commands in its configuration",
      "Remove or quarantine any skill with suspicious install scripts",
      "Only install skills from trusted sources",
    ],
  },
  "Skills Secret Injection": {
    summary: "A skill injects secrets (API keys, tokens) into its environment.",
    steps: [
      "Review which secrets the skill is accessing",
      "Ensure the skill genuinely needs those secrets",
      "Consider using scoped tokens with minimal permissions",
    ],
  },
  "Skills Data Exfiltration": {
    summary: "A skill makes external network calls that could exfiltrate data.",
    steps: [
      "Review the skill's network calls and verify they are legitimate",
      "Check if the skill sends data to unexpected external endpoints",
      "Remove the skill if the network calls are suspicious",
    ],
  },
  "Skills Prompt Injection": {
    summary: "CRITICAL: A skill contains prompt injection language that could manipulate agent behavior.",
    steps: [
      "Review the flagged skill's body text for injection patterns (jailbreak language, override instructions)",
      "Quarantine or remove the skill: rename SKILL.md to SKILL.md.quarantined",
      "Check other skills for similar patterns",
      "Only install skills from trusted, verified sources",
    ],
  },
  "Skills Security": {
    summary: "Review and secure all installed skills.",
    steps: [
      "Set skills directory permissions to 700",
      "Review all skills for dangerous install commands",
      "Check for secret injection and data exfiltration patterns",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CVE Audit (dynamic — matched via prefix in ChecksTable)
  // ═══════════════════════════════════════════════════════════════════════════

  "CVE Audit": {
    summary: "The CVE audit checks your OpenClaw version against known vulnerabilities.",
    steps: [
      "If CVEs are found, upgrade OpenClaw: npm update -g openclaw",
      "For Docker: docker compose pull && docker compose up -d",
      "Re-scan after upgrading to verify the fix",
    ],
  },
};

/**
 * Get remediation for a check name.
 * Handles dynamic CVE check names like "CVE: CVE-2026-25253".
 */
export function getRemediation(checkName: string): { summary: string; steps: string[] } | null {
  // Direct match
  if (REMEDIATION[checkName]) return REMEDIATION[checkName];

  // CVE checks: "CVE: CVE-XXXX-XXXXX"
  if (checkName.startsWith("CVE: ")) {
    const cveId = checkName.replace("CVE: ", "").trim();
    return {
      summary: `Vulnerability ${cveId} detected — upgrade OpenClaw to the latest version.`,
      steps: [
        `1. Upgrade OpenClaw: npm install -g openclaw@latest`,
        `2. For Docker: update the image tag and run: docker compose pull && docker compose up -d`,
        `3. Re-run the Clawkeeper scan to verify the fix: clawkeeper scan`,
        `More info: https://nvd.nist.gov/vuln/detail/${cveId}`,
      ],
    };
  }

  return null;
}
