#!/bin/bash
# ============================================================================
# Clawkeeper Check: Screen Sharing
# Detects whether macOS Screen Sharing is enabled via launchctl.
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

emit_info "Screen Sharing should only be enabled if you're accessing this Mac remotely."

screen_sharing=false

# Check if Screen Sharing is enabled via launchctl
if launchctl list 2>/dev/null | grep -q "com.apple.screensharing"; then
    screen_sharing=true
fi

if [ "$screen_sharing" = true ]; then
    emit_warn "Screen Sharing is ON"
    emit_info "This is expected if you access this Mac via Screen Sharing from your main Mac."
    emit_info "Ensure only authorized users have access."
    emit_pass "Screen Sharing is on (verify this is intentional)" "Screen Sharing"
else
    emit_pass "Screen Sharing is off" "Screen Sharing"
fi
