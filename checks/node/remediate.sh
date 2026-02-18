#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Node.js
# Installs Node.js 22 via Homebrew.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    install_node)
        emit_info "Installing node@22..."

        brew install node@22 2>&1 | tail -3 || {
            emit_fail "Node.js installation failed" "Node.js"
            exit 1
        }

        # Link if needed
        brew link --overwrite node@22 2>/dev/null || true

        if command -v node &>/dev/null; then
            new_version=$(node --version 2>/dev/null)
            emit_pass "Node.js $new_version installed" "Node.js"
        else
            emit_fail "Node.js installed but not in PATH — restart your terminal" "Node.js"
            exit 1
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Node.js"
        ;;
esac
