# ============================================================================
# Clawkeeper Shield — Runtime Shield skill management
# Concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

SHIELD_SKILL_DIR="$HOME/.openclaw/skills/runtime-shield"
SHIELD_CONFIG_DIR="$HOME/.clawkeeper"
SHIELD_LOG_DIR="$HOME/.clawkeeper/shield-logs"

shield_log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [shield] $*"
}

shield_is_installed() {
    [ -d "$SHIELD_SKILL_DIR" ] && [ -f "$SHIELD_SKILL_DIR/SKILL.md" ]
}

shield_check_npm() {
    if ! command -v npm &>/dev/null; then
        error_bold_msg "Error: npm is required to install the Runtime Shield skill."
        echo -e "  ${DIM}Install Node.js from https://nodejs.org${RESET}"
        return 1
    fi
}

shield_install() {
    echo ""
    echo -e "  ${CYAN}${BOLD}Runtime Shield Installation${RESET}"
    echo ""

    # Check prerequisites
    shield_check_npm || return 1

    if ! command -v openclaw &>/dev/null && [ ! -d "$HOME/.openclaw" ]; then
        error_bold_msg "Error: OpenClaw does not appear to be installed."
        echo -e "  ${DIM}Install OpenClaw first, then install the shield.${RESET}"
        return 1
    fi

    # Check if already installed
    if shield_is_installed; then
        success_msg "Runtime Shield is already installed."
        echo -e "  ${DIM}Location: $SHIELD_SKILL_DIR${RESET}"
        echo -e "  ${DIM}To reinstall: clawkeeper.sh shield uninstall && clawkeeper.sh shield install${RESET}"
        return 0
    fi

    # Create skill directory
    mkdir -p "$SHIELD_SKILL_DIR"

    # Find the runtime-shield source
    local source_dir=""
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

    if [ -d "$script_dir/../runtime-shield" ]; then
        source_dir="$script_dir/../runtime-shield"
    elif [ -d "$script_dir/runtime-shield" ]; then
        source_dir="$script_dir/runtime-shield"
    fi

    if [ -z "$source_dir" ] || [ ! -f "$source_dir/SKILL.md" ]; then
        # Download from web
        echo -e "  ${DIM}Downloading Runtime Shield...${RESET}"
        local download_url="https://clawkeeper.dev/downloads/runtime-shield.tar.gz"
        if curl -fsSL "$download_url" | tar xz -C "$SHIELD_SKILL_DIR" 2>/dev/null; then
            shield_log "Downloaded Runtime Shield from $download_url"
        else
            error_bold_msg "Failed to download Runtime Shield."
            rm -rf "$SHIELD_SKILL_DIR"
            return 1
        fi
    else
        # Copy from local source
        echo -e "  ${DIM}Installing from local source...${RESET}"
        cp -R "$source_dir/"* "$SHIELD_SKILL_DIR/"
    fi

    # Install npm dependencies
    echo -e "  ${DIM}Installing dependencies...${RESET}"
    if ! (cd "$SHIELD_SKILL_DIR" && npm install --production --silent 2>/dev/null); then
        warn_msg "npm install failed — skill may still work if pre-built."
    fi

    # Build if needed
    if [ -f "$SHIELD_SKILL_DIR/tsconfig.json" ] && [ ! -d "$SHIELD_SKILL_DIR/dist" ]; then
        echo -e "  ${DIM}Building...${RESET}"
        (cd "$SHIELD_SKILL_DIR" && npx tsc 2>/dev/null) || true
    fi

    # Configure API key
    local api_key=""
    if [ -f "$SHIELD_CONFIG_DIR/config" ]; then
        # shellcheck disable=SC1090
        source "$SHIELD_CONFIG_DIR/config"
        api_key="${CLAWKEEPER_API_KEY:-}"
    fi

    if [ -z "$api_key" ]; then
        echo ""
        echo -e "  ${YELLOW}No API key found.${RESET} The shield will work in local-only mode."
        echo -e "  ${DIM}To connect to the dashboard, set CLAWKEEPER_API_KEY in:${RESET}"
        echo -e "  ${DIM}  $SHIELD_CONFIG_DIR/config${RESET}"
    else
        echo -e "  ${DIM}Using API key from existing agent configuration.${RESET}"
    fi

    # Create log directory
    mkdir -p "$SHIELD_LOG_DIR"

    # Report installation event
    report_event "shield.installed" "$(hostname)" 2>/dev/null || true

    echo ""
    success_msg "Runtime Shield installed successfully!"
    echo -e "  ${DIM}Location: $SHIELD_SKILL_DIR${RESET}"
    echo -e "  ${DIM}Logs: $SHIELD_LOG_DIR${RESET}"
    echo ""
    echo -e "  ${CYAN}The shield will activate automatically on next OpenClaw session.${RESET}"
    echo -e "  ${DIM}Use /shield status inside OpenClaw to check.${RESET}"
}

shield_uninstall() {
    echo ""
    echo -e "  ${CYAN}${BOLD}Runtime Shield Removal${RESET}"
    echo ""

    if ! shield_is_installed; then
        dim_msg "  Runtime Shield is not installed."
        return 0
    fi

    rm -rf "$SHIELD_SKILL_DIR"
    success_msg "Runtime Shield uninstalled."
    echo -e "  ${DIM}Shield logs preserved at: $SHIELD_LOG_DIR${RESET}"
    echo -e "  ${DIM}To remove logs too: rm -rf $SHIELD_LOG_DIR${RESET}"

    report_event "shield.uninstalled" "$(hostname)" 2>/dev/null || true
}

shield_status() {
    echo ""
    echo -e "  ${CYAN}${BOLD}Runtime Shield Status${RESET}"
    echo ""

    if shield_is_installed; then
        echo -e "  ${GREEN}Installed${RESET}: $SHIELD_SKILL_DIR"

        # Check if SKILL.md is valid
        if [ -f "$SHIELD_SKILL_DIR/SKILL.md" ]; then
            local version
            version=$(grep '^version:' "$SHIELD_SKILL_DIR/SKILL.md" 2>/dev/null | head -1 | sed 's/version: *//')
            echo -e "  ${DIM}Version: ${version:-unknown}${RESET}"
        fi

        # Check for built output
        if [ -d "$SHIELD_SKILL_DIR/dist" ]; then
            echo -e "  ${DIM}Built: yes${RESET}"
        else
            echo -e "  ${YELLOW}Built: no (run npm run build in $SHIELD_SKILL_DIR)${RESET}"
        fi

        # Check API key
        local api_key=""
        if [ -f "$SHIELD_CONFIG_DIR/config" ]; then
            # shellcheck disable=SC1090
            source "$SHIELD_CONFIG_DIR/config"
            api_key="${CLAWKEEPER_API_KEY:-}"
        fi

        if [ -n "$api_key" ]; then
            echo -e "  ${DIM}Dashboard: connected (API key configured)${RESET}"
        else
            echo -e "  ${YELLOW}Dashboard: local-only (no API key)${RESET}"
        fi

        # Check log dir
        if [ -d "$SHIELD_LOG_DIR" ]; then
            local log_count
            log_count=$(find "$SHIELD_LOG_DIR" -name "*.jsonl" 2>/dev/null | wc -l | tr -d ' ')
            echo -e "  ${DIM}Log files: $log_count${RESET}"
        fi
    else
        echo -e "  ${YELLOW}Not installed${RESET}"
        echo -e "  ${DIM}Install: clawkeeper.sh shield install${RESET}"
    fi
    echo ""
}

shield_main() {
    local subcommand="${1:-status}"
    shift 2>/dev/null || true

    case "$subcommand" in
        install|--install)
            shield_install
            ;;
        uninstall|--uninstall|remove|--remove)
            shield_uninstall
            ;;
        status|--status)
            shield_status
            ;;
        help|--help|-h)
            echo "Usage: clawkeeper.sh shield <command>"
            echo ""
            echo "Commands:"
            echo "  install     Install the Runtime Shield skill"
            echo "  uninstall   Remove the Runtime Shield skill"
            echo "  status      Check installation status"
            echo "  help        Show this help"
            ;;
        *)
            echo "Unknown shield command: $subcommand"
            echo "Run: clawkeeper.sh shield help"
            return 1
            ;;
    esac
}
