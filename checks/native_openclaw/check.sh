#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw (npm)
# Detects whether OpenClaw is available via global install or npx.
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

emit_info "Checking if OpenClaw is available via npm..."

# Check direct command
if command -v openclaw &>/dev/null; then
    oc_version=$(openclaw --version 2>/dev/null || echo "unknown")
    emit_pass "OpenClaw is installed ($oc_version)" "OpenClaw npm"
    exit 0
fi

# Try npx
if command -v npx &>/dev/null; then
    npx_version=$(npx openclaw --version 2>/dev/null || echo "")
    if [ -n "$npx_version" ]; then
        emit_pass "OpenClaw available via npx ($npx_version)" "OpenClaw npm"
        exit 0
    fi
fi

# Not found
emit_warn "OpenClaw is not installed"

if ! command -v npm &>/dev/null; then
    emit_fail "npm not available — install Node.js first" "OpenClaw npm"
    exit 0
fi

emit_prompt "Install OpenClaw globally via npm?" "install_openclaw" \
    "OpenClaw not installed" \
    "OpenClaw not installed"
