# ============================================================================
# Clawkeeper Deploy — OpenClaw installation and deployment (native + Docker)
# Concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

# --- Native (npm/npx) Deployment -------------------------------------------

OPENCLAW_NATIVE_DIR="$HOME/.openclaw"
OPENCLAW_NATIVE_WORKSPACE="$HOME/openclaw/workspace"

setup_native_openclaw_directories() {
    step_header "OpenClaw Directory Structure (Native)"
    info "Creating directories with secure permissions."

    for dir in "$OPENCLAW_NATIVE_DIR" "$OPENCLAW_NATIVE_WORKSPACE"; do
        if [ -d "$dir" ]; then
            local perms
            perms=$(stat -f "%OLp" "$dir" 2>/dev/null || stat -c "%a" "$dir" 2>/dev/null || echo "unknown")
            if [ "$perms" = "700" ]; then
                ok_msg "$dir exists (permissions: 700)"
            else
                warn_msg "$dir exists but permissions are $perms"
                chmod 700 "$dir"
                ok_msg "Fixed permissions to 700"
            fi
        else
            mkdir -p "$dir"
            chmod 700 "$dir"
            ok_msg "Created $dir (permissions: 700)"
        fi
    done

    pass "Directory structure ready" "Native Directories"
}

setup_native_env_file() {
    step_header "Environment & Secrets (.env)"
    info "API keys and tokens should live in the .env file, never in config files."

    local env_file="$OPENCLAW_NATIVE_DIR/.env"

    if [ -f "$env_file" ]; then
        info ".env file already exists at $env_file"
        local perms
        perms=$(stat -f "%OLp" "$env_file" 2>/dev/null || stat -c "%a" "$env_file" 2>/dev/null || echo "unknown")
        if [ "$perms" != "600" ]; then
            chmod 600 "$env_file"
            info "Fixed .env permissions to 600"
        fi

        if grep -q "GATEWAY_TOKEN=" "$env_file" 2>/dev/null; then
            pass ".env file exists with gateway token" "Native .env"
        else
            warn ".env exists but has no GATEWAY_TOKEN"
            local token
            token=$(generate_gateway_token)
            if [ -n "$token" ]; then
                echo "GATEWAY_TOKEN=$token" >> "$env_file"
                fixed "Generated and added GATEWAY_TOKEN" "Native .env"
                echo ""
                highlight_msg "  SAVE THIS TOKEN — you need it to connect clients:"
                accent_msg "  $token"
                echo ""
            fi
        fi

        if grep -qE "(ANTHROPIC_API_KEY|OPENAI_API_KEY)=" "$env_file" 2>/dev/null; then
            pass "LLM API key configured in .env" "Native API Key"
        else
            warn "No LLM API key found in .env"
            if ask_yn "Add your Anthropic API key now?"; then
                local api_key
                api_key=$(read_secret "Paste your Anthropic API key (sk-ant-...):" "sk-ant-...")
                if [ -n "$api_key" ]; then
                    echo "ANTHROPIC_API_KEY=$api_key" >> "$env_file"
                    fixed "Anthropic API key added to .env" "Native API Key"
                    unset api_key
                else
                    fail "No key provided" "Native API Key"
                fi
            else
                info "You can add it later: echo 'ANTHROPIC_API_KEY=sk-ant-...' >> $env_file"
                skipped "No LLM API key configured" "Native API Key"
            fi
        fi
        return
    fi

    # Create new .env file
    info "Creating .env file with gateway token..."
    local token
    token=$(generate_gateway_token)

    if [ -z "$token" ]; then
        fail "Could not generate gateway token" "Native .env"
        return
    fi

    {
        echo "# CLAW Keeper — OpenClaw native environment"
        echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo ""
        echo "# Gateway authentication token (required)"
        echo "GATEWAY_TOKEN=$token"
        echo ""
        echo "# LLM API key — uncomment and fill in your provider"
        echo "# ANTHROPIC_API_KEY=sk-ant-..."
        echo "# OPENAI_API_KEY=sk-..."
    } > "$env_file"

    chmod 600 "$env_file"

    echo ""
    highlight_msg "  SAVE THIS GATEWAY TOKEN — you need it to connect clients:"
    accent_msg "  $token"
    echo ""

    if ask_yn "Add your Anthropic API key now?"; then
        local api_key
        api_key=$(read_secret "Paste your Anthropic API key (sk-ant-...):" "sk-ant-...")
        if [ -n "$api_key" ]; then
            sed -i.bak "s|# ANTHROPIC_API_KEY=sk-ant-...|ANTHROPIC_API_KEY=$api_key|" "$env_file" 2>/dev/null || {
                echo "ANTHROPIC_API_KEY=$api_key" >> "$env_file"
            }
            rm -f "${env_file}.bak"
            fixed "Anthropic API key added" "Native API Key"
            unset api_key
        else
            info "Skipped — add it later by editing $env_file"
        fi
    else
        info "Add your API key later: edit $env_file"
    fi

    fixed ".env file created (permissions: 600)" "Native .env"
}

setup_native_launchd() {
    step_header "Auto-Start (launchd)"
    info "A LaunchAgent can start OpenClaw automatically when you log in."

    local plist_dir="$HOME/Library/LaunchAgents"
    local plist_file="$plist_dir/com.openclaw.agent.plist"

    if [ -f "$plist_file" ]; then
        pass "LaunchAgent already exists at $plist_file" "LaunchAgent"
        return
    fi

    if ! ask_yn "Create a LaunchAgent to auto-start OpenClaw on login?"; then
        skipped "LaunchAgent not created" "LaunchAgent"
        return
    fi

    mkdir -p "$plist_dir"

    local openclaw_bin
    openclaw_bin=$(command -v openclaw 2>/dev/null || echo "/usr/local/bin/openclaw")

    local env_file="$OPENCLAW_NATIVE_DIR/.env"
    local gateway_token=""
    if [ -f "$env_file" ]; then
        gateway_token=$(grep "^GATEWAY_TOKEN=" "$env_file" 2>/dev/null | cut -d= -f2 || echo "")
    fi

    cat > "$plist_file" << PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>${openclaw_bin}</string>
        <string>--gateway</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${OPENCLAW_NATIVE_WORKSPACE}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OPENCLAW_DISABLE_BONJOUR</key>
        <string>1</string>
        <key>GATEWAY_TOKEN</key>
        <string>${gateway_token}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.openclaw/openclaw.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.openclaw/openclaw-error.log</string>
</dict>
</plist>
PLIST_EOF

    chmod 644 "$plist_file"
    fixed "LaunchAgent created at $plist_file" "LaunchAgent"
    info "It will auto-start OpenClaw next time you log in."

    if ask_yn "Load and start OpenClaw now?"; then
        launchctl load "$plist_file" 2>/dev/null || true
        info "OpenClaw is starting..."
        sleep 3
        if pgrep -f "openclaw" &>/dev/null; then
            fixed "OpenClaw is running" "LaunchAgent Start"
        else
            warn "OpenClaw may still be starting — check with: launchctl list | grep openclaw"
        fi
    fi
}

# --- Docker -----------------------------------------------------------------

harden_docker_desktop() {
    # Check and fix Docker Desktop settings
    local docker_settings="$HOME/Library/Group Containers/group.com.docker/settings.json"

    if [ ! -f "$docker_settings" ]; then
        info "Docker Desktop settings file not found — using defaults"
        return
    fi

    local issues=()

    # Check telemetry
    if grep -q '"analyticsEnabled".*true' "$docker_settings" 2>/dev/null; then
        issues+=("telemetry")
    fi

    # Check resource limits (warn if very high or unlimited)
    local mem_limit
    mem_limit=$(grep -o '"memoryMiB"[[:space:]]*:[[:space:]]*[0-9]*' "$docker_settings" 2>/dev/null | grep -o '[0-9]*' || echo "0")
    if [ "$mem_limit" -gt 8192 ] 2>/dev/null; then
        issues+=("memory")
    fi

    local cpu_limit
    cpu_limit=$(grep -o '"cpus"[[:space:]]*:[[:space:]]*[0-9]*' "$docker_settings" 2>/dev/null | grep -o '[0-9]*' || echo "0")
    if [ "$cpu_limit" -gt 4 ] 2>/dev/null; then
        issues+=("cpu")
    fi

    if [ ${#issues[@]} -eq 0 ]; then
        pass "Docker Desktop settings look reasonable" "Docker Settings"
        return
    fi

    echo ""
    accent_msg "  Docker Desktop hardening:"

    for issue in "${issues[@]}"; do
        case "$issue" in
            telemetry)
                warn "Docker Desktop analytics/telemetry is enabled"
                info "Disable: Docker Desktop → Settings → General → uncheck 'Send usage statistics'"
                ;;
            memory)
                warn "Docker memory limit is high (${mem_limit}MB)"
                info "Recommend 4096MB max: Docker Desktop → Settings → Resources → Memory"
                ;;
            cpu)
                warn "Docker CPU limit is high (${cpu_limit} CPUs)"
                info "Recommend 2 CPUs max: Docker Desktop → Settings → Resources → CPUs"
                ;;
        esac
    done

    fail "Docker Desktop settings need hardening (adjust manually in Docker Desktop → Settings)" "Docker Settings"
}

# --- OpenClaw Docker Deployment ---------------------------------------------

OPENCLAW_DIR="$HOME/openclaw-docker"
OPENCLAW_CONFIG_DIR="$HOME/.openclaw"
OPENCLAW_WORKSPACE="$HOME/openclaw/workspace"

setup_openclaw_directories() {
    step_header "OpenClaw Directory Structure"
    info "Creating directories with secure permissions."

    local dirs_ok=true

    for dir in "$OPENCLAW_CONFIG_DIR" "$OPENCLAW_WORKSPACE" "$OPENCLAW_DIR"; do
        if [ -d "$dir" ]; then
            local perms
            perms=$(stat -f "%OLp" "$dir" 2>/dev/null || stat -c "%a" "$dir" 2>/dev/null || echo "unknown")
            if [ "$perms" = "700" ]; then
                ok_msg "$dir exists (permissions: 700)"
            else
                warn_msg "$dir exists but permissions are $perms"
                chmod 700 "$dir"
                ok_msg "Fixed permissions to 700"
            fi
        else
            mkdir -p "$dir"
            chmod 700 "$dir"
            ok_msg "Created $dir (permissions: 700)"
        fi
    done

    pass "Directory structure ready" "Directories"
}

generate_gateway_token() {
    # Generate a cryptographically strong token
    local token
    token=$(openssl rand -hex 24 2>/dev/null || LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 48 2>/dev/null || echo "")

    if [ -z "$token" ]; then
        warn "Could not generate random token"
        return 1
    fi

    echo "$token"
}

setup_env_file() {
    step_header "Environment & Secrets (.env)"
    info "API keys and tokens should live in the .env file, never in config files."

    local env_file="$OPENCLAW_DIR/.env"

    if [ -f "$env_file" ]; then
        info ".env file already exists at $env_file"
        local perms
        perms=$(stat -f "%OLp" "$env_file" 2>/dev/null || stat -c "%a" "$env_file" 2>/dev/null || echo "unknown")
        if [ "$perms" != "600" ]; then
            chmod 600 "$env_file"
            info "Fixed .env permissions to 600"
        fi

        # Check if GATEWAY_TOKEN exists
        if grep -q "GATEWAY_TOKEN=" "$env_file" 2>/dev/null; then
            pass ".env file exists with gateway token" ".env Setup"
        else
            warn ".env exists but has no GATEWAY_TOKEN"
            local token
            token=$(generate_gateway_token)
            if [ -n "$token" ]; then
                echo "GATEWAY_TOKEN=$token" >> "$env_file"
                fixed "Generated and added GATEWAY_TOKEN" ".env Setup"
                echo ""
                highlight_msg "  SAVE THIS TOKEN — you need it to connect clients:"
                accent_msg "  $token"
                echo ""
            fi
        fi

        # Check for API key
        if grep -qE "(ANTHROPIC_API_KEY|OPENAI_API_KEY)=" "$env_file" 2>/dev/null; then
            pass "LLM API key configured in .env" "API Key"
        else
            warn "No LLM API key found in .env"
            if ask_yn "Add your Anthropic API key now?"; then
                local api_key
                api_key=$(read_secret "Paste your Anthropic API key (sk-ant-...):" "sk-ant-...")
                if [ -n "$api_key" ]; then
                    echo "ANTHROPIC_API_KEY=$api_key" >> "$env_file"
                    fixed "Anthropic API key added to .env" "API Key"
                    unset api_key
                else
                    fail "No key provided" "API Key"
                fi
            else
                info "You can add it later: echo 'ANTHROPIC_API_KEY=sk-ant-...' >> $env_file"
                skipped "No LLM API key configured" "API Key"
            fi
        fi
        return
    fi

    # Create new .env file
    info "Creating .env file with gateway token..."
    local token
    token=$(generate_gateway_token)

    if [ -z "$token" ]; then
        fail "Could not generate gateway token" ".env Setup"
        return
    fi

    echo "# CLAW Keeper — OpenClaw Docker environment" > "$env_file"
    echo "# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$env_file"
    echo "" >> "$env_file"
    echo "# Gateway authentication token (required)" >> "$env_file"
    echo "GATEWAY_TOKEN=$token" >> "$env_file"
    echo "" >> "$env_file"
    echo "# LLM API key — uncomment and fill in your provider" >> "$env_file"
    echo "# ANTHROPIC_API_KEY=sk-ant-..." >> "$env_file"
    echo "# OPENAI_API_KEY=sk-..." >> "$env_file"

    chmod 600 "$env_file"

    echo ""
    highlight_msg "  SAVE THIS GATEWAY TOKEN — you need it to connect clients:"
    accent_msg "  $token"
    echo ""

    if ask_yn "Add your Anthropic API key now?"; then
        local api_key
        api_key=$(read_secret "Paste your Anthropic API key (sk-ant-...):" "sk-ant-...")
        if [ -n "$api_key" ]; then
            # Replace the placeholder line
            sed -i.bak "s|# ANTHROPIC_API_KEY=sk-ant-...|ANTHROPIC_API_KEY=$api_key|" "$env_file" 2>/dev/null || {
                echo "ANTHROPIC_API_KEY=$api_key" >> "$env_file"
            }
            rm -f "${env_file}.bak"
            fixed "Anthropic API key added" "API Key"
            unset api_key
        else
            info "Skipped — add it later by editing $env_file"
        fi
    else
        info "Add your API key later: edit $env_file"
    fi

    fixed ".env file created (permissions: 600)" ".env Setup"
}

setup_docker_compose() {
    step_header "Docker Compose Configuration"
    info "Generating hardened docker-compose.yml for OpenClaw."

    local compose_file="$OPENCLAW_DIR/docker-compose.yml"

    if [ -f "$compose_file" ]; then
        info "docker-compose.yml already exists at $compose_file"

        if ask_yn "Overwrite with hardened configuration? (backup will be saved)"; then
            cp "$compose_file" "${compose_file}.backup.$(date +%s)"
            info "Backup saved"
        else
            pass "Existing docker-compose.yml kept" "Docker Compose"
            return
        fi
    fi

    # --- Image selection ---
    local openclaw_image="us-docker.pkg.dev/prod-375107/minimus-public/openclaw:latest"

    echo ""
    accent_msg "  Which OpenClaw Docker image would you like to use?"
    echo ""
    dim_msg "    1) Minimus hardened (recommended) — 99% fewer CVEs"
    dim_msg "       us-docker.pkg.dev/prod-375107/minimus-public/openclaw:latest"
    echo ""
    dim_msg "    2) Official"
    dim_msg "       ghcr.io/openclaw/openclaw:latest"
    echo ""

    local image_choice
    if [ "$HAS_GUM" = true ]; then
        image_choice=$(gum choose "1) Minimus hardened (recommended)" "2) Official")
        case "$image_choice" in
            2*) openclaw_image="ghcr.io/openclaw/openclaw:latest" ;;
        esac
    else
        read -r -p "  Choose [1/2] (default: 1): " image_choice < /dev/tty
        case "$image_choice" in
            2) openclaw_image="ghcr.io/openclaw/openclaw:latest" ;;
        esac
    fi

    info "Using image: $openclaw_image"

    cat > "$compose_file" << 'COMPOSE_EOF'
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    container_name: openclaw
    restart: unless-stopped

    # --- Security: Run as non-root ---
    user: "1000:1000"

    # --- Security: Drop all capabilities, add only what's needed ---
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    # --- Security: Prevent privilege escalation ---
    security_opt:
      - no-new-privileges:true

    # --- Security: Read-only root filesystem ---
    read_only: true

    # --- Security: Resource limits (prevent runaway agent behavior) ---
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4g
        reservations:
          cpus: "0.25"
          memory: 512m

    # --- Security: Bind to localhost ONLY ---
    ports:
      - "127.0.0.1:18789:18789"
      - "127.0.0.1:18790:18790"

    # --- Volumes ---
    volumes:
      - ${HOME}/.openclaw:/home/node/.openclaw:rw
      - ${HOME}/openclaw/workspace:/home/node/.openclaw/workspace:rw

    # --- Writable tmpfs for paths that need it (read-only root FS) ---
    tmpfs:
      - /tmp:size=100m,noexec,nosuid
      - /home/node/.npm:size=100m,noexec,nosuid

    # --- Environment: Secrets injected from .env ---
    environment:
      - OPENCLAW_DISABLE_BONJOUR=1
      - OPENCLAW_GATEWAY_TOKEN=${GATEWAY_TOKEN}
      # Uncomment your LLM provider:
      # - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      # - OPENAI_API_KEY=${OPENAI_API_KEY}

    # --- Security: Isolated Docker network ---
    networks:
      - openclaw-isolated

    # --- Health check ---
    healthcheck:
      test: ["CMD", "curl", "-sf", "http://localhost:18789/health", "-o", "/dev/null"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

networks:
  openclaw-isolated:
    driver: bridge
    internal: false  # Needs internet for LLM APIs
COMPOSE_EOF

    # Replace image with user's selection
    if [ "$openclaw_image" != "ghcr.io/openclaw/openclaw:latest" ]; then
        sed -i.bak "s|image: ghcr.io/openclaw/openclaw:latest|image: $openclaw_image|" "$compose_file" 2>/dev/null || true
        rm -f "${compose_file}.bak"
    fi

    # Dynamically uncomment the correct API key line based on .env
    local env_file="$OPENCLAW_DIR/.env"
    if [ -f "$env_file" ]; then
        if grep -q "^ANTHROPIC_API_KEY=" "$env_file" 2>/dev/null; then
            sed -i.bak 's|# - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}|- ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}|' "$compose_file" 2>/dev/null || true
            rm -f "${compose_file}.bak"
        fi
        if grep -q "^OPENAI_API_KEY=" "$env_file" 2>/dev/null; then
            sed -i.bak 's|# - OPENAI_API_KEY=${OPENAI_API_KEY}|- OPENAI_API_KEY=${OPENAI_API_KEY}|' "$compose_file" 2>/dev/null || true
            rm -f "${compose_file}.bak"
        fi
    fi

    fixed "Hardened docker-compose.yml generated" "Docker Compose"

    echo ""
    accent_msg "  Security features enabled:"
    dim_msg "    • Non-root user (1000:1000)"
    dim_msg "    • All capabilities dropped (only NET_BIND_SERVICE added)"
    dim_msg "    • no-new-privileges enforced"
    dim_msg "    • Read-only root filesystem"
    dim_msg "    • CPU (2) and memory (4GB) limits"
    dim_msg "    • Ports bound to 127.0.0.1 only"
    dim_msg "    • tmpfs with noexec,nosuid"
    dim_msg "    • Bonjour/mDNS disabled"
    dim_msg "    • Isolated Docker network"
}

setup_openclaw_config() {
    step_header "OpenClaw Security Configuration"
    info "Generating hardened openclaw.json."

    local config_file="$OPENCLAW_CONFIG_DIR/openclaw.json"

    if [ -f "$config_file" ]; then
        info "openclaw.json already exists at $config_file"

        if ask_yn "Overwrite with hardened configuration? (backup will be saved)"; then
            cp "$config_file" "${config_file}.backup.$(date +%s)"
            info "Backup saved"
        else
            pass "Existing openclaw.json kept" "OpenClaw Config"
            return
        fi
    fi

    cat > "$config_file" << 'CONFIG_EOF'
{
  "gateway": {
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "allowTailscale": false
    },
    "controlUI": false,
    "discover": {
      "mode": "off"
    }
  },
  "exec": {
    "ask": "on"
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

    chmod 600 "$config_file"
    fixed "Hardened openclaw.json generated (permissions: 600)" "OpenClaw Config"

    echo ""
    accent_msg "  Configuration:"
    dim_msg "    • gateway.bind = loopback (localhost only)"
    dim_msg "    • gateway.auth.mode = token (required for every connection)"
    dim_msg "    • gateway.controlUI = false (web UI disabled)"
    dim_msg "    • gateway.discover.mode = off (no mDNS broadcast)"
    dim_msg "    • exec.ask = on (agent asks before every command)"
    dim_msg "    • applyPatch.workspaceOnly = true (agent can't write outside workspace)"
    dim_msg "    • logging.redactSensitive = tools (keys redacted in logs)"
}

deploy_openclaw_docker() {
    step_header "Deploy OpenClaw Container"

    if ! command -v docker &>/dev/null || ! docker info &>/dev/null; then
        fail "Docker is not available — install and start Docker first" "Deploy"
        return
    fi

    local compose_file="$OPENCLAW_DIR/docker-compose.yml"
    if [ ! -f "$compose_file" ]; then
        fail "No docker-compose.yml found — run setup steps first" "Deploy"
        return
    fi

    # Check if already running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^openclaw$"; then
        warn "OpenClaw container is already running"

        if ask_yn "Restart with current configuration?"; then
            info "Restarting container..."
            cd "$OPENCLAW_DIR" && docker compose down 2>/dev/null || true
            cd "$OPENCLAW_DIR" && docker compose up -d 2>&1 | tail -5
            fixed "OpenClaw container restarted" "Deploy"
        else
            pass "OpenClaw container running (not restarted)" "Deploy"
        fi
        return
    fi

    if ask_yn "Pull the latest OpenClaw image and start the container?"; then
        if [ "$HAS_GUM" = true ]; then
            gum spin --spinner "$GUM_SPINNER" --title "  Pulling latest OpenClaw image..." -- \
                bash -c "cd '$OPENCLAW_DIR' && docker compose pull 2>&1 | tail -3"
        else
            info "Pulling latest OpenClaw image..."
            cd "$OPENCLAW_DIR" && docker compose pull 2>&1 | tail -3
        fi

        info "Starting container..."
        cd "$OPENCLAW_DIR" && docker compose up -d 2>&1 | tail -5

        # Wait for healthy
        if [ "$HAS_GUM" = true ]; then
            gum spin --spinner "$GUM_SPINNER" --title "  Waiting for OpenClaw to start..." -- \
                bash -c 'waited=0; while [ $waited -lt 30 ]; do docker ps --format "{{.Names}} {{.Status}}" 2>/dev/null | grep "openclaw" | grep -qi "healthy\|Up" && exit 0; sleep 3; waited=$((waited + 3)); done; exit 1'
            if [ $? -eq 0 ]; then
                echo ""
                fixed "OpenClaw container is running" "Deploy"
                echo ""
                accent_msg "  Recent container logs:"
                docker logs --tail 10 openclaw 2>&1 | while read -r line; do
                    dim_msg "    $line"
                done
                return
            fi
        else
            info "Waiting for OpenClaw to start (up to 30 seconds)..."
            local waited=0
            while [ $waited -lt 30 ]; do
                if docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep "openclaw" | grep -qi "healthy\|Up"; then
                    echo ""
                    fixed "OpenClaw container is running" "Deploy"

                    # Show logs briefly
                    echo ""
                    accent_msg "  Recent container logs:"
                    docker logs --tail 10 openclaw 2>&1 | while read -r line; do
                        dim_msg "    $line"
                    done
                    return
                fi
                sleep 3
                waited=$((waited + 3))
                echo -ne "  ${DIM}  Waiting... (${waited}s)${RESET}\r"
            done
        fi
        echo ""
        warn "Container started but may still be initializing"
        info "Check logs: docker logs -f openclaw"
        pass "OpenClaw container started (verify with docker logs)" "Deploy"
    else
        skipped "OpenClaw container not started" "Deploy"
    fi
}
