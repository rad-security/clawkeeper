#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Unnecessary Services
# Disables all detected unnecessary services.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_services)
        # Re-check which services are running and disable them
        declare -A checked_services=(
            ["cups"]="Printing (CUPS)"
            ["avahi-daemon"]="mDNS/Bonjour (Avahi)"
            ["bluetooth"]="Bluetooth"
            ["ModemManager"]="Modem Manager"
            ["whoopsie"]="Ubuntu error reporting"
            ["apport"]="Crash reporting"
        )

        service_order=("cups" "avahi-daemon" "bluetooth" "ModemManager" "whoopsie" "apport")
        disabled_count=0

        for svc_name in "${service_order[@]}"; do
            svc_desc="${checked_services[$svc_name]}"
            if systemctl is-active --quiet "$svc_name" 2>/dev/null; then
                sudo systemctl disable --now "$svc_name" 2>/dev/null || true
                emit_info "Disabled $svc_desc ($svc_name)"
                disabled_count=$((disabled_count + 1))
            fi
        done

        if [ "$disabled_count" -gt 0 ]; then
            emit_pass "Disabled $disabled_count unnecessary service(s)" "Unnecessary Services"
        else
            emit_pass "No unnecessary services found to disable" "Unnecessary Services"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Unnecessary Services"
        ;;
esac
