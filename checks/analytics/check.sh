#!/bin/bash
# ============================================================================
# Clawkeeper Check: Analytics & Telemetry
# Detects whether analytics and telemetry settings are enabled on macOS.
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

emit_info "Diagnostic data from this machine shouldn't go to Apple or third parties."

analytics_issue=false

# Check crash reporter auto-submit
auto_submit=$(defaults read "/Library/Application Support/CrashReporter/DiagnosticMessagesHistory.plist" AutoSubmit 2>/dev/null || echo "unknown")
if [ "$auto_submit" = "1" ] || [ "$auto_submit" = "unknown" ]; then
    analytics_issue=true
fi

# Check Siri analytics
siri_analytics=$(defaults read com.apple.assistant.support "Siri Data Sharing Opt-In Status" 2>/dev/null || echo "unknown")
if [ "$siri_analytics" = "2" ]; then
    analytics_issue=true
fi

if [ "$analytics_issue" = false ]; then
    emit_pass "Analytics and telemetry appear disabled" "Analytics & Telemetry"
    exit 0
fi

emit_warn "Some analytics/telemetry settings may be enabled"
emit_prompt "Disable all analytics and telemetry?" "disable_analytics" \
    "Analytics/telemetry may be enabled" \
    "Analytics left as-is"
