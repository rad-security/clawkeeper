#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw Hardening Audit
# Advanced configuration checks: sandbox mode, exec host policy, DM scope,
# DM policy, filesystem restriction, and log redaction level.
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
    emit_info "No openclaw.json found — skipping hardening checks"
    exit 0
fi

emit_info "Advanced hardening checks:"

# ---------- Sandbox mode ----------
if grep -q '"sandbox"' "$config_file" 2>/dev/null && grep -q '"mode".*"all"' "$config_file" 2>/dev/null; then
    emit_pass "agents.defaults.sandbox.mode = all" "Sandbox Mode"
else
    emit_fail "Sandbox mode should be 'all' (agents.defaults.sandbox.mode)" "Sandbox Mode"
    emit_info "This ensures all agent actions run within the sandbox"
fi

# ---------- Exec host policy ----------
if grep -q '"exec"' "$config_file" 2>/dev/null && grep -q '"host".*"sandbox"' "$config_file" 2>/dev/null; then
    emit_pass "tools.exec.host = sandbox" "Exec Policy"
else
    emit_fail "Exec host should be 'sandbox' (not gateway/elevated)" "Exec Policy"
    emit_info "Prevents agents from executing on the gateway host directly"
fi

# ---------- DM scope ----------
if grep -q '"dmScope".*"per-channel-peer"' "$config_file" 2>/dev/null; then
    emit_pass "session.dmScope = per-channel-peer" "DM Scope"
else
    emit_fail "DM scope should be 'per-channel-peer' for isolation" "DM Scope"
fi

# ---------- DM policy ----------
if grep -q '"dmPolicy".*"pairing"' "$config_file" 2>/dev/null || grep -q '"dm".*"pairing"' "$config_file" 2>/dev/null; then
    emit_pass "DM policy = pairing (requires mutual opt-in)" "DM Policy"
else
    emit_fail "DM policy should be 'pairing' (not 'open')" "DM Policy"
    emit_info "Open DM policy allows any user to message the bot directly"
fi

# ---------- Filesystem restriction ----------
if grep -q '"workspaceOnly".*true' "$config_file" 2>/dev/null; then
    emit_pass "tools.fs.workspaceOnly = true" "Filesystem Restriction"
else
    emit_fail "Filesystem access should be restricted to workspace only" "Filesystem Restriction"
    emit_info "Set tools.fs.workspaceOnly = true in openclaw.json"
fi

# ---------- Log redaction level ----------
if grep -q '"redactSensitive".*"tools"' "$config_file" 2>/dev/null; then
    emit_pass "logging.redactSensitive = tools (full redaction)" "Log Redaction Level"
elif grep -q '"redactSensitive".*true' "$config_file" 2>/dev/null; then
    emit_warn "logging.redactSensitive is enabled but not set to 'tools'"
    emit_fail "Log redaction should be 'tools' for complete coverage" "Log Redaction Level"
else
    emit_fail "logging.redactSensitive not configured" "Log Redaction Level"
fi
