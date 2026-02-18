# ============================================================================
# CLAW Keeper Orchestrator
# CLI entrypoint, phase management, grading, and non-extracted checks.
# This file is concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

# set -uo pipefail is added by bundle.sh

# --- Colors & Formatting ---------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# --- Gum Theme Constants ---------------------------------------------------
HAS_GUM=false
GUM_GREEN="34"
GUM_RED="196"
GUM_YELLOW="220"
GUM_BLUE="33"
GUM_CYAN="45"
GUM_DIM="245"
GUM_BOLD_WHITE="15"
GUM_BORDER="rounded"
GUM_BORDER_FG="45"
GUM_SPINNER="dot"

# Pre-computed gum styled icons (populated by init_gum_icons)
_GUM_PASS_ICON=""
_GUM_FAIL_ICON=""
_GUM_WARN_ICON=""
_GUM_SKIP_ICON=""
_GUM_INFO_ICON=""
_GUM_FIXED_SUFFIX=""
_GUM_SKIPPED_SUFFIX=""

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
HOMEBREW_FAILED=false
CAN_INSTALL_SOFTWARE=true

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

# --- Gum Installation & Icons -----------------------------------------------

ensure_gum() {
    # Skip when stdout is not a TTY (piped output, scheduled jobs)
    if ! [ -t 1 ]; then
        return
    fi

    # Already available in PATH
    if command -v gum &>/dev/null; then
        HAS_GUM=true
        return
    fi

    # Check our local install location
    if [ -x "$HOME/.local/bin/gum" ]; then
        export PATH="$HOME/.local/bin:$PATH"
        HAS_GUM=true
        return
    fi

    # Auto-install gum binary
    local gum_version="0.15.2"
    local os_name arch_name
    os_name=$(uname -s)
    arch_name=$(uname -m)

    case "$os_name" in
        Darwin) ;;
        Linux)  ;;
        *)      return ;;
    esac

    case "$arch_name" in
        arm64|aarch64) arch_name="arm64" ;;
        x86_64)        ;;
        *)             return ;;
    esac

    local url="https://github.com/charmbracelet/gum/releases/download/v${gum_version}/gum_${gum_version}_${os_name}_${arch_name}.tar.gz"
    local tmp_dir dest_dir="$HOME/.local/bin"
    tmp_dir=$(mktemp -d)

    echo -e "  ${DIM}Installing gum for styled output...${RESET}"

    if curl -fsSL "$url" -o "$tmp_dir/gum.tar.gz" 2>/dev/null; then
        tar -xzf "$tmp_dir/gum.tar.gz" -C "$tmp_dir" 2>/dev/null || { rm -rf "$tmp_dir"; return; }
        mkdir -p "$dest_dir"
        # Find the gum binary in extracted contents
        local gum_bin=""
        for candidate in "$tmp_dir/gum" "$tmp_dir"/gum_*/gum; do
            if [ -f "$candidate" ]; then
                gum_bin="$candidate"
                break
            fi
        done
        if [ -n "$gum_bin" ]; then
            mv "$gum_bin" "$dest_dir/gum"
            chmod +x "$dest_dir/gum"
            export PATH="$dest_dir:$PATH"
            if command -v gum &>/dev/null; then
                HAS_GUM=true
                echo -e "  ${GREEN}✓${RESET} ${DIM}gum installed${RESET}"
            fi
        fi
    fi

    rm -rf "$tmp_dir"
}

init_gum_icons() {
    if [ "$HAS_GUM" != true ]; then
        return
    fi
    _GUM_PASS_ICON=$(gum style --foreground "$GUM_GREEN" "✓")
    _GUM_FAIL_ICON=$(gum style --foreground "$GUM_RED" "✗")
    _GUM_WARN_ICON=$(gum style --foreground "$GUM_YELLOW" "⚠")
    _GUM_SKIP_ICON=$(gum style --foreground "$GUM_YELLOW" "⊘")
    _GUM_INFO_ICON=$(gum style --foreground "$GUM_DIM" "→")
    _GUM_FIXED_SUFFIX=$(gum style --foreground "$GUM_DIM" "(just fixed)")
    _GUM_SKIPPED_SUFFIX=$(gum style --foreground "$GUM_DIM" "(accepted risk)")
}

# --- Styled Output Helpers (gum with ANSI fallback) -----------------------

ok_msg() {
    if [ "$HAS_GUM" = true ]; then echo "  ${_GUM_PASS_ICON} $*"
    else echo -e "  ${GREEN}✓${RESET} $*"; fi
}

fail_msg() {
    if [ "$HAS_GUM" = true ]; then echo "  ${_GUM_FAIL_ICON} $*"
    else echo -e "  ${RED}✗${RESET} $*"; fi
}

warn_msg() {
    if [ "$HAS_GUM" = true ]; then echo "  ${_GUM_WARN_ICON} $*"
    else echo -e "  ${YELLOW}⚠${RESET} $*"; fi
}

dim_msg() {
    if [ "$HAS_GUM" = true ]; then gum style --foreground "$GUM_DIM" -- "$*"
    else echo -e "${DIM}$*${RESET}"; fi
}

accent_msg() {
    if [ "$HAS_GUM" = true ]; then gum style --foreground "$GUM_CYAN" -- "$*"
    else echo -e "${CYAN}$*${RESET}"; fi
}

accent_bold_msg() {
    if [ "$HAS_GUM" = true ]; then gum style --bold --foreground "$GUM_CYAN" -- "$*"
    else echo -e "${CYAN}${BOLD}$*${RESET}"; fi
}

highlight_msg() {
    if [ "$HAS_GUM" = true ]; then gum style --bold --foreground "$GUM_YELLOW" -- "$*"
    else echo -e "${YELLOW}${BOLD}$*${RESET}"; fi
}

error_bold_msg() {
    if [ "$HAS_GUM" = true ]; then gum style --bold --foreground "$GUM_RED" -- "$*"
    else echo -e "${RED}${BOLD}$*${RESET}"; fi
}

bold_msg() {
    if [ "$HAS_GUM" = true ]; then gum style --bold --foreground "$GUM_BOLD_WHITE" -- "$*"
    else echo -e "${BOLD}$*${RESET}"; fi
}

phase_header() {
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_CYAN" --border normal --border-foreground "$GUM_BORDER_FG" --padding "0 2" -- "$1"
    else
        echo -e "${CYAN}${BOLD}$1${RESET}"
    fi
}

read_secret() {
    # $1 = prompt text, $2 = placeholder
    local prompt="$1" placeholder="${2:-}"
    if [ "$HAS_GUM" = true ]; then
        gum input --password --placeholder "$placeholder" --header "$prompt" </dev/tty
    else
        echo -ne "  ${BLUE}→${RESET} $prompt " >&2
        local key
        read -rs key </dev/tty
        echo "" >&2
        echo "$key"
    fi
}

# --- Helpers ----------------------------------------------------------------
print_platform_info() {
    local arch_label="$ARCH"
    if [ "$PLATFORM" = "macos" ]; then
        [ "$ARCH" = "arm64" ] && arch_label="Apple Silicon"
        [ "$ARCH" = "x86_64" ] && arch_label="Intel"
        dim_msg "  macOS $MACOS_VERSION ($arch_label)"
    elif [ "$PLATFORM" = "linux" ]; then
        dim_msg "  $LINUX_DISTRO_NAME ($arch_label)"
        if [ "$IS_VPS" = true ]; then
            local virt_type
            virt_type=$(systemd-detect-virt 2>/dev/null || echo "")
            dim_msg "  Virtualization: $virt_type (VPS/VM)"
        fi
    fi
    if [ -n "$DEPLOY_MODE" ]; then
        local mode_label="Docker"
        [ "$DEPLOY_MODE" = "native" ] && mode_label="Native (npm)"
        dim_msg "  Deployment mode: $mode_label"
    fi
}

print_banner() {
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --border "$GUM_BORDER" --border-foreground "$GUM_BORDER_FG" \
            --padding "1 4" --align center --bold --foreground "$GUM_CYAN" \
            "Clawkeeper Setup Wizard" "" "Harden your host. Deploy securely."
    else
        echo -e "${CYAN}${BOLD}"
        echo "   ┌────────────────────────────────────────┐"
        echo "   │                                        │"
        echo "   │        Clawkeeper Setup Wizard         │"
        echo "   │                                        │"
        echo "   │   Harden your host. Deploy securely.   │"
        echo "   │                                        │"
        echo "   └────────────────────────────────────────┘"
        echo -e "${RESET}"
    fi
    print_platform_info
}

print_scan_banner() {
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --border "$GUM_BORDER" --border-foreground "$GUM_BORDER_FG" \
            --padding "1 4" --align center --bold --foreground "$GUM_CYAN" \
            "Clawkeeper Security Scan"
    else
        echo -e "${CYAN}${BOLD}"
        echo "   ┌────────────────────────────────────────┐"
        echo "   │                                        │"
        echo "   │       Clawkeeper Security Scan         │"
        echo "   │                                        │"
        echo "   └────────────────────────────────────────┘"
        echo -e "${RESET}"
    fi
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
    local total_in_phase=$((p + x + f + s))

    # Don't print anything if no checks ran in this phase
    if [ "$total_in_phase" -eq 0 ]; then
        return
    fi

    echo ""
    if [ "$HAS_GUM" = true ]; then
        local summary="──"
        [ "$p" -gt 0 ] && summary="$summary $(gum style --foreground "$GUM_GREEN" "$p passed")"
        [ "$f" -gt 0 ] && summary="$summary $(gum style --foreground "$GUM_GREEN" "$f fixed")"
        [ "$x" -gt 0 ] && summary="$summary $(gum style --foreground "$GUM_RED" "$x failed")"
        [ "$s" -gt 0 ] && summary="$summary $(gum style --foreground "$GUM_YELLOW" "$s skipped")"
        summary="$summary ──"
        gum style --foreground "$GUM_DIM" -- "  $summary"
    else
        echo -ne "  ${DIM}──"
        [ "$p" -gt 0 ] && echo -ne " ${GREEN}$p passed${RESET}${DIM}"
        [ "$f" -gt 0 ] && echo -ne " ${GREEN}$f fixed${RESET}${DIM}"
        [ "$x" -gt 0 ] && echo -ne " ${RED}$x failed${RESET}${DIM}"
        [ "$s" -gt 0 ] && echo -ne " ${YELLOW}$s skipped${RESET}${DIM}"
        echo -e " ──${RESET}"
    fi
}

print_expectations() {
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --foreground "$GUM_DIM" -- \
            "  This wizard walks you through 5 phases:" \
            "    1. Host Hardening   — reduce your attack surface" \
            "    2. Network          — verify network security" \
            "    3. Prerequisites    — install required software" \
            "    4. OpenClaw         — deploy with hardened defaults" \
            "    5. Security Audit   — verify everything is locked down"
        echo ""
        echo "  $(gum style --foreground "$GUM_DIM" "Every change requires your approval. Nothing runs without") $(gum style --bold "[Y/n]")$(gum style --foreground "$GUM_DIM" ".")"
    else
        echo -e "  ${DIM}This wizard walks you through 5 phases:${RESET}"
        echo -e "  ${DIM}  1. Host Hardening   — reduce your attack surface${RESET}"
        echo -e "  ${DIM}  2. Network          — verify network security${RESET}"
        echo -e "  ${DIM}  3. Prerequisites    — install required software${RESET}"
        echo -e "  ${DIM}  4. OpenClaw         — deploy with hardened defaults${RESET}"
        echo -e "  ${DIM}  5. Security Audit   — verify everything is locked down${RESET}"
        echo ""
        echo -e "  ${DIM}Every change requires your approval. Nothing runs without ${RESET}${BOLD}[Y/n]${RESET}${DIM}.${RESET}"
    fi
}

step_header() {
    TOTAL=$((TOTAL + 1))
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_BOLD_WHITE" -- "Step ${TOTAL}: $1"
    else
        echo -e "${BOLD}Step ${TOTAL}: $1${RESET}"
    fi
}

pass() {
    PASS=$((PASS + 1))
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_PASS_ICON} $1"
    else
        echo -e "  ${GREEN}✓${RESET} $1"
    fi
    log_result "PASS" "$2" "$1"
}

fail() {
    FAIL=$((FAIL + 1))
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_FAIL_ICON} $1"
    else
        echo -e "  ${RED}✗${RESET} $1"
    fi
    log_result "FAIL" "$2" "$1"
}

fixed() {
    FIXED=$((FIXED + 1))
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_PASS_ICON} $1 ${_GUM_FIXED_SUFFIX}"
    else
        echo -e "  ${GREEN}✓${RESET} $1 ${DIM}(just fixed)${RESET}"
    fi
    log_result "FIXED" "$2" "$1"
    # After the 3rd fix, a subtle "at scale" hint
    if [ "$FIXED" -eq 3 ]; then
        if [ "$HAS_GUM" = true ]; then
            echo "  $(gum style --foreground "$GUM_DIM" "Track drift across hosts:") $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh agent --install")"
        else
            echo -e "  ${DIM}Track drift across hosts: ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"
        fi
    fi
}

skipped() {
    SKIPPED=$((SKIPPED + 1))
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_SKIP_ICON} $1 ${_GUM_SKIPPED_SUFFIX}"
    else
        echo -e "  ${YELLOW}⊘${RESET} $1 ${DIM}(accepted risk)${RESET}"
    fi
    log_result "SKIPPED" "$2" "$1"
}

warn() {
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_WARN_ICON} $1"
    else
        echo -e "  ${YELLOW}⚠${RESET} $1"
    fi
}

info() {
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_INFO_ICON} $1"
    else
        echo -e "  ${DIM}→ $1${RESET}"
    fi
}

ask_yn() {
    # $1 = prompt
    # Returns 0 for yes, 1 for no
    if [ "$INTERACTIVE" = false ] || [ "$SCAN_ONLY" = true ]; then
        return 1
    fi
    if [ "$HAS_GUM" = true ]; then
        gum confirm --default=yes --prompt.foreground="$GUM_BLUE" -- "  $1" </dev/tty
        return $?
    fi
    local answer
    echo -ne "  ${BLUE}→${RESET} $1 ${DIM}[Y/n]${RESET} "
    read -r answer </dev/tty
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

    if [ "$(uname -s)" = "Darwin" ]; then
        local plist_dest="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
        if [ -f "$plist_dest" ]; then
            launchctl unload "$plist_dest" 2>/dev/null || true
            rm -f "$plist_dest"
            ok_msg "LaunchAgent removed"
        else
            dim_msg "  No LaunchAgent found"
        fi
    elif [ "$(uname -s)" = "Linux" ]; then
        local service_dir="$HOME/.config/systemd/user"
        if [ -f "$service_dir/clawkeeper-agent.timer" ]; then
            systemctl --user disable --now clawkeeper-agent.timer 2>/dev/null || true
            rm -f "$service_dir/clawkeeper-agent.service" "$service_dir/clawkeeper-agent.timer"
            systemctl --user daemon-reload 2>/dev/null || true
            ok_msg "Systemd timer removed"
        else
            dim_msg "  No systemd timer found"
        fi
    fi

    if [ -d "$AGENT_CONFIG_DIR" ]; then
        rm -rf "$AGENT_CONFIG_DIR"
        ok_msg "Config directory removed ($AGENT_CONFIG_DIR)"
    fi

    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --foreground "$GUM_GREEN" -- "  Agent uninstalled."
    else
        echo -e "  ${GREEN}Agent uninstalled.${RESET}"
    fi
    echo ""
}

agent_status() {
    echo ""
    accent_bold_msg "  Clawkeeper Agent Status"
    echo ""

    # Config
    if [ -f "$AGENT_CONFIG_FILE" ]; then
        ok_msg "Config: $AGENT_CONFIG_FILE"
        # shellcheck disable=SC1090
        source "$AGENT_CONFIG_FILE"
        dim_msg "    API URL: ${CLAWKEEPER_API_URL:-$AGENT_API_URL}"
        dim_msg "    API Key: ${CLAWKEEPER_API_KEY:0:16}..."
    else
        fail_msg "Not configured. Run: clawkeeper.sh agent --install"
        return
    fi

    # Platform-specific scheduler status
    if [ "$(uname -s)" = "Darwin" ]; then
        local plist_dest="$HOME/Library/LaunchAgents/$AGENT_PLIST_LABEL.plist"
        if [ -f "$plist_dest" ]; then
            ok_msg "LaunchAgent: installed"
            local launchd_status
            launchd_status=$(launchctl list 2>/dev/null | grep "$AGENT_PLIST_LABEL" || true)
            if [ -n "$launchd_status" ]; then
                ok_msg "LaunchAgent: loaded"
            else
                warn_msg "LaunchAgent: not loaded"
            fi
        else
            warn_msg "LaunchAgent: not installed"
        fi
    elif [ "$(uname -s)" = "Linux" ]; then
        local timer_status
        timer_status=$(systemctl --user is-active clawkeeper-agent.timer 2>/dev/null || echo "inactive")
        if [ "$timer_status" = "active" ]; then
            ok_msg "Systemd timer: active"
        else
            warn_msg "Systemd timer: $timer_status"
        fi
    fi

    # Last run
    local log_file="$AGENT_CONFIG_DIR/agent.log"
    if [ -f "$log_file" ]; then
        local last_line
        last_line=$(tail -1 "$log_file")
        dim_msg "    Last log: $last_line"
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
    # Check if we already have sudo cached
    if sudo -n true 2>/dev/null; then
        SUDO_AUTHENTICATED=true
        return 0
    fi
    echo ""
    highlight_msg "  Some fixes require administrator privileges (sudo)."
    echo ""
    if sudo -v; then
        SUDO_AUTHENTICATED=true
        echo ""
        ok_msg "Sudo access granted"
        return 0
    else
        echo ""
        fail_msg "Could not get sudo access. Some fixes will be skipped."
        return 1
    fi
}

# --- Run Check (extracted checks dispatcher) --------------------------------
# Runs a check.sh from checks/<id>/, parses its JSON output, and renders
# terminal output using the standard pass/fail/fixed/skipped/info/warn helpers.
# For prompt actions, calls remediate.sh if the user accepts.

run_check() {
    local check_id="$1"
    local check_func="__check_${check_id}"
    local remediate_func="__remediate_${check_id}"

    # Read metadata from the __meta_<id> function (set by bundle) or fallback
    local check_name="$check_id"
    if type "__meta_${check_id}" &>/dev/null; then
        check_name=$("__meta_${check_id}" name)
    fi

    local mode="scan"
    [ "$SCAN_ONLY" != true ] && mode="setup"

    step_header "$check_name"

    # Run the check function and capture JSON output
    local json_output
    json_output=$("$check_func" --mode "$mode" 2>/dev/null)

    # Process each JSON line
    while IFS= read -r line; do
        [ -z "$line" ] && continue

        local j_status j_type j_detail j_action j_message j_rid j_fail j_skip j_check
        j_status=$(_jval "$line" "status")
        j_type=$(_jval "$line" "type")
        j_detail=$(_jval "$line" "detail")
        j_action=$(_jval "$line" "action")
        j_message=$(_jval "$line" "message")
        j_rid=$(_jval "$line" "remediation_id")
        j_fail=$(_jval "$line" "fail_detail")
        j_skip=$(_jval "$line" "skip_detail")
        j_check=$(_jval "$line" "check_name")
        [ -z "$j_check" ] && j_check="$check_name"

        if [ -n "$j_type" ]; then
            case "$j_type" in
                info) info "$j_message" ;;
                warn) warn "$j_message" ;;
            esac
        elif [ "$j_action" = "prompt" ]; then
            if ask_yn "$j_message"; then
                # Run remediation
                local rem_output
                rem_output=$("$remediate_func" "$j_rid" 2>/dev/null)
                while IFS= read -r rem_line; do
                    [ -z "$rem_line" ] && continue
                    local r_status r_type r_detail r_message r_check
                    r_status=$(_jval "$rem_line" "status")
                    r_type=$(_jval "$rem_line" "type")
                    r_detail=$(_jval "$rem_line" "detail")
                    r_message=$(_jval "$rem_line" "message")
                    r_check=$(_jval "$rem_line" "check_name")
                    [ -z "$r_check" ] && r_check="$j_check"

                    if [ -n "$r_type" ]; then
                        case "$r_type" in
                            info) info "$r_message" ;;
                            warn) warn "$r_message" ;;
                        esac
                    elif [ -n "$r_status" ]; then
                        case "$r_status" in
                            PASS)  fixed "$r_detail" "$r_check" ;;
                            FIXED) fixed "$r_detail" "$r_check" ;;
                            FAIL)  fail "$r_detail" "$r_check" ;;
                        esac
                    fi
                done <<< "$rem_output"
            else
                # User declined — FAIL in scan mode, SKIPPED in setup mode
                if [ "$SCAN_ONLY" = true ]; then
                    local fail_msg="${j_fail:-$j_message}"
                    fail "$fail_msg" "$j_check"
                else
                    local skip_msg="${j_skip:-${j_fail:-$j_message}}"
                    skipped "$skip_msg" "$j_check"
                fi
            fi
        elif [ -n "$j_status" ]; then
            case "$j_status" in
                PASS)    pass "$j_detail" "$j_check" ;;
                FAIL)    fail "$j_detail" "$j_check" ;;
                FIXED)   fixed "$j_detail" "$j_check" ;;
                SKIPPED) skipped "$j_detail" "$j_check" ;;
            esac
        fi
    done <<< "$json_output"
}

# --- Checks -----------------------------------------------------------------

# check_siri — extracted to checks/siri/{check.sh,remediate.sh}

# check_location_services — extracted to checks/location_services/

# check_bluetooth — extracted to checks/bluetooth/

# check_airdrop — extracted to checks/airdrop/

# check_analytics — extracted to checks/analytics/

# check_spotlight — extracted to checks/spotlight/

# check_firewall — extracted to checks/firewall/

# check_filevault — extracted to checks/filevault/

# check_admin_user — extracted to checks/admin_user/

# check_icloud — extracted to checks/icloud/

# check_remote_login — extracted to checks/remote_login/

# check_screen_sharing — extracted to checks/screen_sharing/

# check_automatic_login — extracted to checks/automatic_login/

# --- Admin / Install Capability Check ---------------------------------------

detect_install_capability() {
    # Determines if the current user can install software (needs admin/sudo).
    # Called before Phase 3 to warn the user early instead of failing mid-install.
    CAN_INSTALL_SOFTWARE=true

    if [ "$PLATFORM" = "macos" ]; then
        local current_user
        current_user=$(whoami)
        if ! groups "$current_user" 2>/dev/null | grep -qw "admin"; then
            # Standard (non-admin) user on macOS — cannot install via Homebrew/sudo
            CAN_INSTALL_SOFTWARE=false
        fi
    elif [ "$PLATFORM" = "linux" ]; then
        # Check if user can sudo (member of sudo/wheel group, or has NOPASSWD)
        if ! sudo -n true 2>/dev/null; then
            local current_user
            current_user=$(whoami)
            if ! groups "$current_user" 2>/dev/null | grep -qwE "sudo|wheel|admin"; then
                CAN_INSTALL_SOFTWARE=false
            fi
        fi
    fi
}

print_install_capability_warning() {
    # Shows a clear warning when a standard user can't install software,
    # with actionable instructions for what to do.
    if [ "$CAN_INSTALL_SOFTWARE" = true ]; then
        return
    fi

    local current_user
    current_user=$(whoami)

    echo ""
    highlight_msg "  Note: You're running as standard user '$current_user' (no admin/sudo)."
    dim_msg "  This is good for security, but installing new software requires admin."
    echo ""

    if [ "$PLATFORM" = "macos" ]; then
        if [ "$DEPLOY_MODE" = "native" ]; then
            dim_msg "  To install prerequisites, ask an admin to run:"
            accent_msg "    1. Install Homebrew:  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            accent_msg "    2. Install Node.js:   brew install node@22 && brew link --overwrite node@22"
        else
            dim_msg "  To install Docker, ask an admin to either:"
            accent_msg "    • Download Docker Desktop from https://docker.com/products/docker-desktop"
            accent_msg "    • Or install via Homebrew: brew install --cask docker"
        fi
        echo ""
        dim_msg "  Then re-run this script as '$current_user' — the security checks will pass."
    elif [ "$PLATFORM" = "linux" ]; then
        dim_msg "  Ask an admin to install prerequisites, then re-run as '$current_user'."
    fi

    echo ""
    dim_msg "  Checking what's already available..."
}

# --- Prerequisites ----------------------------------------------------------

# check_homebrew — extracted to checks/homebrew/

# check_node — extracted to checks/node/

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
    if [ "$HAS_GUM" = true ]; then
        local choice
        choice=$(gum choose --header "  How would you like to run OpenClaw?" \
            "Docker (recommended) — isolated container, limits agent access" \
            "Native (npm) — runs directly on your OS, simpler setup" </dev/tty)
        case "$choice" in
            Native*)
                DEPLOY_MODE="native"
                ok_msg "Selected: Native (npm) deployment"
                ;;
            *)
                DEPLOY_MODE="docker"
                ok_msg "Selected: Docker deployment"
                ;;
        esac
    else
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
        read -r choice </dev/tty

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
    fi
}

# --- Native (npm/npx) Deployment -------------------------------------------

OPENCLAW_NATIVE_DIR="$HOME/.openclaw"
OPENCLAW_NATIVE_WORKSPACE="$HOME/openclaw/workspace"

# check_native_openclaw_installed — extracted to checks/native_openclaw/

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

# check_docker_installed — extracted to checks/docker_installed/

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

# check_openclaw_running — extracted to checks/openclaw_running/

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

# --- Docker Container Hardening Audit ---------------------------------------

# audit_container_security — extracted to checks/container_security/

# --- OpenClaw Config Audit (existing, enhanced) ----------------------------

# check_openclaw_config — extracted to checks/openclaw_config/

# check_env_file — extracted to checks/env_file/

# --- Deep OpenClaw Security Checks -----------------------------------------

# check_openclaw_hardening — extracted to checks/openclaw_hardening/

# check_credential_exposure — extracted to checks/credential_exposure/

# check_skills_security — extracted to checks/skills_security/

# check_soul_security — extracted to checks/soul_security/

# --- Network Checks --------------------------------------------------------

# check_network_isolation — extracted to checks/network_isolation/

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

# check_mdns_bonjour — extracted to checks/mdns_bonjour/

# === Linux Hardening Checks =================================================

# linux_check_ssh_hardening — extracted to checks/linux_ssh_hardening/

# linux_check_firewall — extracted to checks/linux_firewall/

# linux_check_user_account — extracted to checks/linux_user_account/

# linux_check_auto_updates — extracted to checks/linux_auto_updates/

# linux_check_fail2ban — extracted to checks/linux_fail2ban/

# linux_check_unnecessary_services — extracted to checks/linux_unnecessary_services/

# linux_check_disk_encryption — extracted to checks/linux_disk_encryption/

# === Linux Network Checks ==================================================

# linux_check_network — extracted to checks/linux_network/

# linux_check_open_ports — extracted to checks/linux_open_ports/

# === Linux Prerequisites ===================================================

# linux_check_essentials — extracted to checks/linux_essentials/

# linux_check_node — extracted to checks/linux_node/

# linux_check_docker — extracted to checks/linux_docker/

# --- Report -----------------------------------------------------------------

print_report() {
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_CYAN" --border double --border-foreground "$GUM_BORDER_FG" --padding "0 2" -- ""
    else
        echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════${RESET}"
    fi
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
    local gum_grade_color="$GUM_RED"
    if [ "$score" -ge 95 ]; then
        grade="A"; grade_color="$GREEN"; gum_grade_color="$GUM_GREEN"
    elif [ "$score" -ge 85 ]; then
        grade="B"; grade_color="$GREEN"; gum_grade_color="$GUM_GREEN"
    elif [ "$score" -ge 70 ]; then
        grade="C"; grade_color="$YELLOW"; gum_grade_color="$GUM_YELLOW"
    elif [ "$score" -ge 50 ]; then
        grade="D"; grade_color="$YELLOW"; gum_grade_color="$GUM_YELLOW"
    fi

    if [ "$HAS_GUM" = true ]; then
        echo "  $(gum style --bold "Security Grade:") $(gum style --bold --foreground "$gum_grade_color" "$grade") $(gum style --foreground "$GUM_DIM" "(${score}% of checks passing)")"
    else
        echo -e "  ${BOLD}Security Grade: ${grade_color}${BOLD}$grade${RESET} ${DIM}(${score}% of checks passing)${RESET}"
    fi
    echo ""

    if [ "$HAS_GUM" = true ]; then
        echo "  $(gum style --foreground "$GUM_GREEN" "✓ Passed:")  $PASS"
        if [ "$FIXED" -gt 0 ]; then
            echo "  $(gum style --foreground "$GUM_GREEN" "✓ Fixed:")   $FIXED $(gum style --foreground "$GUM_DIM" "(improved during this session)")"
        fi
        echo "  $(gum style --foreground "$GUM_RED" "✗ Failed:")  $FAIL"
        if [ "$SKIPPED" -gt 0 ]; then
            echo "  $(gum style --foreground "$GUM_YELLOW" "⊘ Accepted:") $SKIPPED $(gum style --foreground "$GUM_DIM" "(conscious risk decisions)")"
        fi
    else
        echo -e "  ${GREEN}✓ Passed:${RESET}  $PASS"
        if [ "$FIXED" -gt 0 ]; then
            echo -e "  ${GREEN}✓ Fixed:${RESET}   $FIXED ${DIM}(improved during this session)${RESET}"
        fi
        echo -e "  ${RED}✗ Failed:${RESET}  $FAIL"
        if [ "$SKIPPED" -gt 0 ]; then
            echo -e "  ${YELLOW}⊘ Accepted:${RESET} $SKIPPED ${DIM}(conscious risk decisions)${RESET}"
        fi
    fi
    echo ""

    if [ "$FAIL" -gt 0 ]; then
        error_bold_msg "  Failed checks:"
        for line in "${REPORT_LINES[@]}"; do
            local status step detail
            status=$(echo "$line" | cut -d'|' -f1)
            step=$(echo "$line" | cut -d'|' -f2)
            detail=$(echo "$line" | cut -d'|' -f3)
            if [ "$status" = "FAIL" ]; then
                if [ "$HAS_GUM" = true ]; then
                    echo "    ${_GUM_FAIL_ICON} $(gum style --bold "[$step]") $detail"
                else
                    echo -e "    ${RED}✗${RESET} ${BOLD}[$step]${RESET} $detail"
                fi
            fi
        done
        echo ""
    fi

    if [ "$SKIPPED" -gt 0 ]; then
        if [ "$HAS_GUM" = true ]; then
            gum style --foreground "$GUM_YELLOW" -- "  Accepted risks:"
        else
            echo -e "  ${YELLOW}Accepted risks:${RESET}"
        fi
        for line in "${REPORT_LINES[@]}"; do
            local status step detail
            status=$(echo "$line" | cut -d'|' -f1)
            step=$(echo "$line" | cut -d'|' -f2)
            detail=$(echo "$line" | cut -d'|' -f3)
            if [ "$status" = "SKIPPED" ]; then
                if [ "$HAS_GUM" = true ]; then
                    echo "    ${_GUM_SKIP_ICON} [$step] $detail"
                else
                    echo -e "    ${YELLOW}⊘${RESET} [$step] $detail"
                fi
            fi
        done
        echo ""
    fi

    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_CYAN" --border double --border-foreground "$GUM_BORDER_FG" --padding "0 2" -- ""
    else
        echo -e "${CYAN}${BOLD}════════════════════════════════════════════════════${RESET}"
    fi

    if [ "$FAIL" -gt 0 ]; then
        echo ""
        if [ "$HAS_GUM" = true ]; then
            echo "  Run $(gum style --bold --foreground "$GUM_CYAN" "$(basename "$0") setup") to fix failed checks interactively."
        else
            echo -e "  Run ${CYAN}${BOLD}$(basename "$0") setup${RESET} to fix failed checks interactively."
        fi
    fi

    if [ "$PLATFORM" = "linux" ] && [ "$IS_VPS" = true ]; then
        echo ""
        local vps_ip
        vps_ip=$(curl -sf --max-time 3 https://ifconfig.me 2>/dev/null || echo "your-vps-ip")
        if [ "$HAS_GUM" = true ]; then
            echo "  $(gum style --foreground "$GUM_CYAN" "VPS access:") $(gum style --foreground "$GUM_DIM" "ssh -N -L 18789:127.0.0.1:18789 user@${vps_ip}")"
        else
            echo -e "  ${CYAN}VPS access:${RESET} ${DIM}ssh -N -L 18789:127.0.0.1:18789 user@${vps_ip}${RESET}"
        fi
    fi

    # CTA: check if agent is actually connected (has API key), not just config file
    echo ""
    local has_api_key=false
    if [ -f "$AGENT_CONFIG_FILE" ] && grep -q 'CLAWKEEPER_API_KEY="ck_' "$AGENT_CONFIG_FILE" 2>/dev/null; then
        has_api_key=true
    fi

    if [ "$has_api_key" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            echo "  ${_GUM_PASS_ICON} Agent connected — view your dashboard at $(gum style --foreground "$GUM_CYAN" "clawkeeper.dev")"
        else
            echo -e "  ${GREEN}✓${RESET} Agent connected — view your dashboard at ${CYAN}clawkeeper.dev${RESET}"
        fi
    else
        echo "  Track your score over time with a free dashboard:"
        if [ "$HAS_GUM" = true ]; then
            echo "  → Sign up at $(gum style --foreground "$GUM_CYAN" "https://clawkeeper.dev/signup")"
            echo "  → Then run $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh agent --install") to connect"
        else
            echo -e "  → Sign up at ${CYAN}https://clawkeeper.dev/signup${RESET}"
            echo -e "  → Then run ${CYAN}clawkeeper.sh agent --install${RESET} to connect"
        fi
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

    dim_msg "  Report saved to: $REPORT_FILE"
}

# --- Secure Uninstall -------------------------------------------------------

uninstall_openclaw() {
    print_banner
    echo ""
    error_bold_msg "  OpenClaw Secure Removal"
    echo ""
    dim_msg "  This will permanently remove OpenClaw and securely wipe sensitive data."
    if [ "$HAS_GUM" = true ]; then
        echo "  $(gum style --foreground "$GUM_DIM" "Every step requires your confirmation. Nothing runs without") $(gum style --bold "[Y/n]")$(gum style --foreground "$GUM_DIM" ".")"
    else
        echo -e "  ${DIM}Every step requires your confirmation. Nothing runs without ${RESET}${BOLD}[Y/n]${RESET}${DIM}.${RESET}"
    fi
    echo ""

    detect_platform

    # Detect what's installed
    detect_openclaw_installed

    if [ "$OPENCLAW_INSTALLED" = false ]; then
        warn_msg "No OpenClaw installation detected."
        echo ""
        dim_msg "  Checked: Docker containers/images, npm global, LaunchAgents, processes"
        echo ""
        if ! ask_yn "Continue anyway to clean up leftover config/data files?"; then
            dim_msg "  Nothing to do. Exiting."
            exit 0
        fi
    fi

    local removed_something=false

    # ── Step 1: Stop running instances ──
    echo ""
    accent_bold_msg "  ── Step 1: Stop Running Instances ──"

    # Docker containers
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        local running_containers
        running_containers=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$running_containers" ]; then
            warn_msg "Found running OpenClaw containers:"
            echo "$running_containers" | while read -r c; do dim_msg "    $c"; done
            if ask_yn "Stop these containers?"; then
                echo "$running_containers" | while read -r c; do
                    docker stop "$c" 2>/dev/null && ok_msg "Stopped container: $c"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No running OpenClaw containers"
        fi
    fi

    # Native processes
    local oc_pids
    oc_pids=$(pgrep -f "openclaw" 2>/dev/null || true)
    if [ -n "$oc_pids" ]; then
        warn_msg "Found OpenClaw processes:"
        ps -p "$(echo "$oc_pids" | tr '\n' ',')" -o pid,command 2>/dev/null | tail -n +2 | while read -r line; do
            dim_msg "    $line"
        done
        if ask_yn "Kill these processes?"; then
            echo "$oc_pids" | while read -r pid; do
                kill "$pid" 2>/dev/null && ok_msg "Killed PID $pid"
            done
            sleep 1
            # Force kill any survivors
            local remaining
            remaining=$(pgrep -f "openclaw" 2>/dev/null || true)
            if [ -n "$remaining" ]; then
                echo "$remaining" | while read -r pid; do
                    kill -9 "$pid" 2>/dev/null || true
                done
                ok_msg "Force-killed remaining processes"
            fi
            removed_something=true
        fi
    else
        dim_msg "  → No running OpenClaw processes"
    fi

    # ── Step 2: Remove LaunchAgent (macOS) ──
    if [ "$PLATFORM" = "macos" ]; then
        echo ""
        accent_bold_msg "  ── Step 2: Remove LaunchAgents ──"

        local plist_file="$HOME/Library/LaunchAgents/com.openclaw.agent.plist"
        if [ -f "$plist_file" ]; then
            warn_msg "Found LaunchAgent: $plist_file"
            if ask_yn "Unload and remove this LaunchAgent?"; then
                launchctl unload "$plist_file" 2>/dev/null || true
                rm -f "$plist_file"
                ok_msg "LaunchAgent unloaded and removed"
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw LaunchAgent found"
        fi
    fi

    # ── Step 3: Remove Docker resources ──
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        echo ""
        accent_bold_msg "  ── Step 3: Remove Docker Resources ──"

        # Containers (stopped)
        local all_containers
        all_containers=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$all_containers" ]; then
            warn_msg "Found OpenClaw containers (including stopped):"
            echo "$all_containers" | while read -r c; do dim_msg "    $c"; done
            if ask_yn "Remove these containers?"; then
                echo "$all_containers" | while read -r c; do
                    docker rm -f "$c" 2>/dev/null && ok_msg "Removed container: $c"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw containers to remove"
        fi

        # Images
        local oc_images
        oc_images=$(docker images --format '{{.Repository}}:{{.Tag}} ({{.ID}})' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$oc_images" ]; then
            warn_msg "Found OpenClaw images:"
            echo "$oc_images" | while read -r img; do dim_msg "    $img"; done
            if ask_yn "Remove these images?"; then
                docker images --format '{{.ID}} {{.Repository}}' 2>/dev/null | grep -i "openclaw" | awk '{print $1}' | while read -r id; do
                    docker rmi -f "$id" 2>/dev/null && ok_msg "Removed image: $id"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw images to remove"
        fi

        # Volumes
        local oc_volumes
        oc_volumes=$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$oc_volumes" ]; then
            warn_msg "Found OpenClaw volumes:"
            echo "$oc_volumes" | while read -r v; do dim_msg "    $v"; done
            if ask_yn "Remove these volumes? (DATA WILL BE LOST)"; then
                echo "$oc_volumes" | while read -r v; do
                    docker volume rm "$v" 2>/dev/null && ok_msg "Removed volume: $v"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw volumes to remove"
        fi
    fi

    # ── Step 4: Remove npm global package ──
    echo ""
    accent_bold_msg "  ── Step 4: Remove npm Package ──"

    if command -v openclaw &>/dev/null; then
        warn_msg "OpenClaw is installed globally via npm"
        if ask_yn "Uninstall openclaw npm package?"; then
            npm uninstall -g openclaw 2>&1 | tail -3
            if ! command -v openclaw &>/dev/null; then
                ok_msg "OpenClaw npm package removed"
            else
                warn_msg "openclaw still in PATH — may need manual removal"
            fi
            removed_something=true
        fi
    else
        dim_msg "  → No global OpenClaw npm package found"
    fi

    # ── Step 5: Securely wipe data directories ──
    echo ""
    accent_bold_msg "  ── Step 5: Secure Data Wipe ──"
    echo ""
    dim_msg "  The following directories may contain secrets, session logs, and config:"

    local data_dirs=(
        "$HOME/.openclaw"
        "$HOME/openclaw-docker"
        "$HOME/openclaw"
    )

    local dirs_to_wipe=()
    for dir in "${data_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local dir_size
            dir_size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}' || echo "?")
            warn_msg "$dir (${dir_size})"
            dirs_to_wipe+=("$dir")
        fi
    done

    if [ ${#dirs_to_wipe[@]} -eq 0 ]; then
        dim_msg "  → No OpenClaw data directories found"
    else
        echo ""
        error_bold_msg "  WARNING: This permanently deletes all OpenClaw data including:"
        dim_msg "    • Configuration files (openclaw.json, .env)"
        dim_msg "    • Session logs and conversation history"
        dim_msg "    • MEMORY.md, SOUL.md, skills"
        dim_msg "    • API keys and credentials stored in these directories"
        echo ""

        if ask_yn "Securely wipe these directories? (THIS CANNOT BE UNDONE)"; then
            for dir in "${dirs_to_wipe[@]}"; do
                dim_msg "  → Wiping $dir..."

                # Overwrite sensitive files before deletion
                # Find files that likely contain secrets and overwrite them
                while IFS= read -r sensitive_file; do
                    [ -z "$sensitive_file" ] && continue
                    if [ -f "$sensitive_file" ]; then
                        local fsize
                        fsize=$(wc -c < "$sensitive_file" 2>/dev/null | tr -d ' ')
                        if [ "$fsize" -gt 0 ] 2>/dev/null; then
                            dd if=/dev/urandom bs=1 count="$fsize" of="$sensitive_file" conv=notrunc 2>/dev/null || true
                        fi
                    fi
                done < <(find "$dir" -type f \( \
                    -name "*.json" -o -name "*.jsonl" -o -name ".env" -o \
                    -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o \
                    -name "*.pem" -o -name "*.key" -o -name "*.token" -o \
                    -name "*.log" -o -name "*.sqlite" -o -name "*.db" \
                \) 2>/dev/null)

                # Remove the directory
                rm -rf "$dir"

                if [ ! -d "$dir" ]; then
                    ok_msg "Securely wiped: $dir"
                else
                    fail_msg "Failed to remove: $dir"
                fi
            done
            removed_something=true
        else
            dim_msg "  → Data directories preserved"
        fi
    fi

    # ── Step 6: Clean up docker-compose file ──
    local compose_file="$HOME/openclaw-docker/docker-compose.yml"
    if [ -f "$compose_file" ]; then
        # Already handled above in data dirs, but just in case
        :
    fi

    # ── Summary ──
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_CYAN" --border double --border-foreground "$GUM_BORDER_FG" --padding "0 2" -- ""
    else
        echo -e "  ${CYAN}${BOLD}════════════════════════════════════════════════════${RESET}"
    fi
    echo ""
    if [ "$removed_something" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            gum style --bold --foreground "$GUM_GREEN" -- "  OpenClaw removal complete."
        else
            echo -e "  ${GREEN}${BOLD}OpenClaw removal complete.${RESET}"
        fi
        echo ""
        dim_msg "  What was cleaned:"
        dim_msg "    • Running processes and containers stopped"
        dim_msg "    • Docker images/volumes/containers removed"
        dim_msg "    • LaunchAgents unloaded"
        dim_msg "    • Sensitive files overwritten before deletion"
        dim_msg "    • Data directories removed"
    else
        dim_msg "  No changes were made."
    fi
    echo ""
    dim_msg "  Remaining manual steps (if applicable):"
    dim_msg "    • Check shell history for pasted API keys: history | grep sk-"
    dim_msg "    • Revoke any API keys generated for OpenClaw"
    dim_msg "    • Remove any firewall rules added for OpenClaw"
    echo ""
}

# --- Main -------------------------------------------------------------------

usage() {
    local prog
    prog=$(basename "$0")

    if [ "$HAS_GUM" = true ]; then
        gum format -t markdown -- "# $prog" \
            "" \
            "**Usage:** \`$prog [command] [options]\`" \
            "" \
            "## Commands" \
            "| Command | Description |" \
            "|---------|-------------|" \
            "| \`setup\` | Guided wizard: harden host + install OpenClaw (default) |" \
            "| \`deploy\` | Force full deployment even if already installed |" \
            "| \`scan\` | Read-only security audit (no changes, just a report) |" \
            "| \`uninstall\` | Securely remove OpenClaw and wipe sensitive data |" \
            "| \`agent\` | Manage the Clawkeeper SaaS agent |" \
            "| \`help\` | Show this help |" \
            "" \
            "## Options" \
            "- \`--non-interactive\` — Don't prompt for fixes (same as scan)" \
            "- \`--report FILE\` — Save report to FILE" \
            "" \
            "## Examples" \
            "\`\`\`" \
            "$prog setup              # Interactive hardening wizard" \
            "$prog scan               # Read-only security audit" \
            "$prog scan --report r.txt # Audit with saved report" \
            "$prog uninstall          # Securely remove OpenClaw" \
            "$prog agent --install    # Install SaaS monitoring agent" \
            "\`\`\`"
    else
        echo "Usage: $prog [command] [options]"
        echo ""
        echo "Commands:"
        echo "  setup       Guided wizard: harden host + install OpenClaw (default)"
        echo "  deploy      Force full deployment even if already installed"
        echo "  scan        Read-only security audit (no changes, just a report)"
        echo "  uninstall   Securely remove OpenClaw and wipe sensitive data"
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
        echo "  $prog uninstall          # Securely remove OpenClaw"
        echo "  $prog agent --install    # Install SaaS monitoring agent"
        echo "  $prog agent --status     # Check agent status"
        echo ""
    fi
}

main() {
    local command="${1:-start}"

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
    ensure_gum
    init_gum_icons

    case "$command" in
        start)
            # Interactive menu — default when no command given
            print_banner
            echo ""
            if [ "$HAS_GUM" = true ]; then
                local choice
                choice=$(gum choose --header "  What would you like to do?" \
                    "Scan existing OpenClaw  — audit your current installation (read-only)" \
                    "Deploy OpenClaw securely — full setup wizard with hardened defaults" \
                    "Uninstall OpenClaw      — securely remove and wipe all data" </dev/tty)
                case "$choice" in
                    Deploy*)
                        command="setup"
                        SCAN_ONLY=false
                        INTERACTIVE=true
                        print_expectations
                        select_deployment_mode
                        ;;
                    Uninstall*)
                        uninstall_openclaw
                        exit 0
                        ;;
                    *)
                        command="scan"
                        SCAN_ONLY=true
                        INTERACTIVE=false
                        echo ""
                        dim_msg "  Read-only audit. No changes will be made."
                        select_deployment_mode
                        ;;
                esac
            else
                echo -e "  What would you like to do?"
                echo ""
                echo -e "  ${BOLD}1)${RESET} ${CYAN}Scan existing OpenClaw${RESET}  — audit your current installation (read-only)"
                echo -e "  ${BOLD}2)${RESET} ${CYAN}Deploy OpenClaw securely${RESET} — full setup wizard with hardened defaults"
                echo -e "  ${BOLD}3)${RESET} ${RED}Uninstall OpenClaw${RESET}      — securely remove and wipe all data"
                echo ""
                printf "  Choose [1/2/3]: "
                read -r choice </dev/tty
                case "$choice" in
                    2)
                        command="setup"
                        SCAN_ONLY=false
                        INTERACTIVE=true
                        print_expectations
                        select_deployment_mode
                        ;;
                    3)
                        uninstall_openclaw
                        exit 0
                        ;;
                    *)
                        command="scan"
                        SCAN_ONLY=true
                        INTERACTIVE=false
                        echo ""
                        echo -e "  ${DIM}Read-only audit. No changes will be made.${RESET}"
                        select_deployment_mode
                        ;;
                esac
            fi
            ;;
        setup|deploy)
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
            dim_msg "  Read-only audit. No changes will be made."
            ;;
        uninstall|remove)
            uninstall_openclaw
            exit 0
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

    # Pre-cache sudo credentials so remediations don't surprise the user
    if [ "$SCAN_ONLY" != true ]; then
        ensure_sudo
    fi

    # ── Phase 1 of 5: Host Hardening ──
    reset_phase_counters
    if [ "$PLATFORM" = "macos" ]; then
        phase_header "═══ Phase 1 of 5: macOS Host Hardening ═══"
        run_check "siri"
        run_check "location_services"
        run_check "bluetooth"
        run_check "airdrop"
        run_check "analytics"
        run_check "spotlight"
        run_check "firewall"
        run_check "filevault"
        run_check "admin_user"
        run_check "icloud"
        run_check "automatic_login"
    elif [ "$PLATFORM" = "linux" ]; then
        phase_header "═══ Phase 1 of 5: Linux Host Hardening ═══"
        run_check "linux_user_account"
        run_check "linux_ssh_hardening"
        run_check "linux_firewall"
        run_check "linux_auto_updates"
        run_check "linux_fail2ban"
        run_check "linux_unnecessary_services"
        run_check "linux_disk_encryption"
    fi
    print_phase_summary
    if [ "$HAS_GUM" = true ]; then
        echo "  $(gum style --foreground "$GUM_DIM" "These settings can drift. Track them:") $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh agent --install")"
    else
        echo -e "  ${DIM}These settings can drift. Track them: ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"
    fi

    # ── Phase 2 of 5: Network ──
    reset_phase_counters
    phase_header "═══ Phase 2 of 5: Network ═══"

    if [ "$PLATFORM" = "macos" ]; then
        run_check "network_isolation"
        run_check "screen_sharing"
        run_check "remote_login"
        run_check "mdns_bonjour"
    elif [ "$PLATFORM" = "linux" ]; then
        run_check "linux_network"
        run_check "linux_open_ports"
    fi
    print_phase_summary

    # ── Phase 3 of 5: Prerequisites ──
    reset_phase_counters
    detect_install_capability
    if [ "$PLATFORM" = "macos" ]; then
        print_install_capability_warning
        if [ "$DEPLOY_MODE" = "native" ]; then
            phase_header "═══ Phase 3 of 5: Prerequisites (Homebrew + Node.js) ═══"
            run_check "homebrew"
            if ! command -v brew &>/dev/null; then
                # Node.js install depends on Homebrew — skip with clear guidance
                step_header "Node.js"
                info "Skipped — Homebrew is required to install Node.js."
                fail "Node.js 22+ not available (Homebrew required)" "Node.js"
            else
                run_check "node"
            fi
        else
            phase_header "═══ Phase 3 of 5: Prerequisites (Docker) ═══"
            # Docker mode: only Docker is needed (OpenClaw runs inside the container)
            # Check if Docker is already installed before requiring Homebrew
            if command -v docker &>/dev/null; then
                run_check "docker_installed"
            else
                # Need Homebrew to install Docker Desktop
                run_check "homebrew"
                if ! command -v brew &>/dev/null; then
                    step_header "Docker Desktop"
                    info "Skipped — Homebrew is required to install Docker Desktop."
                    info "Alternatively, download Docker Desktop directly from https://docker.com/products/docker-desktop"
                    fail "Docker not available (install Homebrew or download Docker Desktop directly)" "Docker"
                else
                    run_check "docker_installed"
                fi
            fi
        fi
    elif [ "$PLATFORM" = "linux" ]; then
        print_install_capability_warning
        if [ "$DEPLOY_MODE" = "native" ]; then
            phase_header "═══ Phase 3 of 5: Prerequisites (Node.js) ═══"
            run_check "linux_essentials"
            run_check "linux_node"
        else
            phase_header "═══ Phase 3 of 5: Prerequisites (Docker) ═══"
            # Docker mode on Linux: check Docker first, Node.js not needed
            if command -v docker &>/dev/null; then
                run_check "linux_docker"
            else
                run_check "linux_essentials"
                run_check "linux_docker"
            fi
        fi
    fi
    print_phase_summary

    # If prerequisites failed because user can't install software, show clear next steps
    if [ "$CAN_INSTALL_SOFTWARE" = false ] && [ "$FAIL" -gt "$PHASE_FAIL" ]; then
        echo ""
        highlight_msg "  What to do next:"
        if [ "$PLATFORM" = "macos" ]; then
            dim_msg "  1. Log into an admin account on this Mac"
            if [ "$DEPLOY_MODE" = "native" ]; then
                dim_msg "  2. Install Homebrew and Node.js (see commands above)"
            else
                dim_msg "  2. Install Docker Desktop (see options above)"
            fi
            dim_msg "  3. Log back in as '$(whoami)' and re-run this script"
        else
            dim_msg "  1. Ask an admin to install the required packages"
            dim_msg "  2. Re-run this script"
        fi
    fi

    # ── Phase 4 of 5: OpenClaw Installation & Deployment ──
    reset_phase_counters
    detect_openclaw_installed

    if [ "$command" = "scan" ]; then
        # Scan mode: report installation status only
        phase_header "═══ Phase 4 of 5: OpenClaw Installation Status ═══"
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
        phase_header "═══ Phase 4 of 5: OpenClaw Installation ═══"

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
                    accent_bold_msg "  Installing OpenClaw (Native/npm)..."
                    if command -v node &>/dev/null; then
                        setup_native_openclaw_directories
                        run_check "native_openclaw"
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
                    accent_bold_msg "  Installing OpenClaw (Docker)..."
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
        if [ "$DEPLOY_MODE" = "native" ]; then
            phase_header "═══ Phase 4 of 5: OpenClaw Native Deployment ═══"

            if command -v node &>/dev/null; then
                setup_native_openclaw_directories
                run_check "native_openclaw"
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
            phase_header "═══ Phase 4 of 5: OpenClaw Docker Deployment ═══"

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
    phase_header "═══ Phase 5 of 5: Security Audit ═══"

    run_check "openclaw_running"

    if [ "$DEPLOY_MODE" = "native" ]; then
        run_check "openclaw_config"
        run_check "openclaw_hardening"
        run_check "env_file"
        run_check "credential_exposure"
        run_check "skills_security"
        run_check "soul_security"
    else
        run_check "container_security"
        run_check "openclaw_config"
        run_check "openclaw_hardening"
        run_check "env_file"
        run_check "credential_exposure"
        run_check "skills_security"
        run_check "soul_security"
    fi
    print_phase_summary

    # Final report
    print_report
    save_report
}

# Run
main "$@"
