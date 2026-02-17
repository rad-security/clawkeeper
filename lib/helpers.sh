#!/bin/bash
# ============================================================================
# Clawkeeper — Shared Helpers
# JSON output functions for check scripts + parsing for the orchestrator
# ============================================================================

# --- JSON Output Helpers (used by check.sh / remediate.sh scripts) ----------
# These emit structured JSON lines to stdout. Both the CLI orchestrator and
# the Tauri backend parse this output.

# Escape a string for safe JSON embedding
_json_escape() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\t'/\\t}"
    s="${s//$'\n'/\\n}"
    printf '%s' "$s"
}

emit_pass() {
    local detail="$1"
    local check_name="${2:-}"
    printf '{"status":"PASS","check_name":"%s","detail":"%s"}\n' \
        "$(_json_escape "$check_name")" "$(_json_escape "$detail")"
}

emit_fail() {
    local detail="$1"
    local check_name="${2:-}"
    printf '{"status":"FAIL","check_name":"%s","detail":"%s"}\n' \
        "$(_json_escape "$check_name")" "$(_json_escape "$detail")"
}

emit_info() {
    local message="$1"
    printf '{"type":"info","message":"%s"}\n' "$(_json_escape "$message")"
}

emit_warn() {
    local message="$1"
    printf '{"type":"warn","message":"%s"}\n' "$(_json_escape "$message")"
}

emit_skipped() {
    local detail="$1"
    local check_name="${2:-}"
    printf '{"status":"SKIPPED","check_name":"%s","detail":"%s"}\n' \
        "$(_json_escape "$check_name")" "$(_json_escape "$detail")"
}

# Emit a remediation prompt. The orchestrator will ask the user and call
# remediate.sh if accepted. fail_detail is used when the user declines in
# scan mode; skip_detail when they decline in setup mode.
emit_prompt() {
    local message="$1"
    local remediation_id="$2"
    local fail_detail="${3:-}"
    local skip_detail="${4:-}"
    printf '{"action":"prompt","message":"%s","remediation_id":"%s","fail_detail":"%s","skip_detail":"%s"}\n' \
        "$(_json_escape "$message")" \
        "$(_json_escape "$remediation_id")" \
        "$(_json_escape "$fail_detail")" \
        "$(_json_escape "$skip_detail")"
}

# --- JSON Parsing Helper (used by the orchestrator) -------------------------
# Extract a value from a simple flat JSON object. No jq dependency.
# Usage: _jval '{"key":"value"}' "key"  → prints "value"
_jval() {
    local json="$1" key="$2"
    local pattern="\"${key}\":\""
    local rest="${json#*$pattern}"
    if [ "$rest" = "$json" ]; then
        echo ""
        return
    fi
    # Handle escaped quotes in value
    local value=""
    local i=0
    local len=${#rest}
    local prev=""
    while [ $i -lt "$len" ]; do
        local ch="${rest:$i:1}"
        if [ "$ch" = '"' ] && [ "$prev" != '\' ]; then
            break
        fi
        value="${value}${ch}"
        prev="$ch"
        i=$((i + 1))
    done
    # Unescape
    value="${value//\\n/$'\n'}"
    value="${value//\\t/$'\t'}"
    value="${value//\\\"/\"}"
    value="${value//\\\\/\\}"
    printf '%s' "$value"
}
