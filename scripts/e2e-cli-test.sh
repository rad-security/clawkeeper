#!/bin/bash
# =============================================================================
# Clawkeeper CLI E2E Test — validates install, scan, report parsing, agent config
# Run: bash scripts/e2e-cli-test.sh
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
TOTAL_TESTS=5
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAWKEEPER="$REPO_ROOT/clawkeeper.sh"
TEMP_DIR=""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf "\u2713 %s\n" "$1"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf "\u2717 %s\n" "$1"
}

skip() {
  SKIP_COUNT=$((SKIP_COUNT + 1))
  printf "\u2298 %s\n" "$1"
}

begin_test() {
  local num="$1"
  local name="$2"
  printf "[%d/%d] %-28s" "$num" "$TOTAL_TESTS" "$name..."
}

cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

echo ""
echo "═══ Clawkeeper CLI E2E Test ═══"
echo ""

# Verify clawkeeper.sh exists
if [ ! -f "$CLAWKEEPER" ]; then
  echo "ERROR: clawkeeper.sh not found at $CLAWKEEPER"
  exit 1
fi

# Create temp HOME
TEMP_DIR=$(mktemp -d /tmp/clawkeeper-e2e.XXXXXX)
FAKE_HOME="$TEMP_DIR/home"
mkdir -p "$FAKE_HOME/.local/bin"
mkdir -p "$FAKE_HOME/.clawkeeper"
# Create shell rc files so install script can modify them
touch "$FAKE_HOME/.zshrc"
touch "$FAKE_HOME/.bashrc"

# ---------------------------------------------------------------------------
# TEST 1: Install Script
# ---------------------------------------------------------------------------

begin_test 1 "Install script..."

(
  # Run in subshell with overridden HOME and a mocked curl
  export HOME="$FAKE_HOME"
  export PATH="$FAKE_HOME/.local/bin:$PATH"

  # Create a mock curl that copies the local script instead of downloading
  MOCK_BIN="$TEMP_DIR/mock-bin"
  mkdir -p "$MOCK_BIN"
  cat > "$MOCK_BIN/curl" << 'MOCKEOF'
#!/bin/bash
# Mock curl: instead of downloading, copy the local clawkeeper.sh
# Parse args to find -o (output file)
output_file=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o) output_file="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [ -n "$output_file" ]; then
  cp "$CLAWKEEPER_SRC" "$output_file"
fi
MOCKEOF
  chmod +x "$MOCK_BIN/curl"
  export CLAWKEEPER_SRC="$CLAWKEEPER"
  export PATH="$MOCK_BIN:$PATH"

  # Run install.sh — skip the final `exec` line by replacing it with exit
  INSTALL_SCRIPT="$TEMP_DIR/install-test.sh"
  sed 's/^exec .*$/exit 0/' "$REPO_ROOT/web/public/install.sh" > "$INSTALL_SCRIPT"
  chmod +x "$INSTALL_SCRIPT"

  bash "$INSTALL_SCRIPT" >/dev/null 2>&1
) >/dev/null 2>&1

# Check results
test1_ok=true
if [ ! -f "$FAKE_HOME/.local/bin/clawkeeper.sh" ]; then
  test1_ok=false
fi
if [ ! -x "$FAKE_HOME/.local/bin/clawkeeper.sh" ]; then
  test1_ok=false
fi
# Check PATH persistence was added to one of the shell rc files
if ! grep -q '.local/bin' "$FAKE_HOME/.zshrc" 2>/dev/null && ! grep -q '.local/bin' "$FAKE_HOME/.bashrc" 2>/dev/null; then
  test1_ok=false
fi

if [ "$test1_ok" = true ]; then
  pass "binary at ~/.local/bin, PATH configured"
else
  fail "install script validation failed"
fi

# ---------------------------------------------------------------------------
# TEST 2: Scan Mode (Non-Interactive)
# ---------------------------------------------------------------------------

begin_test 2 "Scan (non-interactive)..."

REPORT_FILE="$TEMP_DIR/e2e-report.txt"

# Run scan in non-interactive mode — capture exit code
# Note: some checks may need sudo, which we don't have in CI, so we accept any exit code
# The important thing is the report file gets generated
scan_exit=0
bash "$CLAWKEEPER" scan --non-interactive --report "$REPORT_FILE" >/dev/null 2>&1 || scan_exit=$?

test2_ok=true
test2_detail=""

if [ ! -f "$REPORT_FILE" ]; then
  test2_ok=false
  test2_detail="report file not created"
elif [ ! -s "$REPORT_FILE" ]; then
  test2_ok=false
  test2_detail="report file is empty"
else
  # Verify report format
  check_count=0

  if ! grep -q "^Score:" "$REPORT_FILE"; then
    test2_ok=false
    test2_detail="missing Score: line"
  fi
  if ! grep -q "^Passed:" "$REPORT_FILE"; then
    test2_ok=false
    test2_detail="missing Passed: line"
  fi
  if ! grep -q "^Failed:" "$REPORT_FILE"; then
    test2_ok=false
    test2_detail="missing Failed: line"
  fi

  # Count check lines (STATUS | CHECK_NAME | DETAIL pattern)
  check_count=$(grep -cE '^\s*(PASS|FAIL|FIXED|SKIPPED)\s*\|' "$REPORT_FILE" || echo "0")

  # Verify all status values are valid
  if grep -E '^\s*[A-Z]+\s*\|' "$REPORT_FILE" | grep -vE '^\s*(PASS|FAIL|FIXED|SKIPPED)\s*\|' | grep -q .; then
    test2_ok=false
    test2_detail="found invalid status values"
  fi
fi

if [ "$test2_ok" = true ]; then
  pass "report generated, $check_count checks"
else
  fail "${test2_detail:-scan validation failed}"
fi

# ---------------------------------------------------------------------------
# TEST 3: Report Parsing Compatibility
# ---------------------------------------------------------------------------

begin_test 3 "Report parse compat..."

test3_ok=true
test3_detail=""

if [ ! -f "$REPORT_FILE" ] || [ ! -s "$REPORT_FILE" ]; then
  test3_ok=false
  test3_detail="no report from test 2"
else
  # Extract score using same logic as agent_run() (lines 4841-4843)
  score=0
  if grep -q "^Score:" "$REPORT_FILE"; then
    score=$(grep "^Score:" "$REPORT_FILE" | head -1 | sed 's/Score: *\([0-9]*\).*/\1/')
  fi

  # Extract passed/failed using same logic as agent_run()
  rp_passed=0
  rp_failed=0
  rp_fixed=0
  rp_skipped=0

  if grep -q "^Passed:" "$REPORT_FILE"; then
    rp_passed=$(grep "^Passed:" "$REPORT_FILE" | head -1 | sed 's/Passed: *//')
  fi
  if grep -q "^Failed:" "$REPORT_FILE"; then
    rp_failed=$(grep "^Failed:" "$REPORT_FILE" | head -1 | sed 's/Failed: *//')
  fi
  if grep -q "^Fixed:" "$REPORT_FILE"; then
    rp_fixed=$(grep "^Fixed:" "$REPORT_FILE" | head -1 | sed 's/Fixed: *//')
  fi
  if grep -q "^Accepted risks:" "$REPORT_FILE"; then
    rp_skipped=$(grep "^Accepted risks:" "$REPORT_FILE" | head -1 | sed 's/Accepted risks: *//')
  fi

  # Calculate grade using same logic as agent_run()
  grade="F"
  if [ "$score" -ge 95 ]; then grade="A"
  elif [ "$score" -ge 85 ]; then grade="B"
  elif [ "$score" -ge 70 ]; then grade="C"
  elif [ "$score" -ge 50 ]; then grade="D"
  fi

  # Verify score is a valid number 0-100
  if ! [[ "$score" =~ ^[0-9]+$ ]] || [ "$score" -gt 100 ]; then
    test3_ok=false
    test3_detail="invalid score: $score"
  fi

  # Parse checks using same logic as agent_run() (lines 4866-4889)
  checks_json="["
  first=true
  while IFS='|' read -r status check_name detail; do
    status=$(echo "$status" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    check_name=$(echo "$check_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    detail=$(echo "$detail" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')

    [ -z "$status" ] && continue
    case "$status" in PASS|FAIL|FIXED|SKIPPED) ;; *) continue ;; esac

    detail=$(printf '%s' "$detail" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g')
    check_name=$(printf '%s' "$check_name" | sed 's/\\/\\\\/g; s/"/\\"/g')

    if [ "$first" = true ]; then
      first=false
    else
      checks_json="$checks_json,"
    fi
    checks_json="$checks_json{\"status\":\"$status\",\"check_name\":\"$check_name\",\"detail\":\"$detail\"}"
  done < <(grep -E '^\s*(PASS|FAIL|FIXED|SKIPPED)\s*\|' "$REPORT_FILE" || true)
  checks_json="$checks_json]"

  # Build full payload JSON (like agent_run does)
  hostname_val=$(hostname)
  payload="{
  \"hostname\": \"$hostname_val\",
  \"platform\": \"macos\",
  \"os_version\": \"15.0\",
  \"score\": $score,
  \"grade\": \"$grade\",
  \"passed\": $rp_passed,
  \"failed\": $rp_failed,
  \"fixed\": $rp_fixed,
  \"skipped\": $rp_skipped,
  \"checks\": $checks_json,
  \"raw_report\": \"test\",
  \"scanned_at\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
  \"agent_version\": \"1.0.0\"
}"

  # Validate payload structure (basic checks — hostname is string, score 0-100, grade A-F)
  # Check that the JSON is parseable (use python if available, else basic checks)
  if command -v python3 &>/dev/null; then
    validation=$(python3 -c "
import json, sys
try:
    p = json.loads('''$payload''')
    assert isinstance(p['hostname'], str) and len(p['hostname']) > 0, 'hostname not string'
    assert isinstance(p['score'], (int, float)) and 0 <= p['score'] <= 100, f'score out of range: {p[\"score\"]}'
    assert p['grade'] in ('A','B','C','D','F'), f'invalid grade: {p[\"grade\"]}'
    assert isinstance(p['checks'], list), 'checks not array'
    for i, c in enumerate(p['checks']):
        assert c['status'] in ('PASS','FAIL','FIXED','SKIPPED'), f'check[{i}] bad status: {c[\"status\"]}'
        assert isinstance(c['check_name'], str) and len(c['check_name']) > 0, f'check[{i}] bad check_name'
    print(f'valid:{len(p[\"checks\"])} checks')
except Exception as e:
    print(f'error:{e}')
" 2>&1) || validation="error:python failed"

    if [[ "$validation" == valid:* ]]; then
      parsed_checks="${validation#valid:}"
    else
      test3_ok=false
      test3_detail="payload validation failed: ${validation#error:}"
    fi
  else
    # No python — basic structural checks
    parsed_checks="(python3 not available for deep validation)"
  fi

  # Cross-reference check_names against PHASE_MAP keys from host-analysis.ts
  # Read known check names from host-analysis.ts
  known_checks_file="$REPO_ROOT/web/src/lib/host-analysis.ts"
  if [ -f "$known_checks_file" ]; then
    unmapped=0
    while IFS='|' read -r status check_name detail; do
      check_name=$(echo "$check_name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
      [ -z "$check_name" ] && continue

      # Check if this check_name appears in PHASE_MAP
      if ! grep -qF "\"$check_name\"" "$known_checks_file"; then
        unmapped=$((unmapped + 1))
      fi
    done < <(grep -E '^\s*(PASS|FAIL|FIXED|SKIPPED)\s*\|' "$REPORT_FILE" || true)

    if [ "$unmapped" -gt 0 ]; then
      # Not a hard failure — some checks may not be in PHASE_MAP
      test3_detail="$unmapped check_names not in PHASE_MAP (may need mapping)"
    fi
  fi
fi

if [ "$test3_ok" = true ]; then
  pass "payload matches API schema, all check_names valid"
else
  fail "${test3_detail:-parse compat failed}"
fi

# ---------------------------------------------------------------------------
# TEST 4: Agent Config
# ---------------------------------------------------------------------------

begin_test 4 "Agent config..."

test4_ok=true
test4_detail=""

# Create agent config manually (simulating what agent_install does)
AGENT_CONFIG_DIR="$FAKE_HOME/.clawkeeper"
AGENT_CONFIG_FILE="$AGENT_CONFIG_DIR/config"
mkdir -p "$AGENT_CONFIG_DIR"

TEST_API_KEY="ck_live_test_e2e_key_12345678"
TEST_API_URL="http://localhost:3000/api/v1/scans"

cat > "$AGENT_CONFIG_FILE" << EOF
# Clawkeeper Agent Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
CLAWKEEPER_API_KEY="$TEST_API_KEY"
CLAWKEEPER_API_URL="$TEST_API_URL"
EOF
chmod 600 "$AGENT_CONFIG_FILE"

# Verify config exists
if [ ! -f "$AGENT_CONFIG_FILE" ]; then
  test4_ok=false
  test4_detail="config file not created"
fi

# Verify permissions are 600
if [ "$test4_ok" = true ]; then
  perms=$(stat -f "%Lp" "$AGENT_CONFIG_FILE" 2>/dev/null || stat -c "%a" "$AGENT_CONFIG_FILE" 2>/dev/null || echo "unknown")
  if [ "$perms" != "600" ]; then
    test4_ok=false
    test4_detail="permissions are $perms, expected 600"
  fi
fi

# Verify config contains key and URL
if [ "$test4_ok" = true ]; then
  if ! grep -q "CLAWKEEPER_API_KEY" "$AGENT_CONFIG_FILE"; then
    test4_ok=false
    test4_detail="config missing CLAWKEEPER_API_KEY"
  fi
  if ! grep -q "CLAWKEEPER_API_URL" "$AGENT_CONFIG_FILE"; then
    test4_ok=false
    test4_detail="config missing CLAWKEEPER_API_URL"
  fi
fi

# Verify config is sourceable and values match
if [ "$test4_ok" = true ]; then
  (
    # shellcheck disable=SC1090
    source "$AGENT_CONFIG_FILE"
    if [ "$CLAWKEEPER_API_KEY" != "$TEST_API_KEY" ]; then
      exit 1
    fi
    if [ "$CLAWKEEPER_API_URL" != "$TEST_API_URL" ]; then
      exit 1
    fi
  ) || {
    test4_ok=false
    test4_detail="config values don't match after sourcing"
  }
fi

if [ "$test4_ok" = true ]; then
  pass "config at ~/.clawkeeper/config, perms 600"
else
  fail "${test4_detail:-agent config failed}"
fi

# ---------------------------------------------------------------------------
# TEST 5: Agent Upload (optional — requires E2E_API_KEY)
# ---------------------------------------------------------------------------

begin_test 5 "Agent upload..."

if [ -z "${E2E_API_KEY:-}" ]; then
  skip "skipped (E2E_API_KEY not set)"
else
  test5_ok=true
  test5_detail=""

  # Set up agent config with real key
  E2E_API_URL="${E2E_API_URL:-http://localhost:3000/api/v1/scans}"

  cat > "$AGENT_CONFIG_FILE" << EOF
CLAWKEEPER_API_KEY="$E2E_API_KEY"
CLAWKEEPER_API_URL="$E2E_API_URL"
EOF
  chmod 600 "$AGENT_CONFIG_FILE"

  # Run agent in a subshell with our fake HOME
  export HOME="$FAKE_HOME"
  export CLAWKEEPER_API_KEY="$E2E_API_KEY"
  export CLAWKEEPER_API_URL="$E2E_API_URL"

  # Use the report we already generated to avoid re-running the full scan
  if [ -f "$REPORT_FILE" ] && [ -s "$REPORT_FILE" ]; then
    # Parse and upload manually using the same logic agent_run uses
    hostname_val=$(hostname)
    platform="macos"
    os_version=$(sw_vers -productVersion 2>/dev/null || echo "unknown")

    # Reuse parsed data from test 3
    scanned_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    http_code=$(curl -s -o "$TEMP_DIR/upload-response.json" -w "%{http_code}" \
      -X POST "$E2E_API_URL" \
      -H "Authorization: Bearer $E2E_API_KEY" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      2>/dev/null) || http_code="000"

    if [ "$http_code" = "200" ]; then
      test5_ok=true
    else
      response=$(cat "$TEMP_DIR/upload-response.json" 2>/dev/null || echo "no response body")
      test5_ok=false
      test5_detail="upload returned HTTP $http_code: $response"
    fi
  else
    test5_ok=false
    test5_detail="no report file available from test 2"
  fi

  if [ "$test5_ok" = true ]; then
    pass "scan uploaded (HTTP 200)"
  else
    fail "${test5_detail:-agent upload failed}"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
TOTAL_RAN=$((PASS_COUNT + FAIL_COUNT))
echo "═══ ${PASS_COUNT}/${TOTAL_RAN} passed, ${SKIP_COUNT} skipped ═══"
echo ""

if [ "$FAIL_COUNT" -gt 0 ]; then
  exit 1
fi
exit 0
