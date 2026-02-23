#!/bin/bash
# ============================================================================
# Clawkeeper Check: Node.js
# Detects whether Node.js >= 22 is installed.
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

emit_info "OpenClaw native install currently requires Node.js 22.x."

if command -v node &>/dev/null; then
    node_version=$(node --version 2>/dev/null || echo "unknown")
    major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)

    if [ "$major_version" -eq 22 ] 2>/dev/null; then
        emit_pass "Node.js $node_version installed (meets v22.x requirement)" "Node.js"
        exit 0
    elif [ "$major_version" -gt 22 ] 2>/dev/null; then
        emit_warn "Node.js $node_version detected"
        emit_warn "OpenClaw native install is currently incompatible with Node.js $major_version (sharp/libvips build issues)"
        emit_fail "Node.js 22.x required for native OpenClaw install" "Node.js"
        exit 0
    else
        emit_warn "Node.js $node_version is installed but OpenClaw needs v22.x"
    fi
else
    emit_warn "Node.js is not installed"
fi

# Check if brew is available for the remediation
if ! command -v brew &>/dev/null; then
    emit_fail "Node.js 22+ not available (install Homebrew first)" "Node.js"
    exit 0
fi

emit_prompt "Install Node.js 22 via Homebrew?" "install_node" \
    "Node.js 22.x not installed" \
    "Node.js not installed"
