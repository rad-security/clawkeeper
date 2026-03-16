#!/bin/bash
# ============================================================================
# Clawkeeper Check: NemoClaw Installation Detection
# Detects NemoClaw (NVIDIA's enterprise AI agent platform) installation
# via Python package, config directory, and running processes.
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

emit_info "Checking for NemoClaw (NVIDIA Enterprise AI Agent) installation..."

found=false
running=false
version=""

# ---------- Check for NemoClaw Python package ----------
if command -v python3 &>/dev/null; then
    if python3 -c "import nemoclaw" 2>/dev/null; then
        found=true
        version=$(python3 -c "import nemoclaw; print(nemoclaw.__version__)" 2>/dev/null || echo "unknown")
        emit_info "NemoClaw Python package installed: v$version"
    fi
    
    # Also check for nemo-agent-toolkit
    if python3 -c "import nvidia_nat" 2>/dev/null; then
        found=true
        nat_version=$(python3 -c "import nvidia_nat; print(nvidia_nat.__version__)" 2>/dev/null || echo "unknown")
        emit_info "NVIDIA NeMo Agent Toolkit installed: v$nat_version"
    fi
fi

# Check pip list as fallback
if command -v pip3 &>/dev/null; then
    if pip3 list 2>/dev/null | grep -qi "nemoclaw\|nvidia-nat"; then
        found=true
        emit_info "NemoClaw/NeMo Agent Toolkit found in pip packages"
    fi
fi

# ---------- Check for NemoClaw config directory ----------
nemoclaw_config_dirs=(
    "$HOME/.nemo/nemoclaw"
    "$HOME/.config/nemoclaw"
    "$HOME/.nemoclaw"
)

for config_dir in "${nemoclaw_config_dirs[@]}"; do
    if [ -d "$config_dir" ]; then
        found=true
        emit_info "NemoClaw config directory found: $config_dir"
    fi
done

# ---------- Check for NeMo Guardrails config ----------
guardrails_config="$HOME/.nemo/guardrails/config.yml"
if [ -f "$guardrails_config" ]; then
    found=true
    emit_info "NeMo Guardrails configuration found"
fi

# ---------- Check for running NemoClaw process ----------
nemoclaw_process=$(pgrep -fl "nemoclaw|nemo.*agent" 2>/dev/null || true)
if [ -n "$nemoclaw_process" ]; then
    found=true
    running=true
    while IFS= read -r line; do
        emit_info "Found NemoClaw process: $line"
    done <<< "$nemoclaw_process"
fi

# ---------- Check for NemoClaw Docker containers ----------
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    nc_containers=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -iE "nemoclaw|nemo.*agent" || true)
    if [ -n "$nc_containers" ]; then
        found=true
        running=true
        while IFS= read -r line; do
            emit_info "Found NemoClaw container: $line"
        done <<< "$nc_containers"
    fi
fi

# ---------- Check for NIM (NVIDIA Inference Microservices) ----------
if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    nim_containers=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -iE "nim|nemotron" || true)
    if [ -n "$nim_containers" ]; then
        emit_info "NVIDIA NIM containers detected (inference backend)"
        while IFS= read -r line; do
            emit_info "  $line"
        done <<< "$nim_containers"
    fi
fi

# ---------- Check for systemd service ----------
if command -v systemctl &>/dev/null; then
    if systemctl is-active --quiet nemoclaw 2>/dev/null; then
        running=true
        emit_info "NemoClaw systemd service is active"
    elif systemctl is-enabled --quiet nemoclaw 2>/dev/null; then
        emit_info "NemoClaw systemd service is enabled but not running"
    fi
fi

# ---------- Summary ----------
if [ "$found" = false ]; then
    emit_info "No NemoClaw installation detected"
    emit_info "NemoClaw is NVIDIA's enterprise AI agent platform (announced GTC 2026)"
    emit_info "Install: pip install nemoclaw"
elif [ "$running" = true ]; then
    if [ -n "$version" ]; then
        emit_pass "NemoClaw v$version is installed and running" "NemoClaw Detection"
    else
        emit_pass "NemoClaw is installed and running" "NemoClaw Detection"
    fi
else
    emit_pass "NemoClaw is installed (not currently running)" "NemoClaw Detection"
fi
