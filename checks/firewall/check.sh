#!/bin/bash
# ============================================================================
# Clawkeeper Check: macOS Firewall
# Detects whether the macOS application firewall is enabled and whether
# "Block all incoming connections" is active.
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

emit_info "Host-level firewall provides defense in depth beyond network isolation."

fw_on=false
fw_block_all=false

fw_status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo "unknown")

if echo "$fw_status" | grep -qi "enabled"; then
    fw_on=true
fi

if [ "$fw_on" = true ]; then
    block_status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getblockall 2>/dev/null || echo "unknown")
    if echo "$block_status" | grep -qi "enabled"; then
        fw_block_all=true
    fi
fi

if [ "$fw_on" = true ] && [ "$fw_block_all" = true ]; then
    emit_pass "Firewall is on with 'Block all incoming' enabled" "Firewall"
    exit 0
elif [ "$fw_on" = true ]; then
    emit_warn "Firewall is ON but 'Block all incoming' is not set"
    emit_info "This allows some incoming connections. Strictest mode blocks all."
    emit_prompt "Enable 'Block all incoming connections'?" "enable_block_all" \
        "Firewall 'Block all incoming' is not enabled" \
        "Firewall left in permissive mode"
    exit 0
fi

# Firewall is off
emit_warn "macOS Firewall is OFF"
emit_prompt "Enable the firewall with 'Block all incoming'?" "enable_firewall" \
    "macOS Firewall is off" \
    "Firewall left off"
