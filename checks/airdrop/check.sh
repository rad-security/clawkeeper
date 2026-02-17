#!/bin/bash
# ============================================================================
# Clawkeeper Check: AirDrop & Handoff
# Detects whether AirDrop and Handoff are enabled on macOS.
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

emit_info "Both create network-discoverable services. AirDrop makes this machine visible nearby."

airdrop_issue=false
handoff_issue=false

# AirDrop
airdrop_status=$(defaults read com.apple.NetworkBrowser DisableAirDrop 2>/dev/null || echo "0")
if [ "$airdrop_status" != "1" ]; then
    airdrop_issue=true
fi

# Handoff
handoff_status=$(defaults read ~/Library/Preferences/ByHost/com.apple.coreservices.useractivityd ActivityAdvertisingAllowed 2>/dev/null || echo "1")
if [ "$handoff_status" != "0" ]; then
    handoff_issue=true
fi

if [ "$airdrop_issue" = false ] && [ "$handoff_issue" = false ]; then
    emit_pass "AirDrop and Handoff are disabled" "AirDrop & Handoff"
    exit 0
fi

[ "$airdrop_issue" = true ] && emit_warn "AirDrop is not disabled"
[ "$handoff_issue" = true ] && emit_warn "Handoff is not disabled"

emit_prompt "Disable AirDrop and Handoff?" "disable_airdrop_handoff" \
    "AirDrop/Handoff not fully disabled" \
    "AirDrop/Handoff left as-is"
