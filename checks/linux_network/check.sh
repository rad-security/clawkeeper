#!/bin/bash
# ============================================================================
# Clawkeeper Check: Linux Network Configuration
# Displays public IP, local IP, and virtualization type.
# Info-only — always passes.
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

emit_info "Reviewing network interfaces and connectivity."

# Gather public IP
public_ip=$(curl -sf --max-time 5 https://ifconfig.me 2>/dev/null \
    || curl -sf --max-time 5 https://api.ipify.org 2>/dev/null \
    || echo "unknown")

# Gather local IP
local_ip=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")

emit_info "Public IP: $public_ip"
emit_info "Local IP: $local_ip"

# Detect virtualization type
virt_type=$(systemd-detect-virt 2>/dev/null || echo "unknown")
emit_info "Virtualization: $virt_type"

emit_info "For VPS deployments, bind OpenClaw to loopback and access via SSH tunnel:"
emit_info "  ssh -N -L 18789:127.0.0.1:18789 user@$public_ip"

emit_pass "Network info displayed" "Network"
