#!/bin/bash
# ============================================================================
# Clawkeeper Check: .env File Security
# Checks .env file permissions in common OpenClaw installation locations.
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

env_candidates=(
    "$HOME/openclaw-docker/.env"
    "$HOME/.openclaw/.env"
    "$HOME/openclaw/.env"
)

found_env=false

for env_file in "${env_candidates[@]}"; do
    if [ -f "$env_file" ]; then
        found_env=true
        perms=$(stat -f "%OLp" "$env_file" 2>/dev/null || stat -c "%a" "$env_file" 2>/dev/null || echo "unknown")

        if [ "$perms" = "600" ]; then
            emit_pass ".env file ($env_file) permissions are 600" ".env Permissions"
        else
            emit_prompt ".env file ($env_file) permissions are $perms — fix to 600?" \
                "fix_env_perms:${env_file}" \
                ".env permissions are $perms (should be 600)" \
                ".env permissions not changed"
        fi
    fi
done

if [ "$found_env" = false ]; then
    emit_info "No .env file found in common locations"
    emit_info "Expected at ~/openclaw-docker/.env if using Docker setup"
fi
