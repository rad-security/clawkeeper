#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw Instance Detection
# Detects running OpenClaw instances via Docker containers, bare-metal
# processes, and port 18789 binding. If the gateway is bound to 0.0.0.0,
# it's a critical finding; 127.0.0.1 is safe.
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

emit_info "Checking for running OpenClaw instances..."

found=false

# ---------- Check for OpenClaw Docker container ----------
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    oc_containers=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -i "openclaw" || true)
    if [ -n "$oc_containers" ]; then
        found=true
        while IFS= read -r line; do
            emit_info "Found Docker container: $line"
        done <<< "$oc_containers"
    fi
fi

# ---------- Check for bare-metal process ----------
oc_process=$(pgrep -fl "openclaw|moltbot|clawdbot" 2>/dev/null || true)
if [ -n "$oc_process" ]; then
    found=true
    while IFS= read -r line; do
        emit_info "Found bare-metal process: $line"
    done <<< "$oc_process"
fi

# ---------- Check for gateway port 18789 ----------
port_check=""
if command -v lsof &>/dev/null; then
    port_check=$(lsof -i :18789 2>/dev/null || true)
elif command -v ss &>/dev/null; then
    port_check=$(ss -tlnp 2>/dev/null | grep ":18789" || true)
fi

if [ -n "$port_check" ]; then
    found=true
    emit_info "Port 18789 is in use"

    # Check binding address
    if echo "$port_check" | grep -q "0.0.0.0"; then
        emit_fail "Gateway bound to 0.0.0.0 (ALL interfaces) — CRITICAL" "OpenClaw Gateway"
        emit_info "This exposes the gateway to the entire network."
        emit_info "Fix: Set gateway.bind to 'loopback' in openclaw.json"
    elif echo "$port_check" | grep -q "127.0.0.1\|localhost"; then
        emit_pass "Gateway bound to localhost only" "OpenClaw Gateway"
    else
        emit_warn "Gateway binding could not be determined"
    fi
fi

if [ "$found" = false ]; then
    emit_info "No running OpenClaw instance detected"
    emit_info "This is expected if you haven't installed OpenClaw yet."
fi
