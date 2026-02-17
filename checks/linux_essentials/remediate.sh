#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Linux Essential Packages
# Installs missing packages via apt-get or dnf.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    install_essentials)
        # Re-detect which packages are missing
        missing=()
        for pkg in git curl openssl ca-certificates; do
            if [ "$pkg" = "ca-certificates" ]; then
                if [ -f /etc/ssl/certs/ca-certificates.crt ] || [ -d /etc/pki/tls/certs ] || dpkg -s ca-certificates &>/dev/null 2>&1 || rpm -q ca-certificates &>/dev/null 2>&1; then
                    continue
                fi
                missing+=("$pkg")
            elif ! command -v "$pkg" &>/dev/null; then
                missing+=("$pkg")
            fi
        done

        if [ ${#missing[@]} -eq 0 ]; then
            emit_pass "All essential packages already installed" "Essentials"
            exit 0
        fi

        emit_info "Installing missing packages: ${missing[*]}"

        if command -v apt-get &>/dev/null; then
            sudo apt-get update -qq && sudo apt-get install -y -qq "${missing[@]}" 2>&1 | tail -3 || {
                emit_fail "Package installation failed" "Essentials"
                exit 1
            }
        elif command -v dnf &>/dev/null; then
            sudo dnf install -y -q "${missing[@]}" 2>&1 | tail -3 || {
                emit_fail "Package installation failed" "Essentials"
                exit 1
            }
        else
            emit_fail "Unsupported package manager" "Essentials"
            exit 1
        fi

        emit_pass "Essential packages installed" "Essentials"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Essentials"
        ;;
esac
