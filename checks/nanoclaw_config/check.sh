#!/bin/bash
# ============================================================================
# Clawkeeper Check: NanoClaw Mount Allowlist Audit
# Audits ~/.config/nanoclaw directory permissions, mount-allowlist.json
# permissions, blocked paths, and security settings.
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

config_dir="$HOME/.config/nanoclaw"
allowlist_file="$config_dir/mount-allowlist.json"

# ---------- Check config directory exists ----------
if [ ! -d "$config_dir" ]; then
    emit_info "No NanoClaw config directory found (~/.config/nanoclaw)"
    emit_info "This is expected if NanoClaw isn't installed yet. Skipping config checks."
    exit 0
fi

# ---------- Check directory permissions ----------
dir_perms=$(stat -f "%OLp" "$config_dir" 2>/dev/null || stat -c "%a" "$config_dir" 2>/dev/null || echo "unknown")
if [ "$dir_perms" = "700" ]; then
    emit_pass "Config directory permissions are 700 (owner-only)" "Config Permissions"
else
    emit_prompt "Config directory permissions are $dir_perms — fix to 700?" \
        "fix_nanoclaw_config_dir_perms" \
        "Config directory permissions are $dir_perms (should be 700)" \
        "Config directory permissions not changed"
fi

# ---------- Check mount-allowlist.json exists ----------
if [ ! -f "$allowlist_file" ]; then
    emit_warn "No mount-allowlist.json found"
    emit_fail "Mount allowlist not configured — NanoClaw may use permissive defaults" "Mount Allowlist"
    exit 0
fi

# ---------- Check allowlist file permissions ----------
file_perms=$(stat -f "%OLp" "$allowlist_file" 2>/dev/null || stat -c "%a" "$allowlist_file" 2>/dev/null || echo "unknown")
if [ "$file_perms" = "600" ]; then
    emit_pass "Mount allowlist permissions are 600" "Allowlist Permissions"
else
    emit_prompt "Mount allowlist permissions are $file_perms — fix to 600?" \
        "fix_nanoclaw_allowlist_perms" \
        "Mount allowlist permissions are $file_perms (should be 600)" \
        "Allowlist permissions not changed"
fi

emit_info "Mount allowlist audit:"

# ---------- Check for required blocked paths ----------
required_blocked=(
    ".ssh"
    ".gnupg"
    ".aws"
    ".env"
    "credentials"
    "private_key"
    "id_rsa"
    "id_ed25519"
)

missing_blocks=()
for path in "${required_blocked[@]}"; do
    if ! grep -q "\"$path\"" "$allowlist_file" 2>/dev/null; then
        missing_blocks+=("$path")
    fi
done

if [ ${#missing_blocks[@]} -eq 0 ]; then
    emit_pass "All sensitive paths blocked in allowlist" "Blocked Paths"
else
    emit_fail "Missing blocked paths: ${missing_blocks[*]}" "Blocked Paths"
    emit_info "Add these to the blocklist in mount-allowlist.json"
fi

# ---------- Check for overly permissive mounts ----------
if grep -qE '"\/"[[:space:]]*:|"\/home"[[:space:]]*:' "$allowlist_file" 2>/dev/null; then
    emit_fail "CRITICAL: Root (/) or /home is in mount allowlist — too permissive" "Mount Scope"
elif grep -qE '"\/Users"[[:space:]]*:' "$allowlist_file" 2>/dev/null; then
    emit_fail "CRITICAL: /Users is in mount allowlist — too permissive" "Mount Scope"
else
    emit_pass "No overly permissive mount paths detected" "Mount Scope"
fi

# ---------- Check nonMainReadOnly setting ----------
if grep -q '"nonMainReadOnly"[[:space:]]*:[[:space:]]*true' "$allowlist_file" 2>/dev/null; then
    emit_pass "nonMainReadOnly enabled (non-main groups get read-only access)" "Read-Only Mode"
else
    emit_warn "nonMainReadOnly not enabled"
    emit_fail "Enable nonMainReadOnly for defense-in-depth" "Read-Only Mode"
    emit_info "This restricts non-main channel groups to read-only filesystem access"
fi

# ---------- Check for plaintext secrets ----------
if grep -qiE "(sk-ant-|sk-|api_key|password|secret)" "$allowlist_file" 2>/dev/null; then
    emit_fail "CRITICAL: Possible secrets found in mount-allowlist.json" "Credential Exposure"
else
    emit_pass "No plaintext secrets in allowlist file" "Credential Exposure"
fi
