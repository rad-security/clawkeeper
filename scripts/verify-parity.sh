#!/bin/bash
# ============================================================================
# Clawkeeper Parity Verification
# Ensures the bundled dist/clawkeeper.sh includes every check from checks/
#
# Usage: bash scripts/verify-parity.sh
# ============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKS_DIR="$REPO_ROOT/checks"
DIST="$REPO_ROOT/dist/clawkeeper.sh"
ERRORS=0

echo "Verifying check parity..."

# 1. Check that dist/clawkeeper.sh exists
if [ ! -f "$DIST" ]; then
    echo "FAIL: dist/clawkeeper.sh not found — run 'bash scripts/bundle.sh' first"
    exit 1
fi

# 2. For each check directory, verify it has required files and is in the bundle
for check_dir in "$CHECKS_DIR"/*/; do
    [ -d "$check_dir" ] || continue
    id=$(basename "$check_dir")

    # check.toml must exist
    if [ ! -f "$check_dir/check.toml" ]; then
        echo "FAIL: $id — missing check.toml"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    # check.sh must exist
    if [ ! -f "$check_dir/check.sh" ]; then
        echo "FAIL: $id — missing check.sh"
        ERRORS=$((ERRORS + 1))
        continue
    fi

    # __check_<id> must exist in bundle
    if ! grep -q "^__check_${id}()" "$DIST"; then
        echo "FAIL: $id — __check_${id}() not found in dist/clawkeeper.sh"
        ERRORS=$((ERRORS + 1))
    fi

    # __meta_<id> must exist in bundle
    if ! grep -q "^__meta_${id}()" "$DIST"; then
        echo "FAIL: $id — __meta_${id}() not found in dist/clawkeeper.sh"
        ERRORS=$((ERRORS + 1))
    fi

    # If remediate.sh exists, __remediate_<id> must exist in bundle
    if [ -f "$check_dir/remediate.sh" ]; then
        if ! grep -q "^__remediate_${id}()" "$DIST"; then
            echo "FAIL: $id — has remediate.sh but __remediate_${id}() not in bundle"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

# 3. Verify run_check calls in orchestrator reference existing checks
ORCHESTRATOR="$REPO_ROOT/lib/orchestrator.sh"
if [ -f "$ORCHESTRATOR" ]; then
    while IFS= read -r line; do
        check_id=$(echo "$line" | sed 's/.*run_check "\([^"]*\)".*/\1/')
        if [ ! -d "$CHECKS_DIR/$check_id" ]; then
            echo "FAIL: orchestrator calls run_check \"$check_id\" but checks/$check_id/ does not exist"
            ERRORS=$((ERRORS + 1))
        fi
    done < <(grep 'run_check "' "$ORCHESTRATOR")
fi

# 4. Syntax check
if ! bash -n "$DIST" 2>/dev/null; then
    echo "FAIL: dist/clawkeeper.sh has syntax errors"
    ERRORS=$((ERRORS + 1))
fi

# Summary
check_count=$(find "$CHECKS_DIR" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
echo ""
if [ "$ERRORS" -eq 0 ]; then
    echo "OK: All $check_count checks verified in dist/clawkeeper.sh"
    exit 0
else
    echo "FAILED: $ERRORS errors found across $check_count checks"
    exit 1
fi
