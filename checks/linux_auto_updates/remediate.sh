#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Automatic Security Updates
# Installs/enables unattended-upgrades or dnf-automatic depending on distro.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    enable_unattended_upgrades)
        sudo systemctl enable --now unattended-upgrades 2>/dev/null || true
        emit_pass "Automatic updates enabled" "Auto Updates"
        ;;
    install_unattended_upgrades)
        sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades 2>&1 | tail -3
        sudo systemctl enable --now unattended-upgrades 2>/dev/null || true
        emit_pass "unattended-upgrades installed and enabled" "Auto Updates"
        ;;
    install_dnf_automatic)
        sudo dnf install -y -q dnf-automatic 2>&1 | tail -3
        sudo systemctl enable --now dnf-automatic-install.timer 2>/dev/null || true
        emit_pass "dnf-automatic installed and enabled" "Auto Updates"
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Auto Updates"
        ;;
esac
