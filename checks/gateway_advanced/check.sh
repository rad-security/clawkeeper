#!/bin/bash
# ============================================================================
# Clawkeeper Check: Gateway Advanced Security
# Checks elevated tools, browser control, group access, plugin allowlist,
# and trusted proxy configuration.
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

config_file="$HOME/.openclaw/openclaw.json"

if [ ! -f "$config_file" ]; then
    emit_info "No openclaw.json found — skipping advanced gateway checks"
    exit 0
fi

emit_info "Advanced gateway security checks:"

# ---------- Elevated tool access ----------
if grep -q '"elevated"' "$config_file" 2>/dev/null; then
    if grep -q '"elevated"' "$config_file" 2>/dev/null && grep -q '"enabled".*true' "$config_file" 2>/dev/null; then
        # Check more precisely: look for elevated block with enabled: true
        # Using a simple heuristic since we don't have jq
        local_elevated=$(grep -A2 '"elevated"' "$config_file" 2>/dev/null | grep '"enabled"' | head -1)
        if echo "$local_elevated" | grep -q 'true' 2>/dev/null; then
            emit_fail "Elevated tool execution is enabled (tools.elevated.enabled: true)" "Elevated Tools"
            emit_info "Disable elevated execution: set tools.elevated.enabled = false"
        else
            emit_pass "Elevated tool execution is disabled" "Elevated Tools"
        fi
    else
        emit_pass "Elevated tool execution is disabled" "Elevated Tools"
    fi
else
    emit_pass "Elevated tool execution not configured (disabled by default)" "Elevated Tools"
fi

# ---------- Browser control ----------
# Check if browser control tools are exposed
if grep -q '"browser"' "$config_file" 2>/dev/null; then
    # Check if browser mode is set to off
    if grep -A3 '"browser"' "$config_file" 2>/dev/null | grep -q '"mode".*"off"' 2>/dev/null; then
        emit_pass "Browser control is disabled (mode: off)" "Browser Control"
    else
        emit_fail "Browser control is enabled — treat as operator-level access" "Browser Control"
        emit_info "Disable when unused: gateway.nodes.browser.mode = 'off'"
        emit_info "If needed, restrict to tailnet-only access"
    fi
else
    emit_pass "Browser control not configured (safe default)" "Browser Control"
fi

# ---------- Group access policy ----------
if grep -q '"requireMention".*true' "$config_file" 2>/dev/null; then
    emit_pass "requireMention = true (bot only responds when @mentioned)" "Group Mention Policy"
else
    if grep -q '"groupPolicy"' "$config_file" 2>/dev/null; then
        if grep -q '"groupPolicy".*"allowlist"' "$config_file" 2>/dev/null; then
            emit_pass "Group policy is set to allowlist" "Group Access Policy"
        elif grep -q '"groupPolicy".*"open"' "$config_file" 2>/dev/null; then
            emit_fail "Group policy is 'open' — any group member can command the bot" "Group Access Policy"
            emit_info "Set groupPolicy to 'allowlist' or enable requireMention"
        fi
    else
        emit_fail "requireMention not enabled for group channels" "Group Mention Policy"
        emit_info "Set requireMention: true to prevent responding to arbitrary group messages"
    fi
fi

# ---------- Plugin/extension allowlist ----------
if grep -q '"plugins"' "$config_file" 2>/dev/null; then
    if grep -q '"allow"' "$config_file" 2>/dev/null; then
        emit_pass "Plugin allowlist is configured (plugins.allow)" "Plugin Allowlist"
    else
        emit_fail "Plugins loaded without explicit allowlist" "Plugin Allowlist"
        emit_info "Define plugins.allow to explicitly trust only required plugins"
    fi
else
    emit_pass "No plugins configured" "Plugin Allowlist"
fi

# ---------- Trusted proxy configuration ----------
if grep -q '"trustedProxies"' "$config_file" 2>/dev/null; then
    emit_pass "Trusted proxies are configured (gateway.trustedProxies)" "Trusted Proxies"
else
    # Only flag if gateway is not in loopback mode (proxy config irrelevant for local-only)
    if grep -q '"bind"' "$config_file" 2>/dev/null; then
        local_bind=$(grep '"bind"' "$config_file" 2>/dev/null | head -1)
        if echo "$local_bind" | grep -q '"loopback"' 2>/dev/null; then
            emit_pass "Gateway is loopback-only (trusted proxies not needed)" "Trusted Proxies"
        else
            emit_fail "Gateway exposed without trusted proxy configuration" "Trusted Proxies"
            emit_info "Set gateway.trustedProxies to prevent auth bypass via header spoofing"
        fi
    else
        emit_pass "Gateway bind mode not set (defaults safe)" "Trusted Proxies"
    fi
fi

# ---------- Dangerous tool deny list ----------
# Check if automation, runtime, and fs groups are denied
denied_groups=0
for group in "group:automation" "group:runtime" "group:fs"; do
    if grep -q "$group" "$config_file" 2>/dev/null; then
        denied_groups=$((denied_groups + 1))
    fi
done

if [ "$denied_groups" -ge 3 ]; then
    emit_pass "Dangerous tool groups denied (automation, runtime, fs)" "Tool Deny List"
elif [ "$denied_groups" -gt 0 ]; then
    emit_warn "Some dangerous tool groups are denied but not all"
    emit_fail "Deny all dangerous tool groups: automation, runtime, fs" "Tool Deny List"
else
    emit_fail "Dangerous tool groups not explicitly denied" "Tool Deny List"
    emit_info "Add to tools.deny: group:automation, group:runtime, group:fs"
fi
