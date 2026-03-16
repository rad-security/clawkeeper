#!/bin/bash
# ============================================================================
# Clawkeeper Check: NanoClaw Container Hardening
# Audits NanoClaw container security settings: non-root execution,
# capabilities, resource limits, read-only rootfs, Docker Sandboxes.
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

# ---------- Check for Docker ----------
if ! command -v docker &>/dev/null; then
    emit_info "Docker not installed — skipping container hardening checks"
    emit_info "NanoClaw requires Docker or Apple Container for isolation"
    exit 0
fi

if ! docker info &>/dev/null 2>&1; then
    emit_info "Docker daemon not running — skipping container hardening checks"
    exit 0
fi

# ---------- Find NanoClaw agent containers ----------
nc_containers=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -iE "nanoclaw|nc-agent" || true)

if [ -z "$nc_containers" ]; then
    emit_info "No running NanoClaw agent containers found"
    emit_info "Container hardening will be verified when agents run"
    exit 0
fi

emit_info "Auditing NanoClaw container security:"

for container in $nc_containers; do
    emit_info "Checking container: $container"
    
    # ---------- Check 1: Running as non-root ----------
    container_user=$(docker exec "$container" id -u 2>/dev/null || echo "unknown")
    if [ "$container_user" = "0" ]; then
        emit_fail "Container $container is running as ROOT (uid 0)" "Container User"
    elif [ "$container_user" = "unknown" ]; then
        emit_warn "Could not determine user for container $container"
    elif [ "$container_user" = "1000" ]; then
        emit_pass "Container $container running as node user (uid: 1000)" "Container User"
    else
        emit_pass "Container $container running as non-root (uid: $container_user)" "Container User"
    fi
    
    # ---------- Check 2: Capabilities ----------
    cap_drop=$(docker inspect --format='{{.HostConfig.CapDrop}}' "$container" 2>/dev/null || echo "")
    if echo "$cap_drop" | grep -qi "all"; then
        emit_pass "All capabilities dropped for $container" "Capabilities"
    else
        emit_warn "Capabilities not fully dropped for $container"
        emit_fail "Add cap_drop: ALL to container configuration" "Capabilities"
    fi
    
    # ---------- Check 3: no-new-privileges ----------
    no_new_priv=$(docker inspect --format='{{index .HostConfig.SecurityOpt}}' "$container" 2>/dev/null || echo "")
    if echo "$no_new_priv" | grep -qi "no-new-privileges"; then
        emit_pass "no-new-privileges set for $container" "No New Privileges"
    else
        emit_fail "no-new-privileges not set for $container" "No New Privileges"
    fi
    
    # ---------- Check 4: Resource limits ----------
    mem_limit=$(docker inspect --format='{{.HostConfig.Memory}}' "$container" 2>/dev/null || echo "0")
    if [ "$mem_limit" -gt 0 ] 2>/dev/null; then
        mem_mb=$((mem_limit / 1024 / 1024))
        emit_pass "Memory limit set for $container (${mem_mb}MB)" "Memory Limit"
    else
        emit_fail "No memory limit set for $container — runaway agent risk" "Memory Limit"
    fi
    
    cpu_limit=$(docker inspect --format='{{.HostConfig.NanoCpus}}' "$container" 2>/dev/null || echo "0")
    if [ "$cpu_limit" -gt 0 ] 2>/dev/null; then
        emit_pass "CPU limit set for $container" "CPU Limit"
    else
        emit_fail "No CPU limit set for $container" "CPU Limit"
    fi
    
    # ---------- Check 5: Read-only rootfs ----------
    readonly_fs=$(docker inspect --format='{{.HostConfig.ReadonlyRootfs}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$readonly_fs" = "true" ]; then
        emit_pass "Root filesystem is read-only for $container" "Read-Only FS"
    else
        emit_warn "Root filesystem is writable for $container"
        emit_info "Consider adding read_only: true for defense-in-depth"
    fi
done

# ---------- Check for Docker Sandboxes ----------
emit_info "Checking Docker Sandboxes availability:"

# Check for Docker Desktop with Sandboxes support
if docker info 2>/dev/null | grep -qi "sandbox"; then
    emit_pass "Docker Sandboxes available (hypervisor-level isolation)" "Docker Sandboxes"
    emit_info "NanoClaw agents can run with enhanced microVM isolation"
else
    # Check platform for Sandboxes support
    platform=$(uname -s)
    arch=$(uname -m)
    
    if [ "$platform" = "Darwin" ] && [ "$arch" = "arm64" ]; then
        emit_info "macOS Apple Silicon detected — Docker Sandboxes supported"
        emit_info "Enable in Docker Desktop settings for hypervisor isolation"
    elif [ "$platform" = "Linux" ]; then
        emit_info "Docker Sandboxes for Linux coming soon (Q2 2026)"
        emit_info "Using standard container isolation"
    else
        emit_info "Docker Sandboxes not available on this platform"
    fi
fi

# ---------- Check for Apple Container (macOS alternative) ----------
if [ "$(uname -s)" = "Darwin" ]; then
    if command -v container &>/dev/null || [ -d "/Library/Apple/System/Library/Sandbox" ]; then
        emit_info "Apple Container/Sandbox available as alternative isolation"
    fi
fi
