#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: OpenClaw (npm)
# Installs OpenClaw globally via npm.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    install_openclaw)
        emit_info "Installing openclaw (this may take a minute)..."

        npm_output=""
        npm_rc=0

        # Use NODE_TLS_REJECT_UNAUTHORIZED=0 upfront to avoid SSL hangs
        # on managed Macs with corporate proxies / cert inspection.
        # Timeout after 60 seconds to prevent indefinite hangs.
        if command -v timeout >/dev/null 2>&1; then
            npm_output=$(NODE_TLS_REJECT_UNAUTHORIZED=0 timeout 60 npm install -g openclaw@latest 2>&1)
            npm_rc=$?
        else
            # macOS doesn't have timeout by default — use a background job
            local tmplog="/tmp/clawkeeper-npm-install.$$.log"
            NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -g openclaw@latest >"$tmplog" 2>&1 &
            local npm_pid=$!
            local waited=0
            while kill -0 "$npm_pid" 2>/dev/null && [ $waited -lt 60 ]; do
                sleep 2
                waited=$((waited + 2))
                printf "\r  Installing... (%ds)" "$waited" >&2
            done
            printf "\r                        \r" >&2
            if kill -0 "$npm_pid" 2>/dev/null; then
                kill "$npm_pid" 2>/dev/null
                wait "$npm_pid" 2>/dev/null
                npm_rc=1
                npm_output="Installation timed out after 60 seconds"
            else
                wait "$npm_pid"
                npm_rc=$?
                npm_output=$(cat "$tmplog" 2>/dev/null || echo "")
            fi
            rm -f "$tmplog"
        fi

        # Retry with sudo if npm global prefix requires elevation.
        if [ $npm_rc -ne 0 ] && echo "$npm_output" | grep -qi "EACCES\|permission denied"; then
            emit_warn "Permission error detected — retrying with sudo..."
            npm_output=$(sudo NODE_TLS_REJECT_UNAUTHORIZED=0 env npm install -g openclaw@latest 2>&1)
            npm_rc=$?
        fi

        echo "$npm_output" | tail -8

        if [ $npm_rc -ne 0 ]; then
            emit_fail "OpenClaw installation failed" "OpenClaw npm"
            exit 1
        fi

        if command -v openclaw &>/dev/null; then
            new_version=$(openclaw --version 2>/dev/null || echo "installed")
            emit_pass "OpenClaw $new_version installed" "OpenClaw npm"
        else
            emit_fail "OpenClaw installed but not in PATH — restart your terminal" "OpenClaw npm"
            exit 1
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "OpenClaw npm"
        ;;
esac
