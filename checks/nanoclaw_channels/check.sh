#!/bin/bash
# ============================================================================
# Clawkeeper Check: NanoClaw Channel Security
# Verifies NanoClaw channel authentication security for WhatsApp, Telegram,
# Slack, and Discord integrations.
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
sessions_dir="$config_dir/sessions"

if [ ! -d "$config_dir" ]; then
    emit_info "No NanoClaw config directory found — skipping channel checks"
    exit 0
fi

emit_info "NanoClaw channel security audit:"

channels_found=0
issues_found=0

# ---------- WhatsApp (Baileys) ----------
emit_info "Checking WhatsApp channel..."
whatsapp_session="$sessions_dir/main/creds.json"
if [ -f "$whatsapp_session" ]; then
    channels_found=$((channels_found + 1))
    emit_info "WhatsApp channel configured (Baileys session)"
    
    # Check permissions
    perms=$(stat -f "%OLp" "$whatsapp_session" 2>/dev/null || stat -c "%a" "$whatsapp_session" 2>/dev/null || echo "unknown")
    if [ "$perms" = "600" ] || [ "$perms" = "400" ]; then
        emit_pass "WhatsApp credentials have secure permissions ($perms)" "WhatsApp Security"
    else
        emit_fail "WhatsApp credentials permissions are $perms (should be 600)" "WhatsApp Security"
        issues_found=$((issues_found + 1))
    fi
    
    # Check that session is not in a mounted directory
    if echo "$whatsapp_session" | grep -qE "^/workspace|^/home/.*/(code|projects|workspace)"; then
        emit_warn "WhatsApp session is in a workspace directory — may be mounted into containers"
        emit_info "Session credentials should stay in ~/.config/nanoclaw/sessions only"
        issues_found=$((issues_found + 1))
    fi
else
    emit_info "WhatsApp channel not configured"
fi

# ---------- Telegram ----------
emit_info "Checking Telegram channel..."
telegram_configured=false

# Check for Telegram bot token in environment
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
    telegram_configured=true
    emit_info "Telegram bot token found in environment"
    emit_pass "Telegram token stored in env var (not in files)" "Telegram Security"
fi

# Check for hardcoded tokens in config files
if [ -d "$config_dir" ]; then
    if grep -rqE "bot[0-9]+:[A-Za-z0-9_-]{35}" "$config_dir" 2>/dev/null; then
        emit_fail "CRITICAL: Telegram bot token found hardcoded in config files" "Telegram Security"
        emit_info "Move token to TELEGRAM_BOT_TOKEN environment variable"
        issues_found=$((issues_found + 1))
        telegram_configured=true
    fi
fi

if [ "$telegram_configured" = false ]; then
    emit_info "Telegram channel not configured"
else
    channels_found=$((channels_found + 1))
fi

# ---------- Slack ----------
emit_info "Checking Slack channel..."
slack_configured=false

# Check for Slack tokens in environment
if [ -n "${SLACK_BOT_TOKEN:-}" ] || [ -n "${SLACK_APP_TOKEN:-}" ]; then
    slack_configured=true
    emit_info "Slack tokens found in environment"
    emit_pass "Slack tokens stored in env vars (not in files)" "Slack Security"
fi

# Check for hardcoded Slack tokens
if [ -d "$config_dir" ]; then
    if grep -rqE "xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+" "$config_dir" 2>/dev/null; then
        emit_fail "CRITICAL: Slack bot token found hardcoded in config files" "Slack Security"
        emit_info "Move token to SLACK_BOT_TOKEN environment variable"
        issues_found=$((issues_found + 1))
        slack_configured=true
    fi
    if grep -rqE "xapp-[0-9]+-[A-Za-z0-9]+-[0-9]+-[A-Za-z0-9]+" "$config_dir" 2>/dev/null; then
        emit_fail "CRITICAL: Slack app token found hardcoded in config files" "Slack Security"
        issues_found=$((issues_found + 1))
        slack_configured=true
    fi
fi

if [ "$slack_configured" = false ]; then
    emit_info "Slack channel not configured"
else
    channels_found=$((channels_found + 1))
fi

# ---------- Discord ----------
emit_info "Checking Discord channel..."
discord_configured=false

# Check for Discord tokens in environment
if [ -n "${DISCORD_BOT_TOKEN:-}" ]; then
    discord_configured=true
    emit_info "Discord bot token found in environment"
    emit_pass "Discord token stored in env var (not in files)" "Discord Security"
fi

# Check for hardcoded Discord tokens
if [ -d "$config_dir" ]; then
    if grep -rqE "[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}" "$config_dir" 2>/dev/null; then
        emit_fail "CRITICAL: Discord bot token found hardcoded in config files" "Discord Security"
        emit_info "Move token to DISCORD_BOT_TOKEN environment variable"
        issues_found=$((issues_found + 1))
        discord_configured=true
    fi
fi

if [ "$discord_configured" = false ]; then
    emit_info "Discord channel not configured"
else
    channels_found=$((channels_found + 1))
fi

# ---------- Check CLAUDE.md files for channel tokens ----------
emit_info "Scanning memory files for leaked channel tokens..."
data_dir="$config_dir/data"

if [ -d "$data_dir" ]; then
    tokens_in_memory=false
    
    while IFS= read -r claude_file; do
        if [ -f "$claude_file" ]; then
            # Check for various token patterns
            if grep -qE "(bot[0-9]+:[A-Za-z0-9_-]{35}|xoxb-|xapp-|[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27})" "$claude_file" 2>/dev/null; then
                tokens_in_memory=true
                group_name=$(basename "$(dirname "$claude_file")")
                emit_fail "Channel token found in $group_name/CLAUDE.md" "Memory Token Leak"
            fi
        fi
    done < <(find "$data_dir" -name "CLAUDE.md" 2>/dev/null)
    
    if [ "$tokens_in_memory" = false ]; then
        emit_pass "No channel tokens in memory files" "Memory Token Leak"
    else
        issues_found=$((issues_found + 1))
    fi
fi

# ---------- Summary ----------
emit_info ""
if [ "$channels_found" -eq 0 ]; then
    emit_info "No messaging channels configured"
elif [ "$issues_found" -eq 0 ]; then
    emit_pass "$channels_found channel(s) configured with secure credentials" "Channel Security"
else
    emit_fail "$issues_found security issue(s) found across $channels_found channel(s)" "Channel Security"
fi
