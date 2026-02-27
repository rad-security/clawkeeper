# ============================================================================
# Clawkeeper Orchestrator — CLI entrypoint
# Concatenated LAST by bundle.sh — do NOT add a shebang here.
#
# Dependencies (concatenated before this file):
#   lib/ui.sh        — colors, formatting, output helpers
#   lib/scanner.sh   — check runner, detection, reporting
#   lib/agent.sh     — SaaS agent management
#   lib/deploy.sh    — OpenClaw deployment (native + Docker)
#   lib/uninstall.sh — secure removal
#
# By RAD Security — https://rad.security
# ============================================================================

# --- Cloud Provider Detection -----------------------------------------------

CLOUD_PROVIDER=""

detect_cloud_provider() {
    CLOUD_PROVIDER=""
    
    # Linode detection
    if [ -f /sys/class/dmi/id/sys_vendor ]; then
        if grep -qi "linode" /sys/class/dmi/id/sys_vendor 2>/dev/null; then
            CLOUD_PROVIDER="linode"
            return
        fi
    fi
    if [ -f /sys/class/dmi/id/product_name ]; then
        if grep -qi "linode" /sys/class/dmi/id/product_name 2>/dev/null; then
            CLOUD_PROVIDER="linode"
            return
        fi
    fi
    
    # DigitalOcean detection
    if [ -f /sys/class/dmi/id/sys_vendor ]; then
        if grep -qi "digitalocean" /sys/class/dmi/id/sys_vendor 2>/dev/null; then
            CLOUD_PROVIDER="digitalocean"
            return
        fi
    fi
    
    # AWS detection
    if [ -f /sys/class/dmi/id/product_version ]; then
        if grep -qi "amazon" /sys/class/dmi/id/product_version 2>/dev/null; then
            CLOUD_PROVIDER="aws"
            return
        fi
    fi
    if [ -f /sys/hypervisor/uuid ]; then
        if grep -qi "^ec2" /sys/hypervisor/uuid 2>/dev/null; then
            CLOUD_PROVIDER="aws"
            return
        fi
    fi
    
    # Google Cloud detection
    if [ -f /sys/class/dmi/id/product_name ]; then
        if grep -qi "google" /sys/class/dmi/id/product_name 2>/dev/null; then
            CLOUD_PROVIDER="gcp"
            return
        fi
    fi
    
    # Azure detection
    if [ -f /sys/class/dmi/id/sys_vendor ]; then
        if grep -qi "microsoft" /sys/class/dmi/id/sys_vendor 2>/dev/null; then
            CLOUD_PROVIDER="azure"
            return
        fi
    fi
    
    # Vultr detection
    if [ -f /sys/class/dmi/id/sys_vendor ]; then
        if grep -qi "vultr" /sys/class/dmi/id/sys_vendor 2>/dev/null; then
            CLOUD_PROVIDER="vultr"
            return
        fi
    fi
    
    # Hetzner detection
    if [ -f /sys/class/dmi/id/sys_vendor ]; then
        if grep -qi "hetzner" /sys/class/dmi/id/sys_vendor 2>/dev/null; then
            CLOUD_PROVIDER="hetzner"
            return
        fi
    fi
}

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
            # Detect cloud provider
            detect_cloud_provider
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

# --- Usage ------------------------------------------------------------------

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
            "| \`shield\` | Manage the Runtime Shield skill |" \
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
        echo "  shield      Manage the Runtime Shield skill"
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

# --- Main -------------------------------------------------------------------

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
                        COMPACT_OUTPUT=true
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
                        COMPACT_OUTPUT=true
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
                        COMPACT_OUTPUT=true
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
                        COMPACT_OUTPUT=true
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
            COMPACT_OUTPUT=true
            print_banner
            print_expectations
            select_deployment_mode
            ;;
        scan)
            SCAN_ONLY=true
            INTERACTIVE=false
            COMPACT_OUTPUT=true
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
        shield|--shield)
            shield_main "${agent_args[@]+"${agent_args[@]}"}"
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
    _compact_flush
    print_phase_summary
    if [ "$COMPACT_OUTPUT" != true ]; then
        if [ "$HAS_GUM" = true ]; then
            echo "  $(gum style --foreground "$GUM_DIM" "These settings can drift. Track them:") $(gum style --foreground "$GUM_CYAN" "clawkeeper.sh agent --install")"
        else
            echo -e "  ${DIM}These settings can drift. Track them: ${RESET}${CYAN}clawkeeper.sh agent --install${RESET}"
        fi
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
    _compact_flush
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
            if command -v docker &>/dev/null; then
                run_check "docker_installed"
                harden_docker_desktop
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
    _compact_flush
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

    _compact_flush
    print_phase_summary

    # ── Phase 5 of 5: Security Audit (all modes) ──
    reset_phase_counters
    phase_header "═══ Phase 5 of 5: Security Audit ═══"

    run_check "openclaw_running"
    run_check "cve_audit"

    if [ "$DEPLOY_MODE" = "native" ]; then
        run_check "openclaw_config"
        run_check "openclaw_hardening"
        run_check "env_file"
        run_check "credential_exposure"
        run_check "session_commands"
        run_check "skills_security"
        run_check "soul_security"
    else
        run_check "container_security"
        run_check "openclaw_config"
        run_check "openclaw_hardening"
        run_check "env_file"
        run_check "credential_exposure"
        run_check "session_commands"
        run_check "skills_security"
        run_check "soul_security"
    fi
    _compact_flush
    print_phase_summary

    # Final report
    print_report
    save_report
}

# Run
main "$@"
