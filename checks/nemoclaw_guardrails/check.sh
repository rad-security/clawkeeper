#!/bin/bash
# ============================================================================
# Clawkeeper Check: NemoClaw Guardrails Configuration
# Audits NeMo Guardrails config.yml for security rails: input validation,
# output filtering, jailbreak detection, PII masking, and fact checking.
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

# Possible guardrails config locations
guardrails_configs=(
    "$HOME/.nemo/guardrails/config.yml"
    "$HOME/.nemo/nemoclaw/guardrails/config.yml"
    "$HOME/.config/nemoclaw/guardrails/config.yml"
    "./config.yml"
    "./guardrails/config.yml"
)

config_file=""
for cfg in "${guardrails_configs[@]}"; do
    if [ -f "$cfg" ]; then
        config_file="$cfg"
        break
    fi
done

if [ -z "$config_file" ]; then
    emit_info "No NeMo Guardrails config.yml found"
    emit_info "NemoClaw uses NeMo Guardrails for application-layer security"
    emit_info "Create config at: ~/.nemo/guardrails/config.yml"
    exit 0
fi

emit_info "Auditing NeMo Guardrails configuration: $config_file"

# ---------- Check config file permissions ----------
file_perms=$(stat -f "%OLp" "$config_file" 2>/dev/null || stat -c "%a" "$config_file" 2>/dev/null || echo "unknown")
if [ "$file_perms" = "600" ] || [ "$file_perms" = "644" ]; then
    emit_pass "Guardrails config permissions are acceptable ($file_perms)" "Config Permissions"
else
    emit_warn "Guardrails config permissions are $file_perms"
fi

# ---------- Check for input rails ----------
emit_info "Checking input rails..."
if grep -qE "^[[:space:]]*input:" "$config_file" 2>/dev/null; then
    emit_pass "Input rails configured" "Input Rails"
    
    # Check for specific input rails
    if grep -qE "self[_-]?check[_-]?input|check_input" "$config_file" 2>/dev/null; then
        emit_pass "Self-check input rail enabled" "Input Validation"
    else
        emit_warn "Self-check input rail not found — consider enabling"
    fi
else
    emit_fail "No input rails configured — user input not validated" "Input Rails"
    emit_info "Add 'input:' section with validation flows to config.yml"
fi

# ---------- Check for output rails ----------
emit_info "Checking output rails..."
if grep -qE "^[[:space:]]*output:" "$config_file" 2>/dev/null; then
    emit_pass "Output rails configured" "Output Rails"
    
    # Check for specific output rails
    if grep -qE "self[_-]?check[_-]?output|check_output" "$config_file" 2>/dev/null; then
        emit_pass "Self-check output rail enabled" "Output Validation"
    else
        emit_warn "Self-check output rail not found — consider enabling"
    fi
    
    if grep -qE "fact[_-]?check|hallucination" "$config_file" 2>/dev/null; then
        emit_pass "Fact checking/hallucination detection enabled" "Fact Checking"
    else
        emit_info "Fact checking not configured (optional)"
    fi
else
    emit_fail "No output rails configured — LLM output not validated" "Output Rails"
    emit_info "Add 'output:' section with validation flows to config.yml"
fi

# ---------- Check for jailbreak detection ----------
emit_info "Checking jailbreak detection..."
if grep -qiE "jailbreak|prompt[_-]?injection|adversarial" "$config_file" 2>/dev/null; then
    emit_pass "Jailbreak/prompt injection detection configured" "Jailbreak Detection"
else
    emit_fail "Jailbreak detection not configured" "Jailbreak Detection"
    emit_info "Add jailbreak detection flow to prevent prompt injection attacks"
fi

# ---------- Check for PII masking ----------
emit_info "Checking PII/sensitive data protection..."
if grep -qiE "pii|sensitive[_-]?data|mask|redact|PERSON|EMAIL|PHONE" "$config_file" 2>/dev/null; then
    emit_pass "PII/sensitive data protection configured" "PII Protection"
else
    emit_warn "PII protection not configured"
    emit_info "Consider adding sensitive_data_detection flow for compliance"
fi

# ---------- Check for retrieval rails (RAG) ----------
emit_info "Checking retrieval rails..."
if grep -qE "^[[:space:]]*retrieval:" "$config_file" 2>/dev/null; then
    emit_pass "Retrieval rails configured (RAG grounding)" "Retrieval Rails"
else
    emit_info "No retrieval rails — OK if not using RAG"
fi

# ---------- Check for dialog rails ----------
emit_info "Checking dialog flow control..."
if grep -qE "^[[:space:]]*dialog:" "$config_file" 2>/dev/null; then
    emit_pass "Dialog rails configured" "Dialog Rails"
else
    emit_info "No dialog rails — conversations not flow-controlled"
fi

# ---------- Check for execution rails ----------
emit_info "Checking execution rails..."
if grep -qE "^[[:space:]]*execution:" "$config_file" 2>/dev/null || grep -qiE "tool[_-]?call|action[_-]?check" "$config_file" 2>/dev/null; then
    emit_pass "Execution rails configured (tool/action control)" "Execution Rails"
else
    emit_warn "No execution rails — tool calls not validated"
    emit_info "Add execution rails to control which tools agents can invoke"
fi

# ---------- Check for Colang flows ----------
rails_dir="$(dirname "$config_file")/rails"
if [ -d "$rails_dir" ]; then
    flow_count=$(find "$rails_dir" -name "*.co" 2>/dev/null | wc -l)
    if [ "$flow_count" -gt 0 ]; then
        emit_info "Found $flow_count Colang flow file(s) in rails directory"
    fi
else
    emit_info "No rails/ directory — using inline config only"
fi

# ---------- Summary ----------
emit_info ""
emit_info "NeMo Guardrails provides application-layer security."
emit_info "Clawkeeper handles infrastructure/host security."
emit_info "Together they form a complete AI agent security stack."
