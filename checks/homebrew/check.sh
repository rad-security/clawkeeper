#!/bin/bash
# ============================================================================
# Clawkeeper Check: Homebrew
# Detects whether Homebrew is installed on macOS.
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

emit_info "Package manager needed for installing Docker, Node.js, and other tools."

if command -v brew &>/dev/null; then
    brew_version=$(brew --version 2>/dev/null | head -1 || echo "unknown")
    emit_pass "Homebrew is installed ($brew_version)" "Homebrew"
    exit 0
fi

# Homebrew not found — prompt to install
emit_warn "Homebrew is not installed"
emit_prompt "Install Homebrew now?" "install_homebrew" \
    "Homebrew not installed" \
    "Homebrew not installed"
