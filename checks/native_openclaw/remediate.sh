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
        emit_info "Installing openclaw..."

        npm_output=""
        npm_rc=0
        npm_output=$(npm install -g openclaw@latest 2>&1)
        npm_rc=$?

        # Retry on SSL/cert environments common on managed Mac fleets.
        if [ $npm_rc -ne 0 ] && echo "$npm_output" | grep -qi "cert\|ssl\|UNABLE_TO_GET_ISSUER_CERT\|SELF_SIGNED\|unable to get local issuer"; then
            emit_warn "SSL certificate error detected — retrying with certificate validation disabled..."
            npm_output=$(NODE_TLS_REJECT_UNAUTHORIZED=0 npm install -g openclaw@latest 2>&1)
            npm_rc=$?
        fi

        # Retry with sudo if npm global prefix requires elevation.
        if [ $npm_rc -ne 0 ] && echo "$npm_output" | grep -qi "EACCES\|permission denied"; then
            emit_warn "Permission error detected — retrying with sudo..."
            npm_output=$(sudo npm install -g openclaw@latest 2>&1)
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
