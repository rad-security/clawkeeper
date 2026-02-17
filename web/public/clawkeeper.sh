#!/bin/bash
# ============================================================================
# CLAW Keeper Setup Wizard
# Harden your host. Deploy OpenClaw securely.
#
# By RAD Security — https://rad.security
# ============================================================================

set -uo pipefail

# --- Colors & Formatting ---------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# --- Counters ---------------------------------------------------------------
PASS=0
FAIL=0
FIXED=0
SKIPPED=0
TOTAL=0

# --- State ------------------------------------------------------------------
NEEDS_SUDO=false
SUDO_AUTHENTICATED=false
INTERACTIVE=true
SCAN_ONLY=false
REPORT_FILE=""
REPORT_LINES=()

# --- Platform Detection -----------------------------------------------------
PLATFORM=""
ARCH=""
MACOS_VERSION=""
DEPLOY_MODE=""
LINUX_DISTRO=""
LINUX_DISTRO_VERSION=""
LINUX_DISTRO_NAME=""
IS_VPS=false

# --- Platform Detection Function --------------------------------------------

detect_platform() {
    local kernel
    kernel=$(uname -s 2>/dev/null || echo "unknown")

    case "$kernel" in
        Darwin)
            PLATFORM="macos"
            ;;
        Linux)
            PLATFORM="linux"
            # Detect distro
            if [ -f /etc/os-release ]; then
                # shellcheck disable=SC1091
                . /etc/os-release
                LINUX_DISTRO="${ID:-unknown}"
                LINUX_DISTRO_VERSION="${VERSION_ID:-unknown}"
                LINUX_DISTRO_NAME="${PRETTY_NAME:-$ID}"
            elif [ -f /etc/debian_version ]; then
                LINUX_DISTRO="debian"
                LINUX_DISTRO_VERSION=$(cat /etc/debian_version)
                LINUX_DISTRO_NAME="Debian $LINUX_DISTRO_VERSION"
            elif [ -f /etc/redhat-release ]; then
                LINUX_DISTRO="rhel"
                LINUX_DISTRO_VERSION=$(grep -oP '\d+' /etc/redhat-release | head -1)
                LINUX_DISTRO_NAME=$(cat /etc/redhat-release)
            else
                LINUX_DISTRO="unknown"
                LINUX_DISTRO_VERSION="unknown"
                LINUX_DISTRO_NAME="Linux (unknown distro)"
            fi
            # Detect if running on a VPS/VM
            if command -v systemd-detect-virt &>/dev/null; then
                local virt_type
                virt_type=$(systemd-detect-virt 2>/dev/null || echo "none")
                if [ "$virt_type" != "none" ] && [ -n "$virt_type" ]; then
                    IS_VPS=true
                fi
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo ""
            echo -e "${CYAN}${BOLD}  Clawkeeper${RESET}"
            echo ""
            echo -e "  ${YELLOW}Clawkeeper supports macOS and Linux.${RESET}"
            echo -e "  ${DIM}Windows: install WSL2, then run Clawkeeper from within WSL.${RESET}"
            echo ""
            exit 0
            ;;
        *)
            echo ""
            echo -e "${CYAN}${BOLD}  Clawkeeper${RESET}"
            echo ""
            echo -e "  ${YELLOW}Clawkeeper supports macOS and Linux.${RESET}"
            echo -e "  ${DIM}Detected platform: $kernel${RESET}"
            echo ""
            exit 0
            ;;
    esac

    # Detect architecture
    local machine
    machine=$(uname -m 2>/dev/null || echo "unknown")
    case "$machine" in
        arm64|aarch64) ARCH="arm64" ;;
        x86_64)        ARCH="x86_64" ;;
        *)             ARCH="$machine" ;;
    esac

    # Detect OS version
    if [ "$PLATFORM" = "macos" ]; then
        MACOS_VERSION=$(sw_vers -productVersion 2>/dev/null || echo "unknown")
    fi
}

# --- Helpers ----------------------------------------------------------------
print_platform_info() {
    local arch_label="$ARCH"
    if [ "$PLATFORM" = "macos" ]; then
        [ "$ARCH" = "arm64" ] && arch_label="Apple Silicon"
        [ "$ARCH" = "x86_64" ] && arch_label="Intel"
        echo -e "  ${DIM}macOS $MACOS_VERSION ($arch_label)${RESET}"
    elif [ "$PLATFORM" = "linux" ]; then
        echo -e "  ${DIM}$LINUX_DISTRO_NAME ($arch_label)${RESET}"
        if [ "$IS_VPS" = true ]; then
            local virt_type
            virt_type=$(systemd-detect-virt 2>/dev/null || echo "")
            echo -e "  ${DIM}Virtualization: $virt_type (VPS/VM)${RESET}"
        fi
    fi
    if [ -n "$DEPLOY_MODE" ]; then
        local mode_label="Docker"
        [ "$DEPLOY_MODE" = "native" ] && mode_label="Native (npm)"
        echo -e "  ${DIM}Deployment mode: $mode_label${RESET}"
    fi
}

print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "   ┌──────────────────────────────────────────────┐"
    echo "   │                                              │"
    echo "   │          CLAW Keeper Setup Wizard             │"
    echo "   │   Harden your host. Deploy OpenClaw securely. │"
    echo "   │                                              │"
    echo "   │              by RAD Security                  │"
    echo "   │                                              │"
    echo "   └──────────────────────────────────────────────┘"
    echo -e "${RESET}"
    print_platform_info
}

print_scan_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "   ┌──────────────────────────────────────────────┐"
    echo "   │                                              │"
    echo "   │          CLAW Keeper Security Scan            │"
    echo "   │            Host Hardening Audit               │"
    echo "   │                                              │"
    echo "   │              by RAD Security                  │"
    echo "   │                                              │"
    echo "   └──────────────────────────────────────────────┘"
    echo -e "${RESET}"
    print_platform_info
}

log_result() {
    # $1 = status (PASS, FAIL, FIXED, SKIPPED)
    # $2 = step name
    # $3 = detail
    REPORT_LINES+=("$1|$2|$3")
}

# Phase tracking for per-phase summaries
PHASE_PASS=0
PHASE_FAIL=0
PHASE_FIXED=0
PHASE_SKIPPED=0

reset_phase_counters() {
    PHASE_PASS=$PASS
    PHASE_FAIL=$FAIL
    PHASE_FIXED=$FIXED
    PHASE_SKIPPED=$SKIPPED
}

print_phase_summary() {
    local p=$((PASS - PHASE_PASS))
    local x=$((FAIL - PHASE_FAIL))
    local f=$((FIXED - PHASE_FIXED))
    local s=$((SKIPPED - PHASE_SKIPPED))
    echo ""
    echo -ne "  ${DIM}──"
    [ "$p" -gt 0 ] && echo -ne " ${GREEN}$p passed${RESET}${DIM}"
    [ "$f" -gt 0 ] && echo -ne " ${GREEN}$f fixed${RESET}${DIM}"
    [ "$x" -gt 0 ] && echo -ne " ${RED}$x failed${RESET}${DIM}"
    [ "$s" -gt 0 ] && echo -ne " ${YELLOW}$s skipped${RESET}${DIM}"
    echo -e " ──${RESET}"
}

print_expectations() {
    echo ""
    echo -e "  ${DIM}This wizard walks you through 5 phases:${RESET}"
    echo -e "  ${DIM}  1. Host Hardening   — reduce your attack surface${RESET}"
    echo -e "  ${DIM}  2. Network          — verify network security${RESET}"
    echo -e "  ${DIM}  3. Prerequisites    — install required software${RESET}"
    echo -e "  ${DIM}  4. OpenClaw         — deploy with hardened defaults${RESET}"
    echo -e "  ${DIM}  5. Security Audit   — verify everything is locked down${RESET}"
    echo ""
    echo -e "  ${DIM}Every change requires your approval. Nothing runs without ${RESET}${BOLD}[Y/n]${RESET}${DIM}.${RESET}"
}

step_header() {
    TOTAL=$((TOTAL + 1))
    echo ""
    echo -e "${BOLD}Step ${TOTAL}: $1${RESET}"
}

pass() {
    PASS=$((PASS + 1))
    echo -e "  ${GREEN}✓${RESET} $1"
    log_result "PASS" "$2" "$1"
}

fail() {
    FAIL=$((FAIL + 1))
    echo -e "  ${RED}✗${RESET} $1"
    log_result "FAIL" "$2" "$1"
}

fixed() {
    FIXED=$((FIXED + 1))
    echo -e "  ${GREEN}✓${RESET} $1 ${DIM}(just fixed)${RESET}"
    log_result "FIXED" "$2" "$1"
    # After the 3rd fix, a subtle "at scale" hint
    if [ "$FIXED" -eq 3 ]; then
        echo -e "  ${DIM}Track drift across hosts: ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"
    fi
}

skipped() {
    SKIPPED=$((SKIPPED + 1))
    echo -e "  ${YELLOW}⊘${RESET} $1 ${DIM}(accepted risk)${RESET}"
    log_result "SKIPPED" "$2" "$1"
}

warn() {
    echo -e "  ${YELLOW}⚠${RESET} $1"
}

info() {
    echo -e "  ${DIM}→ $1${RESET}"
}

ask_yn() {
    # $1 = prompt
    # Returns 0 for yes, 1 for no
    if [ "$INTERACTIVE" = false ] || [ "$SCAN_ONLY" = true ]; then
        return 1
    fi
    local answer
    echo -ne "  ${BLUE}→${RESET} $1 ${DIM}[Y/n]${RESET} "
    read -r answer
    case "$answer" in
        [nN]|[nN][oO]) return 1 ;;
        *) return 0 ;;
    esac
}

# --- Agent (inline) --------------------------------------------------------
# Merged from cli/agent.sh — no external files needed.

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
        echo -e "${RED}Error:${RESET} Agent not configured. Run: clawkeeper.sh agent --install"
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
    echo -e "${CYAN}${BOLD}  Clawkeeper Agent Setup${RESET}"
    echo ""

    # Prompt for API key (with helpful fallback if skipped)
    echo -e "  To upload scan results to your dashboard, you need an API key."
    echo -e "  Get one free at: ${CYAN}https://clawkeeper.dev/signup${RESET}"
    echo ""
    echo -e "  Enter your API key (or press Enter to scan locally without uploading):"
    printf "  > "
    read -r api_key

    if [ -z "$api_key" ]; then
        echo ""
        echo -e "  ${GREEN}✓${RESET} No problem — running in ${BOLD}local-only mode${RESET}."
        echo -e "  ${DIM}Scans will run locally but won't upload to the dashboard.${RESET}"
        echo -e "  ${DIM}To connect later, run: clawkeeper.sh agent --install${RESET}"
        echo ""

        # Run a scan right now so they see value immediately
        local self_path
        self_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
        exec "$self_path" scan
    fi

    # Validate key format
    if [[ ! "$api_key" =~ ^ck_live_ ]]; then
        echo -e "  ${YELLOW}Warning:${RESET} Key doesn't start with ck_live_ — are you sure this is correct?"
        printf "  Continue? [y/N] "
        read -r confirm
        if [[ ! "$confirm" =~ ^[yY] ]]; then
            exit 1
        fi
    fi

    # Optional: custom API URL
    local api_url="${CLAWKEEPER_API_URL:-$AGENT_API_URL}"
    echo ""
    echo -e "  ${DIM}API endpoint: $api_url${RESET}"
    echo -e "  ${DIM}(Set CLAWKEEPER_API_URL env var to override)${RESET}"

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
    echo -e "  ${GREEN}✓${RESET} Config saved to $AGENT_CONFIG_FILE"

    # Resolve our own path for the scheduler
    local self_path
    self_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"

    # Platform-specific scheduler
    if [ "$(uname -s)" = "Darwin" ]; then
        local plist_dest
        plist_dest=$(agent_generate_plist "$self_path")
        launchctl unload "$plist_dest" 2>/dev/null || true
        launchctl load "$plist_dest"
        echo -e "  ${GREEN}✓${RESET} LaunchAgent installed and loaded"
        echo -e "  ${DIM}  Runs hourly. Plist: $plist_dest${RESET}"
    elif [ "$(uname -s)" = "Linux" ]; then
        local timer_path
        timer_path=$(agent_generate_systemd "$self_path")
        echo -e "  ${GREEN}✓${RESET} Systemd user timer installed and enabled"
        echo -e "  ${DIM}  Runs hourly. Timer: $timer_path${RESET}"
    else
        echo -e "  ${YELLOW}⚠${RESET} Unsupported platform for scheduled scans."
        echo -e "  ${DIM}  The agent still works manually: clawkeeper.sh agent run${RESET}"
    fi

    # Run first scan
    echo ""
    echo -e "  ${CYAN}Running first scan...${RESET}"
    echo ""
    agent_run

    report_event "agent.installed"

    echo ""
    echo -e "  ${GREEN}${BOLD}Agent installed successfully!${RESET}"
    echo -e "  ${DIM}View your dashboard at ${RESET}${CYAN}clawkeeper.dev${RESET}"
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
    if grep -q "^Skipped:" "$report_file"; then
        skipped_count=$(grep "^Skipped:" "$report_file" | head -1 | sed 's/Skipped: *//')
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

    # Read raw report
    local raw_report
    raw_report=$(cat "$report_file" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' '\\' | sed 's/\\/n/g')

    local scanned_at
    scanned_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Build JSON payload (no jq dependency)
    local payload
    payload=$(printf '{
  "hostname": "%s",
  "platform": "%s",
  "os_version": "%s",
  "score": %d,
  "grade": "%s",
  "passed": %d,
  "failed": %d,
  "fixed": %d,
  "skipped": %d,
  "checks": %s,
  "raw_report": "%s",
  "scanned_at": "%s",
  "agent_version": "%s"
}' "$hostname" "$platform" "$os_version" "$score" "$grade" \
   "$passed" "$failed" "$fixed_count" "$skipped_count" \
   "$checks_json" "$raw_report" "$scanned_at" "$AGENT_VERSION")

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
        echo -e "  ${GREEN}✓${RESET} Scan uploaded successfully"
    else
        agent_log "Upload failed (HTTP $http_code)"
        echo -e "  ${RED}✗${RESET} Upload failed (HTTP $http_code)"
        if [ -f /tmp/clawkeeper-upload-response.json ]; then
            agent_log "Response: $(cat /tmp/clawkeeper-upload-response.json)"
        fi
    fi

    report_event "agent.stopped"

    # Cleanup
    rm -f "$report_file" /tmp/clawkeeper-upload-response.json
}

agent_uninstall() {
    echo ""
    echo -e "${CYAN}${BOLD}  Clawkeeper Agent Uninstall${RESET}"
    echo ""

    report_event "agent.uninstalled"

    if [ "$(uname -s)" = "Darwin" ]; then
        local plist_dest="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
        if [ -f "$plist_dest" ]; then
            launchctl unload "$plist_dest" 2>/dev/null || true
            rm -f "$plist_dest"
            echo -e "  ${GREEN}✓${RESET} LaunchAgent removed"
        else
            echo -e "  ${DIM}No LaunchAgent found${RESET}"
        fi
    elif [ "$(uname -s)" = "Linux" ]; then
        local service_dir="$HOME/.config/systemd/user"
        if [ -f "$service_dir/clawkeeper-agent.timer" ]; then
            systemctl --user disable --now clawkeeper-agent.timer 2>/dev/null || true
            rm -f "$service_dir/clawkeeper-agent.service" "$service_dir/clawkeeper-agent.timer"
            systemctl --user daemon-reload 2>/dev/null || true
            echo -e "  ${GREEN}✓${RESET} Systemd timer removed"
        else
            echo -e "  ${DIM}No systemd timer found${RESET}"
        fi
    fi

    if [ -d "$AGENT_CONFIG_DIR" ]; then
        rm -rf "$AGENT_CONFIG_DIR"
        echo -e "  ${GREEN}✓${RESET} Config directory removed ($AGENT_CONFIG_DIR)"
    fi

    echo ""
    echo -e "  ${GREEN}Agent uninstalled.${RESET}"
    echo ""
}

agent_status() {
    echo ""
    echo -e "${CYAN}${BOLD}  Clawkeeper Agent Status${RESET}"
    echo ""

    # Config
    if [ -f "$AGENT_CONFIG_FILE" ]; then
        echo -e "  ${GREEN}✓${RESET} Config: $AGENT_CONFIG_FILE"
        # shellcheck disable=SC1090
        source "$AGENT_CONFIG_FILE"
        echo -e "  ${DIM}  API URL: ${CLAWKEEPER_API_URL:-$AGENT_API_URL}${RESET}"
        echo -e "  ${DIM}  API Key: ${CLAWKEEPER_API_KEY:0:16}...${RESET}"
    else
        echo -e "  ${RED}✗${RESET} Not configured. Run: clawkeeper.sh agent --install"
        return
    fi

    # Platform-specific scheduler status
    if [ "$(uname -s)" = "Darwin" ]; then
        local plist_dest="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
        if [ -f "$plist_dest" ]; then
            echo -e "  ${GREEN}✓${RESET} LaunchAgent: installed"
            local launchd_status
            launchd_status=$(launchctl list 2>/dev/null | grep "$AGENT_PLIST_LABEL" || true)
            if [ -n "$launchd_status" ]; then
                echo -e "  ${GREEN}✓${RESET} LaunchAgent: loaded"
            else
                echo -e "  ${YELLOW}⚠${RESET} LaunchAgent: not loaded"
            fi
        else
            echo -e "  ${YELLOW}⚠${RESET} LaunchAgent: not installed"
        fi
    elif [ "$(uname -s)" = "Linux" ]; then
        local timer_status
        timer_status=$(systemctl --user is-active clawkeeper-agent.timer 2>/dev/null || echo "inactive")
        if [ "$timer_status" = "active" ]; then
            echo -e "  ${GREEN}✓${RESET} Systemd timer: active"
        else
            echo -e "  ${YELLOW}⚠${RESET} Systemd timer: $timer_status"
        fi
    fi

    # Last run
    local log_file="$AGENT_CONFIG_DIR/agent.log"
    if [ -f "$log_file" ]; then
        local last_line
        last_line=$(tail -1 "$log_file")
        echo -e "  ${DIM}  Last log: $last_line${RESET}"
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

# --- Sudo helper ------------------------------------------------------------

ensure_sudo() {
    if [ "$SUDO_AUTHENTICATED" = true ]; then
        return 0
    fi
    echo ""
    echo -e "  ${YELLOW}Some fixes require administrator privileges.${RESET}"
    echo -ne "  ${BLUE}→${RESET} Enter your password if prompted: "
    echo ""
    if sudo -v 2>/dev/null; then
        SUDO_AUTHENTICATED=true
        return 0
    else
        echo -e "  ${RED}Could not get sudo access. Some fixes will be skipped.${RESET}"
        return 1
    fi
}

# --- Checks -----------------------------------------------------------------

check_siri() {
    step_header "Siri"
    info "Siri indexes files, contacts, messages, and app activity locally."
    info "A compromised agent could query this index to enumerate sensitive data."

    local siri_enabled=false

    # Check Siri assistant
    if defaults read com.apple.assistant.support "Assistant Enabled" 2>/dev/null | grep -q "1"; then
        siri_enabled=true
    fi

    # Check Listen for Siri
    if defaults read com.apple.Siri StatusMenuVisible 2>/dev/null | grep -q "1"; then
        siri_enabled=true
    fi

    if [ "$siri_enabled" = false ]; then
        pass "Siri is disabled" "Siri"
        return
    fi

    warn "Siri is currently ENABLED"

    if ask_yn "Disable Siri?"; then
        defaults write com.apple.assistant.support "Assistant Enabled" -bool false 2>/dev/null || true
        defaults write com.apple.Siri StatusMenuVisible -bool false 2>/dev/null || true
        defaults write com.apple.Siri UserHasDeclinedEnable -bool true 2>/dev/null || true
        # Disable Siri suggestions
        defaults write com.apple.suggestions SuggestionsAllowFrom -int 0 2>/dev/null || true
        fixed "Siri disabled" "Siri"
        info "Note: You may need to also disable Siri in System Settings → Apple Intelligence & Siri"
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Siri is enabled" "Siri"
        else
            skipped "Siri left enabled" "Siri"
        fi
    fi
}

check_location_services() {
    step_header "Location Services"
    info "Location data embeds in file metadata that OpenClaw might process or transmit."

    # Location Services status requires sudo to read reliably
    local ls_enabled=false

    if command -v defaults &>/dev/null; then
        # Try reading without sudo first
        local ls_status
        ls_status=$(defaults read /var/db/locationd/Library/Preferences/ByHost/com.apple.locationd LocationServicesEnabled 2>/dev/null || echo "unknown")
        if [ "$ls_status" = "unknown" ]; then
            # Need elevated access — try sudo only if already authenticated
            if [ "$SUDO_AUTHENTICATED" = true ]; then
                ls_status=$(sudo defaults read /var/db/locationd/Library/Preferences/ByHost/com.apple.locationd LocationServicesEnabled 2>/dev/null || echo "unknown")
            fi
        fi

        if [ "$ls_status" = "1" ]; then
            ls_enabled=true
        elif [ "$ls_status" = "0" ]; then
            ls_enabled=false
        else
            # Can't determine — check via launchctl
            if launchctl list 2>/dev/null | grep -q "locationd"; then
                # Service is running, likely enabled
                ls_enabled=true
            fi
        fi
    fi

    if [ "$ls_enabled" = false ]; then
        pass "Location Services appear disabled" "Location Services"
        return
    fi

    warn "Location Services appear to be ENABLED"

    if ask_yn "Attempt to disable Location Services?"; then
        if ensure_sudo; then
            sudo defaults write /var/db/locationd/Library/Preferences/ByHost/com.apple.locationd LocationServicesEnabled -bool false 2>/dev/null || true
            fixed "Location Services disabled" "Location Services"
            info "Note: A restart may be required for this to fully take effect"
            info "Verify in System Settings → Privacy & Security → Location Services"
        else
            fail "Location Services enabled (needs sudo to fix)" "Location Services"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Location Services are enabled" "Location Services"
        else
            skipped "Location Services left enabled" "Location Services"
        fi
    fi
}

check_bluetooth() {
    step_header "Bluetooth"
    info "Unnecessary radio interface. Exposes the machine to proximity-based attacks."

    local bt_on=false

    # Check via defaults
    local bt_status
    bt_status=$(defaults read /Library/Preferences/com.apple.Bluetooth ControllerPowerState 2>/dev/null || echo "unknown")

    if [ "$bt_status" = "1" ]; then
        bt_on=true
    elif [ "$bt_status" = "0" ]; then
        bt_on=false
    else
        # Try system_profiler as fallback
        if system_profiler SPBluetoothDataType 2>/dev/null | grep -q "State: On"; then
            bt_on=true
        fi
    fi

    if [ "$bt_on" = false ]; then
        pass "Bluetooth is off" "Bluetooth"
        return
    fi

    warn "Bluetooth is ON"
    info "If you're using a wireless keyboard/mouse, you may need Bluetooth."

    if ask_yn "Disable Bluetooth? (skip if you need wireless peripherals)"; then
        if ensure_sudo; then
            sudo defaults write /Library/Preferences/com.apple.Bluetooth ControllerPowerState -int 0 2>/dev/null || true
            fixed "Bluetooth disabled" "Bluetooth"
            info "Note: If using wireless peripherals, re-enable in System Settings → Bluetooth"
        else
            fail "Bluetooth is on (needs sudo to fix)" "Bluetooth"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Bluetooth is on" "Bluetooth"
        else
            skipped "Bluetooth left on (wireless peripherals)" "Bluetooth"
        fi
    fi
}

check_airdrop() {
    step_header "AirDrop & Handoff"
    info "Both create network-discoverable services. AirDrop makes this machine visible nearby."

    local airdrop_issue=false
    local handoff_issue=false

    # AirDrop
    local airdrop_status
    airdrop_status=$(defaults read com.apple.NetworkBrowser DisableAirDrop 2>/dev/null || echo "0")
    if [ "$airdrop_status" != "1" ]; then
        airdrop_issue=true
    fi

    # Handoff
    local handoff_status
    handoff_status=$(defaults read ~/Library/Preferences/ByHost/com.apple.coreservices.useractivityd ActivityAdvertisingAllowed 2>/dev/null || echo "1")
    if [ "$handoff_status" != "0" ]; then
        handoff_issue=true
    fi

    if [ "$airdrop_issue" = false ] && [ "$handoff_issue" = false ]; then
        pass "AirDrop and Handoff are disabled" "AirDrop & Handoff"
        return
    fi

    [ "$airdrop_issue" = true ] && warn "AirDrop is not disabled"
    [ "$handoff_issue" = true ] && warn "Handoff is not disabled"

    if ask_yn "Disable AirDrop and Handoff?"; then
        defaults write com.apple.NetworkBrowser DisableAirDrop -bool true 2>/dev/null || true
        defaults write ~/Library/Preferences/ByHost/com.apple.coreservices.useractivityd ActivityAdvertisingAllowed -bool false 2>/dev/null || true
        defaults write ~/Library/Preferences/ByHost/com.apple.coreservices.useractivityd ActivityReceivingAllowed -bool false 2>/dev/null || true
        fixed "AirDrop and Handoff disabled" "AirDrop & Handoff"
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "AirDrop/Handoff not fully disabled" "AirDrop & Handoff"
        else
            skipped "AirDrop/Handoff left as-is" "AirDrop & Handoff"
        fi
    fi
}

check_analytics() {
    step_header "Analytics & Telemetry"
    info "Diagnostic data from this machine shouldn't go to Apple or third parties."

    local analytics_issue=false

    # Check various analytics settings
    local auto_submit
    auto_submit=$(defaults read "/Library/Application Support/CrashReporter/DiagnosticMessagesHistory.plist" AutoSubmit 2>/dev/null || echo "unknown")

    if [ "$auto_submit" = "1" ] || [ "$auto_submit" = "unknown" ]; then
        analytics_issue=true
    fi

    # Check Siri analytics
    local siri_analytics
    siri_analytics=$(defaults read com.apple.assistant.support "Siri Data Sharing Opt-In Status" 2>/dev/null || echo "unknown")
    if [ "$siri_analytics" = "2" ]; then
        analytics_issue=true
    fi

    if [ "$analytics_issue" = false ]; then
        pass "Analytics and telemetry appear disabled" "Analytics"
        return
    fi

    warn "Some analytics/telemetry settings may be enabled"

    if ask_yn "Disable all analytics and telemetry?"; then
        # Disable crash reporter auto-submit
        if ensure_sudo; then
            sudo defaults write "/Library/Application Support/CrashReporter/DiagnosticMessagesHistory.plist" AutoSubmit -bool false 2>/dev/null || true
        fi
        # Disable Siri data sharing
        defaults write com.apple.assistant.support "Siri Data Sharing Opt-In Status" -int 0 2>/dev/null || true
        # Disable app analytics
        defaults write com.apple.appanalyticsd policy -int 0 2>/dev/null || true

        fixed "Analytics and telemetry disabled" "Analytics"
        info "Verify in System Settings → Privacy & Security → Analytics & Improvements"
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Analytics/telemetry may be enabled" "Analytics"
        else
            skipped "Analytics left as-is" "Analytics"
        fi
    fi
}

check_spotlight() {
    step_header "Spotlight Indexing"
    info "Spotlight indexes file contents and metadata. Reduces what's queryable by a compromised agent."

    local spotlight_on=false

    local spotlight_status
    spotlight_status=$(mdutil -s / 2>/dev/null || echo "unknown")

    if echo "$spotlight_status" | grep -qi "indexing enabled"; then
        spotlight_on=true
    elif echo "$spotlight_status" | grep -qi "indexing disabled"; then
        spotlight_on=false
    else
        # Assume it's on by default
        spotlight_on=true
    fi

    if [ "$spotlight_on" = false ]; then
        pass "Spotlight indexing is disabled" "Spotlight"
        return
    fi

    warn "Spotlight indexing is ENABLED"

    if ask_yn "Disable Spotlight indexing entirely?"; then
        if ensure_sudo; then
            sudo mdutil -a -i off &>/dev/null || true
            fixed "Spotlight indexing disabled" "Spotlight"
        else
            fail "Spotlight enabled (needs sudo to fix)" "Spotlight"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Spotlight indexing is enabled" "Spotlight"
        else
            skipped "Spotlight left enabled" "Spotlight"
            info "Consider excluding OpenClaw directories later: System Settings → Siri & Spotlight → Spotlight Privacy"
        fi
    fi
}

check_firewall() {
    step_header "macOS Firewall"
    info "Host-level firewall provides defense in depth beyond network isolation."

    local fw_on=false
    local fw_block_all=false

    local fw_status
    fw_status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "unknown")

    if echo "$fw_status" | grep -qi "enabled"; then
        fw_on=true
    fi

    if [ "$fw_on" = true ]; then
        local block_status
        block_status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall 2>/dev/null || echo "unknown")
        if echo "$block_status" | grep -qi "enabled"; then
            fw_block_all=true
        fi
    fi

    if [ "$fw_on" = true ] && [ "$fw_block_all" = true ]; then
        pass "Firewall is on with 'Block all incoming' enabled" "Firewall"
        return
    elif [ "$fw_on" = true ]; then
        warn "Firewall is ON but 'Block all incoming' is not set"
        info "This allows some incoming connections. Strictest mode blocks all."

        if ask_yn "Enable 'Block all incoming connections'?"; then
            if ensure_sudo; then
                sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall on &>/dev/null || true
                fixed "Firewall set to block all incoming" "Firewall"
                info "Note: This may block Screen Sharing. Add exceptions if needed."
            else
                fail "Firewall not fully hardened (needs sudo)" "Firewall"
            fi
        else
            if [ "$SCAN_ONLY" = true ]; then
                fail "Firewall 'Block all incoming' is not enabled" "Firewall"
            else
                skipped "Firewall left in permissive mode" "Firewall"
            fi
        fi
        return
    fi

    warn "macOS Firewall is OFF"

    if ask_yn "Enable the firewall with 'Block all incoming'?"; then
        if ensure_sudo; then
            sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on &>/dev/null || true
            sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall on &>/dev/null || true
            sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on &>/dev/null || true
            fixed "Firewall enabled (block all + stealth mode)" "Firewall"
            info "Note: This may block Screen Sharing. Add exceptions if needed."
        else
            fail "Firewall is off (needs sudo to enable)" "Firewall"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "macOS Firewall is off" "Firewall"
        else
            skipped "Firewall left off" "Firewall"
        fi
    fi
}

check_filevault() {
    step_header "FileVault (Full-Disk Encryption)"
    info "Protects data at rest if the machine is physically compromised."

    local fv_status
    fv_status=$(fdesetup status 2>/dev/null || echo "unknown")

    if echo "$fv_status" | grep -qi "FileVault is On"; then
        pass "FileVault is enabled" "FileVault"
        return
    elif echo "$fv_status" | grep -qi "FileVault is Off"; then
        warn "FileVault is OFF — disk is NOT encrypted"
        info "FileVault requires interactive setup (password + recovery key)."
        info "Enable it: System Settings → Privacy & Security → FileVault → Turn On"
        info "Choose 'Create a recovery key' — do NOT use iCloud for a dedicated machine."
        fail "FileVault is off (enable manually in System Settings)" "FileVault"
        return
    fi

    warn "Could not determine FileVault status"
    fail "FileVault status unknown" "FileVault"
}

check_admin_user() {
    step_header "User Account"
    info "OpenClaw should run under a standard (non-admin) user to limit blast radius."

    local current_user
    current_user=$(whoami)

    # Check if current user is admin
    if groups "$current_user" 2>/dev/null | grep -qw "admin"; then
        warn "You are running as admin user: $current_user"
        info "A compromised agent under an admin account has much broader access."

        # Check if an 'openclaw' user already exists
        if id "openclaw" &>/dev/null; then
            info "A dedicated 'openclaw' user already exists."
            info "Log into that account for OpenClaw usage."
            fail "Currently running as admin (switch to 'openclaw' user)" "User Account"
        else
            if ask_yn "Create a dedicated 'openclaw' standard user?"; then
                if ensure_sudo; then
                    # Find next available UID
                    local next_uid
                    next_uid=$(dscl . -list /Users UniqueID 2>/dev/null | awk '{print $2}' | sort -n | tail -1)
                    next_uid=$((next_uid + 1))

                    echo -ne "  ${BLUE}→${RESET} Set password for 'openclaw' user: "
                    read -rs openclaw_password
                    echo ""

                    if [ -z "$openclaw_password" ]; then
                        fail "No password provided — user not created" "User Account"
                        return
                    fi

                    # Create the user
                    sudo dscl . -create /Users/openclaw 2>/dev/null || true
                    sudo dscl . -create /Users/openclaw UserShell /bin/zsh 2>/dev/null || true
                    sudo dscl . -create /Users/openclaw RealName "OpenClaw" 2>/dev/null || true
                    sudo dscl . -create /Users/openclaw UniqueID "$next_uid" 2>/dev/null || true
                    sudo dscl . -create /Users/openclaw PrimaryGroupID 20 2>/dev/null || true
                    sudo dscl . -create /Users/openclaw NFSHomeDirectory /Users/openclaw 2>/dev/null || true
                    sudo dscl . -passwd /Users/openclaw "$openclaw_password" 2>/dev/null || true
                    sudo createhomedir -c -u openclaw 2>/dev/null || true

                    # Do NOT add to admin group — this is a standard user
                    fixed "Created standard user 'openclaw'" "User Account"
                    info "Log into this account for all OpenClaw operations."
                    info "System Settings → Users & Groups to verify it's a Standard account."

                    # Clear password from memory
                    unset openclaw_password
                else
                    fail "Running as admin (needs sudo to create user)" "User Account"
                fi
            else
                if [ "$SCAN_ONLY" = true ]; then
                    fail "Running as admin user" "User Account"
                else
                    skipped "Running as admin user" "User Account"
                fi
            fi
        fi
    else
        pass "Running as standard (non-admin) user: $current_user" "User Account"
    fi
}

check_icloud() {
    step_header "iCloud"
    info "iCloud syncs data off-device. A compromised agent's files shouldn't trigger cloud uploads."

    # Check if any iCloud account is configured
    local icloud_account
    icloud_account=$(defaults read MobileMeAccounts Accounts 2>/dev/null || echo "")

    if [ -z "$icloud_account" ] || echo "$icloud_account" | grep -q "(\s*)"; then
        pass "No iCloud account signed in" "iCloud"
        return
    fi

    # Check if iCloud Drive is enabled
    local icloud_drive
    icloud_drive=$(defaults read com.apple.bird optimize-storage 2>/dev/null || echo "unknown")

    warn "An iCloud account appears to be signed in"
    info "iCloud can sync OpenClaw workspace files to Apple's servers."
    info "Sign out: System Settings → [your name] → Sign Out"
    info "Or disable iCloud Drive: System Settings → Apple ID → iCloud → iCloud Drive → OFF"

    if [ "$SCAN_ONLY" = true ]; then
        fail "iCloud is signed in" "iCloud"
    else
        fail "iCloud is signed in (disable manually in System Settings)" "iCloud"
    fi
}

check_remote_login() {
    step_header "Remote Login (SSH)"
    info "SSH is useful for managing this machine remotely. Verify it's intentional."

    local ssh_status
    ssh_status=$(systemsetup -getremotelogin 2>&1 || echo "unknown")
    if echo "$ssh_status" | grep -qi "requires admin\|not authorized\|error"; then
        if [ "$SUDO_AUTHENTICATED" = true ]; then
            ssh_status=$(sudo systemsetup -getremotelogin 2>/dev/null || echo "unknown")
        elif [ "$SCAN_ONLY" = false ] && ensure_sudo; then
            ssh_status=$(sudo systemsetup -getremotelogin 2>/dev/null || echo "unknown")
        fi
    fi

    if echo "$ssh_status" | grep -qi "off"; then
        pass "Remote Login (SSH) is off" "Remote Login"
        info "Enable it if you need to manage this machine from your primary Mac."
        return
    elif echo "$ssh_status" | grep -qi "on"; then
        warn "Remote Login (SSH) is ON"
        info "This is expected if you manage this machine remotely."
        info "Ensure only authorized keys are in ~/.ssh/authorized_keys"

        if [ "$SCAN_ONLY" = true ]; then
            # In scan mode, SSH on isn't necessarily a fail — it's informational
            pass "Remote Login (SSH) is on (verify this is intentional)" "Remote Login"
        else
            pass "Remote Login (SSH) is on (acknowledged)" "Remote Login"
        fi
        return
    fi

    warn "Could not determine Remote Login status"
    skipped "Remote Login status unknown" "Remote Login"
}

check_screen_sharing() {
    step_header "Screen Sharing"
    info "Screen Sharing should only be enabled if you're accessing this Mac remotely."

    local screen_sharing=false

    # Check if Screen Sharing is enabled via launchctl
    if launchctl list 2>/dev/null | grep -q "com.apple.screensharing"; then
        screen_sharing=true
    fi

    if [ "$screen_sharing" = true ]; then
        warn "Screen Sharing is ON"
        info "This is expected if you access this Mac via Screen Sharing from your main Mac."
        info "Ensure only authorized users have access."
        pass "Screen Sharing is on (verify this is intentional)" "Screen Sharing"
    else
        pass "Screen Sharing is off" "Screen Sharing"
    fi
}

check_automatic_login() {
    step_header "Automatic Login"
    info "Automatic login bypasses the login screen — anyone with physical access gets in."

    local auto_login
    auto_login=$(defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || echo "")

    if [ -z "$auto_login" ]; then
        pass "Automatic login is disabled" "Automatic Login"
        return
    fi

    warn "Automatic login is enabled for user: $auto_login"

    if ask_yn "Disable automatic login?"; then
        if ensure_sudo; then
            sudo defaults delete /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || true
            fixed "Automatic login disabled" "Automatic Login"
        else
            fail "Automatic login enabled (needs sudo to fix)" "Automatic Login"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Automatic login is enabled" "Automatic Login"
        else
            skipped "Automatic login left enabled" "Automatic Login"
        fi
    fi
}

# --- Prerequisites ----------------------------------------------------------

check_homebrew() {
    step_header "Homebrew"
    info "Package manager needed for installing Docker, Node.js, and other tools."

    if command -v brew &>/dev/null; then
        local brew_version
        brew_version=$(brew --version 2>/dev/null | head -1 || echo "unknown")
        pass "Homebrew is installed ($brew_version)" "Homebrew"
        return
    fi

    warn "Homebrew is not installed"

    if ask_yn "Install Homebrew now?"; then
        info "Running Homebrew installer..."
        echo ""
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
            fail "Homebrew installation failed" "Homebrew"
            return
        }

        # Add to PATH based on architecture
        local brew_prefix=""
        if [ -f /opt/homebrew/bin/brew ]; then
            brew_prefix="/opt/homebrew"
        elif [ -f /usr/local/bin/brew ]; then
            brew_prefix="/usr/local"
        fi

        if [ -n "$brew_prefix" ]; then
            eval "$("${brew_prefix}/bin/brew" shellenv)"
            # Also add to shell profile for future sessions
            local shell_profile="$HOME/.zprofile"
            if ! grep -q 'homebrew' "$shell_profile" 2>/dev/null; then
                echo "eval \"\$(${brew_prefix}/bin/brew shellenv)\"" >> "$shell_profile"
                info "Added Homebrew to $shell_profile"
            fi
        fi

        if command -v brew &>/dev/null; then
            fixed "Homebrew installed" "Homebrew"
        else
            fail "Homebrew installed but not in PATH — restart your terminal" "Homebrew"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Homebrew not installed" "Homebrew"
        else
            skipped "Homebrew not installed" "Homebrew"
        fi
    fi
}

check_node() {
    step_header "Node.js"
    info "OpenClaw requires Node.js 22 or higher."

    if command -v node &>/dev/null; then
        local node_version
        node_version=$(node --version 2>/dev/null || echo "unknown")
        local major_version
        major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)

        if [ "$major_version" -ge 22 ] 2>/dev/null; then
            pass "Node.js $node_version installed (meets v22+ requirement)" "Node.js"
            return
        else
            warn "Node.js $node_version is installed but OpenClaw needs v22+"
        fi
    else
        warn "Node.js is not installed"
    fi

    if ! command -v brew &>/dev/null; then
        fail "Node.js 22+ not available (install Homebrew first)" "Node.js"
        return
    fi

    if ask_yn "Install Node.js 22 via Homebrew?"; then
        info "Installing node@22..."
        brew install node@22 2>&1 | tail -3 || {
            fail "Node.js installation failed" "Node.js"
            return
        }

        # Link if needed
        brew link --overwrite node@22 2>/dev/null || true

        if command -v node &>/dev/null; then
            local new_version
            new_version=$(node --version 2>/dev/null)
            fixed "Node.js $new_version installed" "Node.js"
        else
            fail "Node.js installed but not in PATH — restart your terminal" "Node.js"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Node.js 22+ not installed" "Node.js"
        else
            skipped "Node.js not installed" "Node.js"
        fi
    fi
}

# --- Deployment Mode Selection -----------------------------------------------

select_deployment_mode() {
    # For scan mode, auto-detect based on what's present
    if [ "$SCAN_ONLY" = true ]; then
        if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "openclaw"; then
            DEPLOY_MODE="docker"
        elif pgrep -fl "openclaw" &>/dev/null; then
            DEPLOY_MODE="native"
        else
            DEPLOY_MODE="docker"  # default for scan
        fi
        return
    fi

    echo ""
    echo -e "  ${BOLD}How would you like to run OpenClaw?${RESET}"
    echo ""
    echo -e "  ${CYAN}1)${RESET} Native ${DIM}(npm)${RESET}"
    echo -e "     ${DIM}Runs directly on your OS. Simpler setup, shares your filesystem.${RESET}"
    echo ""
    echo -e "  ${CYAN}2)${RESET} Docker ${DIM}(recommended)${RESET}"
    echo -e "     ${DIM}Runs in an isolated container. Limits what a compromised agent can access.${RESET}"
    echo ""
    local choice
    echo -ne "  ${BLUE}→${RESET} Enter 1 or 2 ${DIM}(default: 2)${RESET}: "
    read -r choice

    case "$choice" in
        1)
            DEPLOY_MODE="native"
            echo -e "  ${GREEN}✓${RESET} Selected: ${BOLD}Native (npm)${RESET} deployment"
            ;;
        *)
            DEPLOY_MODE="docker"
            echo -e "  ${GREEN}✓${RESET} Selected: ${BOLD}Docker${RESET} deployment"
            ;;
    esac
}

# --- Native (npm/npx) Deployment -------------------------------------------

OPENCLAW_NATIVE_DIR="$HOME/.openclaw"
OPENCLAW_NATIVE_WORKSPACE="$HOME/openclaw/workspace"

check_native_openclaw_installed() {
    step_header "OpenClaw (npm)"
    info "Checking if OpenClaw is available via npm..."

    if command -v openclaw &>/dev/null; then
        local oc_version
        oc_version=$(openclaw --version 2>/dev/null || echo "unknown")
        pass "OpenClaw is installed ($oc_version)" "OpenClaw npm"
        return
    fi

    # Try npx
    if command -v npx &>/dev/null; then
        local npx_version
        npx_version=$(npx openclaw --version 2>/dev/null || echo "")
        if [ -n "$npx_version" ]; then
            pass "OpenClaw available via npx ($npx_version)" "OpenClaw npm"
            return
        fi
    fi

    warn "OpenClaw is not installed"

    if ! command -v npm &>/dev/null; then
        fail "npm not available — install Node.js first" "OpenClaw npm"
        return
    fi

    if ask_yn "Install OpenClaw globally via npm?"; then
        info "Installing openclaw..."
        npm install -g openclaw 2>&1 | tail -5 || {
            fail "OpenClaw installation failed" "OpenClaw npm"
            return
        }

        if command -v openclaw &>/dev/null; then
            local new_version
            new_version=$(openclaw --version 2>/dev/null || echo "installed")
            fixed "OpenClaw $new_version installed" "OpenClaw npm"
        else
            fail "OpenClaw installed but not in PATH — restart your terminal" "OpenClaw npm"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "OpenClaw not installed" "OpenClaw npm"
        else
            skipped "OpenClaw not installed" "OpenClaw npm"
        fi
    fi
}

setup_native_openclaw_directories() {
    step_header "OpenClaw Directory Structure (Native)"
    info "Creating directories with secure permissions."

    for dir in "$OPENCLAW_NATIVE_DIR" "$OPENCLAW_NATIVE_WORKSPACE"; do
        if [ -d "$dir" ]; then
            local perms
            perms=$(stat -f "%OLp" "$dir" 2>/dev/null || stat -c "%a" "$dir" 2>/dev/null || echo "unknown")
            if [ "$perms" = "700" ]; then
                echo -e "  ${GREEN}✓${RESET} $dir exists (permissions: 700)"
            else
                echo -e "  ${YELLOW}⚠${RESET} $dir exists but permissions are $perms"
                chmod 700 "$dir"
                echo -e "  ${GREEN}✓${RESET} Fixed permissions to 700"
            fi
        else
            mkdir -p "$dir"
            chmod 700 "$dir"
            echo -e "  ${GREEN}✓${RESET} Created $dir (permissions: 700)"
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
                echo -e "  ${YELLOW}${BOLD}SAVE THIS TOKEN — you need it to connect clients:${RESET}"
                echo -e "  ${CYAN}$token${RESET}"
                echo ""
            fi
        fi

        if grep -qE "(ANTHROPIC_API_KEY|OPENAI_API_KEY)=" "$env_file" 2>/dev/null; then
            pass "LLM API key configured in .env" "Native API Key"
        else
            warn "No LLM API key found in .env"
            if ask_yn "Add your Anthropic API key now?"; then
                echo -ne "  ${BLUE}→${RESET} Paste your Anthropic API key (sk-ant-...): "
                read -rs api_key
                echo ""
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
    echo -e "  ${YELLOW}${BOLD}SAVE THIS GATEWAY TOKEN — you need it to connect clients:${RESET}"
    echo -e "  ${CYAN}$token${RESET}"
    echo ""

    if ask_yn "Add your Anthropic API key now?"; then
        echo -ne "  ${BLUE}→${RESET} Paste your Anthropic API key (sk-ant-...): "
        read -rs api_key
        echo ""
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

check_docker_installed() {
    step_header "Docker Desktop"
    info "Container isolation is the most impactful security improvement for OpenClaw."

    if command -v docker &>/dev/null; then
        if docker info &>/dev/null; then
            pass "Docker is installed and running" "Docker"
            harden_docker_desktop
            return
        else
            warn "Docker is installed but not running"
            info "Open Docker Desktop from Applications to start it."

            if ask_yn "Attempt to start Docker Desktop?"; then
                open -a "Docker" 2>/dev/null || true
                info "Waiting for Docker to start (up to 60 seconds)..."
                local waited=0
                while [ $waited -lt 60 ]; do
                    if docker info &>/dev/null 2>&1; then
                        fixed "Docker Desktop started" "Docker"
                        harden_docker_desktop
                        return
                    fi
                    sleep 5
                    waited=$((waited + 5))
                    echo -ne "  ${DIM}  Waiting... (${waited}s)${RESET}\r"
                done
                echo ""
                fail "Docker did not start within 60 seconds — open it manually" "Docker"
                return
            else
                fail "Docker not running" "Docker"
                return
            fi
        fi
    fi

    warn "Docker is not installed"

    if ! command -v brew &>/dev/null; then
        fail "Docker not installed (install Homebrew first)" "Docker"
        return
    fi

    if ask_yn "Install Docker Desktop via Homebrew?"; then
        info "Installing Docker Desktop (this may take a few minutes)..."
        brew install --cask docker 2>&1 | tail -5 || {
            fail "Docker installation failed" "Docker"
            return
        }

        info "Opening Docker Desktop for first-time setup..."
        open -a "Docker" 2>/dev/null || true

        info "Waiting for Docker to start (up to 90 seconds)..."
        local waited=0
        while [ $waited -lt 90 ]; do
            if docker info &>/dev/null 2>&1; then
                fixed "Docker Desktop installed and running" "Docker"
                harden_docker_desktop
                return
            fi
            sleep 5
            waited=$((waited + 5))
            echo -ne "  ${DIM}  Waiting... (${waited}s)${RESET}\r"
        done
        echo ""
        warn "Docker installed but may still be starting up"
        info "Complete the Docker Desktop setup wizard, then re-run this script."
        fail "Docker installed but not yet responsive" "Docker"
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Docker not installed" "Docker"
        else
            skipped "Docker not installed" "Docker"
        fi
    fi
}

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
    echo -e "  ${CYAN}Docker Desktop hardening:${RESET}"

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

check_openclaw_running() {
    step_header "OpenClaw Instance Detection"
    info "Checking for running OpenClaw instances..."

    local found=false

    # Check for OpenClaw Docker container
    if command -v docker &>/dev/null && docker info &>/dev/null; then
        local oc_containers
        oc_containers=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$oc_containers" ]; then
            found=true
            echo -e "  ${CYAN}Found Docker container:${RESET}"
            echo "$oc_containers" | while read -r line; do
                echo -e "    ${DIM}$line${RESET}"
            done
        fi
    fi

    # Check for bare-metal process
    local oc_process
    oc_process=$(pgrep -fl "openclaw|moltbot|clawdbot" 2>/dev/null || true)
    if [ -n "$oc_process" ]; then
        found=true
        echo -e "  ${CYAN}Found bare-metal process:${RESET}"
        echo "$oc_process" | while read -r line; do
            echo -e "    ${DIM}$line${RESET}"
        done
    fi

    # Check for gateway port
    local port_check=""
    if command -v lsof &>/dev/null; then
        port_check=$(lsof -i :18789 2>/dev/null || true)
    elif command -v ss &>/dev/null; then
        port_check=$(ss -tlnp 2>/dev/null | grep ":18789" || true)
    fi
    if [ -n "$port_check" ]; then
        found=true
        echo -e "  ${CYAN}Port 18789 is in use:${RESET}"

        # Check binding address
        if echo "$port_check" | grep -q "0.0.0.0"; then
            fail "Gateway bound to 0.0.0.0 (ALL interfaces) — CRITICAL" "OpenClaw Gateway"
            info "This exposes the gateway to the entire network."
            info "Fix: Set gateway.bind to 'loopback' in openclaw.json"
        elif echo "$port_check" | grep -q "127.0.0.1\|localhost"; then
            pass "Gateway bound to localhost only" "OpenClaw Gateway"
        else
            warn "Gateway binding could not be determined"
        fi
    fi

    if [ "$found" = false ]; then
        info "No running OpenClaw instance detected"
        info "This is expected if you haven't installed OpenClaw yet."
    fi
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
                echo -e "  ${GREEN}✓${RESET} $dir exists (permissions: 700)"
            else
                echo -e "  ${YELLOW}⚠${RESET} $dir exists but permissions are $perms"
                chmod 700 "$dir"
                echo -e "  ${GREEN}✓${RESET} Fixed permissions to 700"
            fi
        else
            mkdir -p "$dir"
            chmod 700 "$dir"
            echo -e "  ${GREEN}✓${RESET} Created $dir (permissions: 700)"
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
                echo -e "  ${YELLOW}${BOLD}SAVE THIS TOKEN — you need it to connect clients:${RESET}"
                echo -e "  ${CYAN}$token${RESET}"
                echo ""
            fi
        fi

        # Check for API key
        if grep -qE "(ANTHROPIC_API_KEY|OPENAI_API_KEY)=" "$env_file" 2>/dev/null; then
            pass "LLM API key configured in .env" "API Key"
        else
            warn "No LLM API key found in .env"
            if ask_yn "Add your Anthropic API key now?"; then
                echo -ne "  ${BLUE}→${RESET} Paste your Anthropic API key (sk-ant-...): "
                read -rs api_key
                echo ""
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
    echo -e "  ${YELLOW}${BOLD}SAVE THIS GATEWAY TOKEN — you need it to connect clients:${RESET}"
    echo -e "  ${CYAN}$token${RESET}"
    echo ""

    if ask_yn "Add your Anthropic API key now?"; then
        echo -ne "  ${BLUE}→${RESET} Paste your Anthropic API key (sk-ant-...): "
        read -rs api_key
        echo ""
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
    echo -e "  ${CYAN}Security features enabled:${RESET}"
    echo -e "  ${DIM}  • Non-root user (1000:1000)${RESET}"
    echo -e "  ${DIM}  • All capabilities dropped (only NET_BIND_SERVICE added)${RESET}"
    echo -e "  ${DIM}  • no-new-privileges enforced${RESET}"
    echo -e "  ${DIM}  • Read-only root filesystem${RESET}"
    echo -e "  ${DIM}  • CPU (2) and memory (4GB) limits${RESET}"
    echo -e "  ${DIM}  • Ports bound to 127.0.0.1 only${RESET}"
    echo -e "  ${DIM}  • tmpfs with noexec,nosuid${RESET}"
    echo -e "  ${DIM}  • Bonjour/mDNS disabled${RESET}"
    echo -e "  ${DIM}  • Isolated Docker network${RESET}"
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
    echo -e "  ${CYAN}Configuration:${RESET}"
    echo -e "  ${DIM}  • gateway.bind = loopback (localhost only)${RESET}"
    echo -e "  ${DIM}  • gateway.auth.mode = token (required for every connection)${RESET}"
    echo -e "  ${DIM}  • gateway.controlUI = false (web UI disabled)${RESET}"
    echo -e "  ${DIM}  • gateway.discover.mode = off (no mDNS broadcast)${RESET}"
    echo -e "  ${DIM}  • exec.ask = on (agent asks before every command)${RESET}"
    echo -e "  ${DIM}  • applyPatch.workspaceOnly = true (agent can't write outside workspace)${RESET}"
    echo -e "  ${DIM}  • logging.redactSensitive = tools (keys redacted in logs)${RESET}"
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
        info "Pulling latest OpenClaw image..."
        cd "$OPENCLAW_DIR" && docker compose pull 2>&1 | tail -3

        info "Starting container..."
        cd "$OPENCLAW_DIR" && docker compose up -d 2>&1 | tail -5

        # Wait for healthy
        info "Waiting for OpenClaw to start (up to 30 seconds)..."
        local waited=0
        while [ $waited -lt 30 ]; do
            if docker ps --format '{{.Names}} {{.Status}}' 2>/dev/null | grep "openclaw" | grep -qi "healthy\|Up"; then
                echo ""
                fixed "OpenClaw container is running" "Deploy"

                # Show logs briefly
                echo ""
                echo -e "  ${CYAN}Recent container logs:${RESET}"
                docker logs --tail 10 openclaw 2>&1 | while read -r line; do
                    echo -e "  ${DIM}  $line${RESET}"
                done
                return
            fi
            sleep 3
            waited=$((waited + 3))
            echo -ne "  ${DIM}  Waiting... (${waited}s)${RESET}\r"
        done
        echo ""
        warn "Container started but may still be initializing"
        info "Check logs: docker logs -f openclaw"
        pass "OpenClaw container started (verify with docker logs)" "Deploy"
    else
        skipped "OpenClaw container not started" "Deploy"
    fi
}

# --- Docker Container Hardening Audit ---------------------------------------

audit_container_security() {
    step_header "Container Security Audit"

    if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^openclaw$"; then
        info "OpenClaw container is not running — skipping container audit"
        return
    fi

    echo ""
    echo -e "  ${CYAN}Auditing running container:${RESET}"

    # Check 1: Running as non-root
    local container_user
    container_user=$(docker exec openclaw id -u 2>/dev/null || echo "unknown")
    if [ "$container_user" = "0" ]; then
        fail "Container is running as ROOT (uid 0)" "Container User"
    elif [ "$container_user" = "unknown" ]; then
        warn "Could not determine container user"
    else
        pass "Container running as non-root (uid: $container_user)" "Container User"
    fi

    # Check 2: Capabilities
    local cap_info
    cap_info=$(docker inspect --format='{{.HostConfig.CapDrop}}' openclaw 2>/dev/null || echo "")
    if echo "$cap_info" | grep -qi "all"; then
        pass "All capabilities dropped (cap_drop: ALL)" "Capabilities"
    else
        fail "Capabilities not fully dropped — add cap_drop: ALL" "Capabilities"
    fi

    local cap_add
    cap_add=$(docker inspect --format='{{.HostConfig.CapAdd}}' openclaw 2>/dev/null || echo "")
    if echo "$cap_add" | grep -qi "NET_BIND_SERVICE" && [ "$(echo "$cap_add" | tr -cd ',' | wc -c)" -le 0 ]; then
        pass "Only NET_BIND_SERVICE capability added back" "Cap Add"
    elif [ -z "$cap_add" ] || echo "$cap_add" | grep -q "\[\]"; then
        pass "No extra capabilities added" "Cap Add"
    else
        warn "Additional capabilities added: $cap_add"
        fail "Minimize added capabilities — only NET_BIND_SERVICE should be needed" "Cap Add"
    fi

    # Check 3: Privileged mode
    local privileged
    privileged=$(docker inspect --format='{{.HostConfig.Privileged}}' openclaw 2>/dev/null || echo "unknown")
    if [ "$privileged" = "false" ]; then
        pass "Container is NOT privileged" "Privileged Mode"
    elif [ "$privileged" = "true" ]; then
        fail "CRITICAL: Container is running in PRIVILEGED mode" "Privileged Mode"
        info "Remove --privileged immediately — this gives full host access"
    fi

    # Check 4: no-new-privileges
    local no_new_priv
    no_new_priv=$(docker inspect --format='{{index .HostConfig.SecurityOpt}}' openclaw 2>/dev/null || echo "")
    if echo "$no_new_priv" | grep -qi "no-new-privileges"; then
        pass "no-new-privileges is set" "No New Privileges"
    else
        fail "no-new-privileges not set — add security_opt: no-new-privileges:true" "No New Privileges"
    fi

    # Check 5: Read-only root filesystem
    local readonly_fs
    readonly_fs=$(docker inspect --format='{{.HostConfig.ReadonlyRootfs}}' openclaw 2>/dev/null || echo "unknown")
    if [ "$readonly_fs" = "true" ]; then
        pass "Root filesystem is read-only" "Read-Only FS"
    else
        fail "Root filesystem is writable — add read_only: true to compose" "Read-Only FS"
    fi

    # Check 6: Port binding
    local port_bindings
    port_bindings=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}}={{(index $conf 0).HostIp}}:{{(index $conf 0).HostPort}} {{end}}' openclaw 2>/dev/null || echo "")

    local port_ok=true
    if echo "$port_bindings" | grep -q "0.0.0.0"; then
        fail "CRITICAL: Ports bound to 0.0.0.0 (all interfaces)" "Port Binding"
        info "Change to 127.0.0.1:<port>:<port> in docker-compose.yml"
        port_ok=false
    fi
    if [ "$port_ok" = true ] && [ -n "$port_bindings" ]; then
        pass "All ports bound to localhost only" "Port Binding"
    fi

    # Check 7: Resource limits
    local mem_limit
    mem_limit=$(docker inspect --format='{{.HostConfig.Memory}}' openclaw 2>/dev/null || echo "0")
    if [ "$mem_limit" -gt 0 ] 2>/dev/null; then
        local mem_mb=$((mem_limit / 1024 / 1024))
        pass "Memory limit set (${mem_mb}MB)" "Memory Limit"
    else
        fail "No memory limit set — container can consume all host memory" "Memory Limit"
    fi

    local cpu_limit
    cpu_limit=$(docker inspect --format='{{.HostConfig.NanoCpus}}' openclaw 2>/dev/null || echo "0")
    if [ "$cpu_limit" -gt 0 ] 2>/dev/null; then
        local cpu_cores=$((cpu_limit / 1000000000))
        pass "CPU limit set (~${cpu_cores} cores)" "CPU Limit"
    else
        fail "No CPU limit set — runaway agent can consume all CPUs" "CPU Limit"
    fi

    # Check 8: Network mode
    local net_mode
    net_mode=$(docker inspect --format='{{.HostConfig.NetworkMode}}' openclaw 2>/dev/null || echo "unknown")
    if [ "$net_mode" = "host" ]; then
        fail "CRITICAL: Container using host network mode — no network isolation" "Network Mode"
    else
        pass "Container using isolated network ($net_mode)" "Network Mode"
    fi

    # Check 9: Bonjour environment variable
    local bonjour_disabled
    bonjour_disabled=$(docker exec openclaw printenv OPENCLAW_DISABLE_BONJOUR 2>/dev/null || echo "")
    if [ "$bonjour_disabled" = "1" ]; then
        pass "OPENCLAW_DISABLE_BONJOUR=1 is set" "Container Bonjour"
    else
        fail "OPENCLAW_DISABLE_BONJOUR not set in container environment" "Container Bonjour"
    fi

    # Check 10: Volume mounts — warn on sensitive paths
    local mounts
    mounts=$(docker inspect --format='{{range .Mounts}}{{.Source}}:{{.Destination}}:{{.Mode}} {{end}}' openclaw 2>/dev/null || echo "")

    local mount_issue=false
    for sensitive_path in "/etc" "/var" "/root" "/Users" "/home"; do
        if echo "$mounts" | grep -q "^${sensitive_path}:"; then
            warn "Sensitive host path mounted: $sensitive_path"
            mount_issue=true
        fi
    done

    if [ "$mount_issue" = false ]; then
        pass "No sensitive host paths mounted" "Volume Mounts"
    else
        fail "Sensitive host paths are mounted into the container" "Volume Mounts"
    fi
}

# --- OpenClaw Config Audit (existing, enhanced) ----------------------------

check_openclaw_config() {
    step_header "OpenClaw Configuration Audit"

    local config_file="$HOME/.openclaw/openclaw.json"
    local config_dir="$HOME/.openclaw"

    if [ ! -d "$config_dir" ]; then
        info "No OpenClaw config directory found (~/.openclaw)"
        info "This is expected if OpenClaw isn't installed yet. Skipping config checks."
        return
    fi

    # Check directory permissions
    local dir_perms
    dir_perms=$(stat -f "%OLp" "$config_dir" 2>/dev/null || stat -c "%a" "$config_dir" 2>/dev/null || echo "unknown")
    if [ "$dir_perms" = "700" ]; then
        pass "Config directory permissions are 700 (owner-only)" "Config Permissions"
    else
        warn "Config directory permissions are $dir_perms (should be 700)"
        if ask_yn "Fix permissions to 700?"; then
            chmod 700 "$config_dir"
            fixed "Config directory set to 700" "Config Permissions"
        else
            if [ "$SCAN_ONLY" = true ]; then
                fail "Config directory permissions are $dir_perms (should be 700)" "Config Permissions"
            else
                skipped "Config directory permissions not changed" "Config Permissions"
            fi
        fi
    fi

    if [ ! -f "$config_file" ]; then
        info "No openclaw.json found. Skipping config content checks."
        return
    fi

    # Check config file permissions
    local file_perms
    file_perms=$(stat -f "%OLp" "$config_file" 2>/dev/null || stat -c "%a" "$config_file" 2>/dev/null || echo "unknown")
    if [ "$file_perms" = "600" ]; then
        pass "Config file permissions are 600" "Config File Permissions"
    else
        warn "Config file permissions are $file_perms (should be 600)"
        if ask_yn "Fix permissions to 600?"; then
            chmod 600 "$config_file"
            fixed "Config file set to 600" "Config File Permissions"
        else
            if [ "$SCAN_ONLY" = true ]; then
                fail "Config file permissions are $file_perms (should be 600)" "Config File Permissions"
            else
                skipped "Config file permissions not changed" "Config File Permissions"
            fi
        fi
    fi

    # Parse key config values (basic grep — not a full JSON parser)
    echo ""
    echo -e "  ${CYAN}Configuration audit:${RESET}"

    # gateway.bind
    if grep -q '"bind".*"loopback"' "$config_file" 2>/dev/null; then
        pass "gateway.bind = loopback" "gateway.bind"
    elif grep -q '"bind"' "$config_file" 2>/dev/null; then
        fail "gateway.bind is set but NOT to loopback" "gateway.bind"
    else
        warn "gateway.bind not explicitly set"
        fail "gateway.bind not configured (should be 'loopback')" "gateway.bind"
    fi

    # gateway.auth.mode
    if grep -q '"mode".*"token"' "$config_file" 2>/dev/null; then
        pass "gateway.auth.mode = token" "gateway.auth"
    else
        fail "Token authentication not configured" "gateway.auth"
    fi

    # gateway.controlUI
    if grep -q '"controlUI".*false' "$config_file" 2>/dev/null; then
        pass "gateway.controlUI = false (web UI disabled)" "gateway.controlUI"
    else
        warn "gateway.controlUI may be enabled"
        fail "Web control UI should be disabled (controlUI: false)" "gateway.controlUI"
    fi

    # gateway.discover.mode
    if grep -q '"discover"' "$config_file" 2>/dev/null && grep -q '"mode".*"off"' "$config_file" 2>/dev/null; then
        pass "gateway.discover.mode = off (mDNS disabled)" "gateway.discover"
    else
        fail "mDNS discovery should be disabled (discover.mode: off)" "gateway.discover"
    fi

    # exec.ask
    if grep -q '"ask".*"on"' "$config_file" 2>/dev/null; then
        pass "exec.ask = on (explicit consent mode)" "exec.ask"
    else
        fail "Explicit consent not enabled (exec.ask should be 'on')" "exec.ask"
    fi

    # logging.redactSensitive
    if grep -q '"redactSensitive"' "$config_file" 2>/dev/null; then
        pass "logging.redactSensitive is configured" "logging.redactSensitive"
    else
        fail "Sensitive log redaction not configured" "logging.redactSensitive"
    fi

    # Check for plain-text API keys in config
    if grep -qiE "(api.key|api_key|apikey|sk-ant-|sk-)" "$config_file" 2>/dev/null; then
        fail "CRITICAL: Possible plain-text API keys found in config file" "Credential Exposure"
        info "Move API keys to environment variables or a .env file"
    else
        pass "No plain-text API keys detected in config" "Credential Exposure"
    fi
}

check_env_file() {
    step_header ".env File Security"

    local env_candidates=(
        "$HOME/openclaw-docker/.env"
        "$HOME/.openclaw/.env"
        "$HOME/openclaw/.env"
    )

    local found_env=false

    for env_file in "${env_candidates[@]}"; do
        if [ -f "$env_file" ]; then
            found_env=true
            local perms
            perms=$(stat -f "%OLp" "$env_file" 2>/dev/null || stat -c "%a" "$env_file" 2>/dev/null || echo "unknown")

            if [ "$perms" = "600" ]; then
                pass ".env file ($env_file) permissions are 600" ".env Permissions"
            else
                warn ".env file ($env_file) permissions are $perms (should be 600)"
                if ask_yn "Fix permissions to 600?"; then
                    chmod 600 "$env_file"
                    fixed ".env file set to 600" ".env Permissions"
                else
                    if [ "$SCAN_ONLY" = true ]; then
                        fail ".env permissions are $perms (should be 600)" ".env Permissions"
                    else
                        skipped ".env permissions not changed" ".env Permissions"
                    fi
                fi
            fi
        fi
    done

    if [ "$found_env" = false ]; then
        info "No .env file found in common locations"
        info "Expected at ~/openclaw-docker/.env if using Docker setup"
    fi
}

# --- Network Checks --------------------------------------------------------

check_network_isolation() {
    step_header "Network Isolation"
    info "Checking if this machine appears to be on an isolated network."

    # Get current Wi-Fi SSID
    local ssid
    ssid=$(networksetup -getairportnetwork en0 2>/dev/null | sed 's/Current Wi-Fi Network: //' || echo "unknown")
    if [ "$ssid" = "unknown" ] || echo "$ssid" | grep -qi "not associated\|error\|not found"; then
        # Fallback to legacy airport binary (may not exist on newer macOS)
        ssid=$(/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null | awk '/ SSID/ {print substr($0, index($0, $2))}' || echo "unknown")
    fi

    if [ "$ssid" != "unknown" ]; then
        echo -e "  ${CYAN}Connected to Wi-Fi: ${BOLD}$ssid${RESET}"
        info "Verify this is your dedicated isolated network, not your primary Wi-Fi."
    else
        info "Could not determine Wi-Fi SSID"
    fi

    # We can't automatically verify network isolation without knowing the primary network
    # Just report the current network state
    local gateway_ip
    gateway_ip=$(route -n get default 2>/dev/null | grep "gateway" | awk '{print $2}' || echo "unknown")
    echo -e "  ${DIM}  Default gateway: $gateway_ip${RESET}"

    local local_ip
    local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
    echo -e "  ${DIM}  Local IP: $local_ip${RESET}"

    info "Manual verification required:"
    info "  1. Confirm this is NOT your primary network"
    info "  2. Test: ping a device on your primary network (should FAIL)"
    info "  3. Test: ping 8.8.8.8 (should SUCCEED)"

    pass "Network info displayed for manual verification" "Network Isolation"
}

# --- OpenClaw Installation Detection -----------------------------------------

OPENCLAW_INSTALLED=false
OPENCLAW_INSTALL_TYPE=""

detect_openclaw_installed() {
    OPENCLAW_INSTALLED=false
    OPENCLAW_INSTALL_TYPE=""

    # Check for Docker-based installation
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        # Running container
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "openclaw"; then
            OPENCLAW_INSTALLED=true
            OPENCLAW_INSTALL_TYPE="docker"
            return
        fi
        # Stopped container
        if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "openclaw"; then
            OPENCLAW_INSTALLED=true
            OPENCLAW_INSTALL_TYPE="docker"
            return
        fi
        # Image present
        if docker images --format '{{.Repository}}' 2>/dev/null | grep -qi "openclaw"; then
            OPENCLAW_INSTALLED=true
            OPENCLAW_INSTALL_TYPE="docker"
            return
        fi
    fi

    # Check for Docker Compose setup file
    if [ -f "$HOME/openclaw-docker/docker-compose.yml" ]; then
        OPENCLAW_INSTALLED=true
        OPENCLAW_INSTALL_TYPE="docker"
        return
    fi

    # Check for native npm installation
    if command -v openclaw &>/dev/null; then
        OPENCLAW_INSTALLED=true
        OPENCLAW_INSTALL_TYPE="native"
        return
    fi

    # Check for running process
    if pgrep -fl "openclaw" &>/dev/null 2>&1; then
        OPENCLAW_INSTALLED=true
        OPENCLAW_INSTALL_TYPE="native"
        return
    fi

    # Check for LaunchAgent (indicates prior native install)
    if [ -f "$HOME/Library/LaunchAgents/com.openclaw.agent.plist" ]; then
        OPENCLAW_INSTALLED=true
        OPENCLAW_INSTALL_TYPE="native"
        return
    fi
}

check_mdns_bonjour() {
    step_header "mDNS / Bonjour (OpenClaw Discovery)"
    info "OpenClaw can broadcast its presence via mDNS. This should be disabled."

    # Check if OpenClaw is broadcasting
    echo -e "  ${DIM}Scanning for OpenClaw mDNS broadcasts (5 seconds)...${RESET}"

    local mdns_result
    mdns_result=$(perl -e 'alarm 5; exec @ARGV' dns-sd -B _openclaw-gw._tcp 2>/dev/null || true)

    if echo "$mdns_result" | grep -qi "openclaw"; then
        fail "OpenClaw is broadcasting via mDNS — discoverable on the network" "mDNS"
        info "Set OPENCLAW_DISABLE_BONJOUR=1 in your environment"
        info "Set gateway.discover.mode = 'off' in openclaw.json"
    else
        pass "No OpenClaw mDNS broadcasts detected" "mDNS"
    fi
}

# === Linux Hardening Checks =================================================

linux_check_ssh_hardening() {
    step_header "SSH Hardening"
    info "SSH is the primary attack surface on a VPS. Hardening is critical."

    local sshd_config="/etc/ssh/sshd_config"
    local issues=()

    if [ ! -f "$sshd_config" ]; then
        warn "sshd_config not found at $sshd_config"
        fail "Cannot audit SSH configuration" "SSH Hardening"
        return
    fi

    # Check root login
    local root_login
    root_login=$(grep -i "^PermitRootLogin" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
    if [ -z "$root_login" ]; then
        root_login=$(grep -rhi "^PermitRootLogin" /etc/ssh/sshd_config.d/ 2>/dev/null | tail -1 | awk '{print $2}' || echo "")
    fi
    if [ "$root_login" = "no" ] || [ "$root_login" = "prohibit-password" ]; then
        echo -e "  ${GREEN}✓${RESET} PermitRootLogin = $root_login"
    else
        issues+=("root_login")
        warn "PermitRootLogin is '${root_login:-yes (default)}' — should be 'no' or 'prohibit-password'"
    fi

    # Check password authentication
    local pass_auth
    pass_auth=$(grep -i "^PasswordAuthentication" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
    if [ -z "$pass_auth" ]; then
        pass_auth=$(grep -rhi "^PasswordAuthentication" /etc/ssh/sshd_config.d/ 2>/dev/null | tail -1 | awk '{print $2}' || echo "")
    fi
    if [ "$pass_auth" = "no" ]; then
        echo -e "  ${GREEN}✓${RESET} PasswordAuthentication = no"
    else
        issues+=("pass_auth")
        warn "PasswordAuthentication is '${pass_auth:-yes (default)}' — should be 'no'"
    fi

    # Check X11 forwarding
    local x11
    x11=$(grep -i "^X11Forwarding" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
    if [ "$x11" = "no" ]; then
        echo -e "  ${GREEN}✓${RESET} X11Forwarding = no"
    elif [ "$x11" = "yes" ]; then
        issues+=("x11")
        warn "X11Forwarding is enabled — should be 'no' on a headless server"
    fi

    # Check MaxAuthTries
    local max_auth
    max_auth=$(grep -i "^MaxAuthTries" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
    if [ -n "$max_auth" ] && [ "$max_auth" -le 3 ] 2>/dev/null; then
        echo -e "  ${GREEN}✓${RESET} MaxAuthTries = $max_auth"
    elif [ -n "$max_auth" ] && [ "$max_auth" -gt 6 ] 2>/dev/null; then
        issues+=("max_auth")
        warn "MaxAuthTries is $max_auth — recommend ≤ 3"
    fi

    if [ ${#issues[@]} -eq 0 ]; then
        pass "SSH configuration is hardened" "SSH Hardening"
        return
    fi

    if ask_yn "Harden SSH configuration?"; then
        if ensure_sudo; then
            local dropin_dir="/etc/ssh/sshd_config.d"
            sudo mkdir -p "$dropin_dir" 2>/dev/null || true
            sudo tee "$dropin_dir/99-clawkeeper-hardening.conf" > /dev/null << 'SSH_EOF'
# CLAW Keeper SSH hardening
PermitRootLogin prohibit-password
PasswordAuthentication no
X11Forwarding no
MaxAuthTries 3
AllowAgentForwarding no
SSH_EOF

            # Validate config before reloading
            if sudo sshd -t 2>/dev/null; then
                sudo systemctl reload sshd 2>/dev/null || sudo systemctl reload ssh 2>/dev/null || true
                fixed "SSH hardened (drop-in: $dropin_dir/99-clawkeeper-hardening.conf)" "SSH Hardening"
                warn "IMPORTANT: Verify you can still SSH in from another terminal before closing this session!"
            else
                sudo rm -f "$dropin_dir/99-clawkeeper-hardening.conf"
                fail "SSH config validation failed — changes reverted" "SSH Hardening"
            fi
        else
            fail "SSH hardening requires sudo" "SSH Hardening"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "SSH is not fully hardened" "SSH Hardening"
        else
            skipped "SSH hardening deferred" "SSH Hardening"
        fi
    fi
}

linux_check_firewall() {
    step_header "Firewall (UFW)"
    info "A firewall limits inbound access to only the ports you need."

    if command -v ufw &>/dev/null; then
        local ufw_status
        ufw_status=$(sudo ufw status 2>/dev/null || ufw status 2>/dev/null || echo "unknown")

        if echo "$ufw_status" | grep -qi "Status: active"; then
            pass "UFW firewall is active" "Firewall"

            # Check if OpenClaw port is exposed externally
            if echo "$ufw_status" | grep -q "18789.*ALLOW.*Anywhere"; then
                warn "Port 18789 is open in UFW — prefer SSH tunnel over direct exposure"
            fi
            return
        fi

        warn "UFW is installed but not active"

        if ask_yn "Enable UFW with SSH-only inbound rules?"; then
            if ensure_sudo; then
                sudo ufw default deny incoming 2>/dev/null
                sudo ufw default allow outgoing 2>/dev/null
                sudo ufw allow ssh 2>/dev/null
                sudo ufw --force enable 2>/dev/null
                fixed "UFW enabled (SSH allowed, OpenClaw via SSH tunnel only)" "Firewall"
                info "Access OpenClaw via: ssh -N -L 18789:127.0.0.1:18789 user@this-server"
            else
                fail "UFW setup requires sudo" "Firewall"
            fi
        else
            if [ "$SCAN_ONLY" = true ]; then
                fail "UFW firewall is not active" "Firewall"
            else
                skipped "Firewall not enabled" "Firewall"
            fi
        fi
    else
        warn "UFW is not installed"

        if ask_yn "Install and configure UFW?"; then
            if ensure_sudo; then
                if command -v apt-get &>/dev/null; then
                    sudo apt-get update -qq && sudo apt-get install -y -qq ufw 2>&1 | tail -3
                elif command -v dnf &>/dev/null; then
                    sudo dnf install -y -q ufw 2>&1 | tail -3
                else
                    fail "Cannot install UFW — unsupported package manager" "Firewall"
                    return
                fi
                sudo ufw default deny incoming 2>/dev/null
                sudo ufw default allow outgoing 2>/dev/null
                sudo ufw allow ssh 2>/dev/null
                sudo ufw --force enable 2>/dev/null
                fixed "UFW installed and enabled (SSH-only inbound)" "Firewall"
                info "Access OpenClaw via SSH tunnel — do NOT open port 18789"
            else
                fail "Firewall setup requires sudo" "Firewall"
            fi
        else
            if [ "$SCAN_ONLY" = true ]; then
                fail "No firewall installed" "Firewall"
            else
                skipped "Firewall not installed" "Firewall"
            fi
        fi
    fi
}

linux_check_user_account() {
    step_header "User Account"
    info "OpenClaw should run under a non-root user to limit blast radius."

    local current_user
    current_user=$(whoami)

    if [ "$current_user" = "root" ]; then
        warn "You are running as root"
        info "A compromised agent running as root has full system access."

        if id "openclaw" &>/dev/null; then
            info "A dedicated 'openclaw' user already exists."
            info "Switch to it: su - openclaw"
            fail "Running as root (switch to 'openclaw' user)" "User Account"
        else
            if ask_yn "Create a dedicated 'openclaw' user?"; then
                # Add to docker group if docker is installed
                if getent group docker &>/dev/null; then
                    useradd -m -s /bin/bash -G docker openclaw 2>/dev/null
                else
                    useradd -m -s /bin/bash openclaw 2>/dev/null
                fi

                if [ $? -ne 0 ]; then
                    fail "Could not create 'openclaw' user" "User Account"
                    return
                fi

                echo -ne "  ${BLUE}→${RESET} Set password for 'openclaw' user: "
                read -rs openclaw_password
                echo ""

                if [ -n "$openclaw_password" ]; then
                    echo "openclaw:$openclaw_password" | chpasswd 2>/dev/null || {
                        fail "Could not set password" "User Account"
                        unset openclaw_password
                        return
                    }
                    unset openclaw_password

                    # Allow sudo for the user
                    if [ -d /etc/sudoers.d ]; then
                        echo "openclaw ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/openclaw 2>/dev/null || true
                        chmod 440 /etc/sudoers.d/openclaw 2>/dev/null || true
                    fi

                    # Create OpenClaw directories
                    mkdir -p /home/openclaw/.openclaw/workspace
                    chown -R openclaw:openclaw /home/openclaw/.openclaw

                    fixed "Created user 'openclaw' with home directory" "User Account"
                    info "Switch to it: su - openclaw"
                    info "Or SSH in as: ssh openclaw@this-server"
                else
                    fail "No password provided — user created but may not be usable" "User Account"
                fi
            else
                if [ "$SCAN_ONLY" = true ]; then
                    fail "Running as root" "User Account"
                else
                    skipped "Running as root" "User Account"
                fi
            fi
        fi
    else
        pass "Running as non-root user: $current_user" "User Account"

        # Check docker group membership if Docker mode
        if [ "$DEPLOY_MODE" = "docker" ] && command -v docker &>/dev/null; then
            if groups "$current_user" 2>/dev/null | grep -qw "docker"; then
                echo -e "  ${GREEN}✓${RESET} User is in 'docker' group"
            else
                warn "User is not in 'docker' group (needed for Docker deployment)"
                if ask_yn "Add $current_user to docker group?"; then
                    if ensure_sudo; then
                        sudo usermod -aG docker "$current_user" 2>/dev/null || true
                        fixed "Added $current_user to docker group" "Docker Group"
                        info "Log out and back in for group membership to take effect"
                    else
                        fail "Needs sudo to modify groups" "Docker Group"
                    fi
                fi
            fi
        fi
    fi
}

linux_check_auto_updates() {
    step_header "Automatic Security Updates"
    info "Servers should auto-install security patches to prevent known exploits."

    if [ "$LINUX_DISTRO" = "ubuntu" ] || [ "$LINUX_DISTRO" = "debian" ]; then
        if dpkg -l unattended-upgrades 2>/dev/null | grep -q "^ii"; then
            if systemctl is-active --quiet unattended-upgrades 2>/dev/null; then
                pass "unattended-upgrades is installed and active" "Auto Updates"
            else
                warn "unattended-upgrades is installed but not active"
                if ask_yn "Enable automatic security updates?"; then
                    if ensure_sudo; then
                        sudo systemctl enable --now unattended-upgrades 2>/dev/null || true
                        fixed "Automatic updates enabled" "Auto Updates"
                    fi
                else
                    if [ "$SCAN_ONLY" = true ]; then
                        fail "Automatic updates not active" "Auto Updates"
                    else
                        skipped "Automatic updates not enabled" "Auto Updates"
                    fi
                fi
            fi
        else
            warn "unattended-upgrades is not installed"
            if ask_yn "Install and enable automatic security updates?"; then
                if ensure_sudo; then
                    sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades 2>&1 | tail -3
                    sudo systemctl enable --now unattended-upgrades 2>/dev/null || true
                    fixed "unattended-upgrades installed and enabled" "Auto Updates"
                else
                    fail "Needs sudo to install unattended-upgrades" "Auto Updates"
                fi
            else
                if [ "$SCAN_ONLY" = true ]; then
                    fail "No automatic updates configured" "Auto Updates"
                else
                    skipped "Automatic updates not configured" "Auto Updates"
                fi
            fi
        fi
    elif [ "$LINUX_DISTRO" = "fedora" ] || [ "$LINUX_DISTRO" = "rhel" ] || [ "$LINUX_DISTRO" = "centos" ] || [ "$LINUX_DISTRO" = "rocky" ] || [ "$LINUX_DISTRO" = "almalinux" ]; then
        if rpm -q dnf-automatic &>/dev/null; then
            pass "dnf-automatic is installed" "Auto Updates"
        else
            warn "dnf-automatic is not installed"
            if ask_yn "Install and enable automatic security updates?"; then
                if ensure_sudo; then
                    sudo dnf install -y -q dnf-automatic 2>&1 | tail -3
                    sudo systemctl enable --now dnf-automatic-install.timer 2>/dev/null || true
                    fixed "dnf-automatic installed and enabled" "Auto Updates"
                else
                    fail "Needs sudo to install dnf-automatic" "Auto Updates"
                fi
            else
                if [ "$SCAN_ONLY" = true ]; then
                    fail "No automatic updates configured" "Auto Updates"
                else
                    skipped "Automatic updates not configured" "Auto Updates"
                fi
            fi
        fi
    else
        info "Auto-update check not supported for distro: $LINUX_DISTRO"
        skipped "Auto-update check skipped (unsupported distro)" "Auto Updates"
    fi
}

linux_check_fail2ban() {
    step_header "Fail2ban"
    info "Blocks IPs after repeated failed login attempts."

    if command -v fail2ban-client &>/dev/null; then
        if systemctl is-active --quiet fail2ban 2>/dev/null; then
            pass "Fail2ban is installed and running" "Fail2ban"
        else
            warn "Fail2ban is installed but not running"
            if ask_yn "Start and enable fail2ban?"; then
                if ensure_sudo; then
                    sudo systemctl enable --now fail2ban 2>/dev/null
                    fixed "Fail2ban started and enabled" "Fail2ban"
                fi
            else
                if [ "$SCAN_ONLY" = true ]; then
                    fail "Fail2ban is not running" "Fail2ban"
                else
                    skipped "Fail2ban not started" "Fail2ban"
                fi
            fi
        fi
    else
        warn "Fail2ban is not installed"

        if ask_yn "Install and configure fail2ban?"; then
            if ensure_sudo; then
                if command -v apt-get &>/dev/null; then
                    sudo apt-get update -qq && sudo apt-get install -y -qq fail2ban 2>&1 | tail -3
                elif command -v dnf &>/dev/null; then
                    sudo dnf install -y -q fail2ban 2>&1 | tail -3
                else
                    fail "Cannot install fail2ban — unsupported package manager" "Fail2ban"
                    return
                fi

                sudo tee /etc/fail2ban/jail.local > /dev/null << 'F2B_EOF'
# CLAW Keeper — fail2ban configuration
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
F2B_EOF

                sudo systemctl enable --now fail2ban 2>/dev/null || true
                fixed "Fail2ban installed and configured" "Fail2ban"
            else
                fail "Needs sudo to install fail2ban" "Fail2ban"
            fi
        else
            if [ "$SCAN_ONLY" = true ]; then
                fail "Fail2ban is not installed" "Fail2ban"
            else
                skipped "Fail2ban not installed" "Fail2ban"
            fi
        fi
    fi
}

linux_check_unnecessary_services() {
    step_header "Unnecessary Services"
    info "Reducing running services minimizes the attack surface."

    local unnecessary_services=()
    local checked_services=(
        "cups:Printing (CUPS)"
        "avahi-daemon:mDNS/Bonjour (Avahi)"
        "bluetooth:Bluetooth"
        "ModemManager:Modem Manager"
        "whoopsie:Ubuntu error reporting"
        "apport:Crash reporting"
    )

    for entry in "${checked_services[@]}"; do
        local svc_name="${entry%%:*}"
        local svc_desc="${entry##*:}"
        if systemctl is-active --quiet "$svc_name" 2>/dev/null; then
            unnecessary_services+=("$svc_name:$svc_desc")
            warn "$svc_desc ($svc_name) is running"
        fi
    done

    if [ ${#unnecessary_services[@]} -eq 0 ]; then
        pass "No unnecessary services detected" "Unnecessary Services"
        return
    fi

    if ask_yn "Disable ${#unnecessary_services[@]} unnecessary service(s)?"; then
        if ensure_sudo; then
            for entry in "${unnecessary_services[@]}"; do
                local svc_name="${entry%%:*}"
                local svc_desc="${entry##*:}"
                sudo systemctl disable --now "$svc_name" 2>/dev/null || true
                echo -e "  ${GREEN}✓${RESET} Disabled $svc_desc ($svc_name)"
            done
            fixed "Unnecessary services disabled" "Unnecessary Services"
        else
            fail "Needs sudo to disable services" "Unnecessary Services"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Unnecessary services running" "Unnecessary Services"
        else
            skipped "Unnecessary services left running" "Unnecessary Services"
        fi
    fi
}

linux_check_disk_encryption() {
    step_header "Disk Encryption"
    info "Protects data at rest if the server disk is accessed outside the VM."

    if command -v lsblk &>/dev/null; then
        if lsblk -o TYPE 2>/dev/null | grep -q "crypt"; then
            pass "LUKS disk encryption detected" "Disk Encryption"
            return
        fi
    fi

    if ls /dev/mapper/crypt* &>/dev/null 2>&1 || ls /dev/mapper/luks* &>/dev/null 2>&1; then
        pass "Encrypted volumes detected" "Disk Encryption"
        return
    fi

    warn "No disk encryption detected"
    info "Most VPS providers do not offer LUKS. Consider provider-level encryption"
    info "or application-level encryption for sensitive data."

    if [ "$SCAN_ONLY" = true ]; then
        fail "No disk encryption detected" "Disk Encryption"
    else
        skipped "Disk encryption not available (typical for VPS)" "Disk Encryption"
    fi
}

# === Linux Network Checks ==================================================

linux_check_network() {
    step_header "Network Configuration"
    info "Reviewing network interfaces and connectivity."

    local public_ip
    public_ip=$(curl -sf --max-time 5 https://ifconfig.me 2>/dev/null || curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || echo "unknown")
    local local_ip
    local_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")

    echo -e "  ${DIM}  Public IP: $public_ip${RESET}"
    echo -e "  ${DIM}  Local IP: $local_ip${RESET}"

    if [ "$IS_VPS" = true ]; then
        local virt_type
        virt_type=$(systemd-detect-virt 2>/dev/null || echo "unknown")
        echo -e "  ${DIM}  Virtualization: $virt_type${RESET}"
    fi

    info "For VPS deployments, bind OpenClaw to loopback and access via SSH tunnel:"
    info "  ssh -N -L 18789:127.0.0.1:18789 user@$public_ip"

    pass "Network info displayed" "Network"
}

linux_check_open_ports() {
    step_header "Open Ports Audit"
    info "Only essential ports should be listening on external interfaces."

    local listening_ports=""
    if command -v ss &>/dev/null; then
        listening_ports=$(ss -tlnp 2>/dev/null || echo "")
    elif command -v netstat &>/dev/null; then
        listening_ports=$(netstat -tlnp 2>/dev/null || echo "")
    else
        info "Neither ss nor netstat available — skipping port audit"
        return
    fi

    if [ -z "$listening_ports" ]; then
        info "Could not retrieve listening ports"
        return
    fi

    echo ""
    echo -e "  ${CYAN}Listening services:${RESET}"

    # Show summary of listening ports
    if command -v ss &>/dev/null; then
        ss -tlnp 2>/dev/null | grep "LISTEN" | while read -r line; do
            local addr
            addr=$(echo "$line" | awk '{print $4}')
            local proc
            proc=$(echo "$line" | awk '{print $6}')
            if echo "$addr" | grep -q "0.0.0.0\|::"; then
                echo -e "  ${YELLOW}⚠${RESET} ${DIM}$addr — $proc${RESET}"
            else
                echo -e "  ${DIM}  $addr — $proc${RESET}"
            fi
        done
    fi

    # Critical: check if OpenClaw port is externally exposed
    if echo "$listening_ports" | grep -q "0.0.0.0:18789\|:::18789"; then
        fail "OpenClaw gateway (18789) is listening on ALL interfaces — CRITICAL" "Open Ports"
        info "Bind to loopback only and use SSH tunnel for access"
    else
        pass "No critical port exposure detected" "Open Ports"
    fi
}

# === Linux Prerequisites ===================================================

linux_check_essentials() {
    step_header "Essential Packages"
    info "Checking for git, curl, and openssl."

    local missing=()
    for pkg in git curl openssl ca-certificates; do
        if command -v "$pkg" &>/dev/null; then
            echo -e "  ${GREEN}✓${RESET} $pkg"
        else
            missing+=("$pkg")
            warn "$pkg is not installed"
        fi
    done

    if [ ${#missing[@]} -eq 0 ]; then
        pass "All essential packages installed" "Essentials"
        return
    fi

    if ask_yn "Install missing packages (${missing[*]})?"; then
        if ensure_sudo; then
            if command -v apt-get &>/dev/null; then
                sudo apt-get update -qq && sudo apt-get install -y -qq "${missing[@]}" 2>&1 | tail -3
            elif command -v dnf &>/dev/null; then
                sudo dnf install -y -q "${missing[@]}" 2>&1 | tail -3
            else
                fail "Unsupported package manager" "Essentials"
                return
            fi
            fixed "Essential packages installed" "Essentials"
        else
            fail "Needs sudo to install packages" "Essentials"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Missing packages: ${missing[*]}" "Essentials"
        else
            skipped "Missing packages not installed" "Essentials"
        fi
    fi
}

linux_check_node() {
    step_header "Node.js"
    info "OpenClaw requires Node.js 22 or higher."

    if command -v node &>/dev/null; then
        local node_version
        node_version=$(node --version 2>/dev/null || echo "unknown")
        local major_version
        major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)

        if [ "$major_version" -ge 22 ] 2>/dev/null; then
            pass "Node.js $node_version installed (meets v22+ requirement)" "Node.js"
            return
        else
            warn "Node.js $node_version is installed but OpenClaw needs v22+"
        fi
    else
        warn "Node.js is not installed"
    fi

    if ask_yn "Install Node.js 22 via NodeSource?"; then
        if ensure_sudo; then
            info "Setting up NodeSource repository..."
            if command -v apt-get &>/dev/null; then
                curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tail -5
                sudo apt-get install -y -qq nodejs 2>&1 | tail -3
            elif command -v dnf &>/dev/null; then
                curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tail -5
                sudo dnf install -y -q nodejs 2>&1 | tail -3
            else
                fail "Unsupported package manager for NodeSource" "Node.js"
                return
            fi

            if command -v node &>/dev/null; then
                local new_version
                new_version=$(node --version 2>/dev/null)
                fixed "Node.js $new_version installed" "Node.js"
            else
                fail "Node.js installation failed" "Node.js"
            fi
        else
            fail "Needs sudo to install Node.js" "Node.js"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Node.js 22+ not installed" "Node.js"
        else
            skipped "Node.js not installed" "Node.js"
        fi
    fi
}

linux_check_docker() {
    step_header "Docker Engine"
    info "Docker provides container isolation for OpenClaw."

    if command -v docker &>/dev/null; then
        if docker info &>/dev/null 2>&1; then
            local docker_version
            docker_version=$(docker --version 2>/dev/null | head -1 || echo "unknown")
            pass "Docker is installed and running ($docker_version)" "Docker"

            # Check Docker Compose
            if docker compose version &>/dev/null 2>&1; then
                local compose_ver
                compose_ver=$(docker compose version --short 2>/dev/null || echo "unknown")
                echo -e "  ${GREEN}✓${RESET} Docker Compose $compose_ver"
            else
                warn "Docker Compose plugin not found"
                info "Install: sudo apt-get install docker-compose-plugin"
            fi
            return
        else
            warn "Docker is installed but not running or accessible"
            if ask_yn "Start Docker service?"; then
                if ensure_sudo; then
                    sudo systemctl start docker 2>/dev/null
                    sudo systemctl enable docker 2>/dev/null
                    if docker info &>/dev/null 2>&1; then
                        fixed "Docker service started and enabled" "Docker"
                    else
                        fail "Docker could not be started — check: sudo journalctl -u docker" "Docker"
                    fi
                else
                    fail "Needs sudo to start Docker" "Docker"
                fi
            else
                fail "Docker not running" "Docker"
            fi
            return
        fi
    fi

    warn "Docker is not installed"

    if ask_yn "Install Docker Engine via official script?"; then
        if ensure_sudo; then
            info "Installing Docker Engine (this may take a minute)..."
            curl -fsSL https://get.docker.com | sudo sh 2>&1 | tail -10 || {
                fail "Docker installation failed" "Docker"
                return
            }

            # Add current user to docker group
            local current_user
            current_user=$(whoami)
            if [ "$current_user" != "root" ]; then
                sudo usermod -aG docker "$current_user" 2>/dev/null || true
                info "Added $current_user to docker group (log out/in to take effect)"
            fi

            sudo systemctl enable --now docker 2>/dev/null || true

            if docker info &>/dev/null 2>&1 || sudo docker info &>/dev/null 2>&1; then
                fixed "Docker Engine installed and running" "Docker"
            else
                warn "Docker installed — you may need to log out and back in"
                info "Then verify with: docker info"
            fi
        else
            fail "Docker installation requires sudo" "Docker"
        fi
    else
        if [ "$SCAN_ONLY" = true ]; then
            fail "Docker not installed" "Docker"
        else
            skipped "Docker not installed" "Docker"
        fi
    fi
}

# --- Report -----------------------------------------------------------------

print_report() {
    echo ""
    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════${RESET}"
    echo ""

    # Calculate grade — SKIPPED = accepted risk (not penalized like FAIL)
    local scored_checks=$((PASS + FAIL + FIXED))
    local effective_pass=$((PASS + FIXED))
    local score=0

    if [ "$scored_checks" -gt 0 ]; then
        score=$(( (effective_pass * 100) / scored_checks ))
    fi

    local grade="F"
    local grade_color="$RED"
    if [ "$score" -ge 95 ]; then
        grade="A"; grade_color="$GREEN"
    elif [ "$score" -ge 85 ]; then
        grade="B"; grade_color="$GREEN"
    elif [ "$score" -ge 70 ]; then
        grade="C"; grade_color="$YELLOW"
    elif [ "$score" -ge 50 ]; then
        grade="D"; grade_color="$YELLOW"
    fi

    echo -e "  ${BOLD}Security Grade: ${grade_color}${BOLD}$grade${RESET} ${DIM}(${score}% of checks passing)${RESET}"
    echo ""
    echo -e "  ${GREEN}✓ Passed:${RESET}  $PASS"
    if [ "$FIXED" -gt 0 ]; then
        echo -e "  ${GREEN}✓ Fixed:${RESET}   $FIXED ${DIM}(improved during this session)${RESET}"
    fi
    echo -e "  ${RED}✗ Failed:${RESET}  $FAIL"
    if [ "$SKIPPED" -gt 0 ]; then
        echo -e "  ${YELLOW}⊘ Accepted:${RESET} $SKIPPED ${DIM}(conscious risk decisions)${RESET}"
    fi
    echo ""

    if [ "$FAIL" -gt 0 ]; then
        echo -e "  ${RED}${BOLD}Failed checks:${RESET}"
        for line in "${REPORT_LINES[@]}"; do
            local status step detail
            status=$(echo "$line" | cut -d'|' -f1)
            step=$(echo "$line" | cut -d'|' -f2)
            detail=$(echo "$line" | cut -d'|' -f3)
            if [ "$status" = "FAIL" ]; then
                echo -e "    ${RED}✗${RESET} ${BOLD}[$step]${RESET} $detail"
            fi
        done
        echo ""
    fi

    if [ "$SKIPPED" -gt 0 ]; then
        echo -e "  ${YELLOW}Accepted risks:${RESET}"
        for line in "${REPORT_LINES[@]}"; do
            local status step detail
            status=$(echo "$line" | cut -d'|' -f1)
            step=$(echo "$line" | cut -d'|' -f2)
            detail=$(echo "$line" | cut -d'|' -f3)
            if [ "$status" = "SKIPPED" ]; then
                echo -e "    ${YELLOW}⊘${RESET} [$step] $detail"
            fi
        done
        echo ""
    fi

    echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════${RESET}"

    if [ "$FAIL" -gt 0 ]; then
        echo ""
        echo -e "  Run ${CYAN}${BOLD}$(basename "$0") setup${RESET} to fix failed checks interactively."
    fi

    if [ "$PLATFORM" = "linux" ] && [ "$IS_VPS" = true ]; then
        echo ""
        local vps_ip
        vps_ip=$(curl -sf --max-time 3 https://ifconfig.me 2>/dev/null || echo "your-vps-ip")
        echo -e "  ${CYAN}VPS access:${RESET} ${DIM}ssh -N -L 18789:127.0.0.1:18789 user@${vps_ip}${RESET}"
    fi

    # CTA: agent install if not installed, dashboard if it is
    echo ""
    if [ -f "$AGENT_CONFIG_FILE" ]; then
        echo -e "  ${GREEN}✓${RESET} Agent installed — view your dashboard at ${CYAN}clawkeeper.dev${RESET}"
    else
        echo -e "  Track your score over time with a free dashboard:"
        echo -e "  → Sign up at ${CYAN}https://clawkeeper.dev/signup${RESET}"
        echo -e "  → Then run ${CYAN}clawkeeper.sh agent --install${RESET} to connect"
    fi
    echo ""
}

save_report() {
    if [ -z "$REPORT_FILE" ]; then
        return
    fi

    local os_info
    if [ "$PLATFORM" = "macos" ]; then
        os_info="macOS $(sw_vers -productVersion 2>/dev/null || echo 'unknown')"
    elif [ "$PLATFORM" = "linux" ]; then
        os_info="$LINUX_DISTRO_NAME"
    else
        os_info="$PLATFORM"
    fi

    local scored_checks=$((PASS + FAIL + FIXED))
    local effective_pass=$((PASS + FIXED))
    local score=0
    if [ "$scored_checks" -gt 0 ]; then
        score=$(( (effective_pass * 100) / scored_checks ))
    fi

    {
        echo "CLAW Keeper Security Report"
        echo "Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
        echo "Hostname: $(hostname)"
        echo "OS: $os_info"
        echo "User: $(whoami)"
        echo ""
        echo "---"
        echo ""
        echo "Score: ${score}%"
        echo "Passed: $PASS"
        echo "Fixed: $FIXED"
        echo "Failed: $FAIL"
        echo "Accepted risks: $SKIPPED"
        echo ""
        echo "---"
        echo ""

        for line in "${REPORT_LINES[@]}"; do
            local status step detail
            status=$(echo "$line" | cut -d'|' -f1)
            step=$(echo "$line" | cut -d'|' -f2)
            detail=$(echo "$line" | cut -d'|' -f3)
            printf "%-8s | %-25s | %s\n" "$status" "$step" "$detail"
        done

        echo ""
        echo "---"
        echo ""
        echo "This is a point-in-time snapshot. Settings drift over time."
        echo "For continuous monitoring, drift detection, and compliance reporting:"
        echo "https://clawkeeper.dev"
    } > "$REPORT_FILE"

    echo -e "  ${DIM}Report saved to: $REPORT_FILE${RESET}"
}

# --- Main -------------------------------------------------------------------

usage() {
    local prog
    prog=$(basename "$0")
    echo "Usage: $prog [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup       Guided wizard: harden host + install OpenClaw (default)"
    echo "  deploy      Force full deployment even if already installed"
    echo "  scan        Read-only security audit (no changes, just a report)"
    echo "  agent       Manage the Clawkeeper SaaS agent"
    echo "  help        Show this help"
    echo ""
    echo "Deployment modes (chosen interactively):"
    echo "  native      Run OpenClaw directly via npm — simpler"
    echo "  docker      Run OpenClaw in Docker — better isolation (recommended)"
    echo ""
    echo "Options:"
    echo "  --non-interactive    Don't prompt for fixes (same as scan)"
    echo "  --report FILE        Save report to FILE"
    echo ""
    echo "Examples:"
    echo "  $prog setup              # Interactive hardening wizard"
    echo "  $prog deploy             # Full install + deployment"
    echo "  $prog scan               # Read-only security audit"
    echo "  $prog scan --report r.txt # Audit with saved report"
    echo "  $prog agent --install    # Install SaaS monitoring agent"
    echo "  $prog agent --status     # Check agent status"
    echo ""
}

main() {
    local command="${1:-setup}"

    # Save all args after command for agent passthrough
    local agent_args=()
    shift 2>/dev/null || true
    agent_args=("$@")

    # Agent command handles its own args — skip main's parse loop
    if [ "$command" != "agent" ]; then
        while [[ $# -gt 0 ]]; do
            case "$1" in
                --non-interactive)
                    INTERACTIVE=false
                    ;;
                --report)
                    shift
                    REPORT_FILE="${1:-}"
                    ;;
                --help|-h)
                    usage
                    exit 0
                    ;;
                *)
                    ;;
            esac
            shift 2>/dev/null || true
        done
    fi

    # Detect platform before anything else
    detect_platform

    case "$command" in
        setup)
            SCAN_ONLY=false
            INTERACTIVE=true
            print_banner
            print_expectations
            select_deployment_mode
            ;;
        deploy)
            SCAN_ONLY=false
            INTERACTIVE=true
            print_banner
            print_expectations
            select_deployment_mode
            ;;
        scan)
            SCAN_ONLY=true
            INTERACTIVE=false
            print_scan_banner
            select_deployment_mode
            echo -e "  ${DIM}Read-only audit. No changes will be made.${RESET}"
            ;;
        agent)
            agent_main "${agent_args[@]+"${agent_args[@]}"}"
            exit 0
            ;;
        help|--help|-h)
            usage
            exit 0
            ;;
        *)
            echo "Unknown command: $command"
            usage
            exit 1
            ;;
    esac

    # ── Phase 1 of 5: Host Hardening ──
    reset_phase_counters
    echo ""
    if [ "$PLATFORM" = "macos" ]; then
        echo -e "${CYAN}${BOLD}═══ Phase 1 of 5: macOS Host Hardening ═══${RESET}"
        check_siri
        check_location_services
        check_bluetooth
        check_airdrop
        check_analytics
        check_spotlight
        check_firewall
        check_filevault
        check_admin_user
        check_icloud
        check_automatic_login
    elif [ "$PLATFORM" = "linux" ]; then
        echo -e "${CYAN}${BOLD}═══ Phase 1 of 5: Linux Host Hardening ═══${RESET}"
        linux_check_user_account
        linux_check_ssh_hardening
        linux_check_firewall
        linux_check_auto_updates
        linux_check_fail2ban
        linux_check_unnecessary_services
        linux_check_disk_encryption
    fi
    print_phase_summary
    echo -e "  ${DIM}These settings can drift. Track them: ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"

    # ── Phase 2 of 5: Network ──
    reset_phase_counters
    echo ""
    echo -e "${CYAN}${BOLD}═══ Phase 2 of 5: Network ═══${RESET}"

    if [ "$PLATFORM" = "macos" ]; then
        check_network_isolation
        check_screen_sharing
        check_remote_login
        check_mdns_bonjour
    elif [ "$PLATFORM" = "linux" ]; then
        linux_check_network
        linux_check_open_ports
    fi
    print_phase_summary

    # ── Phase 3 of 5: Prerequisites ──
    reset_phase_counters
    echo ""
    if [ "$PLATFORM" = "macos" ]; then
        if [ "$DEPLOY_MODE" = "native" ]; then
            echo -e "${CYAN}${BOLD}═══ Phase 3 of 5: Prerequisites (Homebrew + Node.js) ═══${RESET}"
            check_homebrew
            check_node
        else
            echo -e "${CYAN}${BOLD}═══ Phase 3 of 5: Prerequisites (Homebrew + Node.js + Docker) ═══${RESET}"
            check_homebrew
            check_node
            check_docker_installed
        fi
    elif [ "$PLATFORM" = "linux" ]; then
        if [ "$DEPLOY_MODE" = "native" ]; then
            echo -e "${CYAN}${BOLD}═══ Phase 3 of 5: Prerequisites (Node.js) ═══${RESET}"
            linux_check_essentials
            linux_check_node
        else
            echo -e "${CYAN}${BOLD}═══ Phase 3 of 5: Prerequisites (Node.js + Docker) ═══${RESET}"
            linux_check_essentials
            linux_check_node
            linux_check_docker
        fi
    fi
    print_phase_summary

    # ── Phase 4 of 5: OpenClaw Installation & Deployment ──
    reset_phase_counters
    detect_openclaw_installed

    if [ "$command" = "scan" ]; then
        # Scan mode: report installation status only
        echo ""
        echo -e "${CYAN}${BOLD}═══ Phase 4 of 5: OpenClaw Installation Status ═══${RESET}"
        step_header "OpenClaw Detection"
        if [ "$OPENCLAW_INSTALLED" = true ]; then
            local install_label="native (npm)"
            [ "$OPENCLAW_INSTALL_TYPE" = "docker" ] && install_label="Docker"
            pass "OpenClaw is installed ($install_label)" "OpenClaw Detection"
        else
            fail "OpenClaw is not installed" "OpenClaw Detection"
            info "Run '$(basename "$0") setup' to install OpenClaw with hardened defaults."
        fi

    elif [ "$command" = "setup" ]; then
        # Setup mode: detect and offer to install if missing
        echo ""
        echo -e "${CYAN}${BOLD}═══ Phase 4 of 5: OpenClaw Installation ═══${RESET}"

        if [ "$OPENCLAW_INSTALLED" = true ]; then
            step_header "OpenClaw Detection"
            local install_label="native (npm)"
            [ "$OPENCLAW_INSTALL_TYPE" = "docker" ] && install_label="Docker"
            pass "OpenClaw is already installed ($install_label)" "OpenClaw Detection"
        else
            step_header "OpenClaw Detection"
            warn "OpenClaw is not installed on this system"
            info "The setup wizard can install OpenClaw with secure, hardened defaults."
            if [ "$DEPLOY_MODE" = "native" ]; then
                info "Selected mode: Native (npm) — runs directly on this Mac"
            else
                info "Selected mode: Docker — runs in an isolated container (recommended)"
            fi
            echo ""

            if ask_yn "Install OpenClaw now?"; then
                if [ "$DEPLOY_MODE" = "native" ]; then
                    echo ""
                    echo -e "  ${CYAN}${BOLD}Installing OpenClaw (Native/npm)...${RESET}"
                    if command -v node &>/dev/null; then
                        setup_native_openclaw_directories
                        check_native_openclaw_installed
                        setup_native_env_file
                        setup_openclaw_config
                        setup_native_launchd
                    else
                        echo ""
                        warn "Node.js is not available — cannot install OpenClaw"
                        info "Re-run this wizard after installing Node.js (Phase 3)."
                        fail "Skipped installation (Node.js not available)" "Deploy"
                    fi
                else
                    echo ""
                    echo -e "  ${CYAN}${BOLD}Installing OpenClaw (Docker)...${RESET}"
                    if command -v docker &>/dev/null && docker info &>/dev/null; then
                        setup_openclaw_directories
                        setup_env_file
                        setup_docker_compose
                        setup_openclaw_config
                        deploy_openclaw_docker
                    else
                        echo ""
                        warn "Docker is not available — cannot install OpenClaw"
                        info "Re-run this wizard after installing Docker Desktop (Phase 3)."
                        fail "Skipped installation (Docker not available)" "Deploy"
                    fi
                fi
            else
                skipped "OpenClaw installation deferred" "OpenClaw Installation"
                info "Run '$(basename "$0") deploy' when you're ready to install."
            fi
        fi

    elif [ "$command" = "deploy" ]; then
        # Deploy mode: always run full deployment
        echo ""
        if [ "$DEPLOY_MODE" = "native" ]; then
            echo -e "${CYAN}${BOLD}═══ Phase 4 of 5: OpenClaw Native Deployment ═══${RESET}"

            if command -v node &>/dev/null; then
                setup_native_openclaw_directories
                check_native_openclaw_installed
                setup_native_env_file
                setup_openclaw_config
                setup_native_launchd
            else
                echo ""
                warn "Node.js is not available — cannot deploy OpenClaw"
                info "Install Node.js first, then re-run: $(basename "$0") deploy"
                fail "Skipped deployment (Node.js not available)" "Deploy"
            fi
        else
            echo -e "${CYAN}${BOLD}═══ Phase 4 of 5: OpenClaw Docker Deployment ═══${RESET}"

            if command -v docker &>/dev/null && docker info &>/dev/null; then
                setup_openclaw_directories
                setup_env_file
                setup_docker_compose
                setup_openclaw_config
                deploy_openclaw_docker
            else
                echo ""
                warn "Docker is not available — cannot deploy OpenClaw"
                info "Install and start Docker Desktop first, then re-run: $(basename "$0") deploy"
                fail "Skipped deployment (Docker not available)" "Deploy"
            fi
        fi
    fi

    print_phase_summary

    # ── Phase 5 of 5: Security Audit (all modes) ──
    reset_phase_counters
    echo ""
    echo -e "${CYAN}${BOLD}═══ Phase 5 of 5: Security Audit ═══${RESET}"

    check_openclaw_running

    if [ "$DEPLOY_MODE" = "native" ]; then
        check_openclaw_config
        check_env_file
    else
        audit_container_security
        check_openclaw_config
        check_env_file
    fi
    print_phase_summary

    # Final report
    print_report
    save_report
}

# Run
main "$@"