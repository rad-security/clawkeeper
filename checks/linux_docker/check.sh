#!/bin/bash
# ============================================================================
# Clawkeeper Check: Linux Docker Engine
# Detects Docker installation, running status, and Compose plugin.
# Offers to start the service or install Docker from get.docker.com.
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

emit_info "Docker provides container isolation for OpenClaw."

if command -v docker &>/dev/null; then
    if docker info &>/dev/null 2>&1; then
        docker_version=$(docker --version 2>/dev/null | head -1 || echo "unknown")
        emit_pass "Docker is installed and running ($docker_version)" "Docker"

        # Check Docker Compose
        if docker compose version &>/dev/null 2>&1; then
            compose_ver=$(docker compose version --short 2>/dev/null || echo "unknown")
            emit_info "Docker Compose $compose_ver available"
        else
            emit_warn "Docker Compose plugin not found"
            emit_info "Install: sudo apt-get install docker-compose-plugin"
        fi
        exit 0
    else
        emit_warn "Docker is installed but not running or accessible"
        emit_prompt "Start Docker service?" "start_docker" \
            "Docker not running" \
            "Docker not started"
        exit 0
    fi
fi

# Docker not installed at all
emit_warn "Docker is not installed"
emit_prompt "Install Docker Engine via official script?" "install_docker" \
    "Docker not installed" \
    "Docker not installed"
