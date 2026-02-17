#!/bin/bash
# ============================================================================
# Clawkeeper Check: Docker Desktop
# Detects whether Docker is installed, running, and has reasonable settings.
# Includes harden_docker_desktop sub-checks when Docker is running.
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

emit_info "Container isolation is the most impactful security improvement for OpenClaw."

# --- Docker Desktop hardening sub-check -------------------------------------
# Called when Docker is installed and running.
harden_docker_desktop() {
    local docker_settings="$HOME/Library/Group Containers/group.com.docker/settings.json"

    if [ ! -f "$docker_settings" ]; then
        emit_info "Docker Desktop settings file not found — using defaults"
        return
    fi

    local issues=()

    # Check telemetry
    if grep -q '"analyticsEnabled".*true' "$docker_settings" 2>/dev/null; then
        issues+=("telemetry")
    fi

    # Check resource limits (warn if very high or unlimited)
    local mem_limit
    mem_limit=$(grep -o '"memoryMiB"[[:space:]]*:[[:space:]]*[0-9]*' "$docker_settings" 2>/dev/null | grep -o '[0-9]*' || echo "0")
    if [ "$mem_limit" -gt 8192 ] 2>/dev/null; then
        issues+=("memory")
    fi

    local cpu_limit
    cpu_limit=$(grep -o '"cpus"[[:space:]]*:[[:space:]]*[0-9]*' "$docker_settings" 2>/dev/null | grep -o '[0-9]*' || echo "0")
    if [ "$cpu_limit" -gt 4 ] 2>/dev/null; then
        issues+=("cpu")
    fi

    if [ ${#issues[@]} -eq 0 ]; then
        emit_pass "Docker Desktop settings look reasonable" "Docker Settings"
        return
    fi

    # Report individual issues
    for issue in "${issues[@]}"; do
        case "$issue" in
            telemetry)
                emit_warn "Docker Desktop analytics/telemetry is enabled"
                emit_info "Disable: Docker Desktop -> Settings -> General -> uncheck 'Send usage statistics'"
                ;;
            memory)
                emit_warn "Docker memory limit is high (${mem_limit}MB)"
                emit_info "Recommend 4096MB max: Docker Desktop -> Settings -> Resources -> Memory"
                ;;
            cpu)
                emit_warn "Docker CPU limit is high (${cpu_limit} CPUs)"
                emit_info "Recommend 2 CPUs max: Docker Desktop -> Settings -> Resources -> CPUs"
                ;;
        esac
    done

    emit_fail "Docker Desktop settings need hardening (adjust manually in Docker Desktop -> Settings)" "Docker Settings"
}

# --- Main Docker check -------------------------------------------------------

if command -v docker &>/dev/null; then
    if docker info &>/dev/null; then
        emit_pass "Docker is installed and running" "Docker"
        harden_docker_desktop
        exit 0
    else
        # Docker installed but not running
        emit_warn "Docker is installed but not running"
        emit_info "Open Docker Desktop from Applications to start it."
        emit_prompt "Attempt to start Docker Desktop?" "start_docker" \
            "Docker not running" \
            "Docker left stopped"
        exit 0
    fi
fi

# Docker not installed
emit_warn "Docker is not installed"

if ! command -v brew &>/dev/null; then
    emit_fail "Docker not installed (install Homebrew first)" "Docker"
    exit 0
fi

emit_prompt "Install Docker Desktop via Homebrew?" "install_docker" \
    "Docker not installed" \
    "Docker not installed"
