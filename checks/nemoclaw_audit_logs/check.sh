#!/bin/bash
# ============================================================================
# Clawkeeper Check: NemoClaw Audit Logging
# Verifies NemoClaw audit logging is enabled for compliance and security
# monitoring. Checks log configuration, rotation, and permissions.
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

emit_info "Checking NemoClaw audit logging configuration..."

# Possible audit log locations
audit_dirs=(
    "$HOME/.nemo/nemoclaw/audit"
    "$HOME/.nemo/audit"
    "$HOME/.config/nemoclaw/audit"
    "/var/log/nemoclaw"
)

# Possible config locations
config_files=(
    "$HOME/.nemo/nemoclaw/config.yml"
    "$HOME/.nemo/guardrails/config.yml"
    "$HOME/.config/nemoclaw/config.yml"
)

audit_dir=""
config_file=""

for dir in "${audit_dirs[@]}"; do
    if [ -d "$dir" ]; then
        audit_dir="$dir"
        break
    fi
done

for cfg in "${config_files[@]}"; do
    if [ -f "$cfg" ]; then
        config_file="$cfg"
        break
    fi
done

if [ -z "$config_file" ] && [ -z "$audit_dir" ]; then
    emit_info "No NemoClaw configuration or audit directory found"
    emit_info "Skipping audit logging checks"
    exit 0
fi

# ---------- Check for audit directory ----------
if [ -n "$audit_dir" ]; then
    emit_info "Audit directory found: $audit_dir"
    
    # Check directory permissions
    dir_perms=$(stat -f "%OLp" "$audit_dir" 2>/dev/null || stat -c "%a" "$audit_dir" 2>/dev/null || echo "unknown")
    if [ "$dir_perms" = "700" ] || [ "$dir_perms" = "750" ]; then
        emit_pass "Audit directory permissions are secure ($dir_perms)" "Audit Dir Permissions"
    else
        emit_warn "Audit directory permissions are $dir_perms (recommend 700 or 750)"
    fi
    
    # Count audit log files
    log_count=$(find "$audit_dir" -name "*.log" -o -name "*.json" 2>/dev/null | wc -l)
    if [ "$log_count" -gt 0 ]; then
        emit_pass "Found $log_count audit log file(s)" "Audit Logs Present"
        
        # Check most recent log age
        newest_log=$(find "$audit_dir" -type f \( -name "*.log" -o -name "*.json" \) -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)
        if [ -n "$newest_log" ]; then
            log_age_hours=$(( ($(date +%s) - $(stat -f "%m" "$newest_log" 2>/dev/null || stat -c "%Y" "$newest_log" 2>/dev/null || echo "0")) / 3600 ))
            if [ "$log_age_hours" -lt 24 ]; then
                emit_pass "Recent audit activity (within 24 hours)" "Audit Activity"
            else
                emit_info "Most recent audit log is $log_age_hours hours old"
            fi
        fi
    else
        emit_warn "No audit log files found in $audit_dir"
    fi
else
    emit_warn "No audit directory found"
    emit_info "Create audit directory at ~/.nemo/nemoclaw/audit"
fi

# ---------- Check config for audit settings ----------
if [ -n "$config_file" ]; then
    emit_info "Checking audit configuration in $config_file..."
    
    # Check for audit/logging configuration
    if grep -qiE "audit:|logging:" "$config_file" 2>/dev/null; then
        emit_pass "Audit/logging section found in config" "Audit Config"
        
        # Check for specific audit settings
        if grep -qiE "enabled:[[:space:]]*true|audit_enabled" "$config_file" 2>/dev/null; then
            emit_pass "Audit logging is enabled" "Audit Enabled"
        else
            emit_warn "Audit logging may not be explicitly enabled"
        fi
        
        # Check for verbose/detailed logging
        if grep -qiE "verbose|detailed|level:[[:space:]]*(debug|trace)" "$config_file" 2>/dev/null; then
            emit_info "Verbose/detailed logging configured"
        fi
        
        # Check for log rotation
        if grep -qiE "rotation|max_size|max_files|rotate" "$config_file" 2>/dev/null; then
            emit_pass "Log rotation configured" "Log Rotation"
        else
            emit_warn "Log rotation not configured — logs may grow unbounded"
        fi
    else
        emit_fail "No audit/logging configuration found" "Audit Config"
        emit_info "Add 'audit:' or 'logging:' section to enable audit trails"
    fi
fi

# ---------- Check for LangSmith/observability integration ----------
emit_info "Checking observability integrations..."

langsmith_configured=false
if [ -n "${LANGCHAIN_API_KEY:-}" ] || [ -n "${LANGSMITH_API_KEY:-}" ]; then
    langsmith_configured=true
    emit_pass "LangSmith API key configured (tracing enabled)" "LangSmith"
fi

if [ -n "$config_file" ] && grep -qiE "langsmith|langchain|tracing" "$config_file" 2>/dev/null; then
    langsmith_configured=true
    emit_info "LangSmith/tracing configuration found in config"
fi

if [ "$langsmith_configured" = false ]; then
    emit_info "LangSmith not configured (optional but recommended for enterprise)"
    emit_info "NVIDIA NeMo Agent Toolkit supports native LangSmith integration"
fi

# ---------- Enterprise compliance checks ----------
emit_info "Enterprise compliance considerations:"

# Check for data retention settings
if [ -n "$config_file" ] && grep -qiE "retention|expire|ttl" "$config_file" 2>/dev/null; then
    emit_pass "Data retention settings configured" "Data Retention"
else
    emit_info "No data retention policy configured"
    emit_info "Consider adding retention settings for compliance (GDPR, SOC2)"
fi

# Check for encryption at rest
if [ -n "$audit_dir" ]; then
    if mount | grep -q "$(dirname "$audit_dir").*encrypted\|luks\|ecryptfs"; then
        emit_pass "Audit directory appears to be on encrypted storage" "Encryption at Rest"
    else
        emit_info "Audit directory encryption status unknown"
        emit_info "Ensure audit logs are stored on encrypted volumes for compliance"
    fi
fi
