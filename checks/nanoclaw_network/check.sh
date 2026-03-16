#!/bin/bash
# ============================================================================
# Clawkeeper Check: NanoClaw Network Egress
# Checks for network egress restrictions on NanoClaw containers.
# This addresses a KNOWN VULNERABILITY (GitHub Issue #458):
# Agent containers have unrestricted outbound network access, enabling
# data exfiltration, credential theft, and arbitrary payload download.
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

emit_info "Checking NanoClaw network egress restrictions..."
emit_warn "NOTE: Unrestricted network egress is a KNOWN NanoClaw vulnerability (Issue #458)"

# ---------- Check for Docker network restrictions ----------
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    # Check for NanoClaw containers
    nc_containers=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -iE "nanoclaw|nc-agent" || true)
    
    if [ -n "$nc_containers" ]; then
        for container in $nc_containers; do
            # Check network mode
            net_mode=$(docker inspect --format='{{.HostConfig.NetworkMode}}' "$container" 2>/dev/null || echo "unknown")
            
            if [ "$net_mode" = "none" ]; then
                emit_pass "Container $container has network disabled" "Network Isolation"
            elif [ "$net_mode" = "host" ]; then
                emit_fail "CRITICAL: Container $container using host network — no isolation" "Network Isolation"
            else
                emit_warn "Container $container has network access ($net_mode)"
                emit_info "This allows potential data exfiltration to attacker-controlled servers"
            fi
        done
    fi
fi

# ---------- Check for iptables egress rules ----------
has_egress_rules=false

if command -v iptables &>/dev/null; then
    # Check for rules targeting uid 1000 (node user in containers)
    if sudo iptables -L OUTPUT -n -v 2>/dev/null | grep -q "owner UID match 1000"; then
        has_egress_rules=true
        emit_info "Found iptables rules for container user (uid 1000)"
    fi
    
    # Check for rules targeting Docker networks
    if sudo iptables -L DOCKER-USER -n -v 2>/dev/null | grep -qE "DROP|REJECT"; then
        has_egress_rules=true
        emit_info "Found Docker network egress restrictions"
    fi
fi

if command -v nft &>/dev/null; then
    # Check nftables for egress rules
    if sudo nft list ruleset 2>/dev/null | grep -qE "uid 1000.*drop|docker.*drop"; then
        has_egress_rules=true
        emit_info "Found nftables egress restrictions"
    fi
fi

# ---------- Provide recommendations ----------
if [ "$has_egress_rules" = true ]; then
    emit_pass "Network egress restrictions detected" "Egress Control"
else
    emit_fail "No network egress restrictions found — data exfiltration risk" "Egress Control"
    emit_info ""
    emit_info "RECOMMENDED: Add iptables rules to restrict container network access:"
    emit_info ""
    emit_info "  # Allow only Anthropic API endpoints for uid 1000 (container user)"
    emit_info "  sudo iptables -A OUTPUT -m owner --uid-owner 1000 -d api.anthropic.com -j ACCEPT"
    emit_info "  sudo iptables -A OUTPUT -m owner --uid-owner 1000 -d statsig.anthropic.com -j ACCEPT"
    emit_info "  sudo iptables -A OUTPUT -m owner --uid-owner 1000 -j DROP"
    emit_info ""
    emit_info "Or use Docker network policies to restrict container egress."
fi

# ---------- Check for Docker network policies ----------
if command -v docker &>/dev/null; then
    # Check for custom bridge networks with internal flag
    internal_nets=$(docker network ls --filter "driver=bridge" --format '{{.Name}}' 2>/dev/null | while read -r net; do
        if docker network inspect "$net" --format '{{.Internal}}' 2>/dev/null | grep -q "true"; then
            echo "$net"
        fi
    done)
    
    if [ -n "$internal_nets" ]; then
        emit_info "Found internal Docker networks (no external access): $internal_nets"
    fi
fi

# ---------- Additional warning ----------
emit_info ""
emit_warn "Without egress restrictions, compromised agents can:"
emit_info "  • Exfiltrate mounted filesystem data"
emit_info "  • Steal API credentials (ANTHROPIC_API_KEY)"
emit_info "  • Download and execute arbitrary payloads"
emit_info "  • Scan internal networks"
