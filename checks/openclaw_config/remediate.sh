#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: OpenClaw Configuration
# Fixes config directory and file permissions.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    fix_config_dir_perms)
        config_dir="$HOME/.openclaw"
        if [ -d "$config_dir" ]; then
            chmod 700 "$config_dir"
            emit_pass "Config directory set to 700" "Config Permissions"
        else
            emit_fail "Config directory not found: $config_dir" "Config Permissions"
        fi
        ;;
    fix_config_file_perms)
        config_file="$HOME/.openclaw/openclaw.json"
        if [ -f "$config_file" ]; then
            chmod 600 "$config_file"
            emit_pass "Config file set to 600" "Config File Permissions"
        else
            emit_fail "Config file not found: $config_file" "Config File Permissions"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "OpenClaw Config"
        ;;
esac
