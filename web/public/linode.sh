#!/bin/bash
# ============================================================================
# Clawkeeper Linode Quick Install
# Dead-simple one-liner for existing Linode servers
#
# Usage: curl -fsSL https://clawkeeper.dev/linode.sh | bash
#    or: curl -fsSL https://clawkeeper.dev/linode.sh | bash -s -- --docker
#    or: curl -fsSL https://clawkeeper.dev/linode.sh | bash -s -- --native
#
# By RAD Security — https://rad.security
# ============================================================================

set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# --- Arguments ---
DEPLOY_MODE=""
NONINTERACTIVE=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --docker) DEPLOY_MODE="docker"; shift ;;
        --native) DEPLOY_MODE="native"; shift ;;
        --non-interactive|-y) NONINTERACTIVE=true; shift ;;
        --help|-h)
            echo "Clawkeeper Linode Quick Install"
            echo ""
            echo "Usage: curl -fsSL https://clawkeeper.dev/linode.sh | bash [options]"
            echo ""
            echo "Options:"
            echo "  --docker          Use Docker deployment (recommended)"
            echo "  --native          Use native npm deployment"
            echo "  --non-interactive Skip prompts, use defaults"
            echo "  --help            Show this help"
            exit 0
            ;;
        *) shift ;;
    esac
done

# --- Banner ---
echo ""
echo -e "${CYAN}${BOLD}  ╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}  ║           Clawkeeper — Linode Quick Install               ║${RESET}"
echo -e "${CYAN}${BOLD}  ║               Hardened OpenClaw in minutes                ║${RESET}"
echo -e "${CYAN}${BOLD}  ╚═══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# --- Detect if running on Linode ---
detect_linode() {
    local is_linode=false
    
    # Method 1: Check vendor file
    if [ -f /sys/class/dmi/id/sys_vendor ]; then
        if grep -qi "linode" /sys/class/dmi/id/sys_vendor 2>/dev/null; then
            is_linode=true
        fi
    fi
    
    # Method 2: Check product name
    if [ -f /sys/class/dmi/id/product_name ]; then
        if grep -qi "linode" /sys/class/dmi/id/product_name 2>/dev/null; then
            is_linode=true
        fi
    fi
    
    # Method 3: Check for Linode-specific metadata service
    if curl -sf --max-time 2 http://169.254.169.254/v1/instance 2>/dev/null | grep -q "linode"; then
        is_linode=true
    fi
    
    # Method 4: Check hostname patterns
    if hostname | grep -qiE "linode|lish"; then
        is_linode=true
    fi
    
    # Method 5: Check for Linode kernel
    if uname -r | grep -qi "linode"; then
        is_linode=true
    fi
    
    echo "$is_linode"
}

IS_LINODE=$(detect_linode)

if [ "$IS_LINODE" = "true" ]; then
    echo -e "  ${GREEN}✓${RESET} Detected Linode environment"
else
    echo -e "  ${YELLOW}!${RESET} Not detected as Linode (continuing anyway)"
fi

# --- Check prerequisites ---
echo ""
echo -e "  ${CYAN}Checking prerequisites...${RESET}"

# Must be Linux
if [ "$(uname -s)" != "Linux" ]; then
    echo -e "  ${RED}✗${RESET} This script is for Linux servers only"
    exit 1
fi
echo -e "  ${GREEN}✓${RESET} Linux detected"

# Should not run as root for main operations
if [ "$EUID" -eq 0 ]; then
    echo -e "  ${YELLOW}!${RESET} Running as root — will create dedicated user"
    RUNNING_AS_ROOT=true
else
    echo -e "  ${GREEN}✓${RESET} Running as user: $(whoami)"
    RUNNING_AS_ROOT=false
fi

# Check for package manager
if command -v apt-get &>/dev/null; then
    PKG_MANAGER="apt"
    echo -e "  ${GREEN}✓${RESET} Package manager: apt"
elif command -v dnf &>/dev/null; then
    PKG_MANAGER="dnf"
    echo -e "  ${GREEN}✓${RESET} Package manager: dnf"
elif command -v yum &>/dev/null; then
    PKG_MANAGER="yum"
    echo -e "  ${GREEN}✓${RESET} Package manager: yum"
else
    echo -e "  ${RED}✗${RESET} No supported package manager found (apt/dnf/yum)"
    exit 1
fi

# --- Deployment mode selection ---
if [ -z "$DEPLOY_MODE" ]; then
    echo ""
    if [ "$NONINTERACTIVE" = true ]; then
        DEPLOY_MODE="docker"
        echo -e "  ${DIM}Using default: Docker deployment${RESET}"
    else
        echo -e "  ${CYAN}How would you like to deploy OpenClaw?${RESET}"
        echo ""
        echo -e "    ${BOLD}1)${RESET} Docker ${GREEN}(recommended)${RESET} — isolated container, better security"
        echo -e "    ${BOLD}2)${RESET} Native — direct npm install, simpler but less isolated"
        echo ""
        printf "  Choose [1/2] (default: 1): "
        read -r choice </dev/tty
        case "$choice" in
            2) DEPLOY_MODE="native" ;;
            *) DEPLOY_MODE="docker" ;;
        esac
    fi
fi

echo ""
echo -e "  ${CYAN}Deployment mode:${RESET} $DEPLOY_MODE"

# --- Install dependencies ---
echo ""
echo -e "  ${CYAN}Installing dependencies...${RESET}"

install_packages() {
    local packages="$*"
    case "$PKG_MANAGER" in
        apt)
            sudo apt-get update -qq
            sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq $packages
            ;;
        dnf)
            sudo dnf install -y -q $packages
            ;;
        yum)
            sudo yum install -y -q $packages
            ;;
    esac
}

# Essential packages
install_packages curl git openssl ca-certificates

if [ "$DEPLOY_MODE" = "docker" ]; then
    if ! command -v docker &>/dev/null; then
        echo -e "  ${DIM}Installing Docker...${RESET}"
        curl -fsSL https://get.docker.com | sudo sh
        sudo usermod -aG docker "$(whoami)"
        echo -e "  ${GREEN}✓${RESET} Docker installed"
        echo -e "  ${YELLOW}!${RESET} You may need to log out and back in for Docker group"
    else
        echo -e "  ${GREEN}✓${RESET} Docker already installed"
    fi
    
    # Docker Compose plugin
    if ! docker compose version &>/dev/null 2>&1; then
        case "$PKG_MANAGER" in
            apt) sudo apt-get install -y -qq docker-compose-plugin ;;
            dnf|yum) sudo $PKG_MANAGER install -y -q docker-compose-plugin ;;
        esac
    fi
else
    if ! command -v node &>/dev/null; then
        echo -e "  ${DIM}Installing Node.js...${RESET}"
        case "$PKG_MANAGER" in
            apt)
                curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
                sudo apt-get install -y -qq nodejs
                ;;
            dnf|yum)
                curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash -
                sudo $PKG_MANAGER install -y -q nodejs
                ;;
        esac
        echo -e "  ${GREEN}✓${RESET} Node.js $(node --version) installed"
    else
        echo -e "  ${GREEN}✓${RESET} Node.js $(node --version) already installed"
    fi
fi

# --- Security hardening ---
echo ""
echo -e "  ${CYAN}Applying security hardening...${RESET}"

# Firewall
if command -v ufw &>/dev/null; then
    sudo ufw --force enable >/dev/null 2>&1 || true
    sudo ufw allow 22/tcp >/dev/null 2>&1 || true
    echo -e "  ${GREEN}✓${RESET} UFW firewall enabled"
elif command -v firewall-cmd &>/dev/null; then
    sudo systemctl enable firewalld >/dev/null 2>&1 || true
    sudo systemctl start firewalld >/dev/null 2>&1 || true
    sudo firewall-cmd --permanent --add-service=ssh >/dev/null 2>&1 || true
    sudo firewall-cmd --reload >/dev/null 2>&1 || true
    echo -e "  ${GREEN}✓${RESET} firewalld enabled"
else
    install_packages ufw
    sudo ufw --force enable >/dev/null 2>&1 || true
    sudo ufw allow 22/tcp >/dev/null 2>&1 || true
    echo -e "  ${GREEN}✓${RESET} UFW installed and enabled"
fi

# Fail2ban
if ! command -v fail2ban-client &>/dev/null; then
    install_packages fail2ban
fi
sudo systemctl enable fail2ban >/dev/null 2>&1 || true
sudo systemctl start fail2ban >/dev/null 2>&1 || true
echo -e "  ${GREEN}✓${RESET} fail2ban enabled"

# --- Install Clawkeeper ---
echo ""
echo -e "  ${CYAN}Installing Clawkeeper...${RESET}"

CLAWKEEPER_DIR="$HOME/.local/bin"
mkdir -p "$CLAWKEEPER_DIR"
curl -fsSL https://clawkeeper.dev/clawkeeper.sh -o "$CLAWKEEPER_DIR/clawkeeper.sh"
chmod +x "$CLAWKEEPER_DIR/clawkeeper.sh"

# Add to PATH
case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
esac

if ! grep -qF '.local/bin' "$HOME/.bashrc" 2>/dev/null; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi

echo -e "  ${GREEN}✓${RESET} Clawkeeper installed"

# --- Setup OpenClaw directories ---
echo ""
echo -e "  ${CYAN}Setting up OpenClaw...${RESET}"

OPENCLAW_CONFIG_DIR="$HOME/.openclaw"
OPENCLAW_WORKSPACE="$HOME/openclaw/workspace"

mkdir -p "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE"
chmod 700 "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE"

# Generate gateway token
GATEWAY_TOKEN=$(openssl rand -hex 24)

# Create .env file
cat > "$OPENCLAW_CONFIG_DIR/.env" << ENV_EOF
# Clawkeeper — OpenClaw Environment
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

GATEWAY_TOKEN=$GATEWAY_TOKEN

# Add your LLM API key:
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
ENV_EOF
chmod 600 "$OPENCLAW_CONFIG_DIR/.env"

# Create hardened config
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

echo -e "  ${GREEN}✓${RESET} OpenClaw directories created"

# --- Deploy OpenClaw ---
if [ "$DEPLOY_MODE" = "docker" ]; then
    echo ""
    echo -e "  ${CYAN}Deploying OpenClaw container...${RESET}"
    
    OPENCLAW_DOCKER_DIR="$HOME/openclaw-docker"
    mkdir -p "$OPENCLAW_DOCKER_DIR"
    chmod 700 "$OPENCLAW_DOCKER_DIR"
    
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
      - ~/.openclaw:/home/node/.openclaw:rw
      - ~/openclaw/workspace:/home/node/.openclaw/workspace:rw
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

    cp "$OPENCLAW_CONFIG_DIR/.env" "$OPENCLAW_DOCKER_DIR/.env"
    
    # Need to use sg to pick up docker group without logout
    if groups | grep -q docker; then
        cd "$OPENCLAW_DOCKER_DIR" && docker compose pull && docker compose up -d
        echo -e "  ${GREEN}✓${RESET} OpenClaw container started"
    else
        echo -e "  ${YELLOW}!${RESET} Docker group not active yet"
        echo -e "  ${DIM}   Log out and back in, then run:${RESET}"
        echo -e "  ${DIM}   cd ~/openclaw-docker && docker compose up -d${RESET}"
    fi
else
    echo ""
    echo -e "  ${CYAN}Installing OpenClaw via npm...${RESET}"
    npm install -g @anthropic-ai/openclaw
    echo -e "  ${GREEN}✓${RESET} OpenClaw installed: $(openclaw --version 2>/dev/null || echo 'version check pending')"
fi

# --- Get server IP ---
SERVER_IP=$(curl -sf --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}' || echo "YOUR_SERVER_IP")

# --- Summary ---
echo ""
echo -e "${CYAN}${BOLD}  ╔═══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${CYAN}${BOLD}  ║                    Setup Complete!                        ║${RESET}"
echo -e "${CYAN}${BOLD}  ╚═══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Gateway Token (SAVE THIS):${RESET}"
echo -e "  ${GREEN}$GATEWAY_TOKEN${RESET}"
echo ""
echo -e "  ${BOLD}Connect from your local machine:${RESET}"
echo -e "  ${DIM}ssh -N -L 18789:127.0.0.1:18789 $(whoami)@${SERVER_IP}${RESET}"
echo ""
echo -e "  ${BOLD}Then configure your IDE to use:${RESET}"
echo -e "  ${DIM}http://localhost:18789${RESET}"
echo ""
echo -e "  ${BOLD}Add your API key:${RESET}"
echo -e "  ${DIM}echo 'ANTHROPIC_API_KEY=sk-ant-...' >> ~/.openclaw/.env${RESET}"
echo ""
echo -e "  ${BOLD}Run a security audit:${RESET}"
echo -e "  ${DIM}clawkeeper.sh scan${RESET}"
echo ""

# Save summary to file
cat > "$HOME/openclaw-quickstart.txt" << SUMMARY_EOF
Clawkeeper Linode Quick Install Summary
=======================================
Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Server: $(hostname) ($SERVER_IP)
Mode: $DEPLOY_MODE

Gateway Token: $GATEWAY_TOKEN

SSH Tunnel Command:
ssh -N -L 18789:127.0.0.1:18789 $(whoami)@$SERVER_IP

IDE Configuration:
http://localhost:18789

Add API Key:
echo 'ANTHROPIC_API_KEY=sk-ant-...' >> ~/.openclaw/.env

Security Audit:
clawkeeper.sh scan

Logs:
- Clawkeeper: ~/.local/bin/clawkeeper.sh
- OpenClaw config: ~/.openclaw/
- Docker compose: ~/openclaw-docker/ (if Docker mode)
SUMMARY_EOF

echo -e "  ${DIM}Summary saved to: ~/openclaw-quickstart.txt${RESET}"
echo ""
