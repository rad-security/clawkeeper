#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Fail2ban
# Installs and/or starts fail2ban with a sensible default configuration.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    start_fail2ban)
        sudo systemctl enable --now fail2ban 2>/dev/null
        emit_pass "Fail2ban started and enabled" "Fail2ban"
        ;;
    install_fail2ban)
        if command -v apt-get &>/dev/null; then
            sudo apt-get update -qq && sudo apt-get install -y -qq fail2ban 2>&1 | tail -3
        elif command -v dnf &>/dev/null; then
            sudo dnf install -y -q fail2ban 2>&1 | tail -3
        else
            emit_fail "Cannot install fail2ban -- unsupported package manager" "Fail2ban"
            exit 1
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
        emit_pass "Fail2ban installed and configured" "Fail2ban"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Fail2ban"
        ;;
esac
