#!/bin/bash
# ============================================================================
# Clawkeeper Check: Credential Store Security
# Checks permissions on ~/.openclaw/credentials/, OAuth profiles,
# session transcript directories, and log files.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

MODE="scan"
REMEDIATION_ID=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --mode) MODE="$2"; shift 2 ;;
        --remediation-id) REMEDIATION_ID="$2"; shift 2 ;;
        *) shift ;;
    esac
done

openclaw_dir="$HOME/.openclaw"

if [ ! -d "$openclaw_dir" ]; then
    emit_info "No ~/.openclaw directory found — skipping credential store checks"
    exit 0
fi

# --- Remediation handler ---
if [ -n "$REMEDIATION_ID" ]; then
    case "$REMEDIATION_ID" in
        fix_credentials_perms)
            creds_dir="$openclaw_dir/credentials"
            if [ -d "$creds_dir" ]; then
                chmod 700 "$creds_dir"
                find "$creds_dir" -type f -exec chmod 600 {} \;
                emit_pass "Credentials directory and files set to 700/600" "Credential Directory"
            else
                emit_fail "Credentials directory not found" "Credential Directory"
            fi
            ;;
        fix_oauth_perms)
            find "$openclaw_dir/agents" -name "auth-profiles.json" -exec chmod 600 {} \; 2>/dev/null
            emit_pass "OAuth profile files set to 600" "OAuth Profiles"
            ;;
        fix_sessions_perms)
            find "$openclaw_dir/agents" -name "sessions" -type d -exec chmod 700 {} \; 2>/dev/null
            find "$openclaw_dir/agents" -path "*/sessions/*.jsonl" -exec chmod 600 {} \; 2>/dev/null
            emit_pass "Session directories and logs set to 700/600" "Session Transcripts"
            ;;
        fix_log_perms)
            log_dir="/tmp/openclaw"
            if [ -d "$log_dir" ]; then
                chmod 700 "$log_dir"
                find "$log_dir" -name "*.log" -exec chmod 600 {} \; 2>/dev/null
                emit_pass "Log directory and files set to 700/600" "Log Files"
            else
                emit_fail "Log directory not found: $log_dir" "Log Files"
            fi
            ;;
        *)
            emit_fail "Unknown remediation: $REMEDIATION_ID" "Credential Store"
            ;;
    esac
    exit 0
fi

emit_info "Credential store security checks:"

# ---------- Credentials directory ----------
creds_dir="$openclaw_dir/credentials"
if [ -d "$creds_dir" ]; then
    creds_perms=$(stat -f "%Lp" "$creds_dir" 2>/dev/null || stat -c "%a" "$creds_dir" 2>/dev/null)
    if [ "$creds_perms" = "700" ]; then
        emit_pass "Credentials directory permissions are 700" "Credential Directory"
    else
        emit_prompt "Credentials directory permissions are $creds_perms — fix to 700?" \
            "fix_credentials_perms" \
            "Credentials directory permissions are $creds_perms (should be 700)" \
            "Credentials directory left at $creds_perms"
    fi

    # Check individual credential files
    cred_file_issues=0
    while IFS= read -r cred_file; do
        [ -z "$cred_file" ] && continue
        fperms=$(stat -f "%Lp" "$cred_file" 2>/dev/null || stat -c "%a" "$cred_file" 2>/dev/null)
        if [ "$fperms" != "600" ] && [ "$fperms" != "400" ]; then
            cred_file_issues=$((cred_file_issues + 1))
        fi
    done < <(find "$creds_dir" -type f 2>/dev/null)

    if [ "$cred_file_issues" -gt 0 ]; then
        emit_fail "$cred_file_issues credential file(s) have incorrect permissions (should be 600)" "Credential Files"
    else
        emit_pass "All credential files have correct permissions" "Credential Files"
    fi
else
    emit_pass "No credentials directory found (no channel credentials stored)" "Credential Directory"
fi

# ---------- OAuth profiles ----------
oauth_issues=0
oauth_count=0
while IFS= read -r profile_file; do
    [ -z "$profile_file" ] && continue
    oauth_count=$((oauth_count + 1))
    fperms=$(stat -f "%Lp" "$profile_file" 2>/dev/null || stat -c "%a" "$profile_file" 2>/dev/null)
    if [ "$fperms" != "600" ] && [ "$fperms" != "400" ]; then
        oauth_issues=$((oauth_issues + 1))
    fi
done < <(find "$openclaw_dir/agents" -name "auth-profiles.json" 2>/dev/null)

if [ "$oauth_count" -eq 0 ]; then
    emit_pass "No OAuth profiles found" "OAuth Profiles"
elif [ "$oauth_issues" -gt 0 ]; then
    emit_prompt "$oauth_issues OAuth profile(s) have incorrect permissions — fix to 600?" \
        "fix_oauth_perms" \
        "$oauth_issues OAuth profile(s) have incorrect permissions" \
        "OAuth profiles left with current permissions"
else
    emit_pass "All $oauth_count OAuth profile(s) have correct permissions (600)" "OAuth Profiles"
fi

# ---------- Session transcripts ----------
session_dir_issues=0
session_file_issues=0
session_count=0

while IFS= read -r sess_dir; do
    [ -z "$sess_dir" ] && continue
    session_count=$((session_count + 1))
    dperms=$(stat -f "%Lp" "$sess_dir" 2>/dev/null || stat -c "%a" "$sess_dir" 2>/dev/null)
    if [ "$dperms" != "700" ]; then
        session_dir_issues=$((session_dir_issues + 1))
    fi
    # Sample check session files
    while IFS= read -r sess_file; do
        [ -z "$sess_file" ] && continue
        fperms=$(stat -f "%Lp" "$sess_file" 2>/dev/null || stat -c "%a" "$sess_file" 2>/dev/null)
        if [ "$fperms" != "600" ] && [ "$fperms" != "400" ]; then
            session_file_issues=$((session_file_issues + 1))
        fi
    done < <(find "$sess_dir" -name "*.jsonl" -maxdepth 1 2>/dev/null | head -5)
done < <(find "$openclaw_dir/agents" -name "sessions" -type d 2>/dev/null)

if [ "$session_count" -eq 0 ]; then
    emit_pass "No session transcript directories found" "Session Transcripts"
elif [ "$session_dir_issues" -gt 0 ] || [ "$session_file_issues" -gt 0 ]; then
    total_issues=$((session_dir_issues + session_file_issues))
    emit_prompt "$total_issues session store permission issue(s) — fix to 700/600?" \
        "fix_sessions_perms" \
        "Session transcript permissions are too permissive" \
        "Session transcript permissions left as-is"
else
    emit_pass "Session transcript stores have correct permissions" "Session Transcripts"
fi

# ---------- Log files ----------
log_dir="/tmp/openclaw"
if [ -d "$log_dir" ]; then
    log_perms=$(stat -f "%Lp" "$log_dir" 2>/dev/null || stat -c "%a" "$log_dir" 2>/dev/null)
    if [ "$log_perms" = "700" ]; then
        emit_pass "Log directory permissions are 700" "Log Files"
    else
        emit_prompt "Log directory permissions are $log_perms — fix to 700?" \
            "fix_log_perms" \
            "Log directory permissions are $log_perms (should be 700)" \
            "Log directory left at $log_perms"
    fi
else
    emit_pass "No OpenClaw log directory found at /tmp/openclaw" "Log Files"
fi
