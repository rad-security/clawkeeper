#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Location Services
# Disables Location Services on macOS (requires sudo).
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_location_services)
        sudo defaults write /var/db/locationd/Library/Preferences/ByHost/com.apple.locationd LocationServicesEnabled -bool false 2>/dev/null || true
        emit_pass "Location Services disabled" "Location Services"
        emit_info "Note: A restart may be required for this to fully take effect"
        emit_info "Verify in System Settings → Privacy & Security → Location Services"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Location Services"
        ;;
esac
