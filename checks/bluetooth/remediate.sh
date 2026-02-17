#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Bluetooth
# Disables Bluetooth on macOS (requires sudo).
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_bluetooth)
        sudo defaults write /Library/Preferences/com.apple.Bluetooth ControllerPowerState -int 0 2>/dev/null || true
        emit_pass "Bluetooth disabled" "Bluetooth"
        emit_info "Note: If using wireless peripherals, re-enable in System Settings → Bluetooth"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Bluetooth"
        ;;
esac
