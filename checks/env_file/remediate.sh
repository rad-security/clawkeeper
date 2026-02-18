#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: .env File Security
# Fixes .env file permissions to 600.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

# The remediation_id is in the form "fix_env_perms:/path/to/.env"
case "$REMEDIATION_ID" in
    fix_env_perms:*)
        env_file="${REMEDIATION_ID#fix_env_perms:}"
        if [ -f "$env_file" ]; then
            chmod 600 "$env_file"
            emit_pass ".env file set to 600 ($env_file)" ".env Permissions"
        else
            emit_fail ".env file not found: $env_file" ".env Permissions"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" ".env Permissions"
        ;;
esac
