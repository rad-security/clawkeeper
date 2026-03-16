#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: NanoClaw Credentials
# Fixes credential file permissions.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

remediation_id="${1:-}"
config_dir="$HOME/.config/nanoclaw"

case "$remediation_id" in
    fix_nanoclaw_session_perms)
        sessions_dir="$config_dir/sessions"
        fixed=0
        while IFS= read -r creds_file; do
            if chmod 600 "$creds_file" 2>/dev/null; then
                fixed=$((fixed + 1))
            fi
        done < <(find "$sessions_dir" -name "creds.json" 2>/dev/null)
        
        if [ "$fixed" -gt 0 ]; then
            emit_pass "Fixed permissions on $fixed session credential file(s)" "Session Credentials"
        else
            emit_fail "Could not fix session credential permissions" "Session Credentials"
        fi
        ;;
    fix_nanoclaw_env_perms)
        if chmod 600 "$config_dir/.env" 2>/dev/null; then
            emit_pass "Fixed .env permissions to 600" ".env Permissions"
        else
            emit_fail "Could not fix .env permissions" ".env Permissions"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $remediation_id" "Remediation"
        ;;
esac
