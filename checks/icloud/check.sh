#!/bin/bash
# ============================================================================
# Clawkeeper Check: iCloud
# Detects whether an iCloud account is signed in on macOS.
# Info-only — no automated remediation (must sign out manually).
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

emit_info "iCloud syncs data off-device. A compromised agent's files shouldn't trigger cloud uploads."

# Check if any iCloud account is configured
icloud_account=$(defaults read MobileMeAccounts Accounts 2>/dev/null || echo "")

if [ -z "$icloud_account" ] || echo "$icloud_account" | grep -q "(\s*)"; then
    emit_pass "No iCloud account signed in" "iCloud"
    exit 0
fi

emit_warn "An iCloud account appears to be signed in"
emit_info "iCloud can sync OpenClaw workspace files to Apple's servers."
emit_info "Sign out: System Settings -> [your name] -> Sign Out"
emit_info "Or disable iCloud Drive: System Settings -> Apple ID -> iCloud -> iCloud Drive -> OFF"
emit_fail "iCloud is signed in (disable manually in System Settings)" "iCloud"
