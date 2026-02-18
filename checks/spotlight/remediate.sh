#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Spotlight Indexing
# Disables Spotlight indexing on macOS (requires sudo).
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_spotlight)
        sudo mdutil -a -i off &>/dev/null || true
        emit_pass "Spotlight indexing disabled" "Spotlight Indexing"
        emit_info "Consider excluding OpenClaw directories later: System Settings → Siri & Spotlight → Spotlight Privacy"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Spotlight Indexing"
        ;;
esac
