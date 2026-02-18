#!/bin/bash
# ============================================================================
# Clawkeeper Check: Remote Login (SSH)
# Detects whether Remote Login (SSH) is enabled on macOS via systemsetup.
# May require sudo to read the setting on some macOS versions.
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

emit_info "SSH is useful for managing this machine remotely. Verify it's intentional."

ssh_status=$(systemsetup -getremotelogin 2>&1 || echo "unknown")

# If the call requires admin privileges, skip — don't prompt for password
if echo "$ssh_status" | grep -qi "requires admin\|not authorized\|error"; then
    ssh_status="unknown"
fi

if echo "$ssh_status" | grep -qi "off"; then
    emit_pass "Remote Login (SSH) is off" "Remote Login"
    emit_info "Enable it if you need to manage this machine from your primary Mac."
    exit 0
elif echo "$ssh_status" | grep -qi "on"; then
    emit_warn "Remote Login (SSH) is ON"
    emit_info "This is expected if you manage this machine remotely."
    emit_info "Ensure only authorized keys are in ~/.ssh/authorized_keys"
    emit_pass "Remote Login (SSH) is on (verify this is intentional)" "Remote Login"
    exit 0
fi

# Could not determine status
emit_warn "Could not determine Remote Login status"
emit_skipped "Remote Login status unknown" "Remote Login"
