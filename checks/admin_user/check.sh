#!/bin/bash
# ============================================================================
# Clawkeeper Check: User Account
# Detects whether the current user is an admin, and whether a dedicated
# 'openclaw' standard user exists.
# Info-only — creating a user requires interactive password input which
# cannot be handled via the JSON protocol.
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

emit_info "OpenClaw should run under a standard (non-admin) user to limit blast radius."

current_user=$(whoami)

# Check if current user is admin
if groups "$current_user" 2>/dev/null | grep -qw "admin"; then
    emit_warn "You are running as admin user: $current_user"
    emit_info "A compromised agent under an admin account has much broader access."

    # Check if an 'openclaw' user already exists
    if id "openclaw" &>/dev/null; then
        emit_info "A dedicated 'openclaw' user already exists."
        emit_info "Log into that account for OpenClaw usage."
        emit_fail "Currently running as admin (switch to 'openclaw' user)" "User Account"
    else
        emit_info "To create a dedicated 'openclaw' standard user, run the following manually:"
        emit_info "  sudo dscl . -create /Users/openclaw"
        emit_info "  sudo dscl . -create /Users/openclaw UserShell /bin/zsh"
        emit_info "  sudo dscl . -create /Users/openclaw RealName \"OpenClaw\""
        emit_info "  sudo dscl . -create /Users/openclaw UniqueID <NEXT_UID>"
        emit_info "  sudo dscl . -create /Users/openclaw PrimaryGroupID 20"
        emit_info "  sudo dscl . -create /Users/openclaw NFSHomeDirectory /Users/openclaw"
        emit_info "  sudo dscl . -passwd /Users/openclaw <PASSWORD>"
        emit_info "  sudo createhomedir -c -u openclaw"
        emit_info "Do NOT add the user to the admin group — it should be a standard account."
        emit_info "Then log into that account for all OpenClaw operations."
        emit_fail "Running as admin user (create a dedicated 'openclaw' standard user)" "User Account"
    fi
else
    emit_pass "Running as standard (non-admin) user: $current_user" "User Account"
fi
