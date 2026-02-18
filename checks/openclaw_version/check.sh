#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw Version & CVE Check
# Detects installed OpenClaw version and checks against known vulnerabilities.
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

# --- Known vulnerable versions ---
# Format: "max_affected_version|CVE|severity|description"
# All versions BEFORE 2026.1.29 are affected by these CVEs
KNOWN_CVES=(
    "2026.1.28|CVE-2026-24763|HIGH|Gateway authentication bypass via crafted request"
    "2026.1.28|CVE-2026-25253|HIGH|1-click RCE: WebSocket gatewayUrl token leak from query string"
)

# Minimum safe version
MIN_SAFE_VERSION="2026.1.29"

# --- Detect OpenClaw version ---
oc_version=""
if command -v openclaw &>/dev/null; then
    oc_version=$(openclaw --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
elif command -v npx &>/dev/null; then
    oc_version=$(npx openclaw --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
fi

if [ -z "$oc_version" ]; then
    emit_skipped "OpenClaw not detected — version check skipped" "OpenClaw Version"
    exit 0
fi

emit_info "Detected OpenClaw version: $oc_version"

# --- Version comparison helper ---
# Returns 0 if $1 <= $2 (version A is less than or equal to version B)
version_lte() {
    local IFS='.'
    local -a a=($1) b=($2)
    local i
    for ((i=0; i<3; i++)); do
        local va=${a[$i]:-0}
        local vb=${b[$i]:-0}
        if (( va < vb )); then return 0; fi
        if (( va > vb )); then return 1; fi
    done
    return 0  # equal
}

version_lt() {
    local IFS='.'
    local -a a=($1) b=($2)
    local i
    for ((i=0; i<3; i++)); do
        local va=${a[$i]:-0}
        local vb=${b[$i]:-0}
        if (( va < vb )); then return 0; fi
        if (( va > vb )); then return 1; fi
    done
    return 1  # equal means not less-than
}

# --- Check against known CVEs ---
vuln_count=0
for entry in "${KNOWN_CVES[@]}"; do
    IFS='|' read -r max_affected cve severity description <<< "$entry"
    if version_lte "$oc_version" "$max_affected"; then
        emit_fail "CRITICAL: $cve ($severity) — $description [fixed in $MIN_SAFE_VERSION]" "CVE: $cve"
        vuln_count=$((vuln_count + 1))
    fi
done

if [ "$vuln_count" -eq 0 ]; then
    emit_pass "OpenClaw $oc_version has no known CVEs" "OpenClaw Version"
else
    emit_warn "Found $vuln_count known CVE(s) — upgrade to OpenClaw >= $MIN_SAFE_VERSION"
    emit_info "Run: npm install -g openclaw@latest"
fi

# --- Check if version is recent ---
# Warn if version is more than 3 major releases behind latest known
latest_known="2026.1.29"
if version_lt "$oc_version" "$latest_known"; then
    emit_warn "OpenClaw $oc_version may be outdated (latest known: $latest_known)"
fi
