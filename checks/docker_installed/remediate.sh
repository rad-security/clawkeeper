#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Docker Desktop
# Handles starting Docker Desktop or installing it via Homebrew.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    start_docker)
        open -a "Docker" 2>/dev/null || true
        emit_info "Waiting for Docker to start (up to 60 seconds)..."

        waited=0
        while [ $waited -lt 60 ]; do
            if docker info &>/dev/null 2>&1; then
                emit_pass "Docker Desktop started" "Docker"
                exit 0
            fi
            sleep 5
            waited=$((waited + 5))
        done

        emit_fail "Docker did not start within 60 seconds — open it manually" "Docker"
        exit 1
        ;;
    install_docker)
        emit_info "Installing Docker Desktop (this may take a few minutes)..."

        brew install --cask docker 2>&1 | tail -5 || {
            emit_fail "Docker installation failed" "Docker"
            exit 1
        }

        emit_info "Opening Docker Desktop for first-time setup..."
        open -a "Docker" 2>/dev/null || true

        emit_info "Waiting for Docker to start (up to 90 seconds)..."
        waited=0
        while [ $waited -lt 90 ]; do
            if docker info &>/dev/null 2>&1; then
                emit_pass "Docker Desktop installed and running" "Docker"
                exit 0
            fi
            sleep 5
            waited=$((waited + 5))
        done

        emit_warn "Docker installed but may still be starting up"
        emit_info "Complete the Docker Desktop setup wizard, then re-run this script."
        emit_fail "Docker installed but not yet responsive" "Docker"
        exit 1
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Docker"
        ;;
esac
