#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Linux Node.js
# Installs Node.js 22 via NodeSource repository.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    install_node)
        emit_info "Setting up NodeSource repository..."

        if command -v apt-get &>/dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tail -5 || {
                emit_fail "NodeSource setup failed" "Node.js"
                exit 1
            }
            sudo apt-get install -y -qq nodejs 2>&1 | tail -3 || {
                emit_fail "Node.js installation failed" "Node.js"
                exit 1
            }
        elif command -v dnf &>/dev/null; then
            curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo -E bash - 2>&1 | tail -5 || {
                emit_fail "NodeSource setup failed" "Node.js"
                exit 1
            }
            sudo dnf install -y -q nodejs 2>&1 | tail -3 || {
                emit_fail "Node.js installation failed" "Node.js"
                exit 1
            }
        else
            emit_fail "Unsupported package manager for NodeSource" "Node.js"
            exit 1
        fi

        if command -v node &>/dev/null; then
            new_version=$(node --version 2>/dev/null)
            emit_pass "Node.js $new_version installed" "Node.js"
        else
            emit_fail "Node.js installation failed" "Node.js"
            exit 1
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Node.js"
        ;;
esac
