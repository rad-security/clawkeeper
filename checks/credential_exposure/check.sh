#!/bin/bash
# ============================================================================
# Clawkeeper Check: Credential Exposure Scan
# Scans openclaw.json, shell history, MEMORY.md, and session logs for
# common credential patterns. Never echoes actual credentials — truncates
# to first 4 characters.
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

# Patterns that match common credential formats
# NEVER echo actual credentials — truncate to first 4 chars
cred_patterns='(sk-ant-api[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{36}|xoxb-[0-9]{10,}|AKIA[0-9A-Z]{16}|AIza[A-Za-z0-9_-]{35})'

config_file="$HOME/.openclaw/openclaw.json"

# ---- 1. Config file: detect resolved ${VAR} env vars (config.patch bug) ----
if [ -f "$config_file" ]; then
    config_matches=$(grep -oE "$cred_patterns" "$config_file" 2>/dev/null || true)
    if [ -n "$config_matches" ]; then
        truncated=$(echo "$config_matches" | head -1 | cut -c1-4)
        emit_fail "CRITICAL: Credential found in openclaw.json (${truncated}****)" "Credential Exposure Config"
        emit_info "Likely caused by env-var resolution bug — remove and use .env instead"
    else
        emit_pass "No credentials detected in openclaw.json" "Credential Exposure Config"
    fi
else
    emit_info "No openclaw.json found — skipping config credential scan"
fi

# ---- 2. Shell history ----
history_files=(
    "$HOME/.bash_history"
    "$HOME/.zsh_history"
)
history_hit=false
for hfile in "${history_files[@]}"; do
    if [ -f "$hfile" ]; then
        hist_match=$(grep -oE "$cred_patterns" "$hfile" 2>/dev/null | head -1 || true)
        if [ -n "$hist_match" ]; then
            history_hit=true
            truncated=$(echo "$hist_match" | cut -c1-4)
            emit_fail "Credential found in shell history: $(basename "$hfile") (${truncated}****)" "Credential Exposure History"
            emit_info "Run: history -c or remove matching lines from $hfile"
        fi
    fi
done
if [ "$history_hit" = false ]; then
    emit_pass "No credentials found in shell history" "Credential Exposure History"
fi

# ---- 3. MEMORY.md ----
memory_file="$HOME/.openclaw/MEMORY.md"
if [ -f "$memory_file" ]; then
    # Check permissions
    mem_perms=$(stat -f "%OLp" "$memory_file" 2>/dev/null || stat -c "%a" "$memory_file" 2>/dev/null || echo "unknown")
    if [ "$mem_perms" != "600" ] && [ "$mem_perms" != "700" ]; then
        emit_fail "MEMORY.md permissions are $mem_perms (should be 600)" "Credential Exposure Memory"
    fi
    # Content scan
    mem_match=$(grep -oE "$cred_patterns" "$memory_file" 2>/dev/null | head -1 || true)
    if [ -n "$mem_match" ]; then
        truncated=$(echo "$mem_match" | cut -c1-4)
        emit_fail "Credential found in MEMORY.md (${truncated}****)" "Credential Exposure Memory"
        emit_info "OpenClaw may have memorized a secret — edit ~/.openclaw/MEMORY.md"
    else
        emit_pass "No credentials detected in MEMORY.md" "Credential Exposure Memory"
    fi
else
    emit_info "No MEMORY.md found — skipping memory credential scan"
fi

# ---- 4. Session logs (sample scan — check permissions + first few files) ----
sessions_dir="$HOME/.openclaw/agents"
if [ -d "$sessions_dir" ]; then
    session_files=$(find "$sessions_dir" -name "*.jsonl" -type f 2>/dev/null | head -5)
    if [ -n "$session_files" ]; then
        # Check directory permissions
        sess_perms=$(stat -f "%OLp" "$sessions_dir" 2>/dev/null || stat -c "%a" "$sessions_dir" 2>/dev/null || echo "unknown")
        if [ "$sess_perms" != "700" ]; then
            emit_fail "Session logs directory permissions are $sess_perms (should be 700)" "Credential Exposure Sessions"
        fi
        # Sample content scan
        sess_hit=false
        while IFS= read -r sfile; do
            [ -z "$sfile" ] && continue
            s_match=$(grep -oE "$cred_patterns" "$sfile" 2>/dev/null | head -1 || true)
            if [ -n "$s_match" ]; then
                sess_hit=true
                truncated=$(echo "$s_match" | cut -c1-4)
                emit_fail "Credential found in session log (${truncated}****)" "Credential Exposure Sessions"
                emit_info "File: $sfile"
                break
            fi
        done <<< "$session_files"
        if [ "$sess_hit" = false ]; then
            emit_pass "No credentials detected in sampled session logs" "Credential Exposure Sessions"
        fi
    else
        emit_info "No session log files found"
    fi
else
    emit_info "No agents directory found — skipping session log scan"
fi
