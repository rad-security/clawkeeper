#!/bin/bash
# ============================================================================
# Clawkeeper Check: mDNS / Bonjour (OpenClaw Discovery)
# Scans for OpenClaw mDNS broadcasts on the local network using dns-sd.
# Uses a 5-second timeout to detect any _openclaw-gw._tcp broadcasts.
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

emit_info "OpenClaw can broadcast its presence via mDNS. This should be disabled."
emit_info "Scanning for OpenClaw mDNS broadcasts (5 seconds)..."

# Use perl alarm to enforce a 5-second timeout on dns-sd browse
mdns_result=$(perl -e 'alarm 5; exec @ARGV' dns-sd -B _openclaw-gw._tcp 2>/dev/null || true)

if echo "$mdns_result" | grep -qi "openclaw"; then
    emit_fail "OpenClaw is broadcasting via mDNS — discoverable on the network" "mDNS"
    emit_info "Set OPENCLAW_DISABLE_BONJOUR=1 in your environment"
    emit_info "Set gateway.discover.mode = 'off' in openclaw.json"
else
    emit_pass "No OpenClaw mDNS broadcasts detected" "mDNS"
fi
