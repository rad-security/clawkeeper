#!/bin/bash
# ============================================================================
# Clawkeeper Check: Session Rogue Commands
# Scans session JSONL files for suspicious bash commands executed by agents.
# Detects potential data exfiltration, reverse shells, and privilege escalation.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "$SCRIPT_DIR/../../lib/helpers.sh"

sessions_dir="$HOME/.openclaw/agents"
if [ ! -d "$sessions_dir" ]; then
    emit_info "No agents directory found — skipping session command scan"
    exit 0
fi

session_files=$(find "$sessions_dir" -name "*.jsonl" -type f 2>/dev/null | sort -r | head -10)
if [ -z "$session_files" ]; then
    emit_info "No session log files found"
    exit 0
fi

rogue_found=false

while IFS= read -r sfile; do
    [ -z "$sfile" ] && continue

    # Extract lines referencing bash tool_use / command content
    cmd_content=$(grep -E '"(tool_use|bash|command)"' "$sfile" 2>/dev/null | head -500 || true)
    [ -z "$cmd_content" ] && continue

    # Data exfiltration — curl/wget POSTing data
    if echo "$cmd_content" | grep -qiE 'curl.*(--data|-d |-X POST|--upload)|wget.*--post'; then
        rogue_found=true
        snippet=$(echo "$cmd_content" | grep -oiE 'curl.*(--data|-d |-X POST|--upload)|wget.*--post' | head -1 | cut -c1-60)
        emit_fail "Suspicious data exfil command: ${snippet}" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # Reverse shells
    if echo "$cmd_content" | grep -qiE '(nc|ncat|netcat).* -e.*(bash|sh|/bin)|bash -i.*>&.*/dev/tcp'; then
        rogue_found=true
        emit_fail "Reverse shell pattern detected in session commands" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # Base64 decode piped to shell
    if echo "$cmd_content" | grep -qiE 'base64.*(decode|--decode|-d).*\|.*(bash|sh)'; then
        rogue_found=true
        emit_fail "Base64-to-shell execution detected" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # Privilege escalation
    if echo "$cmd_content" | grep -qiE 'chmod 777|chmod [+]s|chown root'; then
        rogue_found=true
        emit_fail "Privilege escalation command detected (chmod 777/setuid)" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # Sensitive file access
    if echo "$cmd_content" | grep -qiE '(cat|less|head|tail|cp|scp).*/etc/(shadow|passwd)|authorized_keys'; then
        rogue_found=true
        emit_fail "Sensitive file access detected (/etc/shadow, /etc/passwd, authorized_keys)" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # Download-and-execute
    if echo "$cmd_content" | grep -qiE '(curl|wget).*\|.*(bash|sh)'; then
        rogue_found=true
        emit_fail "Download-and-execute pattern detected (curl|bash)" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # Env dumping to external
    if echo "$cmd_content" | grep -qiE '(printenv|env|set).*\|.*(curl|wget|nc|ncat)'; then
        rogue_found=true
        emit_fail "Environment variable exfiltration detected" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

    # History clearing
    if echo "$cmd_content" | grep -qiE 'history -c|rm.*(bash_history|zsh_history|history)'; then
        rogue_found=true
        emit_fail "History clearing detected" "Session Rogue Commands"
        emit_info "File: $sfile"
    fi

done <<< "$session_files"

if [ "$rogue_found" = false ]; then
    emit_pass "No rogue command patterns detected in recent sessions" "Session Rogue Commands"
fi
