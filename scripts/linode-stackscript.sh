#!/bin/bash
# <UDF name="openclaw_user" label="Username for OpenClaw" default="openclaw" />
# <UDF name="ssh_pubkey" label="SSH Public Key (required)" />
# <UDF name="deploy_mode" label="Deployment Mode" oneOf="docker,native" default="docker" />
# <UDF name="anthropic_api_key" label="Anthropic API Key (optional)" default="" />
# <UDF name="notify_email" label="Notification Email (optional)" default="" />
#
# ============================================================================
# Clawkeeper Linode StackScript
# One-click hardened OpenClaw server deployment
#
# Usage: Create a new Linode → Select this StackScript → Fill in parameters
#        Your server will be ready in ~5 minutes with:
#        - Hardened SSH (key-only, no root login)
#        - Firewall configured (UFW)
#        - Fail2ban for brute-force protection
#        - Docker or native OpenClaw installation
#        - Auto-updates enabled
#
# By RAD Security — https://rad.security
# ============================================================================

set -euo pipefail

exec > >(tee /var/log/clawkeeper-stackscript.log) 2>&1
echo "=== Clawkeeper StackScript started at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="

# --- Configuration from UDF variables ---
OPENCLAW_USER="${LINODE_DATACENTERID:+$OPENCLAW_USER}"
OPENCLAW_USER="${OPENCLAW_USER:-openclaw}"
SSH_PUBKEY="${SSH_PUBKEY:-}"
DEPLOY_MODE="${DEPLOY_MODE:-docker}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# --- Validation ---
if [ -z "$SSH_PUBKEY" ]; then
    echo "ERROR: SSH public key is required"
    exit 1
fi

# --- System Updates ---
echo ">>> Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

# --- Essential Packages ---
echo ">>> Installing essential packages..."
apt-get install -y -qq \
    curl \
    git \
    openssl \
    ca-certificates \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges

# --- Create dedicated user ---
echo ">>> Creating user: $OPENCLAW_USER"
if ! id "$OPENCLAW_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$OPENCLAW_USER"
fi

# Configure SSH key for the user
mkdir -p "/home/$OPENCLAW_USER/.ssh"
echo "$SSH_PUBKEY" > "/home/$OPENCLAW_USER/.ssh/authorized_keys"
chmod 700 "/home/$OPENCLAW_USER/.ssh"
chmod 600 "/home/$OPENCLAW_USER/.ssh/authorized_keys"
chown -R "$OPENCLAW_USER:$OPENCLAW_USER" "/home/$OPENCLAW_USER/.ssh"

# Add to sudo group (for initial setup, can be removed later)
usermod -aG sudo "$OPENCLAW_USER"
echo "$OPENCLAW_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/$OPENCLAW_USER"
chmod 440 "/etc/sudoers.d/$OPENCLAW_USER"

# --- SSH Hardening ---
echo ">>> Hardening SSH configuration..."
SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup original
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.backup.$(date +%s)"

# Apply hardened settings
cat > /etc/ssh/sshd_config.d/99-clawkeeper-hardening.conf << 'SSHD_EOF'
# Clawkeeper SSH Hardening
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*
Subsystem sftp /usr/lib/openssh/sftp-server
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
SSHD_EOF

# Validate and reload SSH
if sshd -t; then
    systemctl reload sshd
    echo "SSH hardening applied successfully"
else
    echo "WARNING: SSH config validation failed, reverting..."
    rm -f /etc/ssh/sshd_config.d/99-clawkeeper-hardening.conf
fi

# --- Firewall (UFW) ---
echo ">>> Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 18789/tcp comment 'OpenClaw Gateway (localhost recommended)'
ufw --force enable
ufw status verbose

# --- Fail2ban ---
echo ">>> Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << 'FAIL2BAN_EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
FAIL2BAN_EOF

systemctl enable fail2ban
systemctl restart fail2ban

# --- Auto-updates ---
echo ">>> Enabling automatic security updates..."
cat > /etc/apt/apt.conf.d/20auto-upgrades << 'AUTOUPDATE_EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
AUTOUPDATE_EOF

cat > /etc/apt/apt.conf.d/50unattended-upgrades << 'UNATTENDED_EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
UNATTENDED_EOF

systemctl enable unattended-upgrades
systemctl start unattended-upgrades

# --- Docker Installation (if selected) ---
if [ "$DEPLOY_MODE" = "docker" ]; then
    echo ">>> Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$OPENCLAW_USER"
    systemctl enable docker
    systemctl start docker
    
    # Install Docker Compose plugin
    apt-get install -y -qq docker-compose-plugin
    
    echo "Docker installed: $(docker --version)"
fi

# --- Node.js Installation (if native mode) ---
if [ "$DEPLOY_MODE" = "native" ]; then
    echo ">>> Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
    echo "Node.js installed: $(node --version)"
fi

# --- Clawkeeper Installation ---
echo ">>> Installing Clawkeeper..."
CLAWKEEPER_DIR="/home/$OPENCLAW_USER/.local/bin"
mkdir -p "$CLAWKEEPER_DIR"
curl -fsSL https://clawkeeper.dev/clawkeeper.sh -o "$CLAWKEEPER_DIR/clawkeeper.sh"
chmod +x "$CLAWKEEPER_DIR/clawkeeper.sh"
chown -R "$OPENCLAW_USER:$OPENCLAW_USER" "/home/$OPENCLAW_USER/.local"

# Add to PATH in user's profile
echo 'export PATH="$HOME/.local/bin:$PATH"' >> "/home/$OPENCLAW_USER/.bashrc"

# --- OpenClaw Directory Structure ---
echo ">>> Setting up OpenClaw directories..."
OPENCLAW_CONFIG_DIR="/home/$OPENCLAW_USER/.openclaw"
OPENCLAW_WORKSPACE="/home/$OPENCLAW_USER/openclaw/workspace"

mkdir -p "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE"
chmod 700 "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE"
chown -R "$OPENCLAW_USER:$OPENCLAW_USER" "$OPENCLAW_CONFIG_DIR" "/home/$OPENCLAW_USER/openclaw"

# --- Environment File ---
echo ">>> Creating secure .env file..."
GATEWAY_TOKEN=$(openssl rand -hex 24)

cat > "$OPENCLAW_CONFIG_DIR/.env" << ENV_EOF
# Clawkeeper — OpenClaw Environment
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Linode: $(hostname)

GATEWAY_TOKEN=$GATEWAY_TOKEN
ENV_EOF

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >> "$OPENCLAW_CONFIG_DIR/.env"
fi

chmod 600 "$OPENCLAW_CONFIG_DIR/.env"
chown "$OPENCLAW_USER:$OPENCLAW_USER" "$OPENCLAW_CONFIG_DIR/.env"

# --- OpenClaw Configuration ---
echo ">>> Creating hardened openclaw.json..."
cat > "$OPENCLAW_CONFIG_DIR/openclaw.json" << CONFIG_EOF
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "allowTailscale": false
    },
    "controlUi": {
      "enabled": false
    }
  },
  "discovery": {
    "mdns": {
      "mode": "off"
    },
    "wideArea": {
      "enabled": false
    }
  },
  "tools": {
    "exec": {
      "applyPatch": {
        "workspaceOnly": true
      }
    }
  },
  "logging": {
    "redactSensitive": "tools"
  }
}
CONFIG_EOF

chmod 600 "$OPENCLAW_CONFIG_DIR/openclaw.json"
chown "$OPENCLAW_USER:$OPENCLAW_USER" "$OPENCLAW_CONFIG_DIR/openclaw.json"

# --- Docker Compose (if Docker mode) ---
if [ "$DEPLOY_MODE" = "docker" ]; then
    echo ">>> Creating hardened docker-compose.yml..."
    OPENCLAW_DOCKER_DIR="/home/$OPENCLAW_USER/openclaw-docker"
    mkdir -p "$OPENCLAW_DOCKER_DIR"
    
    cat > "$OPENCLAW_DOCKER_DIR/docker-compose.yml" << 'COMPOSE_EOF'
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    container_name: openclaw
    restart: unless-stopped
    user: "1000:1000"
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    security_opt:
      - no-new-privileges:true
    read_only: true
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4g
        reservations:
          cpus: "0.25"
          memory: 512m
    ports:
      - "127.0.0.1:18789:18789"
    volumes:
      - ${HOME}/.openclaw:/home/node/.openclaw:rw
      - ${HOME}/openclaw/workspace:/home/node/.openclaw/workspace:rw
    tmpfs:
      - /tmp:size=100m,noexec,nosuid
      - /home/node/.npm:size=100m,noexec,nosuid
    environment:
      - OPENCLAW_DISABLE_BONJOUR=1
      - OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}
    networks:
      - openclaw-isolated
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:18789/health", "-o", "/dev/null"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

networks:
  openclaw-isolated:
    driver: bridge
    internal: false
COMPOSE_EOF

    # Copy .env for docker-compose
    cp "$OPENCLAW_CONFIG_DIR/.env" "$OPENCLAW_DOCKER_DIR/.env"
    
    chmod 700 "$OPENCLAW_DOCKER_DIR"
    chown -R "$OPENCLAW_USER:$OPENCLAW_USER" "$OPENCLAW_DOCKER_DIR"
    
    # Start OpenClaw container
    echo ">>> Starting OpenClaw container..."
    su - "$OPENCLAW_USER" -c "cd $OPENCLAW_DOCKER_DIR && docker compose pull && docker compose up -d"
fi

# --- Systemd Service (if native mode) ---
if [ "$DEPLOY_MODE" = "native" ]; then
    echo ">>> Installing OpenClaw via npm..."
    su - "$OPENCLAW_USER" -c "npm install -g @anthropic-ai/openclaw"
    
    echo ">>> Creating systemd service..."
    cat > /etc/systemd/system/openclaw.service << SERVICE_EOF
[Unit]
Description=OpenClaw AI Agent Gateway
After=network.target

[Service]
Type=simple
User=$OPENCLAW_USER
Group=$OPENCLAW_USER
WorkingDirectory=/home/$OPENCLAW_USER/openclaw/workspace
ExecStart=/usr/bin/openclaw gateway --port 18789
Restart=on-failure
RestartSec=5
Environment=OPENCLAW_DISABLE_BONJOUR=1
EnvironmentFile=/home/$OPENCLAW_USER/.openclaw/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only
ReadWritePaths=/home/$OPENCLAW_USER/.openclaw /home/$OPENCLAW_USER/openclaw/workspace
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

[Install]
WantedBy=multi-user.target
SERVICE_EOF

    systemctl daemon-reload
    systemctl enable openclaw
    systemctl start openclaw
fi

# --- Summary ---
echo ""
echo "============================================================================"
echo "  Clawkeeper Linode Setup Complete!"
echo "============================================================================"
echo ""
echo "  Server: $(hostname) ($(curl -sf --max-time 3 https://ifconfig.me 2>/dev/null || echo 'IP pending'))"
echo "  User:   $OPENCLAW_USER"
echo "  Mode:   $DEPLOY_MODE"
echo ""
echo "  Gateway Token (SAVE THIS):"
echo "  $GATEWAY_TOKEN"
echo ""
echo "  Connect from your local machine:"
echo "  ssh -N -L 18789:127.0.0.1:18789 $OPENCLAW_USER@$(curl -sf --max-time 3 https://ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""
echo "  Then configure your IDE to use: http://localhost:18789"
echo ""
echo "  Run a security audit:"
echo "  ssh $OPENCLAW_USER@YOUR_SERVER_IP 'clawkeeper.sh scan'"
echo ""
echo "============================================================================"

# --- Optional: Email notification ---
if [ -n "$NOTIFY_EMAIL" ]; then
    if command -v mail &>/dev/null; then
        echo "Clawkeeper setup complete on $(hostname). Gateway token: $GATEWAY_TOKEN" | \
            mail -s "Clawkeeper Ready: $(hostname)" "$NOTIFY_EMAIL"
    fi
fi

echo "=== Clawkeeper StackScript completed at $(date -u +"%Y-%m-%dT%H:%M:%SZ") ==="
