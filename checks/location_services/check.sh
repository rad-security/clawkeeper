#!/bin/bash
# ============================================================================
# Clawkeeper Check: Location Services
# Detects whether Location Services are enabled on macOS.
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

emit_info "Location data embeds in file metadata that OpenClaw might process or transmit."

ls_enabled=false

if command -v defaults &>/dev/null; then
    # Try reading without elevated access first
    ls_status=$(defaults read /var/db/locationd/Library/Preferences/ByHost/com.apple.locationd LocationServicesEnabled 2>/dev/null || echo "unknown")

    if [ "$ls_status" = "1" ]; then
        ls_enabled=true
    elif [ "$ls_status" = "0" ]; then
        ls_enabled=false
    else
        # Can't read the plist without elevated access — use launchctl as fallback
        if launchctl list 2>/dev/null | grep -q "locationd"; then
            # Service is running, likely enabled
            ls_enabled=true
        fi
    fi
fi

if [ "$ls_enabled" = false ]; then
    emit_pass "Location Services appear disabled" "Location Services"
    exit 0
fi

emit_warn "Location Services appear to be ENABLED"
emit_prompt "Attempt to disable Location Services?" "disable_location_services" \
    "Location Services are enabled" \
    "Location Services left enabled"
