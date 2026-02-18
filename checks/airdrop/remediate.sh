#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: AirDrop & Handoff
# Disables AirDrop and Handoff on macOS (no sudo required).
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_airdrop_handoff)
        defaults write com.apple.NetworkBrowser DisableAirDrop -bool true 2>/dev/null || true
        defaults write ~/Library/Preferences/ByHost/com.apple.coreservices.useractivityd ActivityAdvertisingAllowed -bool false 2>/dev/null || true
        defaults write ~/Library/Preferences/ByHost/com.apple.coreservices.useractivityd ActivityReceivingAllowed -bool false 2>/dev/null || true
        emit_pass "AirDrop and Handoff disabled" "AirDrop & Handoff"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "AirDrop & Handoff"
        ;;
esac
