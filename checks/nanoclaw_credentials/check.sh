#!/bin/bash
# ============================================================================
# Clawkeeper Check: NanoClaw Credential Security
# Verifies NanoClaw credential isolation: environment variable exposure,
# secrets in CLAUDE.md memory files, and session credential safety.
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

config_dir="$HOME/.config/nanoclaw"
data_dir="$config_dir/data"

if [ ! -d "$config_dir" ]; then
    emit_info "No NanoClaw config directory found — skipping credential checks"
    exit 0
fi

emit_info "NanoClaw credential security audit:"

# ---------- Check 1: Whitelisted environment variables ----------
# NanoClaw should only expose specific env vars to containers
allowed_env_vars=(
    "CLAUDE_CODE_OAUTH_TOKEN"
    "ANTHROPIC_API_KEY"
    "OPENAI_API_KEY"
)

emit_info "Checking environment variable exposure..."

# Check for potentially dangerous env vars that shouldn't reach containers
dangerous_vars_found=()
for var in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY GITHUB_TOKEN GH_TOKEN NPM_TOKEN; do
    if [ -n "${!var:-}" ]; then
        dangerous_vars_found+=("$var")
    fi
done

if [ ${#dangerous_vars_found[@]} -eq 0 ]; then
    emit_pass "No dangerous env vars detected in shell environment" "Env Var Exposure"
else
    emit_warn "Found env vars that should NOT reach NanoClaw containers: ${dangerous_vars_found[*]}"
    emit_info "NanoClaw's container isolation should filter these, but verify mount-allowlist.json"
fi

# Check for required auth env vars
auth_configured=false
if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    emit_pass "CLAUDE_CODE_OAUTH_TOKEN is set" "Claude Auth"
    auth_configured=true
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
    emit_pass "ANTHROPIC_API_KEY is set" "Claude Auth"
    auth_configured=true
fi

if [ "$auth_configured" = false ]; then
    emit_warn "No Claude authentication env var found"
    emit_info "Set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY"
fi

# ---------- Check 2: Scan CLAUDE.md files for secrets ----------
emit_info "Scanning CLAUDE.md memory files for secrets..."

if [ -d "$data_dir" ]; then
    secrets_found=false
    
    while IFS= read -r claude_file; do
        if [ -f "$claude_file" ]; then
            # Check for API keys and secrets
            if grep -qiE "(sk-ant-[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36})" "$claude_file" 2>/dev/null; then
                secrets_found=true
                emit_fail "CRITICAL: API key pattern found in $(basename "$(dirname "$claude_file")")/CLAUDE.md" "Memory Secrets"
            fi
            
            # Check for password patterns
            if grep -qiE "(password[[:space:]]*[=:][[:space:]]*['\"][^'\"]+['\"]|secret[[:space:]]*[=:][[:space:]]*['\"][^'\"]+['\"])" "$claude_file" 2>/dev/null; then
                secrets_found=true
                emit_warn "Password/secret pattern found in $(basename "$(dirname "$claude_file")")/CLAUDE.md"
            fi
        fi
    done < <(find "$data_dir" -name "CLAUDE.md" 2>/dev/null)
    
    if [ "$secrets_found" = false ]; then
        emit_pass "No secrets detected in CLAUDE.md memory files" "Memory Secrets"
    fi
else
    emit_info "No data directory found — no memory files to scan"
fi

# ---------- Check 3: Session credential permissions ----------
emit_info "Checking session credential security..."

sessions_dir="$config_dir/sessions"
if [ -d "$sessions_dir" ]; then
    insecure_creds=false
    
    while IFS= read -r creds_file; do
        if [ -f "$creds_file" ]; then
            perms=$(stat -f "%OLp" "$creds_file" 2>/dev/null || stat -c "%a" "$creds_file" 2>/dev/null || echo "unknown")
            if [ "$perms" != "600" ] && [ "$perms" != "400" ]; then
                insecure_creds=true
                emit_warn "Session credentials at $creds_file have permissions $perms"
            fi
        fi
    done < <(find "$sessions_dir" -name "creds.json" 2>/dev/null)
    
    if [ "$insecure_creds" = true ]; then
        emit_prompt "Fix session credential permissions to 600?" \
            "fix_nanoclaw_session_perms" \
            "Session credentials have insecure permissions" \
            "Session permissions not fixed"
    else
        session_count=$(find "$sessions_dir" -name "creds.json" 2>/dev/null | wc -l)
        if [ "$session_count" -gt 0 ]; then
            emit_pass "All $session_count session credential files have secure permissions" "Session Credentials"
        else
            emit_info "No session credentials found"
        fi
    fi
else
    emit_info "No sessions directory — no channel credentials to check"
fi

# ---------- Check 4: .env file in NanoClaw directory ----------
nanoclaw_env="$config_dir/.env"
if [ -f "$nanoclaw_env" ]; then
    env_perms=$(stat -f "%OLp" "$nanoclaw_env" 2>/dev/null || stat -c "%a" "$nanoclaw_env" 2>/dev/null || echo "unknown")
    if [ "$env_perms" = "600" ]; then
        emit_pass ".env file permissions are 600" ".env Permissions"
    else
        emit_prompt ".env file permissions are $env_perms — fix to 600?" \
            "fix_nanoclaw_env_perms" \
            ".env file permissions are $env_perms (should be 600)" \
            ".env permissions not fixed"
    fi
else
    emit_info "No .env file in NanoClaw config directory"
fi
