#!/bin/bash
# ============================================================================
# Clawkeeper Check: Fail2ban
# Checks whether fail2ban is installed and running.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

MODE="scan"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode) MODE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

emit_info "Blocks IPs after repeated failed login attempts."

if command -v fail2ban-client &>/dev/null; then
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        emit_pass "Fail2ban is installed and running" "Fail2ban"
    else
        emit_warn "Fail2ban is installed but not running"
        emit_prompt "Start and enable fail2ban?" "start_fail2ban" \
            "Fail2ban is not running" \
            "Fail2ban not started"
    fi
else
    emit_warn "Fail2ban is not installed"
    emit_prompt "Install and configure fail2ban?" "install_fail2ban" \
        "Fail2ban is not installed" \
        "Fail2ban not installed"
fi
