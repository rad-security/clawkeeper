#!/bin/bash
# ============================================================================
# Clawkeeper Check: Unnecessary Services
# Checks for running services that are typically unnecessary on a server:
# cups, avahi-daemon, bluetooth, ModemManager, whoopsie, apport.
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

emit_info "Reducing running services minimizes the attack surface."

declare -A checked_services=(
    ["cups"]="Printing (CUPS)"
    ["avahi-daemon"]="mDNS/Bonjour (Avahi)"
    ["bluetooth"]="Bluetooth"
    ["ModemManager"]="Modem Manager"
    ["whoopsie"]="Ubuntu error reporting"
    ["apport"]="Crash reporting"
)

# Preserve ordering with a separate array
service_order=("cups" "avahi-daemon" "bluetooth" "ModemManager" "whoopsie" "apport")

found_services=()

for svc_name in "${service_order[@]}"; do
    svc_desc="${checked_services[$svc_name]}"
    if systemctl is-active --quiet "$svc_name" 2>/dev/null; then
        found_services+=("$svc_name")
        emit_warn "$svc_desc ($svc_name) is running"
    fi
done

if [ ${#found_services[@]} -eq 0 ]; then
    emit_pass "No unnecessary services detected" "Unnecessary Services"
    exit 0
fi

emit_prompt "Disable ${#found_services[@]} unnecessary service(s)?" "disable_services" \
    "Unnecessary services running" \
    "Unnecessary services left running"
