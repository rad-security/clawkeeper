#!/bin/bash
# ============================================================================
# Clawkeeper Check: SSH Hardening
# Checks sshd_config for PermitRootLogin, PasswordAuthentication,
# X11Forwarding, and MaxAuthTries.
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

emit_info "SSH is the primary attack surface on a VPS. Hardening is critical."

sshd_config="/etc/ssh/sshd_config"

if [ ! -f "$sshd_config" ]; then
    emit_warn "sshd_config not found at $sshd_config"
    emit_fail "Cannot audit SSH configuration" "SSH Hardening"
    exit 0
fi

issues=0

# Check PermitRootLogin
root_login=$(grep -i "^PermitRootLogin" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
if [ -z "$root_login" ]; then
    root_login=$(grep -rhi "^PermitRootLogin" /etc/ssh/sshd_config.d/ 2>/dev/null | tail -1 | awk '{print $2}' || echo "")
fi
if [ "$root_login" = "no" ] || [ "$root_login" = "prohibit-password" ]; then
    emit_pass "PermitRootLogin = $root_login" "PermitRootLogin"
else
    issues=$((issues + 1))
    emit_fail "PermitRootLogin is '${root_login:-yes (default)}' -- should be 'no' or 'prohibit-password'" "PermitRootLogin"
fi

# Check PasswordAuthentication
pass_auth=$(grep -i "^PasswordAuthentication" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
if [ -z "$pass_auth" ]; then
    pass_auth=$(grep -rhi "^PasswordAuthentication" /etc/ssh/sshd_config.d/ 2>/dev/null | tail -1 | awk '{print $2}' || echo "")
fi
if [ "$pass_auth" = "no" ]; then
    emit_pass "PasswordAuthentication = no" "PasswordAuthentication"
else
    issues=$((issues + 1))
    emit_fail "PasswordAuthentication is '${pass_auth:-yes (default)}' -- should be 'no'" "PasswordAuthentication"
fi

# Check X11Forwarding
x11=$(grep -i "^X11Forwarding" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
if [ "$x11" = "no" ]; then
    emit_pass "X11Forwarding = no" "X11Forwarding"
elif [ "$x11" = "yes" ]; then
    issues=$((issues + 1))
    emit_fail "X11Forwarding is enabled -- should be 'no' on a headless server" "X11Forwarding"
fi

# Check MaxAuthTries
max_auth=$(grep -i "^MaxAuthTries" "$sshd_config" 2>/dev/null | awk '{print $2}' || echo "")
if [ -n "$max_auth" ] && [ "$max_auth" -le 3 ] 2>/dev/null; then
    emit_pass "MaxAuthTries = $max_auth" "MaxAuthTries"
elif [ -n "$max_auth" ] && [ "$max_auth" -gt 6 ] 2>/dev/null; then
    issues=$((issues + 1))
    emit_fail "MaxAuthTries is $max_auth -- recommend 3 or less" "MaxAuthTries"
fi

if [ "$issues" -eq 0 ]; then
    emit_pass "SSH configuration is hardened" "SSH Hardening"
else
    emit_prompt "Harden SSH configuration?" "harden_ssh" \
        "SSH is not fully hardened" \
        "SSH hardening deferred"
fi
