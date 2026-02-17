#!/bin/bash
# ============================================================================
# Clawkeeper Check: Siri
# Detects whether Siri and its assistant features are enabled on macOS.
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

emit_info "Siri indexes files, contacts, messages, and app activity locally."
emit_info "A compromised agent could query this index to enumerate sensitive data."

siri_enabled=false

# Check Siri assistant
if defaults read com.apple.assistant.support "Assistant Enabled" 2>/dev/null | grep -q "1"; then
    siri_enabled=true
fi

# Check Listen for Siri
if defaults read com.apple.Siri StatusMenuVisible 2>/dev/null | grep -q "1"; then
    siri_enabled=true
fi

if [ "$siri_enabled" = false ]; then
    emit_pass "Siri is disabled" "Siri"
    exit 0
fi

emit_warn "Siri is currently ENABLED"
emit_prompt "Disable Siri?" "disable_siri" "Siri is enabled" "Siri left enabled"
