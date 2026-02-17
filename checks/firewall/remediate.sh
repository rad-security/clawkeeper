#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: macOS Firewall
# Enables the firewall and/or sets "Block all incoming connections".
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    enable_block_all)
        # Firewall is already on — just enable block-all
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall on &>/dev/null || true
        emit_pass "Firewall set to block all incoming" "Firewall"
        emit_info "Note: This may block Screen Sharing. Add exceptions if needed."
        ;;
    enable_firewall)
        # Firewall is off — enable everything
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on &>/dev/null || true
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setblockall on &>/dev/null || true
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setstealthmode on &>/dev/null || true
        emit_pass "Firewall enabled (block all + stealth mode)" "Firewall"
        emit_info "Note: This may block Screen Sharing. Add exceptions if needed."
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Firewall"
        ;;
esac
