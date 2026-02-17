#!/bin/bash
# ============================================================================
# Clawkeeper Check: Linux Disk Encryption
# Detects LUKS / dm-crypt encrypted volumes.
# Info-only — no automated remediation (most VPS providers do not offer LUKS).
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

emit_info "Protects data at rest if the server disk is accessed outside the VM."

# Method 1: check lsblk for crypt type
if command -v lsblk &>/dev/null; then
    if lsblk -o TYPE 2>/dev/null | grep -q "crypt"; then
        emit_pass "LUKS disk encryption detected" "Disk Encryption"
        exit 0
    fi
fi

# Method 2: check /dev/mapper for crypt* or luks* entries
if ls /dev/mapper/crypt* &>/dev/null 2>&1 || ls /dev/mapper/luks* &>/dev/null 2>&1; then
    emit_pass "Encrypted volumes detected" "Disk Encryption"
    exit 0
fi

# No encryption detected
emit_warn "No disk encryption detected"
emit_info "Most VPS providers do not offer LUKS. Consider provider-level encryption"
emit_info "or application-level encryption for sensitive data."

if [ "$MODE" = "scan" ]; then
    emit_fail "No disk encryption detected" "Disk Encryption"
else
    emit_skipped "Disk encryption not available (typical for VPS)" "Disk Encryption"
fi
