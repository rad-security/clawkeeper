#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Siri
# Disables Siri and related features on macOS.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_siri)
        defaults write com.apple.assistant.support "Assistant Enabled" -bool false 2>/dev/null || true
        defaults write com.apple.Siri StatusMenuVisible -bool false 2>/dev/null || true
        defaults write com.apple.Siri UserHasDeclinedEnable -bool true 2>/dev/null || true
        # Disable Siri suggestions
        defaults write com.apple.suggestions SuggestionsAllowFrom -int 0 2>/dev/null || true
        emit_pass "Siri disabled" "Siri" # FIXED status set by orchestrator
        emit_info "Note: You may need to also disable Siri in System Settings → Apple Intelligence & Siri"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Siri"
        ;;
esac
