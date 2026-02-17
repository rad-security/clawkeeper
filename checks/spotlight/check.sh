#!/bin/bash
# ============================================================================
# Clawkeeper Check: Spotlight Indexing
# Detects whether Spotlight indexing is enabled on macOS.
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

emit_info "Spotlight indexes file contents and metadata. Reduces what's queryable by a compromised agent."

spotlight_on=false

spotlight_status=$(mdutil -s / 2>/dev/null || echo "unknown")

if echo "$spotlight_status" | grep -qi "indexing enabled"; then
    spotlight_on=true
elif echo "$spotlight_status" | grep -qi "indexing disabled"; then
    spotlight_on=false
else
    # Assume it's on by default
    spotlight_on=true
fi

if [ "$spotlight_on" = false ]; then
    emit_pass "Spotlight indexing is disabled" "Spotlight Indexing"
    exit 0
fi

emit_warn "Spotlight indexing is ENABLED"
emit_prompt "Disable Spotlight indexing entirely?" "disable_spotlight" \
    "Spotlight indexing is enabled" \
    "Spotlight left enabled"
