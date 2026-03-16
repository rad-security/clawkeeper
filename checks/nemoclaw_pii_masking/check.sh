#!/bin/bash
# ============================================================================
# Clawkeeper Check: NemoClaw PII Protection
# Verifies NemoClaw PII detection and masking configuration for compliance
# with GDPR, HIPAA, SOC2 and other privacy regulations.
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

emit_info "Checking NemoClaw PII protection configuration..."

# Possible config locations
config_files=(
    "$HOME/.nemo/guardrails/config.yml"
    "$HOME/.nemo/nemoclaw/config.yml"
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
    emit_info "No NemoClaw/Guardrails configuration found"
    emit_info "Skipping PII protection checks"
    exit 0
fi

emit_info "Analyzing PII protection in: $config_file"

# ---------- Check for PII detection configuration ----------
pii_configured=false

if grep -qiE "pii|personal[_-]?data|sensitive[_-]?data[_-]?detection" "$config_file" 2>/dev/null; then
    pii_configured=true
    emit_pass "PII/sensitive data detection configured" "PII Detection"
else
    emit_fail "No PII detection configured" "PII Detection"
    emit_info "Add sensitive_data_detection flow for privacy compliance"
fi

# ---------- Check for specific entity types ----------
emit_info "Checking protected entity types..."

entity_types=(
    "PERSON:Personal names"
    "EMAIL:Email addresses"
    "PHONE:Phone numbers"
    "SSN:Social Security Numbers"
    "CREDIT_CARD:Credit card numbers"
    "ADDRESS:Physical addresses"
    "DATE_OF_BIRTH:Birth dates"
    "IP_ADDRESS:IP addresses"
    "MEDICAL:Medical information"
    "FINANCIAL:Financial data"
)

detected_entities=0
for entity_spec in "${entity_types[@]}"; do
    entity="${entity_spec%%:*}"
    description="${entity_spec#*:}"
    
    if grep -qiE "$entity|$(echo "$entity" | tr '_' ' ')" "$config_file" 2>/dev/null; then
        emit_info "  ✓ $description ($entity) protection configured"
        detected_entities=$((detected_entities + 1))
    fi
done

if [ "$detected_entities" -gt 0 ]; then
    emit_pass "$detected_entities entity type(s) configured for detection" "Entity Types"
else
    emit_warn "No specific entity types configured"
    emit_info "Recommend configuring: PERSON, EMAIL, PHONE, SSN, CREDIT_CARD at minimum"
fi

# ---------- Check for masking/redaction settings ----------
emit_info "Checking masking/redaction configuration..."

if grep -qiE "mask|redact|anonymize|obfuscate" "$config_file" 2>/dev/null; then
    emit_pass "Data masking/redaction configured" "Data Masking"
    
    # Check masking method
    if grep -qiE "hash|sha256|md5" "$config_file" 2>/dev/null; then
        emit_info "  Hashing-based masking configured"
    fi
    if grep -qiE "replace|substitute|\*\*\*|xxx" "$config_file" 2>/dev/null; then
        emit_info "  Replacement-based masking configured"
    fi
    if grep -qiE "encrypt|tokenize" "$config_file" 2>/dev/null; then
        emit_info "  Encryption/tokenization configured"
    fi
else
    if [ "$pii_configured" = true ]; then
        emit_warn "PII detection configured but masking/redaction not found"
        emit_info "Configure masking to prevent PII from reaching LLM or logs"
    else
        emit_fail "No data masking/redaction configured" "Data Masking"
    fi
fi

# ---------- Check input rail for PII ----------
emit_info "Checking input rail PII handling..."

if grep -qiE "input:.*pii|pii.*input|mask[_-]?input" "$config_file" 2>/dev/null || \
   grep -A 20 "^[[:space:]]*input:" "$config_file" 2>/dev/null | grep -qiE "pii|sensitive|mask"; then
    emit_pass "Input rail includes PII handling" "Input PII"
else
    emit_warn "Input rail does not explicitly handle PII"
    emit_info "PII should be masked BEFORE reaching the LLM"
fi

# ---------- Check output rail for PII ----------
emit_info "Checking output rail PII handling..."

if grep -qiE "output:.*pii|pii.*output|mask[_-]?output" "$config_file" 2>/dev/null || \
   grep -A 20 "^[[:space:]]*output:" "$config_file" 2>/dev/null | grep -qiE "pii|sensitive|mask"; then
    emit_pass "Output rail includes PII handling" "Output PII"
else
    emit_warn "Output rail does not explicitly handle PII"
    emit_info "PII in LLM responses should be masked before returning to users"
fi

# ---------- Check for audit log PII handling ----------
emit_info "Checking audit log PII handling..."

if grep -qiE "log.*mask|log.*redact|audit.*pii|pii.*audit" "$config_file" 2>/dev/null; then
    emit_pass "Audit logs configured for PII masking" "Audit PII"
else
    emit_warn "Audit log PII handling not configured"
    emit_info "Ensure PII is not logged in plain text for compliance"
fi

# ---------- Compliance considerations ----------
emit_info ""
emit_info "Compliance considerations:"

# GDPR check
if grep -qiE "gdpr|eu[_-]?data|right[_-]?to[_-]?forget|data[_-]?subject" "$config_file" 2>/dev/null; then
    emit_pass "GDPR considerations found in config" "GDPR"
else
    emit_info "  GDPR: Consider adding data subject rights handling"
fi

# HIPAA check
if grep -qiE "hipaa|phi|protected[_-]?health|medical" "$config_file" 2>/dev/null; then
    emit_pass "HIPAA/PHI considerations found in config" "HIPAA"
else
    emit_info "  HIPAA: Consider adding PHI detection if handling healthcare data"
fi

# PCI-DSS check
if grep -qiE "pci|cardholder|payment|credit[_-]?card" "$config_file" 2>/dev/null; then
    emit_pass "PCI-DSS considerations found in config" "PCI-DSS"
else
    emit_info "  PCI-DSS: Consider adding card data detection if handling payments"
fi

# ---------- Summary ----------
emit_info ""
if [ "$pii_configured" = true ] && [ "$detected_entities" -gt 2 ]; then
    emit_pass "PII protection is substantially configured" "PII Summary"
else
    emit_warn "PII protection needs improvement for compliance"
    emit_info ""
    emit_info "Recommended NeMo Guardrails PII configuration:"
    emit_info "  sensitive_data_detection:"
    emit_info "    entities:"
    emit_info "      - PERSON"
    emit_info "      - EMAIL_ADDRESS"
    emit_info "      - PHONE_NUMBER"
    emit_info "      - US_SSN"
    emit_info "      - CREDIT_CARD"
    emit_info "    mask_mode: replace  # or 'hash', 'tokenize'"
fi
