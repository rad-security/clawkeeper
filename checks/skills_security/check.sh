#!/bin/bash
# ============================================================================
# Clawkeeper Check: Skills Security Audit
# Scans skills directories for dangerous install commands, secret injection
# via apiKey/token/env blocks, and data exfiltration patterns.
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

skills_dirs=(
    "$HOME/.openclaw/skills"
    "./skills"
)

found_skills=false

for skills_dir in "${skills_dirs[@]}"; do
    if [ ! -d "$skills_dir" ]; then
        continue
    fi
    found_skills=true

    # ---------- Check directory permissions ----------
    dir_perms=$(stat -f "%OLp" "$skills_dir" 2>/dev/null || stat -c "%a" "$skills_dir" 2>/dev/null || echo "unknown")
    if [ "$dir_perms" = "700" ]; then
        emit_pass "Skills directory ($skills_dir) permissions are 700" "Skills Directory Permissions"
    else
        emit_prompt "Skills directory ($skills_dir) permissions are $dir_perms — fix to 700?" \
            "fix_skills_dir_perms:${skills_dir}" \
            "Skills directory permissions are $dir_perms (should be 700)" \
            "Skills directory permissions not changed"
    fi

    # ---------- Scan each SKILL.md file ----------
    skill_files=$(find "$skills_dir" -name "SKILL.md" -o -name "skill.md" 2>/dev/null || true)
    if [ -z "$skill_files" ]; then
        emit_info "No SKILL.md files found in $skills_dir"
        continue
    fi

    emit_info "Scanning skills in $skills_dir:"

    install_flagged=false
    secret_flagged=false
    exfil_flagged=false

    while IFS= read -r skill_file; do
        [ -z "$skill_file" ] && continue
        skill_name=$(basename "$(dirname "$skill_file")")

        # 1. Install commands — check for dangerous patterns
        install_block=$(grep -iA5 "^install:" "$skill_file" 2>/dev/null || true)
        if [ -n "$install_block" ]; then
            if echo "$install_block" | grep -qiE 'curl\s|wget\s|eval\s|exec\s|bash\s+-c|base64|sh\s+-c|\|\s*sh|\|\s*bash'; then
                install_flagged=true
                emit_fail "CRITICAL: Skill '$skill_name' has dangerous install commands" "Skills Install Commands"
                emit_info "Found shell execution patterns in install block"
                emit_prompt "Quarantine skill '$skill_name'? (rename SKILL.md with .quarantined)" \
                    "quarantine_skill:${skill_file}" \
                    "Dangerous skill '$skill_name' not quarantined" \
                    "Skill '$skill_name' left as-is"
            fi
        fi

        # 2. Secret injection — skills using apiKey: or env: to inject secrets
        if grep -qiE '^\s*(apiKey|api_key|secret|token)\s*:' "$skill_file" 2>/dev/null; then
            secret_flagged=true
            emit_fail "Skill '$skill_name' injects secrets (apiKey/token)" "Skills Secret Injection"
            emit_info "Secrets injected via skills run in the host process context"
        fi
        if grep -qiE '^\s*env\s*:' "$skill_file" 2>/dev/null; then
            # Check if the env block references sensitive-looking vars
            env_block=$(grep -iA3 '^\s*env\s*:' "$skill_file" 2>/dev/null || true)
            if echo "$env_block" | grep -qiE 'KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL'; then
                secret_flagged=true
                emit_fail "Skill '$skill_name' injects sensitive env vars" "Skills Secret Injection"
            fi
        fi

        # 3. Data exfiltration — curl/wget/nc with external URLs in body
        body_content=$(sed -n '/^---$/,/^---$/d; p' "$skill_file" 2>/dev/null || true)
        if echo "$body_content" | grep -qiE '(curl|wget|nc|ncat)\s+(https?://|[0-9]+\.[0-9]+\.[0-9]+)'; then
            exfil_flagged=true
            emit_fail "Skill '$skill_name' may exfiltrate data (external network call)" "Skills Data Exfiltration"
            emit_info "Review: $skill_file"
        fi

    done <<< "$skill_files"

    if [ "$install_flagged" = false ]; then
        emit_pass "No dangerous install commands found" "Skills Install Commands"
    fi
    if [ "$secret_flagged" = false ]; then
        emit_pass "No secret injection detected" "Skills Secret Injection"
    fi
    if [ "$exfil_flagged" = false ]; then
        emit_pass "No data exfiltration patterns found" "Skills Data Exfiltration"
    fi
done

if [ "$found_skills" = false ]; then
    emit_info "No skills directories found — skipping skills audit"
    emit_info "Checked: ~/.openclaw/skills/ and ./skills/"
fi
