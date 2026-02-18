#!/bin/bash
# ============================================================================
# Clawkeeper Check: FileVault (Full-Disk Encryption)
# Detects whether FileVault is enabled on macOS.
# Info-only — no automated remediation (must be done in System Settings).
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

emit_info "Protects data at rest if the machine is physically compromised."

fv_status=$(fdesetup status 2>/dev/null || echo "unknown")

if echo "$fv_status" | grep -qi "FileVault is On"; then
    emit_pass "FileVault is enabled" "FileVault"
    exit 0
elif echo "$fv_status" | grep -qi "FileVault is Off"; then
    emit_warn "FileVault is OFF — disk is NOT encrypted"
    emit_info "FileVault requires interactive setup (password + recovery key)."
    emit_info "Enable it: System Settings -> Privacy & Security -> FileVault -> Turn On"
    emit_info "Choose 'Create a recovery key' — do NOT use iCloud for a dedicated machine."
    emit_fail "FileVault is off (enable manually in System Settings)" "FileVault"
    exit 0
fi

emit_warn "Could not determine FileVault status"
emit_fail "FileVault status unknown" "FileVault"
