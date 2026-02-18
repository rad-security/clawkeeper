#!/bin/bash
# ============================================================================
# Clawkeeper Check: Bluetooth
# Detects whether Bluetooth is enabled on macOS.
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

emit_info "Unnecessary radio interface. Exposes the machine to proximity-based attacks."

bt_on=false

# Check via defaults
bt_status=$(defaults read /Library/Preferences/com.apple.Bluetooth ControllerPowerState 2>/dev/null || echo "unknown")

if [ "$bt_status" = "1" ]; then
    bt_on=true
elif [ "$bt_status" = "0" ]; then
    bt_on=false
else
    # Try system_profiler as fallback
    if system_profiler SPBluetoothDataType 2>/dev/null | grep -q "State: On"; then
        bt_on=true
    fi
fi

if [ "$bt_on" = false ]; then
    emit_pass "Bluetooth is off" "Bluetooth"
    exit 0
fi

emit_warn "Bluetooth is ON"
emit_info "If you're using a wireless keyboard/mouse, you may need Bluetooth."
emit_prompt "Disable Bluetooth? (skip if you need wireless peripherals)" "disable_bluetooth" \
    "Bluetooth is on" \
    "Bluetooth left on (wireless peripherals)"
