#!/bin/bash
# ============================================================================
# Clawkeeper Check: Firewall (UFW)
# Checks UFW status: active, installed-but-inactive, or not installed.
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

emit_info "A firewall limits inbound access to only the ports you need."

if command -v ufw &>/dev/null; then
    ufw_status=$(sudo ufw status 2>/dev/null || ufw status 2>/dev/null || echo "unknown")

    if echo "$ufw_status" | grep -qi "Status: active"; then
        emit_pass "UFW firewall is active" "Firewall"

        # Check if OpenClaw port is exposed externally
        if echo "$ufw_status" | grep -q "18789.*ALLOW.*Anywhere"; then
            emit_warn "Port 18789 is open in UFW -- prefer SSH tunnel over direct exposure"
        fi
        exit 0
    fi

    # UFW is installed but not active
    emit_warn "UFW is installed but not active"
    emit_prompt "Enable UFW with SSH-only inbound rules?" "enable_ufw" \
        "UFW firewall is not active" \
        "Firewall not enabled"
else
    # UFW is not installed
    emit_warn "UFW is not installed"
    emit_prompt "Install and configure UFW?" "install_ufw" \
        "No firewall installed" \
        "Firewall not installed"
fi
