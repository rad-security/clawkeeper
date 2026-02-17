#!/bin/bash
# Clawkeeper installer — curl -fsSL https://clawkeeper.dev/install.sh | bash
set -euo pipefail

REPO="https://clawkeeper.dev/clawkeeper.sh"
DEST="$HOME/.local/bin/clawkeeper.sh"

echo ""
echo "  Installing Clawkeeper..."
echo ""

mkdir -p "$(dirname "$DEST")"
curl -fsSL "$REPO" -o "$DEST"
chmod +x "$DEST"

echo "  ✓ Downloaded to $DEST"

# Ensure ~/.local/bin is on PATH
case ":$PATH:" in
    *":$HOME/.local/bin:"*) ;;
    *)
        echo ""
        echo "  Add ~/.local/bin to your PATH:"
        echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
        echo ""
        ;;
esac

# Run agent install
exec "$DEST" agent --install
