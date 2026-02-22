# ============================================================================
# Clawkeeper UI — Colors, formatting, gum integration, styled output
# Concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

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

# --- Compact Output --------------------------------------------------------
COMPACT_OUTPUT=false
_COMPACT_THIS_CHECK=false
_COMPACT_STEP_NAME=""
_COMPACT_COL=0
_COMPACT_BUF=""

# --- Platform Detection -----------------------------------------------------
PLATFORM=""
ARCH=""
MACOS_VERSION=""
DEPLOY_MODE=""
LINUX_DISTRO=""
LINUX_DISTRO_VERSION=""
LINUX_DISTRO_NAME=""
IS_VPS=false

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

_compact_emit() {
    local text="$1"
    if [ "$_COMPACT_COL" -eq 0 ]; then
        _COMPACT_BUF="$text"
        _COMPACT_COL=1
    else
        # Print both columns: first item, cursor to column 42, second item
        printf '%s\033[42G%s\n' "$_COMPACT_BUF" "$text"
        _COMPACT_BUF=""
        _COMPACT_COL=0
    fi
}

_compact_flush() {
    if [ "$_COMPACT_COL" -eq 1 ] && [ -n "$_COMPACT_BUF" ]; then
        printf '%s\n' "$_COMPACT_BUF"
        _COMPACT_BUF=""
        _COMPACT_COL=0
    fi
}

step_header() {
    TOTAL=$((TOTAL + 1))
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        _COMPACT_STEP_NAME="$1"
        return
    fi
    _compact_flush
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_BOLD_WHITE" -- "Step ${TOTAL}: $1"
    else
        echo -e "${BOLD}Step ${TOTAL}: $1${RESET}"
    fi
}

pass() {
    PASS=$((PASS + 1))
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            _compact_emit "  ${_GUM_PASS_ICON} ${_COMPACT_STEP_NAME}"
        else
            _compact_emit "$(echo -e "  ${GREEN}✓${RESET} ${_COMPACT_STEP_NAME}")"
        fi
        log_result "PASS" "$2" "$1"
        return
    fi
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_PASS_ICON} $1"
    else
        echo -e "  ${GREEN}✓${RESET} $1"
    fi
    log_result "PASS" "$2" "$1"
}

fail() {
    FAIL=$((FAIL + 1))
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            _compact_emit "  ${_GUM_FAIL_ICON} ${_COMPACT_STEP_NAME}"
        else
            _compact_emit "$(echo -e "  ${RED}✗${RESET} ${_COMPACT_STEP_NAME}")"
        fi
        log_result "FAIL" "$2" "$1"
        return
    fi
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_FAIL_ICON} $1"
    else
        echo -e "  ${RED}✗${RESET} $1"
    fi
    log_result "FAIL" "$2" "$1"
}

fixed() {
    FIXED=$((FIXED + 1))
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            _compact_emit "  ${_GUM_PASS_ICON} ${_COMPACT_STEP_NAME} ${_GUM_FIXED_SUFFIX}"
        else
            _compact_emit "$(echo -e "  ${GREEN}✓${RESET} ${_COMPACT_STEP_NAME} ${DIM}(fixed)${RESET}")"
        fi
        log_result "FIXED" "$2" "$1"
        return
    fi
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_PASS_ICON} $1 ${_GUM_FIXED_SUFFIX}"
    else
        echo -e "  ${GREEN}✓${RESET} $1 ${DIM}(just fixed)${RESET}"
    fi
    log_result "FIXED" "$2" "$1"
    # After the 3rd fix, a subtle "at scale" hint (suppress in compact mode)
    if [ "$FIXED" -eq 3 ] && [ "$COMPACT_OUTPUT" != true ]; then
        if [ "$HAS_GUM" = true ]; then
            echo "  $(gum style --foreground "$GUM_DIM" "Track drift across hosts:") $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh agent --install")"
        else
            echo -e "  ${DIM}Track drift across hosts: ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"
        fi
    fi
}

skipped() {
    SKIPPED=$((SKIPPED + 1))
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            _compact_emit "  ${_GUM_SKIP_ICON} ${_COMPACT_STEP_NAME} ${_GUM_SKIPPED_SUFFIX}"
        else
            _compact_emit "$(echo -e "  ${YELLOW}⊘${RESET} ${_COMPACT_STEP_NAME} ${DIM}(risk)${RESET}")"
        fi
        log_result "SKIPPED" "$2" "$1"
        return
    fi
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_SKIP_ICON} $1 ${_GUM_SKIPPED_SUFFIX}"
    else
        echo -e "  ${YELLOW}⊘${RESET} $1 ${DIM}(accepted risk)${RESET}"
    fi
    log_result "SKIPPED" "$2" "$1"
}

warn() {
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        return
    fi
    if [ "$HAS_GUM" = true ]; then
        echo "  ${_GUM_WARN_ICON} $1"
    else
        echo -e "  ${YELLOW}⚠${RESET} $1"
    fi
}

info() {
    if [ "$COMPACT_OUTPUT" = true ] && [ "$_COMPACT_THIS_CHECK" = true ]; then
        return
    fi
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
