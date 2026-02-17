#!/bin/bash
# ============================================================================
# Clawkeeper Check: Linux User Account
# Detects whether running as root and checks docker group membership.
# User creation is interactive (password input) so we emit FAIL with
# instructions rather than a prompt.
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

emit_info "OpenClaw should run under a non-root user to limit blast radius."

current_user=$(whoami)

if [ "$current_user" = "root" ]; then
    emit_warn "You are running as root"
    emit_info "A compromised agent running as root has full system access."

    if id "openclaw" &>/dev/null; then
        emit_info "A dedicated 'openclaw' user already exists."
        emit_info "Switch to it: su - openclaw"
        emit_fail "Running as root (switch to 'openclaw' user)" "User Account"
    else
        emit_info "To create a dedicated 'openclaw' user, run the following manually:"
        if getent group docker &>/dev/null; then
            emit_info "  useradd -m -s /bin/bash -G docker openclaw"
        else
            emit_info "  useradd -m -s /bin/bash openclaw"
        fi
        emit_info "  passwd openclaw"
        emit_info "Then grant sudo access:"
        emit_info "  echo 'openclaw ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/openclaw"
        emit_info "  chmod 440 /etc/sudoers.d/openclaw"
        emit_info "Create OpenClaw directories:"
        emit_info "  mkdir -p /home/openclaw/.openclaw/workspace"
        emit_info "  chown -R openclaw:openclaw /home/openclaw/.openclaw"
        emit_info "Then switch to the new user: su - openclaw"
        emit_fail "Running as root (create a dedicated 'openclaw' user)" "User Account"
    fi
else
    emit_pass "Running as non-root user: $current_user" "User Account"

    # Check docker group membership if Docker is available
    if command -v docker &>/dev/null; then
        if groups "$current_user" 2>/dev/null | grep -qw "docker"; then
            emit_pass "User is in 'docker' group" "Docker Group"
        else
            emit_warn "User is not in 'docker' group (needed for Docker deployment)"
            emit_info "To add yourself: sudo usermod -aG docker $current_user"
            emit_info "Log out and back in for group membership to take effect."
        fi
    fi
fi
