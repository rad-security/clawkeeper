#!/bin/bash
# ============================================================================
# Clawkeeper Check: NanoClaw Instance Detection
# Detects running NanoClaw instances via host process, Docker containers,
# and active channel connections (WhatsApp, Telegram, etc.).
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

emit_info "Checking for running NanoClaw instances..."

found=false
running=false

# ---------- Check for NanoClaw host process ----------
nanoclaw_process=$(pgrep -fl "nanoclaw|nano-claw" 2>/dev/null || true)
if [ -n "$nanoclaw_process" ]; then
    found=true
    running=true
    while IFS= read -r line; do
        emit_info "Found NanoClaw process: $line"
    done <<< "$nanoclaw_process"
fi

# ---------- Check for NanoClaw npm package ----------
if command -v npm &>/dev/null; then
    if npm list -g nanoclaw 2>/dev/null | grep -q "nanoclaw@"; then
        found=true
        nc_version=$(npm list -g nanoclaw 2>/dev/null | grep "nanoclaw@" | sed 's/.*@//' | head -1)
        emit_info "NanoClaw npm package installed: v$nc_version"
    fi
fi

# ---------- Check for NanoClaw agent containers ----------
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    nc_containers=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -iE "nanoclaw|nc-agent" || true)
    if [ -n "$nc_containers" ]; then
        found=true
        running=true
        while IFS= read -r line; do
            emit_info "Found NanoClaw container: $line"
        done <<< "$nc_containers"
    fi
fi

# ---------- Check for NanoClaw config directory ----------
nanoclaw_config_dir="$HOME/.config/nanoclaw"
if [ -d "$nanoclaw_config_dir" ]; then
    found=true
    emit_info "NanoClaw config directory exists: $nanoclaw_config_dir"
    
    # Check for active sessions
    if [ -d "$nanoclaw_config_dir/sessions" ]; then
        session_count=$(find "$nanoclaw_config_dir/sessions" -name "creds.json" 2>/dev/null | wc -l)
        if [ "$session_count" -gt 0 ]; then
            emit_info "Found $session_count active channel session(s)"
        fi
    fi
fi

# ---------- Check for WhatsApp Baileys session ----------
if [ -f "$nanoclaw_config_dir/sessions/main/creds.json" ]; then
    emit_info "WhatsApp channel configured (Baileys session found)"
fi

# ---------- Check for systemd service ----------
if command -v systemctl &>/dev/null; then
    if systemctl is-active --quiet nanoclaw 2>/dev/null; then
        running=true
        emit_info "NanoClaw systemd service is active"
    elif systemctl is-enabled --quiet nanoclaw 2>/dev/null; then
        emit_info "NanoClaw systemd service is enabled but not running"
    fi
fi

# ---------- Check for launchd service (macOS) ----------
if [ -f "$HOME/Library/LaunchAgents/com.nanoclaw.agent.plist" ]; then
    if launchctl list 2>/dev/null | grep -q "com.nanoclaw"; then
        running=true
        emit_info "NanoClaw launchd service is running"
    else
        emit_info "NanoClaw launchd plist exists but service not loaded"
    fi
fi

# ---------- Summary ----------
if [ "$found" = false ]; then
    emit_info "No NanoClaw installation detected"
    emit_info "This is expected if you haven't installed NanoClaw yet."
elif [ "$running" = true ]; then
    emit_pass "NanoClaw is installed and running" "NanoClaw Detection"
else
    emit_warn "NanoClaw is installed but not running"
    emit_pass "NanoClaw installation detected" "NanoClaw Detection"
fi
