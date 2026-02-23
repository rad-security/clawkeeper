#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw Configuration Audit
# Audits ~/.openclaw directory permissions, openclaw.json file permissions,
# and key config values: gateway.bind, auth.mode, controlUi, discovery,
# logging.redactSensitive, and credential exposure.
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

# gateway.controlUi
if grep -q '"controlUi"' "$config_file" 2>/dev/null; then
    if grep -q '"enabled".*false' "$config_file" 2>/dev/null; then
        emit_pass "gateway.controlUi.enabled = false (web UI disabled)" "gateway.controlUi"
    else
        emit_warn "gateway.controlUi may be enabled"
        emit_fail "Web control UI should be disabled for security (controlUi.enabled: false)" "gateway.controlUi"
    fi
else
    emit_pass "gateway.controlUi not configured (defaults to disabled)" "gateway.controlUi"
fi

# discovery.mdns.mode (top-level discovery section, not gateway.discover)
if grep -q '"discovery"' "$config_file" 2>/dev/null; then
    if grep -q '"mode".*"off"' "$config_file" 2>/dev/null; then
        emit_pass "discovery.mdns.mode = off (mDNS disabled)" "discovery"
    else
        emit_warn "mDNS discovery may be enabled"
        emit_fail "mDNS discovery should be disabled (discovery.mdns.mode: off)" "discovery"
    fi
else
    emit_warn "discovery not configured — mDNS may be enabled by default"
    emit_fail "Add discovery.mdns.mode = off to disable network broadcast" "discovery"
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
