#!/bin/bash
# ============================================================================
# Clawkeeper Check: Automatic Login
# Detects whether automatic login is enabled on macOS.
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

emit_info "Automatic login bypasses the login screen — anyone with physical access gets in."

auto_login=$(defaults read /Library/Preferences/com.apple.loginwindow autoLoginUser 2>/dev/null || echo "")

if [ -z "$auto_login" ]; then
    emit_pass "Automatic login is disabled" "Automatic Login"
    exit 0
fi

emit_warn "Automatic login is enabled for user: $auto_login"
emit_prompt "Disable automatic login?" "disable_automatic_login" \
    "Automatic login is enabled" \
    "Automatic login left enabled"
