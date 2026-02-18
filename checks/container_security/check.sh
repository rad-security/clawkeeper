#!/bin/bash
# ============================================================================
# Clawkeeper Check: Container Security Audit
# Audits a running OpenClaw Docker container for: user (non-root),
# capabilities (cap_drop ALL), privileged mode, no-new-privileges,
# read-only root filesystem, port binding, resource limits (memory/CPU),
# network mode, Bonjour env var, and volume mounts.
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

# ---------- Check if OpenClaw container is running ----------
if ! command -v docker &>/dev/null; then
    emit_info "Docker not installed — skipping container audit"
    exit 0
fi

if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^openclaw$"; then
    emit_info "OpenClaw container is not running — skipping container audit"
    exit 0
fi

emit_info "Auditing running container:"

# ---------- Check 1: Running as non-root ----------
container_user=$(docker exec openclaw id -u 2>/dev/null || echo "unknown")
if [ "$container_user" = "0" ]; then
    emit_fail "Container is running as ROOT (uid 0)" "Container User"
elif [ "$container_user" = "unknown" ]; then
    emit_warn "Could not determine container user"
else
    emit_pass "Container running as non-root (uid: $container_user)" "Container User"
fi

# ---------- Check 2: Capabilities ----------
cap_info=$(docker inspect --format='{{.HostConfig.CapDrop}}' openclaw 2>/dev/null || echo "")
if echo "$cap_info" | grep -qi "all"; then
    emit_pass "All capabilities dropped (cap_drop: ALL)" "Capabilities"
else
    emit_fail "Capabilities not fully dropped — add cap_drop: ALL" "Capabilities"
fi

cap_add=$(docker inspect --format='{{.HostConfig.CapAdd}}' openclaw 2>/dev/null || echo "")
if echo "$cap_add" | grep -qi "NET_BIND_SERVICE" && [ "$(echo "$cap_add" | tr -cd ',' | wc -c)" -le 0 ]; then
    emit_pass "Only NET_BIND_SERVICE capability added back" "Cap Add"
elif [ -z "$cap_add" ] || echo "$cap_add" | grep -q "\[\]"; then
    emit_pass "No extra capabilities added" "Cap Add"
else
    emit_warn "Additional capabilities added: $cap_add"
    emit_fail "Minimize added capabilities — only NET_BIND_SERVICE should be needed" "Cap Add"
fi

# ---------- Check 3: Privileged mode ----------
privileged=$(docker inspect --format='{{.HostConfig.Privileged}}' openclaw 2>/dev/null || echo "unknown")
if [ "$privileged" = "false" ]; then
    emit_pass "Container is NOT privileged" "Privileged Mode"
elif [ "$privileged" = "true" ]; then
    emit_fail "CRITICAL: Container is running in PRIVILEGED mode" "Privileged Mode"
    emit_info "Remove --privileged immediately — this gives full host access"
fi

# ---------- Check 4: no-new-privileges ----------
no_new_priv=$(docker inspect --format='{{index .HostConfig.SecurityOpt}}' openclaw 2>/dev/null || echo "")
if echo "$no_new_priv" | grep -qi "no-new-privileges"; then
    emit_pass "no-new-privileges is set" "No New Privileges"
else
    emit_fail "no-new-privileges not set — add security_opt: no-new-privileges:true" "No New Privileges"
fi

# ---------- Check 5: Read-only root filesystem ----------
readonly_fs=$(docker inspect --format='{{.HostConfig.ReadonlyRootfs}}' openclaw 2>/dev/null || echo "unknown")
if [ "$readonly_fs" = "true" ]; then
    emit_pass "Root filesystem is read-only" "Read-Only FS"
else
    emit_fail "Root filesystem is writable — add read_only: true to compose" "Read-Only FS"
fi

# ---------- Check 6: Port binding ----------
port_bindings=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{$p}}={{(index $conf 0).HostIp}}:{{(index $conf 0).HostPort}} {{end}}' openclaw 2>/dev/null || echo "")

port_ok=true
if echo "$port_bindings" | grep -q "0.0.0.0"; then
    emit_fail "CRITICAL: Ports bound to 0.0.0.0 (all interfaces)" "Port Binding"
    emit_info "Change to 127.0.0.1:<port>:<port> in docker-compose.yml"
    port_ok=false
fi
if [ "$port_ok" = true ] && [ -n "$port_bindings" ]; then
    emit_pass "All ports bound to localhost only" "Port Binding"
fi

# ---------- Check 7: Resource limits ----------
mem_limit=$(docker inspect --format='{{.HostConfig.Memory}}' openclaw 2>/dev/null || echo "0")
if [ "$mem_limit" -gt 0 ] 2>/dev/null; then
    mem_mb=$((mem_limit / 1024 / 1024))
    emit_pass "Memory limit set (${mem_mb}MB)" "Memory Limit"
else
    emit_fail "No memory limit set — container can consume all host memory" "Memory Limit"
fi

cpu_limit=$(docker inspect --format='{{.HostConfig.NanoCpus}}' openclaw 2>/dev/null || echo "0")
if [ "$cpu_limit" -gt 0 ] 2>/dev/null; then
    cpu_cores=$((cpu_limit / 1000000000))
    emit_pass "CPU limit set (~${cpu_cores} cores)" "CPU Limit"
else
    emit_fail "No CPU limit set — runaway agent can consume all CPUs" "CPU Limit"
fi

# ---------- Check 8: Network mode ----------
net_mode=$(docker inspect --format='{{.HostConfig.NetworkMode}}' openclaw 2>/dev/null || echo "unknown")
if [ "$net_mode" = "host" ]; then
    emit_fail "CRITICAL: Container using host network mode — no network isolation" "Network Mode"
else
    emit_pass "Container using isolated network ($net_mode)" "Network Mode"
fi

# ---------- Check 9: Bonjour environment variable ----------
bonjour_disabled=$(docker exec openclaw printenv OPENCLAW_DISABLE_BONJOUR 2>/dev/null || echo "")
if [ "$bonjour_disabled" = "1" ]; then
    emit_pass "OPENCLAW_DISABLE_BONJOUR=1 is set" "Container Bonjour"
else
    emit_fail "OPENCLAW_DISABLE_BONJOUR not set in container environment" "Container Bonjour"
fi

# ---------- Check 10: Volume mounts — warn on sensitive paths ----------
mounts=$(docker inspect --format='{{range .Mounts}}{{.Source}}:{{.Destination}}:{{.Mode}} {{end}}' openclaw 2>/dev/null || echo "")

mount_issue=false
for sensitive_path in "/etc" "/var" "/root" "/Users" "/home"; do
    if echo "$mounts" | grep -q "^${sensitive_path}:"; then
        emit_warn "Sensitive host path mounted: $sensitive_path"
        mount_issue=true
    fi
done

if [ "$mount_issue" = false ]; then
    emit_pass "No sensitive host paths mounted" "Volume Mounts"
else
    emit_fail "Sensitive host paths are mounted into the container" "Volume Mounts"
fi
