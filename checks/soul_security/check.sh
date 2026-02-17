#!/bin/bash
# ============================================================================
# Clawkeeper Check: SOUL.md Security Audit
# Checks SOUL.md permissions, sensitive data (credentials/PII), prompt
# injection patterns, base64-encoded blocks, invisible Unicode characters,
# and file size anomalies.
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

soul_files=(
    "$HOME/.openclaw/SOUL.md"
    "./SOUL.md"
)

found_soul=false

for soul_file in "${soul_files[@]}"; do
    if [ ! -f "$soul_file" ]; then
        continue
    fi
    found_soul=true
    emit_info "Checking: $soul_file"

    # ---------- 1. Permissions — should be 600 ----------
    perms=$(stat -f "%OLp" "$soul_file" 2>/dev/null || stat -c "%a" "$soul_file" 2>/dev/null || echo "unknown")
    if [ "$perms" = "600" ]; then
        emit_pass "SOUL.md permissions are 600 ($soul_file)" "SOUL.md Permissions"
    else
        emit_prompt "SOUL.md permissions are $perms — fix to 600? ($soul_file)" \
            "fix_soul_perms:${soul_file}" \
            "SOUL.md permissions are $perms (should be 600)" \
            "SOUL.md permissions not changed"
    fi

    # ---------- 2. Sensitive data — credential/PII patterns ----------
    cred_patterns='(sk-ant-api|sk-[A-Za-z0-9]{20,}|ghp_|xoxb-|AKIA[0-9A-Z]|AIza[A-Za-z0-9]|password\s*[:=]\s*\S+)'
    soul_cred=$(grep -oiE "$cred_patterns" "$soul_file" 2>/dev/null | head -1 || true)
    if [ -n "$soul_cred" ]; then
        truncated=$(echo "$soul_cred" | cut -c1-4)
        emit_fail "Sensitive data found in SOUL.md (${truncated}****)" "SOUL.md Sensitive Data"
        emit_info "SOUL.md is loaded into every conversation — remove secrets immediately"
    else
        emit_pass "No sensitive data detected in SOUL.md" "SOUL.md Sensitive Data"
    fi

    # ---------- 3. Prompt injection / integrity ----------
    injection_hit=false

    # Check for common prompt injection patterns
    if grep -qiE '(you are now|ignore previous|disregard all|forget your instructions|new instructions|system prompt override|jailbreak)' "$soul_file" 2>/dev/null; then
        injection_hit=true
        emit_fail "Potential prompt injection detected in SOUL.md" "SOUL.md Integrity"
        emit_info "Found override/jailbreak language — review file for tampering"
    fi

    # Check for base64-encoded blocks (suspicious in a personality file)
    if grep -qE '[A-Za-z0-9+/]{40,}={0,2}$' "$soul_file" 2>/dev/null; then
        injection_hit=true
        emit_fail "Suspicious base64-encoded content in SOUL.md" "SOUL.md Integrity"
        emit_info "Base64 blocks in SOUL.md may hide malicious instructions"
    fi

    # Check for unusual Unicode (zero-width chars, RTL override, homoglyphs)
    if grep -qP '[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}\x{FEFF}]' "$soul_file" 2>/dev/null; then
        injection_hit=true
        emit_fail "Invisible Unicode characters found in SOUL.md" "SOUL.md Integrity"
        emit_info "Zero-width or directional override chars can hide injected text"
    fi

    if [ "$injection_hit" = false ]; then
        emit_pass "No prompt injection patterns detected" "SOUL.md Integrity"
    fi

    # ---------- 4. File size — over 10KB is suspicious ----------
    file_size=$(wc -c < "$soul_file" 2>/dev/null | tr -d ' ')
    if [ "$file_size" -gt 10240 ] 2>/dev/null; then
        emit_fail "SOUL.md is unusually large ($(( file_size / 1024 ))KB — over 10KB)" "SOUL.md Size"
        emit_info "Large SOUL.md files may contain hidden instructions or data"
    else
        emit_pass "SOUL.md size is reasonable ($(( file_size / 1024 ))KB)" "SOUL.md Size"
    fi
done

if [ "$found_soul" = false ]; then
    emit_info "No SOUL.md files found — skipping SOUL.md audit"
    emit_info "Checked: ~/.openclaw/SOUL.md and ./SOUL.md"
fi
