#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Automatic Login
# Disables automatic login by removing the autoLoginUser preference.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_automatic_login)
        sudo defaults delete /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || true
        emit_pass "Automatic login disabled" "Automatic Login"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Automatic Login"
        ;;
esac
