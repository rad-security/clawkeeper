#!/bin/bash
# ============================================================================
# Clawkeeper Check: Linux Open Ports Audit
# Uses ss or netstat to identify listening ports. Flags OpenClaw gateway
# (port 18789) on 0.0.0.0 as critical.
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

emit_info "Only essential ports should be listening on external interfaces."

listening_ports=""
if command -v ss &>/dev/null; then
    listening_ports=$(ss -tlnp 2>/dev/null || echo "")
elif command -v netstat &>/dev/null; then
    listening_ports=$(netstat -tlnp 2>/dev/null || echo "")
else
    emit_info "Neither ss nor netstat available — skipping port audit"
    emit_skipped "No port inspection tool available" "Open Ports"
    exit 0
fi

if [ -z "$listening_ports" ]; then
    emit_info "Could not retrieve listening ports"
    emit_skipped "Could not retrieve listening ports" "Open Ports"
    exit 0
fi

# Report listening services
if command -v ss &>/dev/null; then
    while IFS= read -r line; do
        addr=$(echo "$line" | awk '{print $4}')
        proc=$(echo "$line" | awk '{print $6}')
        if echo "$addr" | grep -q "0.0.0.0\|::"; then
            emit_warn "External listener: $addr -- $proc"
        else
            emit_info "Local listener: $addr -- $proc"
        fi
    done < <(ss -tlnp 2>/dev/null | grep "LISTEN")
fi

# Critical: check if OpenClaw port is externally exposed
if echo "$listening_ports" | grep -q "0.0.0.0:18789\|:::18789"; then
    emit_fail "OpenClaw gateway (18789) is listening on ALL interfaces — CRITICAL" "Open Ports"
    emit_info "Bind to loopback only and use SSH tunnel for access"
else
    emit_pass "No critical port exposure detected" "Open Ports"
fi
