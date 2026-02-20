# ============================================================================
# Clawkeeper Agent — SaaS integration, scheduling, scan upload
# Concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

AGENT_VERSION="1.0.0"
AGENT_CONFIG_DIR="$HOME/.clawkeeper"
AGENT_CONFIG_FILE="$AGENT_CONFIG_DIR/config"
AGENT_PLIST_LABEL="com.clawkeeper.agent"
AGENT_API_URL="https://clawkeeper.dev/api/v1/scans"

agent_log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

# Report a lifecycle event to the Clawkeeper API (fire-and-forget)
report_event() {
    local event_type="$1"
    local event_hostname="${2:-$(hostname)}"

    # Load config if not already loaded
    local api_key="${CLAWKEEPER_API_KEY:-}"
    local api_url="${CLAWKEEPER_API_URL:-$AGENT_API_URL}"

    if [ -z "$api_key" ] && [ -f "$AGENT_CONFIG_FILE" ]; then
        # shellcheck disable=SC1090
        source "$AGENT_CONFIG_FILE"
        api_key="${CLAWKEEPER_API_KEY:-}"
        api_url="${CLAWKEEPER_API_URL:-$AGENT_API_URL}"
    fi

    # Silently skip if no API key
    [ -z "$api_key" ] && return 0

    # Derive events URL from scans URL
    local events_url="${api_url%/scans}/events"

    curl -s -o /dev/null \
        -X POST "$events_url" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d "{\"event_type\":\"$event_type\",\"hostname\":\"$event_hostname\"}" \
        2>/dev/null &
}

agent_load_config() {
    if [ ! -f "$AGENT_CONFIG_FILE" ]; then
        error_bold_msg "Error: Agent not configured. Run: clawkeeper.sh agent --install"
        exit 1
    fi
    # shellcheck disable=SC1090
    source "$AGENT_CONFIG_FILE"
}

agent_generate_plist() {
    local script_path="$1"
    local dest="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$dest" <<PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$AGENT_PLIST_LABEL</string>
    <key>ProgramArguments</key>
    <array>
        <string>$script_path</string>
        <string>agent</string>
        <string>run</string>
    </array>
    <key>StartInterval</key>
    <integer>3600</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$HOME/.clawkeeper/agent.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.clawkeeper/agent.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
PLISTEOF
    echo "$dest"
}

agent_generate_systemd() {
    local script_path="$1"
    local service_dir="$HOME/.config/systemd/user"
    mkdir -p "$service_dir"

    cat > "$service_dir/clawkeeper-agent.service" <<SVCEOF
[Unit]
Description=Clawkeeper Security Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=$script_path agent run
Environment=PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin

[Install]
WantedBy=default.target
SVCEOF

    cat > "$service_dir/clawkeeper-agent.timer" <<TMREOF
[Unit]
Description=Run Clawkeeper agent hourly

[Timer]
OnBootSec=5min
OnUnitActiveSec=1h
Persistent=true

[Install]
WantedBy=timers.target
TMREOF

    systemctl --user daemon-reload 2>/dev/null || true
    systemctl --user enable --now clawkeeper-agent.timer 2>/dev/null || true
    echo "$service_dir/clawkeeper-agent.timer"
}

agent_install() {
    echo ""
    accent_bold_msg "  Clawkeeper Agent Setup"
    echo ""

    # Prompt for API key (with helpful fallback if skipped)
    echo "  To upload scan results to your dashboard, you need an API key."
    if [ "$HAS_GUM" = true ]; then
        echo "  Get one free at: $(gum style --foreground "$GUM_CYAN" "https://clawkeeper.dev/signup")"
        echo ""
        api_key=$(gum input --placeholder "ck_live_..." --header "  Enter your API key (or press Enter to skip):" </dev/tty)
    else
        echo -e "  Get one free at: ${CYAN}https://clawkeeper.dev/signup${RESET}"
        echo ""
        echo "  Enter your API key (or press Enter to scan locally without uploading):"
        printf "  > "
        read -r api_key </dev/tty
    fi

    if [ -z "$api_key" ]; then
        echo ""
        dim_msg "  No API key entered. To connect later:"
        if [ "$HAS_GUM" = true ]; then
            dim_msg "    1. Sign up at $(gum style --foreground "$GUM_CYAN" "https://clawkeeper.dev/signup")"
            dim_msg "    2. Run $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh agent --install")"
            echo ""
            echo "  $(gum style --foreground "$GUM_DIM" "To scan locally without uploading:") $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh scan")"
        else
            echo -e "  ${DIM}  1. Sign up at ${RESET}${CYAN}https://clawkeeper.dev/signup${RESET}"
            echo -e "  ${DIM}  2. Run ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"
            echo ""
            echo -e "  ${DIM}To scan locally without uploading:${RESET} ${CYAN}clawkeeper.sh scan${RESET}"
        fi
        echo ""
        exit 0
    fi

    # Validate key format
    if [[ ! "$api_key" =~ ^ck_live_ ]]; then
        if [ "$HAS_GUM" = true ]; then
            warn_msg "Key doesn't start with ck_live_ — are you sure this is correct?"
            if ! gum confirm --default=no "  Continue?" </dev/tty; then
                exit 1
            fi
        else
            echo -e "  ${YELLOW}Warning:${RESET} Key doesn't start with ck_live_ — are you sure this is correct?"
            printf "  Continue? [y/N] "
            read -r confirm </dev/tty
            if [[ ! "$confirm" =~ ^[yY] ]]; then
                exit 1
            fi
        fi
    fi

    # Optional: custom API URL
    local api_url="${CLAWKEEPER_API_URL:-$AGENT_API_URL}"
    echo ""
    dim_msg "  API endpoint: $api_url"
    dim_msg "  (Set CLAWKEEPER_API_URL env var to override)"

    # Create config directory
    mkdir -p "$AGENT_CONFIG_DIR"

    # Write config
    cat > "$AGENT_CONFIG_FILE" <<EOF
# Clawkeeper Agent Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
CLAWKEEPER_API_KEY="$api_key"
CLAWKEEPER_API_URL="$api_url"
EOF
    chmod 600 "$AGENT_CONFIG_FILE"

    echo ""
    ok_msg "Config saved to $AGENT_CONFIG_FILE"

    # Resolve our own path for the scheduler
    local self_path
    self_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

    # Platform-specific scheduler
    if [ "$(uname -s)" = "Darwin" ]; then
        local plist_dest
        plist_dest=$(agent_generate_plist "$self_path")
        launchctl unload "$plist_dest" 2>/dev/null || true
        launchctl load "$plist_dest"
        ok_msg "LaunchAgent installed and loaded"
        dim_msg "    Runs hourly. Plist: $plist_dest"
    elif [ "$(uname -s)" = "Linux" ]; then
        local timer_path
        timer_path=$(agent_generate_systemd "$self_path")
        ok_msg "Systemd user timer installed and enabled"
        dim_msg "    Runs hourly. Timer: $timer_path"
    else
        warn_msg "Unsupported platform for scheduled scans."
        dim_msg "    The agent still works manually: clawkeeper.sh agent run"
    fi

    # Run first scan
    echo ""
    accent_msg "  Running first scan..."
    echo ""
    agent_run

    report_event "agent.installed"

    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_GREEN" -- "  Agent installed successfully!"
        echo "  $(gum style --foreground "$GUM_DIM" "View your dashboard at") $(gum style --foreground "$GUM_CYAN" "clawkeeper.dev")"
    else
        echo -e "  ${GREEN}${BOLD}Agent installed successfully!${RESET}"
        echo -e "  ${DIM}View your dashboard at ${RESET}${CYAN}clawkeeper.dev${RESET}"
    fi
    echo ""
}

agent_run() {
    agent_load_config

    local api_url="${CLAWKEEPER_API_URL:-$AGENT_API_URL}"
    local api_key="${CLAWKEEPER_API_KEY:-}"

    if [ -z "$api_key" ]; then
        agent_log "ERROR: No API key configured"
        exit 1
    fi

    # Resolve our own path
    local self_path
    self_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

    # Run scan and capture report
    local report_file
    report_file=$(mktemp /tmp/clawkeeper-report.XXXXXX)

    report_event "agent.started"

    agent_log "Running clawkeeper scan..."

    # Run scan in non-interactive mode, capture output
    "$self_path" scan --report "$report_file" --non-interactive 2>/dev/null || true

    if [ ! -f "$report_file" ]; then
        agent_log "ERROR: Scan did not produce a report file"
        exit 1
    fi

    # Parse the report file
    local hostname platform os_version
    hostname=$(hostname)
    platform="unknown"
    os_version="unknown"

    case "$(uname -s)" in
        Darwin)
            platform="macos"
            os_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
            ;;
        Linux)
            platform="linux"
            os_version=$(grep -oP 'VERSION_ID="\K[^"]+' /etc/os-release 2>/dev/null || echo "unknown")
            ;;
    esac

    # Extract metrics from the report
    local score=0 passed=0 failed=0 fixed_count=0 skipped_count=0 grade="F"

    if grep -q "^Score:" "$report_file"; then
        score=$(grep "^Score:" "$report_file" | head -1 | sed 's/Score: *\([0-9]*\).*/\1/')
    fi
    if grep -q "^Passed:" "$report_file"; then
        passed=$(grep "^Passed:" "$report_file" | head -1 | sed 's/Passed: *//')
    fi
    if grep -q "^Failed:" "$report_file"; then
        failed=$(grep "^Failed:" "$report_file" | head -1 | sed 's/Failed: *//')
    fi
    if grep -q "^Fixed:" "$report_file"; then
        fixed_count=$(grep "^Fixed:" "$report_file" | head -1 | sed 's/Fixed: *//')
    fi
    if grep -q "^Accepted risks:" "$report_file"; then
        skipped_count=$(grep "^Accepted risks:" "$report_file" | head -1 | sed 's/Accepted risks: *//')
    fi

    # Calculate grade
    if [ "$score" -ge 95 ]; then grade="A"
    elif [ "$score" -ge 85 ]; then grade="B"
    elif [ "$score" -ge 70 ]; then grade="C"
    elif [ "$score" -ge 50 ]; then grade="D"
    else grade="F"
    fi

    # Parse individual checks from report (STATUS | CHECK_NAME | DETAIL)
    local checks_json="["
    local first=true
    while IFS='|' read -r status check_name detail; do
        # Trim whitespace
        status=$(echo "$status" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        check_name=$(echo "$check_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        detail=$(echo "$detail" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

        # Skip empty or header lines
        [ -z "$status" ] && continue
        case "$status" in PASS|FAIL|FIXED|SKIPPED) ;; *) continue ;; esac

        # Escape JSON special characters
        detail=$(printf '%s' "$detail" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g')
        check_name=$(printf '%s' "$check_name" | sed 's/\\/\\\\/g; s/"/\\"/g')

        if [ "$first" = true ]; then
            first=false
        else
            checks_json="$checks_json,"
        fi

        checks_json="$checks_json{\"status\":\"$status\",\"check_name\":\"$check_name\",\"detail\":\"$detail\"}"
    done < <(grep -E '^\s*(PASS|FAIL|FIXED|SKIPPED)\s*\|' "$report_file" || true)
    checks_json="$checks_json]"

    # Read raw report — escape for JSON embedding
    local raw_report
    raw_report=$(sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g' "$report_file" | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

    local scanned_at
    scanned_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build JSON payload (no jq dependency)
    # Use heredoc to avoid printf interpretation of % in report content
    local payload
    payload="{
  \"hostname\": \"$hostname\",
  \"platform\": \"$platform\",
  \"os_version\": \"$os_version\",
  \"score\": $score,
  \"grade\": \"$grade\",
  \"passed\": $passed,
  \"failed\": $failed,
  \"fixed\": $fixed_count,
  \"skipped\": $skipped_count,
  \"checks\": $checks_json,
  \"raw_report\": \"$raw_report\",
  \"scanned_at\": \"$scanned_at\",
  \"agent_version\": \"$AGENT_VERSION\"
}"

    # Upload
    agent_log "Uploading scan to $api_url..."

    local http_code
    http_code=$(curl -s -o /tmp/clawkeeper-upload-response.json -w "%{http_code}" \
        -X POST "$api_url" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>/dev/null || echo "000")

    if [ "$http_code" = "200" ]; then
        agent_log "Upload successful (HTTP $http_code)"
        ok_msg "Scan uploaded successfully"
    else
        agent_log "Upload failed (HTTP $http_code)"
        fail_msg "Upload failed (HTTP $http_code)"
        if [ -f /tmp/clawkeeper-upload-response.json ]; then
            local err_body
            err_body=$(cat /tmp/clawkeeper-upload-response.json)
            agent_log "Response: $err_body"
            # Try to extract "error" field from JSON response
            local err_msg
            err_msg=$(echo "$err_body" | sed -n 's/.*"error" *: *"\([^"]*\)".*/\1/p')
            if [ -n "$err_msg" ]; then
                dim_msg "  $err_msg"
            fi
        fi
    fi

    report_event "agent.stopped"

    # Cleanup
    rm -f "$report_file" /tmp/clawkeeper-upload-response.json
}

agent_uninstall() {
    echo ""
    accent_bold_msg "  Clawkeeper Agent Uninstall"
    echo ""

    report_event "agent.uninstalled"

    # Remove scheduler
    if [ "$(uname -s)" = "Darwin" ]; then
        local plist="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
        if [ -f "$plist" ]; then
            launchctl unload "$plist" 2>/dev/null || true
            rm -f "$plist"
            ok_msg "LaunchAgent unloaded and removed"
        else
            dim_msg "  → No LaunchAgent found"
        fi
    elif [ "$(uname -s)" = "Linux" ]; then
        systemctl --user disable --now clawkeeper-agent.timer 2>/dev/null || true
        rm -f "$HOME/.config/systemd/user/clawkeeper-agent.service" \
              "$HOME/.config/systemd/user/clawkeeper-agent.timer"
        systemctl --user daemon-reload 2>/dev/null || true
        ok_msg "Systemd timer disabled and removed"
    fi

    # Remove config
    if [ -f "$AGENT_CONFIG_FILE" ]; then
        rm -f "$AGENT_CONFIG_FILE"
        ok_msg "Agent config removed"
    fi

    echo ""
    ok_msg "Clawkeeper agent uninstalled"
    echo ""
}

agent_status() {
    echo ""
    accent_bold_msg "  Clawkeeper Agent Status"
    echo ""

    # Config
    if [ -f "$AGENT_CONFIG_FILE" ]; then
        ok_msg "Config: $AGENT_CONFIG_FILE"
        local api_url
        api_url=$(grep 'CLAWKEEPER_API_URL=' "$AGENT_CONFIG_FILE" 2>/dev/null | cut -d'"' -f2)
        [ -n "$api_url" ] && dim_msg "    API: $api_url"
        if grep -q 'CLAWKEEPER_API_KEY="ck_' "$AGENT_CONFIG_FILE" 2>/dev/null; then
            ok_msg "API key: configured"
        else
            fail_msg "API key: not found"
        fi
    else
        fail_msg "Config: not found (run: clawkeeper.sh agent --install)"
    fi

    # Scheduler
    echo ""
    if [ "$(uname -s)" = "Darwin" ]; then
        local plist="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
        if [ -f "$plist" ]; then
            ok_msg "LaunchAgent: installed"
            if launchctl list 2>/dev/null | grep -q "$AGENT_PLIST_LABEL"; then
                ok_msg "Scheduler: loaded and active"
            else
                warn_msg "Scheduler: installed but not loaded"
                dim_msg "    Fix: launchctl load $plist"
            fi
        else
            fail_msg "LaunchAgent: not installed"
        fi
    elif [ "$(uname -s)" = "Linux" ]; then
        if systemctl --user is-enabled clawkeeper-agent.timer &>/dev/null; then
            ok_msg "Systemd timer: enabled"
            if systemctl --user is-active clawkeeper-agent.timer &>/dev/null; then
                ok_msg "Scheduler: active"
            else
                warn_msg "Scheduler: enabled but not active"
            fi
        else
            fail_msg "Systemd timer: not installed"
        fi
    fi

    # Last run
    echo ""
    local log_file="$AGENT_CONFIG_DIR/agent.log"
    if [ -f "$log_file" ]; then
        local last_line
        last_line=$(tail -1 "$log_file" 2>/dev/null)
        dim_msg "  Last log entry: $last_line"
    else
        dim_msg "  No agent log found"
    fi
    echo ""
}

agent_main() {
    local subcmd="${1:-}"
    shift 2>/dev/null || true

    case "$subcmd" in
        --install|install)
            agent_install
            ;;
        run)
            agent_run
            ;;
        --uninstall|uninstall)
            agent_uninstall
            ;;
        --status|status)
            agent_status
            ;;
        --help|help|"")
            echo "Usage: clawkeeper.sh agent [--install|run|--uninstall|--status]"
            echo ""
            echo "  --install     Configure API key and install scheduled scans"
            echo "  run           Run scan and upload (used by scheduler)"
            echo "  --uninstall   Remove agent and config"
            echo "  --status      Show agent status"
            exit 1
            ;;
    esac
}
