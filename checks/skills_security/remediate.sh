#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Skills Security
# Quarantines dangerous skills by renaming SKILL.md and fixes directory perms.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    quarantine_skill:*)
        skill_file="${REMEDIATION_ID#quarantine_skill:}"
        if [ -f "$skill_file" ]; then
            skill_name=$(basename "$(dirname "$skill_file")")
            mv "$skill_file" "${skill_file}.quarantined"
            emit_pass "Skill '$skill_name' quarantined" "Skills Install Commands"
        else
            emit_fail "Skill file not found: $skill_file" "Skills Install Commands"
        fi
        ;;
    fix_skills_dir_perms:*)
        skills_dir="${REMEDIATION_ID#fix_skills_dir_perms:}"
        if [ -d "$skills_dir" ]; then
            chmod 700 "$skills_dir"
            emit_pass "Skills directory set to 700 ($skills_dir)" "Skills Directory Permissions"
        else
            emit_fail "Skills directory not found: $skills_dir" "Skills Directory Permissions"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Skills Security"
        ;;
esac
