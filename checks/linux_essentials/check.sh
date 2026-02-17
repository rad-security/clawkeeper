#!/bin/bash
# ============================================================================
# Clawkeeper Check: Linux Essential Packages
# Checks for git, curl, openssl, and ca-certificates.
# Emits a remediation prompt if any are missing.
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

emit_info "Checking for git, curl, openssl, and ca-certificates."

missing=()
for pkg in git curl openssl ca-certificates; do
    # ca-certificates is a package, not a command — check differently
    if [ "$pkg" = "ca-certificates" ]; then
        # Check if the ca-certificates bundle exists
        if [ -f /etc/ssl/certs/ca-certificates.crt ] || [ -d /etc/pki/tls/certs ] || dpkg -s ca-certificates &>/dev/null 2>&1 || rpm -q ca-certificates &>/dev/null 2>&1; then
            emit_info "$pkg is installed"
        else
            missing+=("$pkg")
            emit_warn "$pkg is not installed"
        fi
    elif command -v "$pkg" &>/dev/null; then
        emit_info "$pkg is installed"
    else
        missing+=("$pkg")
        emit_warn "$pkg is not installed"
    fi
done

if [ ${#missing[@]} -eq 0 ]; then
    emit_pass "All essential packages installed" "Essentials"
    exit 0
fi

# Check for a supported package manager before offering remediation
if ! command -v apt-get &>/dev/null && ! command -v dnf &>/dev/null; then
    emit_fail "Missing packages: ${missing[*]} (unsupported package manager)" "Essentials"
    exit 0
fi

emit_prompt "Install missing packages (${missing[*]})?" "install_essentials" \
    "Missing packages: ${missing[*]}" \
    "Missing packages not installed"
