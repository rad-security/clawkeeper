#!/bin/bash
# Clawkeeper installer — curl -fsSL https://clawkeeper.dev/install.sh | bash
set -euo pipefail

REPO="https://clawkeeper.dev/clawkeeper.sh"
DEST="$HOME/.local/bin/clawkeeper.sh"

# --- Download ---
echo ""
echo "  Installing Clawkeeper..."
echo ""

mkdir -p "$(dirname "$DEST")"
curl -fsSL "$REPO" -o "$DEST"
chmod +x "$DEST"

echo "  ✓ Downloaded to $DEST"

# --- Add to PATH for this session ---
case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *) export PATH="$HOME/.local/bin:$PATH" ;;
esac

# --- Persist PATH in shell profiles ---
path_line='export PATH="$HOME/.local/bin:$PATH"'
path_added=false
for rc in "$HOME/.zshrc" "$HOME/.bashrc"; do
    if [ -f "$rc" ] && ! grep -qF '.local/bin' "$rc" 2>/dev/null; then
        printf '\n# Added by Clawkeeper\n%s\n' "$path_line" >> "$rc"
        path_added=true
    fi
done
if [ "$path_added" = true ]; then
    echo "  ✓ Added to PATH (restart your shell or run: source ~/.zshrc)"
else
    echo "  ✓ PATH already configured"
fi

# --- Launch interactive menu ---
echo ""
echo "  Launching Clawkeeper..."
echo ""
exec "$DEST" </dev/tty
