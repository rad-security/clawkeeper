#!/bin/bash
# ============================================================================
# Clawkeeper Check: OpenClaw CVE Audit (Live Feed)
# Fetches the OpenClaw CVE feed from jgamblin/OpenClawCVEs and checks the
# installed version against all known vulnerabilities.
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

# --- CVE feed URLs ---
CVE_FEED_URL="https://raw.githubusercontent.com/jgamblin/OpenClawCVEs/main/cves.json"
GHSA_FEED_URL="https://raw.githubusercontent.com/jgamblin/OpenClawCVEs/main/ghsa-advisories.json"

# --- Detect OpenClaw version ---
oc_version=""
if command -v openclaw &>/dev/null; then
    oc_version=$(openclaw --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
elif command -v npx &>/dev/null; then
    oc_version=$(npx openclaw --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
fi

if [ -z "$oc_version" ]; then
    emit_skipped "OpenClaw not detected — CVE audit skipped" "CVE Audit"
    exit 0
fi

emit_info "Detected OpenClaw version: $oc_version"

# --- Fetch CVE feed into temp files ---
cve_tmp=$(mktemp)
ghsa_tmp=$(mktemp)
result_tmp=$(mktemp)
trap 'rm -f "$cve_tmp" "$ghsa_tmp" "$result_tmp"' EXIT

if command -v curl &>/dev/null; then
    curl -sf --connect-timeout 10 --max-time 30 "$CVE_FEED_URL" > "$cve_tmp" 2>/dev/null
    curl -sf --connect-timeout 10 --max-time 30 "$GHSA_FEED_URL" > "$ghsa_tmp" 2>/dev/null
elif command -v wget &>/dev/null; then
    wget -qO- --timeout=30 "$CVE_FEED_URL" > "$cve_tmp" 2>/dev/null
    wget -qO- --timeout=30 "$GHSA_FEED_URL" > "$ghsa_tmp" 2>/dev/null
fi

if [ ! -s "$cve_tmp" ]; then
    emit_skipped "Could not fetch CVE feed (no network or API unavailable)" "CVE Audit"
    exit 0
fi

# --- Use python3 to parse feed and check version ---
# python3 is pre-installed on macOS (since Catalina) and virtually all Linux distros
if ! command -v python3 &>/dev/null; then
    emit_skipped "python3 not available — CVE feed parsing skipped" "CVE Audit"
    exit 0
fi

# Python script reads JSON from temp files (avoids argument length limits)
# Outputs one line per result:
#   VULN|CVE-ID|SEVERITY|CVSS|DESCRIPTION|PACKAGES|FIX_VERSION
#   CLEAN  (if no vulnerabilities found)
#   ERROR|message  (if parsing failed)
python3 - "$cve_tmp" "$ghsa_tmp" "$oc_version" > "$result_tmp" 2>/dev/null <<'PYEOF'
import json, sys, re, os

def parse_version(v):
    try:
        parts = v.strip().split(".")
        return tuple(int(p) for p in parts[:3])
    except (ValueError, IndexError):
        return (0, 0, 0)

def check_constraint(installed, constraint):
    constraint = constraint.strip()
    m = re.match(r"^(<=?|>=?)\s*(\d+\.\d+\.\d+)", constraint)
    if not m:
        return False
    op, ver_str = m.group(1), m.group(2)
    target = parse_version(ver_str)
    if op == "<":
        return installed < target
    elif op == "<=":
        return installed <= target
    elif op == ">":
        return installed > target
    elif op == ">=":
        return installed >= target
    return False

def is_affected(installed, affected_versions):
    for constraint_group in affected_versions:
        parts = [c.strip() for c in constraint_group.split(",")]
        all_match = True
        for part in parts:
            if not check_constraint(installed, part):
                all_match = False
                break
        if all_match:
            return True
    return False

def extract_fix_version(affected_versions):
    for constraint_group in affected_versions:
        parts = [c.strip() for c in constraint_group.split(",")]
        for part in parts:
            m = re.match(r"^<[=]?\s*(\d+\.\d+\.\d+)", part)
            if m:
                return m.group(1)
    return "latest"

try:
    cve_file = sys.argv[1]
    ghsa_file = sys.argv[2]
    version_str = sys.argv[3]

    with open(cve_file, "r") as f:
        cve_data = json.load(f)
    try:
        with open(ghsa_file, "r") as f:
            ghsa_data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        ghsa_data = []
except Exception as e:
    print(f"ERROR|Failed to parse CVE feed: {e}")
    sys.exit(0)

installed = parse_version(version_str)

ghsa_map = {}
for g in ghsa_data:
    cve_id = g.get("cve_id", "")
    if cve_id:
        ghsa_map[cve_id] = g

vuln_count = 0
for cve in cve_data:
    cve_id = cve.get("cve_id", "")
    if not cve_id:
        continue
    advisory = ghsa_map.get(cve_id, {})
    affected = advisory.get("affected_versions", [])
    if not affected:
        continue
    if is_affected(installed, affected):
        severity = cve.get("severity", "MEDIUM").upper()
        cvss = cve.get("cvss", 0)
        title = cve.get("title", cve_id)
        packages = advisory.get("packages", [])
        pkg_str = ", ".join(packages) if packages else "openclaw"
        fix_ver = extract_fix_version(affected)
        title = title.replace("|", "-")
        print(f"VULN|{cve_id}|{severity}|{cvss}|{title}|{pkg_str}|{fix_ver}")
        vuln_count += 1

if vuln_count == 0:
    print("CLEAN")
PYEOF

audit_results=$(cat "$result_tmp")

if [ -z "$audit_results" ]; then
    emit_skipped "CVE feed parsing failed" "CVE Audit"
    exit 0
fi

# --- Process results ---
vuln_count=0
while IFS= read -r line; do
    case "$line" in
        CLEAN)
            emit_pass "OpenClaw $oc_version — no known CVEs in the security feed" "CVE Audit"
            ;;
        ERROR\|*)
            err_msg="${line#ERROR|}"
            emit_skipped "$err_msg" "CVE Audit"
            ;;
        VULN\|*)
            IFS='|' read -r _ cve_id severity cvss title packages fix_ver <<< "$line"
            vuln_count=$((vuln_count + 1))
            emit_fail "$severity ($cvss): $title — affects $packages [upgrade to >= $fix_ver]" "CVE: $cve_id"
            ;;
    esac
done <<< "$audit_results"

if [ "$vuln_count" -gt 0 ]; then
    emit_warn "Found $vuln_count CVE(s) affecting OpenClaw $oc_version"
    emit_info "Run: npm install -g openclaw@latest  (or update your Docker image)"
fi
