# ============================================================================
# Clawkeeper Scanner — Check runner, detection, grading, reporting
# Concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

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
