#!/bin/bash
# ============================================================================
# Clawkeeper Check: Network Isolation
# Displays current network info (Wi-Fi SSID, gateway, local IP) so the user
# can manually verify this machine is on a dedicated isolated network.
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

emit_info "Checking if this machine appears to be on an isolated network."

# Get current Wi-Fi SSID
ssid=$(networksetup -getairportnetwork en0 2>/dev/null | sed 's/Current Wi-Fi Network: //' || echo "unknown")
if [ "$ssid" = "unknown" ] || echo "$ssid" | grep -qi "not associated\|error\|not found"; then
    # Fallback to legacy airport binary (may not exist on newer macOS)
    ssid=$(/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I 2>/dev/null | awk '/ SSID/ {print substr($0, index($0, $2))}' || echo "unknown")
fi

if [ "$ssid" != "unknown" ]; then
    emit_info "Connected to Wi-Fi: $ssid"
    emit_info "Verify this is your dedicated isolated network, not your primary Wi-Fi."
else
    emit_info "Could not determine Wi-Fi SSID"
fi

# Report gateway
gateway_ip=$(route -n get default 2>/dev/null | grep "gateway" | awk '{print $2}' || echo "unknown")
emit_info "Default gateway: $gateway_ip"

# Report local IP
local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
emit_info "Local IP: $local_ip"

emit_info "Manual verification required:"
emit_info "  1. Confirm this is NOT your primary network"
emit_info "  2. Test: ping a device on your primary network (should FAIL)"
emit_info "  3. Test: ping 8.8.8.8 (should SUCCEED)"

emit_pass "Network info displayed for manual verification" "Network Isolation"
