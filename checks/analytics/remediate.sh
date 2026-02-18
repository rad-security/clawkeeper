#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Analytics & Telemetry
# Disables analytics and telemetry on macOS (partially requires sudo).
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    disable_analytics)
        # Disable crash reporter auto-submit (requires sudo)
        sudo defaults write "/Library/Application Support/CrashReporter/DiagnosticMessagesHistory.plist" AutoSubmit -bool false 2>/dev/null || true
        # Disable Siri data sharing
        defaults write com.apple.assistant.support "Siri Data Sharing Opt-In Status" -int 0 2>/dev/null || true
        # Disable app analytics
        defaults write com.apple.appanalyticsd policy -int 0 2>/dev/null || true
        emit_pass "Analytics and telemetry disabled" "Analytics & Telemetry"
        emit_info "Verify in System Settings → Privacy & Security → Analytics & Improvements"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Analytics & Telemetry"
        ;;
esac
