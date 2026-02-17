#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: SOUL.md Security
# Fixes SOUL.md file permissions to 600.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    fix_soul_perms:*)
        soul_file="${REMEDIATION_ID#fix_soul_perms:}"
        if [ -f "$soul_file" ]; then
            chmod 600 "$soul_file"
            emit_pass "SOUL.md set to 600 ($soul_file)" "SOUL.md Permissions"
        else
            emit_fail "SOUL.md file not found: $soul_file" "SOUL.md Permissions"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "SOUL.md Permissions"
        ;;
esac
