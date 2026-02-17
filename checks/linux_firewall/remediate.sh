#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Firewall (UFW)
# Installs and/or enables UFW with SSH-only inbound rules.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    enable_ufw)
        sudo ufw default deny incoming 2>/dev/null
        sudo ufw default allow outgoing 2>/dev/null
        sudo ufw allow ssh 2>/dev/null
        sudo ufw --force enable 2>/dev/null
        emit_pass "UFW enabled (SSH allowed, OpenClaw via SSH tunnel only)" "Firewall"
        emit_info "Access OpenClaw via: ssh -N -L 18789:127.0.0.1:18789 user@this-server"
        ;;
    install_ufw)
        if command -v apt-get &>/dev/null; then
            sudo apt-get update -qq && sudo apt-get install -y -qq ufw 2>&1 | tail -3
        elif command -v dnf &>/dev/null; then
            sudo dnf install -y -q ufw 2>&1 | tail -3
        else
            emit_fail "Cannot install UFW -- unsupported package manager" "Firewall"
            exit 1
        fi
        sudo ufw default deny incoming 2>/dev/null
        sudo ufw default allow outgoing 2>/dev/null
        sudo ufw allow ssh 2>/dev/null
        sudo ufw --force enable 2>/dev/null
        emit_pass "UFW installed and enabled (SSH-only inbound)" "Firewall"
        emit_info "Access OpenClaw via SSH tunnel -- do NOT open port 18789"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Firewall"
        ;;
esac
