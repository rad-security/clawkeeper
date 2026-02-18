#!/bin/bash
# ============================================================================
# Clawkeeper Check: Automatic Security Updates
# Checks unattended-upgrades (Debian/Ubuntu) or dnf-automatic (RHEL/Fedora).
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

emit_info "Servers should auto-install security patches to prevent known exploits."

# Detect distro family
distro=""
if [ -f /etc/os-release ]; then
    . /etc/os-release
    case "$ID" in
        ubuntu|debian) distro="debian" ;;
        fedora|rhel|centos|rocky|almalinux) distro="rhel" ;;
        *) distro="$ID" ;;
    esac
fi

if [ "$distro" = "debian" ]; then
    if dpkg -l unattended-upgrades 2>/dev/null | grep -q "^ii"; then
        if systemctl is-active --quiet unattended-upgrades 2>/dev/null; then
            emit_pass "unattended-upgrades is installed and active" "Auto Updates"
        else
            emit_warn "unattended-upgrades is installed but not active"
            emit_prompt "Enable automatic security updates?" "enable_unattended_upgrades" \
                "Automatic updates not active" \
                "Automatic updates not enabled"
        fi
    else
        emit_warn "unattended-upgrades is not installed"
        emit_prompt "Install and enable automatic security updates?" "install_unattended_upgrades" \
            "No automatic updates configured" \
            "Automatic updates not configured"
    fi
elif [ "$distro" = "rhel" ]; then
    if rpm -q dnf-automatic &>/dev/null; then
        emit_pass "dnf-automatic is installed" "Auto Updates"
    else
        emit_warn "dnf-automatic is not installed"
        emit_prompt "Install and enable automatic security updates?" "install_dnf_automatic" \
            "No automatic updates configured" \
            "Automatic updates not configured"
    fi
else
    emit_info "Auto-update check not supported for distro: ${distro:-unknown}"
    emit_skipped "Auto-update check skipped (unsupported distro)" "Auto Updates"
fi
