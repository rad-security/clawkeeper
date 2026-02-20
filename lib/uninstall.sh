# ============================================================================
# Clawkeeper Uninstall — Secure removal of OpenClaw
# Concatenated by bundle.sh — do NOT add a shebang here.
#
# By RAD Security — https://rad.security
# ============================================================================

uninstall_openclaw() {
    print_banner
    echo ""
    error_bold_msg "  OpenClaw Secure Removal"
    echo ""
    dim_msg "  This will permanently remove OpenClaw and securely wipe sensitive data."
    if [ "$HAS_GUM" = true ]; then
        echo "  $(gum style --foreground "$GUM_DIM" "Every step requires your confirmation. Nothing runs without") $(gum style --bold "[Y/n]")$(gum style --foreground "$GUM_DIM" ".")"
    else
        echo -e "  ${DIM}Every step requires your confirmation. Nothing runs without ${RESET}${BOLD}[Y/n]${RESET}${DIM}.${RESET}"
    fi
    echo ""

    detect_platform

    # Detect what's installed
    detect_openclaw_installed

    if [ "$OPENCLAW_INSTALLED" = false ]; then
        warn_msg "No OpenClaw installation detected."
        echo ""
        dim_msg "  Checked: Docker containers/images, npm global, LaunchAgents, processes"
        echo ""
        if ! ask_yn "Continue anyway to clean up leftover config/data files?"; then
            dim_msg "  Nothing to do. Exiting."
            exit 0
        fi
    fi

    local removed_something=false

    # ── Step 1: Stop running instances ──
    echo ""
    accent_bold_msg "  ── Step 1: Stop Running Instances ──"

    # Docker containers
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        local running_containers
        running_containers=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$running_containers" ]; then
            warn_msg "Found running OpenClaw containers:"
            echo "$running_containers" | while read -r c; do dim_msg "    $c"; done
            if ask_yn "Stop these containers?"; then
                echo "$running_containers" | while read -r c; do
                    docker stop "$c" 2>/dev/null && ok_msg "Stopped container: $c"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No running OpenClaw containers"
        fi
    fi

    # Native processes
    local oc_pids
    oc_pids=$(pgrep -f "openclaw" 2>/dev/null || true)
    if [ -n "$oc_pids" ]; then
        warn_msg "Found OpenClaw processes:"
        ps -p "$(echo "$oc_pids" | tr '\n' ',')" -o pid,command 2>/dev/null | tail -n +2 | while read -r line; do
            dim_msg "    $line"
        done
        if ask_yn "Kill these processes?"; then
            echo "$oc_pids" | while read -r pid; do
                kill "$pid" 2>/dev/null && ok_msg "Killed PID $pid"
            done
            sleep 1
            # Force kill any survivors
            local remaining
            remaining=$(pgrep -f "openclaw" 2>/dev/null || true)
            if [ -n "$remaining" ]; then
                echo "$remaining" | while read -r pid; do
                    kill -9 "$pid" 2>/dev/null || true
                done
                ok_msg "Force-killed remaining processes"
            fi
            removed_something=true
        fi
    else
        dim_msg "  → No running OpenClaw processes"
    fi

    # ── Step 2: Remove LaunchAgent (macOS) ──
    if [ "$PLATFORM" = "macos" ]; then
        echo ""
        accent_bold_msg "  ── Step 2: Remove LaunchAgents ──"

        local plist_file="$HOME/Library/LaunchAgents/com.openclaw.agent.plist"
        if [ -f "$plist_file" ]; then
            warn_msg "Found LaunchAgent: $plist_file"
            if ask_yn "Unload and remove this LaunchAgent?"; then
                launchctl unload "$plist_file" 2>/dev/null || true
                rm -f "$plist_file"
                ok_msg "LaunchAgent unloaded and removed"
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw LaunchAgent found"
        fi
    fi

    # ── Step 3: Remove Docker resources ──
    if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
        echo ""
        accent_bold_msg "  ── Step 3: Remove Docker Resources ──"

        # Containers (stopped)
        local all_containers
        all_containers=$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$all_containers" ]; then
            warn_msg "Found OpenClaw containers (including stopped):"
            echo "$all_containers" | while read -r c; do dim_msg "    $c"; done
            if ask_yn "Remove these containers?"; then
                echo "$all_containers" | while read -r c; do
                    docker rm -f "$c" 2>/dev/null && ok_msg "Removed container: $c"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw containers to remove"
        fi

        # Images
        local oc_images
        oc_images=$(docker images --format '{{.Repository}}:{{.Tag}} ({{.ID}})' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$oc_images" ]; then
            warn_msg "Found OpenClaw images:"
            echo "$oc_images" | while read -r img; do dim_msg "    $img"; done
            if ask_yn "Remove these images?"; then
                docker images --format '{{.ID}} {{.Repository}}' 2>/dev/null | grep -i "openclaw" | awk '{print $1}' | while read -r id; do
                    docker rmi -f "$id" 2>/dev/null && ok_msg "Removed image: $id"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw images to remove"
        fi

        # Volumes
        local oc_volumes
        oc_volumes=$(docker volume ls --format '{{.Name}}' 2>/dev/null | grep -i "openclaw" || true)
        if [ -n "$oc_volumes" ]; then
            warn_msg "Found OpenClaw volumes:"
            echo "$oc_volumes" | while read -r v; do dim_msg "    $v"; done
            if ask_yn "Remove these volumes? (DATA WILL BE LOST)"; then
                echo "$oc_volumes" | while read -r v; do
                    docker volume rm "$v" 2>/dev/null && ok_msg "Removed volume: $v"
                done
                removed_something=true
            fi
        else
            dim_msg "  → No OpenClaw volumes to remove"
        fi
    fi

    # ── Step 4: Remove npm global package ──
    echo ""
    accent_bold_msg "  ── Step 4: Remove npm Package ──"

    if command -v openclaw &>/dev/null; then
        warn_msg "OpenClaw is installed globally via npm"
        if ask_yn "Uninstall openclaw npm package?"; then
            npm uninstall -g openclaw 2>&1 | tail -3
            if ! command -v openclaw &>/dev/null; then
                ok_msg "OpenClaw npm package removed"
            else
                warn_msg "openclaw still in PATH — may need manual removal"
            fi
            removed_something=true
        fi
    else
        dim_msg "  → No global OpenClaw npm package found"
    fi

    # ── Step 5: Securely wipe data directories ──
    echo ""
    accent_bold_msg "  ── Step 5: Secure Data Wipe ──"
    echo ""
    dim_msg "  The following directories may contain secrets, session logs, and config:"

    local data_dirs=(
        "$HOME/.openclaw"
        "$HOME/openclaw-docker"
        "$HOME/openclaw"
    )

    local dirs_to_wipe=()
    for dir in "${data_dirs[@]}"; do
        if [ -d "$dir" ]; then
            local dir_size
            dir_size=$(du -sh "$dir" 2>/dev/null | awk '{print $1}' || echo "?")
            warn_msg "$dir (${dir_size})"
            dirs_to_wipe+=("$dir")
        fi
    done

    if [ ${#dirs_to_wipe[@]} -eq 0 ]; then
        dim_msg "  → No OpenClaw data directories found"
    else
        echo ""
        error_bold_msg "  WARNING: This permanently deletes all OpenClaw data including:"
        dim_msg "    • Configuration files (openclaw.json, .env)"
        dim_msg "    • Session logs and conversation history"
        dim_msg "    • MEMORY.md, SOUL.md, skills"
        dim_msg "    • API keys and credentials stored in these directories"
        echo ""

        if ask_yn "Securely wipe these directories? (THIS CANNOT BE UNDONE)"; then
            for dir in "${dirs_to_wipe[@]}"; do
                dim_msg "  → Wiping $dir..."

                # Overwrite sensitive files before deletion
                # Find files that likely contain secrets and overwrite them
                while IFS= read -r sensitive_file; do
                    [ -z "$sensitive_file" ] && continue
                    if [ -f "$sensitive_file" ]; then
                        local fsize
                        fsize=$(wc -c < "$sensitive_file" 2>/dev/null | tr -d ' ')
                        if [ "$fsize" -gt 0 ] 2>/dev/null; then
                            dd if=/dev/urandom bs=1 count="$fsize" of="$sensitive_file" conv=notrunc 2>/dev/null || true
                        fi
                    fi
                done < <(find "$dir" -type f \( \
                    -name "*.json" -o -name "*.jsonl" -o -name ".env" -o \
                    -name "*.md" -o -name "*.yml" -o -name "*.yaml" -o \
                    -name "*.pem" -o -name "*.key" -o -name "*.token" -o \
                    -name "*.log" -o -name "*.sqlite" -o -name "*.db" \
                \) 2>/dev/null)

                # Remove the directory
                rm -rf "$dir"

                if [ ! -d "$dir" ]; then
                    ok_msg "Securely wiped: $dir"
                else
                    fail_msg "Failed to remove: $dir"
                fi
            done
            removed_something=true
        else
            dim_msg "  → Data directories preserved"
        fi
    fi

    # ── Step 6: Clean up docker-compose file ──
    local compose_file="$HOME/openclaw-docker/docker-compose.yml"
    if [ -f "$compose_file" ]; then
        # Already handled above in data dirs, but just in case
        :
    fi

    # ── Summary ──
    echo ""
    if [ "$HAS_GUM" = true ]; then
        gum style --bold --foreground "$GUM_CYAN" --border double --border-foreground "$GUM_BORDER_FG" --padding "0 2" -- ""
    else
        echo -e "  ${CYAN}${BOLD}════════════════════════════════════════════════════${RESET}"
    fi
    echo ""
    if [ "$removed_something" = true ]; then
        if [ "$HAS_GUM" = true ]; then
            gum style --bold --foreground "$GUM_GREEN" -- "  OpenClaw removal complete."
        else
            echo -e "  ${GREEN}${BOLD}OpenClaw removal complete.${RESET}"
        fi
        echo ""
        dim_msg "  What was cleaned:"
        dim_msg "    • Running processes and containers stopped"
        dim_msg "    • Docker images/volumes/containers removed"
        dim_msg "    • LaunchAgents unloaded"
        dim_msg "    • Sensitive files overwritten before deletion"
        dim_msg "    • Data directories removed"
    else
        dim_msg "  No changes were made."
    fi
    echo ""
    dim_msg "  Remaining manual steps (if applicable):"
    dim_msg "    • Check shell history for pasted API keys: history | grep sk-"
    dim_msg "    • Revoke any API keys generated for OpenClaw"
    dim_msg "    • Remove any firewall rules added for OpenClaw"
    echo ""
}
