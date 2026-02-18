#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Linux Docker Engine
# Handles starting the Docker service or installing Docker from get.docker.com.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    start_docker)
        emit_info "Starting Docker service..."
        sudo systemctl start docker 2>/dev/null
        sudo systemctl enable docker 2>/dev/null

        if docker info &>/dev/null 2>&1; then
            emit_pass "Docker service started and enabled" "Docker"
        else
            emit_fail "Docker could not be started — check: sudo journalctl -u docker" "Docker"
            exit 1
        fi
        ;;
    install_docker)
        emit_info "Installing Docker Engine (this may take a minute)..."
        curl -fsSL https://get.docker.com | sudo sh 2>&1 | tail -10 || {
            emit_fail "Docker installation failed" "Docker"
            exit 1
        }

        # Add current user to docker group
        current_user=$(whoami)
        if [ "$current_user" != "root" ]; then
            sudo usermod -aG docker "$current_user" 2>/dev/null || true
            emit_info "Added $current_user to docker group (log out/in to take effect)"
        fi

        sudo systemctl enable --now docker 2>/dev/null || true

        if docker info &>/dev/null 2>&1 || sudo docker info &>/dev/null 2>&1; then
            emit_pass "Docker Engine installed and running" "Docker"
        else
            emit_warn "Docker installed — you may need to log out and back in"
            emit_info "Then verify with: docker info"
            emit_pass "Docker Engine installed (re-login may be required)" "Docker"
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Docker"
        ;;
esac
