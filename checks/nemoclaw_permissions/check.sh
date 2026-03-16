#!/bin/bash
# ============================================================================
# Clawkeeper Check: NemoClaw Permissions & RBAC
# Verifies NemoClaw role-based access control, tool permissions, and
# privilege separation for enterprise deployments.
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

emit_info "Checking NemoClaw permissions and access control..."

# Possible config locations
config_files=(
    "$HOME/.nemo/nemoclaw/config.yml"
    "$HOME/.nemo/guardrails/config.yml"
    "$HOME/.config/nemoclaw/config.yml"
    "./config.yml"
)

config_file=""
for cfg in "${config_files[@]}"; do
    if [ -f "$cfg" ]; then
        config_file="$cfg"
        break
    fi
done

if [ -z "$config_file" ]; then
    emit_info "No NemoClaw configuration found"
    emit_info "Skipping permissions checks"
    exit 0
fi

emit_info "Analyzing configuration: $config_file"

# ---------- Check for RBAC/permissions configuration ----------
emit_info "Checking role-based access control..."

if grep -qiE "roles:|permissions:|rbac:|access[_-]?control:" "$config_file" 2>/dev/null; then
    emit_pass "RBAC/permissions section found in config" "RBAC Config"
    
    # Check for role definitions
    if grep -qiE "admin|operator|viewer|readonly|user" "$config_file" 2>/dev/null; then
        emit_pass "Role definitions found" "Role Definitions"
    else
        emit_warn "No explicit role definitions found"
    fi
else
    emit_warn "No RBAC/permissions configuration found"
    emit_info "Consider adding role-based access control for enterprise deployments"
fi

# ---------- Check tool/action permissions ----------
emit_info "Checking tool/action permissions..."

if grep -qiE "tools:|actions:|allowed[_-]?tools:|blocked[_-]?tools:" "$config_file" 2>/dev/null; then
    emit_pass "Tool permissions configuration found" "Tool Permissions"
    
    # Check for dangerous tool restrictions
    dangerous_tools=("shell" "exec" "file_write" "sudo" "system" "eval")
    unrestricted_dangerous=()
    
    for tool in "${dangerous_tools[@]}"; do
        # Check if tool is mentioned but not in a blocked/restricted context
        if grep -qiE "$tool" "$config_file" 2>/dev/null; then
            if ! grep -qiE "(block|disable|deny|restrict).*$tool|$tool.*(block|disable|deny|restrict)" "$config_file" 2>/dev/null; then
                unrestricted_dangerous+=("$tool")
            fi
        fi
    done
    
    if [ ${#unrestricted_dangerous[@]} -gt 0 ]; then
        emit_warn "Potentially dangerous tools not explicitly restricted: ${unrestricted_dangerous[*]}"
        emit_info "Consider adding explicit restrictions for shell/exec/system tools"
    else
        emit_pass "No unrestricted dangerous tools detected" "Dangerous Tools"
    fi
else
    emit_fail "No tool permissions configured — agents have unrestricted tool access" "Tool Permissions"
    emit_info "Add 'tools:' section to control which tools agents can invoke"
fi

# ---------- Check for privilege escalation prevention ----------
emit_info "Checking privilege escalation prevention..."

if grep -qiE "escalat|privilege|sudo|root|admin[_-]?mode" "$config_file" 2>/dev/null; then
    if grep -qiE "(prevent|block|disable|deny).*escalat|no[_-]?escalat" "$config_file" 2>/dev/null; then
        emit_pass "Privilege escalation prevention configured" "Privilege Escalation"
    else
        emit_warn "Privilege escalation mentioned but prevention not clear"
    fi
else
    emit_info "No explicit privilege escalation prevention"
    emit_info "Ensure agents cannot autonomously escalate privileges"
fi

# ---------- Check for data access controls ----------
emit_info "Checking data access controls..."

if grep -qiE "data[_-]?access:|file[_-]?access:|directory[_-]?access:|allowed[_-]?paths:" "$config_file" 2>/dev/null; then
    emit_pass "Data/file access controls configured" "Data Access"
    
    # Check for sensitive path blocking
    if grep -qiE "\.ssh|\.aws|\.gnupg|credentials|secrets" "$config_file" 2>/dev/null; then
        emit_pass "Sensitive paths mentioned in access config" "Sensitive Paths"
    else
        emit_warn "Sensitive paths not explicitly blocked"
    fi
else
    emit_warn "No data access controls configured"
    emit_info "Consider restricting which files/directories agents can access"
fi

# ---------- Check for multi-agent permissions ----------
emit_info "Checking multi-agent collaboration settings..."

if grep -qiE "multi[_-]?agent|collaboration|supervisor|worker|delegate" "$config_file" 2>/dev/null; then
    emit_pass "Multi-agent configuration found" "Multi-Agent"
    
    # Check for inter-agent permission controls
    if grep -qiE "inter[_-]?agent|agent[_-]?to[_-]?agent|delegation[_-]?policy" "$config_file" 2>/dev/null; then
        emit_pass "Inter-agent permission controls configured" "Agent Delegation"
    else
        emit_info "No explicit inter-agent permission controls"
        emit_info "Consider defining delegation policies for supervisor/worker agents"
    fi
else
    emit_info "No multi-agent collaboration configured"
fi

# ---------- Check execution rails for permission enforcement ----------
if grep -qiE "execution:|pre[_-]?action:|post[_-]?action:" "$config_file" 2>/dev/null; then
    emit_pass "Execution rails configured for runtime permission checks" "Execution Rails"
else
    emit_warn "No execution rails — tool calls not validated at runtime"
    emit_info "Add execution rails to enforce permissions before actions execute"
fi

# ---------- Summary recommendations ----------
emit_info ""
emit_info "Enterprise permission recommendations:"
emit_info "  1. Define explicit roles (admin, operator, viewer)"
emit_info "  2. Restrict dangerous tools (shell, exec, system)"
emit_info "  3. Block access to sensitive directories"
emit_info "  4. Configure execution rails for runtime enforcement"
emit_info "  5. Set delegation policies for multi-agent setups"
