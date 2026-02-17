#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw Configuration Audit
# Audits ~/.openclaw directory permissions, openclaw.json file permissions,
# and key config values: gateway.bind, auth.mode, controlUI, discover.mode,
# exec.ask, redactSensitive, and credential exposure.
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

config_file="$HOME/.openclaw/openclaw.json"
config_dir="$HOME/.openclaw"

# ---------- Check config directory exists ----------
if [ ! -d "$config_dir" ]; then
    emit_info "No OpenClaw config directory found (~/.openclaw)"
    emit_info "This is expected if OpenClaw isn't installed yet. Skipping config checks."
    exit 0
fi

# ---------- Check directory permissions ----------
dir_perms=$(stat -f "%OLp" "$config_dir" 2>/dev/null || stat -c "%a" "$config_dir" 2>/dev/null || echo "unknown")
if [ "$dir_perms" = "700" ]; then
    emit_pass "Config directory permissions are 700 (owner-only)" "Config Permissions"
else
    emit_prompt "Config directory permissions are $dir_perms — fix to 700?" \
        "fix_config_dir_perms" \
        "Config directory permissions are $dir_perms (should be 700)" \
        "Config directory permissions not changed"
fi

# ---------- Check config file exists ----------
if [ ! -f "$config_file" ]; then
    emit_info "No openclaw.json found. Skipping config content checks."
    exit 0
fi

# ---------- Check config file permissions ----------
file_perms=$(stat -f "%OLp" "$config_file" 2>/dev/null || stat -c "%a" "$config_file" 2>/dev/null || echo "unknown")
if [ "$file_perms" = "600" ]; then
    emit_pass "Config file permissions are 600" "Config File Permissions"
else
    emit_prompt "Config file permissions are $file_perms — fix to 600?" \
        "fix_config_file_perms" \
        "Config file permissions are $file_perms (should be 600)" \
        "Config file permissions not changed"
fi

# ---------- Parse key config values ----------
emit_info "Configuration audit:"

# gateway.bind
if grep -q '"bind".*"loopback"' "$config_file" 2>/dev/null; then
    emit_pass "gateway.bind = loopback" "gateway.bind"
elif grep -q '"bind"' "$config_file" 2>/dev/null; then
    emit_fail "gateway.bind is set but NOT to loopback" "gateway.bind"
else
    emit_warn "gateway.bind not explicitly set"
    emit_fail "gateway.bind not configured (should be 'loopback')" "gateway.bind"
fi

# gateway.auth.mode
if grep -q '"mode".*"token"' "$config_file" 2>/dev/null; then
    emit_pass "gateway.auth.mode = token" "gateway.auth"
else
    emit_fail "Token authentication not configured" "gateway.auth"
fi

# gateway.controlUI
if grep -q '"controlUI".*false' "$config_file" 2>/dev/null; then
    emit_pass "gateway.controlUI = false (web UI disabled)" "gateway.controlUI"
else
    emit_warn "gateway.controlUI may be enabled"
    emit_fail "Web control UI should be disabled (controlUI: false)" "gateway.controlUI"
fi

# gateway.discover.mode
if grep -q '"discover"' "$config_file" 2>/dev/null && grep -q '"mode".*"off"' "$config_file" 2>/dev/null; then
    emit_pass "gateway.discover.mode = off (mDNS disabled)" "gateway.discover"
else
    emit_fail "mDNS discovery should be disabled (discover.mode: off)" "gateway.discover"
fi

# exec.ask
if grep -q '"ask".*"on"' "$config_file" 2>/dev/null; then
    emit_pass "exec.ask = on (explicit consent mode)" "exec.ask"
else
    emit_fail "Explicit consent not enabled (exec.ask should be 'on')" "exec.ask"
fi

# logging.redactSensitive
if grep -q '"redactSensitive"' "$config_file" 2>/dev/null; then
    emit_pass "logging.redactSensitive is configured" "logging.redactSensitive"
else
    emit_fail "Sensitive log redaction not configured" "logging.redactSensitive"
fi

# Check for plain-text API keys in config
if grep -qiE "(api.key|api_key|apikey|sk-ant-|sk-)" "$config_file" 2>/dev/null; then
    emit_fail "CRITICAL: Possible plain-text API keys found in config file" "Credential Exposure"
    emit_info "Move API keys to environment variables or a .env file"
else
    emit_pass "No plain-text API keys detected in config" "Credential Exposure"
fi
