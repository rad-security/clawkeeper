#!/bin/bash
# ============================================================================
# Clawkeeper Remediation: Homebrew
# Installs Homebrew and configures PATH for the current and future sessions.
# Outputs JSON lines to stdout.
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../lib/helpers.sh
source "${SCRIPT_DIR}/../../lib/helpers.sh" 2>/dev/null || true

REMEDIATION_ID="${1:-}"

case "$REMEDIATION_ID" in
    install_homebrew)
        emit_info "Running Homebrew installer..."

        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
            emit_fail "Homebrew installation failed" "Homebrew"
            exit 1
        }

        # Add to PATH based on architecture
        brew_prefix=""
        if [ -f /opt/homebrew/bin/brew ]; then
            brew_prefix="/opt/homebrew"
        elif [ -f /usr/local/bin/brew ]; then
            brew_prefix="/usr/local"
        fi

        if [ -n "$brew_prefix" ]; then
            eval "$("${brew_prefix}/bin/brew" shellenv)"
            # Also add to shell profile for future sessions
            shell_profile="$HOME/.zprofile"
            if ! grep -q 'homebrew' "$shell_profile" 2>/dev/null; then
                echo "eval \"\$(${brew_prefix}/bin/brew shellenv)\"" >> "$shell_profile"
                emit_info "Added Homebrew to $shell_profile"
            fi
        fi

        if command -v brew &>/dev/null; then
            emit_pass "Homebrew installed" "Homebrew"
        else
            emit_fail "Homebrew installed but not in PATH — restart your terminal" "Homebrew"
            exit 1
        fi
        ;;
    *)
        emit_fail "Unknown remediation: $REMEDIATION_ID" "Homebrew"
        ;;
esac
