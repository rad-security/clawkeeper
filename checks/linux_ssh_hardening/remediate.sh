#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: SSH Hardening
# Creates a drop-in config at /etc/ssh/sshd_config.d/99-clawkeeper-hardening.conf,
# validates configuration, and reloads sshd.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    harden_ssh)
        dropin_dir="/etc/ssh/sshd_config.d"
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
            emit_pass "SSH hardened (drop-in: $dropin_dir/99-clawkeeper-hardening.conf)" "SSH Hardening"
            emit_warn "IMPORTANT: Verify you can still SSH in from another terminal before closing this session!"
        else
            sudo rm -f "$dropin_dir/99-clawkeeper-hardening.conf"
            emit_fail "SSH config validation failed -- changes reverted" "SSH Hardening"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "SSH Hardening"
        ;;
esac
