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

        npm install -g openclaw 2>&1 | tail -5 || {
            emit_fail "OpenClaw installation failed" "OpenClaw npm"
            exit 1
        }

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
