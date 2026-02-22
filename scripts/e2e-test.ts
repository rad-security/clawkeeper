#!/usr/bin/env npx tsx
// =============================================================================
// Clawkeeper E2E Test — API + Dashboard verification
// Run: cd web && npx tsx ../scripts/e2e-test.ts
// Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import path from "path";
import { config } from "dotenv";

// Load .env.local from web/
config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let orgId = "";
let userId = "";
let apiKey = "";
let keyHash = "";
let hostIds: string[] = [];
let scanIds: string[] = [];
let passed = 0;
let failed = 0;

const TEST_EMAIL = `e2e-${Date.now()}@test.clawkeeper.dev`;
const TEST_PASSWORD = "E2eTestPass!2026";
const TEST_ORG_NAME = `e2e-test-org-${Date.now()}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(section: string, msg: string) {
  console.log(`[${section}] ${msg}`);
}

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

async function scenario(num: number, total: number, name: string, fn: () => Promise<string>) {
  const prefix = `[${num}/${total}]`;
  process.stdout.write(`${prefix} ${name}...`.padEnd(52));
  try {
    const detail = await fn();
    console.log(`\u2713 ${detail}`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`\u2717 ${msg}`);
    failed++;
  }
}

async function apiPost(endpoint: string, body: unknown, token?: string): Promise<{ status: number; body: Record<string, unknown> }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json as Record<string, unknown> };
}

// ---------------------------------------------------------------------------
// Fixtures — exact check_names from PHASE_MAP in host-analysis.ts
// ---------------------------------------------------------------------------

const MACOS_DOCKER_CHECKS = [
  // host_hardening (11 macOS checks)
  { status: "PASS", check_name: "Siri", detail: "Siri is disabled" },
  { status: "PASS", check_name: "Location Services", detail: "Location services disabled" },
  { status: "FAIL", check_name: "Bluetooth", detail: "Bluetooth is on" },
  { status: "PASS", check_name: "AirDrop", detail: "AirDrop is disabled" },
  { status: "PASS", check_name: "Analytics", detail: "Analytics sharing disabled" },
  { status: "PASS", check_name: "Spotlight", detail: "Spotlight suggestions disabled" },
  { status: "PASS", check_name: "Firewall", detail: "Firewall is on (stealth mode)" },
  { status: "PASS", check_name: "FileVault", detail: "FileVault is enabled" },
  { status: "FAIL", check_name: "Admin User", detail: "Running as admin user" },
  { status: "PASS", check_name: "iCloud", detail: "iCloud Drive disabled" },
  { status: "PASS", check_name: "Automatic Login", detail: "Automatic login is disabled" },
  // network (4)
  { status: "PASS", check_name: "Network Isolation", detail: "Binding to localhost only" },
  { status: "PASS", check_name: "Screen Sharing", detail: "Screen sharing is off" },
  { status: "PASS", check_name: "Remote Login", detail: "Remote login is off" },
  { status: "PASS", check_name: "mDNS / Bonjour", detail: "mDNS not exposed" },
  // prerequisites (2 + 2 skipped)
  { status: "FIXED", check_name: "Homebrew", detail: "Homebrew installed via remediation" },
  { status: "PASS", check_name: "Docker Desktop", detail: "Docker 27.1.1 running" },
  // security_audit (8)
  { status: "PASS", check_name: "Container User", detail: "Container running as non-root (uid 1000)" },
  { status: "PASS", check_name: "Capabilities", detail: "All capabilities dropped (cap_drop: ALL)" },
  { status: "PASS", check_name: "Privileged Mode", detail: "Container is NOT privileged" },
  { status: "PASS", check_name: "Port Binding", detail: "All ports bound to localhost only" },
  { status: "FAIL", check_name: "gateway.auth", detail: "Token authentication not configured" },
  { status: "FAIL", check_name: "Credential Exposure", detail: "API key found in ~/.openclaw/config.yaml" },
  { status: "PASS", check_name: "Skills Install Commands", detail: "No suspicious install commands" },
  { status: "PASS", check_name: "SOUL.md Permissions", detail: "SOUL.md has safe permissions" },
  // skipped (2) — Docker mode, no Node/OpenClaw
  { status: "SKIPPED", check_name: "Node.js", detail: "Not needed in Docker mode" },
  { status: "SKIPPED", check_name: "OpenClaw (npm)", detail: "Using Docker deployment" },
];

const MACOS_SCAN_1 = {
  hostname: "e2e-macbook-docker.local",
  platform: "macos",
  os_version: "15.3",
  score: 72,
  grade: "C",
  passed: 18,
  failed: 4,
  fixed: 2,
  skipped: 2,
  checks: MACOS_DOCKER_CHECKS,
  raw_report: "E2E test report - macOS Docker scan 1",
  scanned_at: new Date().toISOString(),
  agent_version: "1.0.0",
};

// Second scan for same host — grade drops C→D, Firewall flips PASS→FAIL
const MACOS_SCAN_2_CHECKS = MACOS_DOCKER_CHECKS.map((c) => {
  if (c.check_name === "Firewall") return { ...c, status: "FAIL", detail: "Firewall is off" };
  if (c.check_name === "Automatic Login") return { ...c, status: "FAIL", detail: "Automatic login is enabled" };
  if (c.check_name === "iCloud") return { ...c, status: "FAIL", detail: "iCloud Drive enabled" };
  if (c.check_name === "AirDrop") return { ...c, status: "FAIL", detail: "AirDrop is enabled for everyone" };
  return c;
});

const MACOS_SCAN_2 = {
  hostname: "e2e-macbook-docker.local",
  platform: "macos",
  os_version: "15.3",
  score: 52,
  grade: "D",
  passed: 14,
  failed: 8,
  fixed: 2,
  skipped: 2,
  checks: MACOS_SCAN_2_CHECKS,
  raw_report: "E2E test report - macOS Docker scan 2 (degraded)",
  scanned_at: new Date(Date.now() + 60000).toISOString(),
  agent_version: "1.0.0",
};

const LINUX_CHECKS = [
  // host_hardening (6 Linux checks)
  { status: "PASS", check_name: "SSH Hardening", detail: "SSH config is hardened" },
  { status: "PASS", check_name: "Firewall (UFW)", detail: "UFW is active" },
  { status: "PASS", check_name: "Automatic Security Updates", detail: "Unattended upgrades enabled" },
  { status: "PASS", check_name: "Fail2ban", detail: "Fail2ban is active" },
  { status: "PASS", check_name: "Disk Encryption", detail: "LUKS encryption detected" },
  { status: "PASS", check_name: "Unnecessary Services", detail: "No unnecessary services found" },
  // network (2)
  { status: "PASS", check_name: "Network Configuration", detail: "Network properly configured" },
  { status: "PASS", check_name: "Open Ports Audit", detail: "No unexpected open ports" },
  // prerequisites (3)
  { status: "PASS", check_name: "Essential Packages", detail: "All essential packages installed" },
  { status: "PASS", check_name: "Node.js", detail: "Node.js 22.6.0 installed" },
  { status: "PASS", check_name: "OpenClaw (npm)", detail: "OpenClaw 0.35.0 installed" },
  // security_audit (6)
  { status: "PASS", check_name: "gateway.bind", detail: "gateway.bind = loopback" },
  { status: "PASS", check_name: "gateway.auth", detail: "gateway.auth.mode = token" },
  { status: "PASS", check_name: "Credential Exposure", detail: "No credentials exposed" },
  { status: "PASS", check_name: "Skills Install Commands", detail: "No suspicious install commands" },
  { status: "PASS", check_name: ".env Permissions", detail: ".env has safe permissions" },
  { status: "PASS", check_name: "SOUL.md Permissions", detail: "SOUL.md has safe permissions" },
];

const LINUX_SCAN = {
  hostname: "e2e-ubuntu-native.internal",
  platform: "linux",
  os_version: "24.04",
  score: 91,
  grade: "A",
  passed: 17,
  failed: 0,
  fixed: 0,
  skipped: 0,
  checks: LINUX_CHECKS,
  raw_report: "E2E test report - Linux native scan",
  scanned_at: new Date(Date.now() + 120000).toISOString(),
  agent_version: "1.0.0",
};

const THIRD_HOST_SCAN = {
  hostname: "e2e-third-host.local",
  platform: "macos",
  os_version: "15.3",
  score: 85,
  grade: "B",
  passed: 20,
  failed: 2,
  fixed: 1,
  skipped: 1,
  checks: [
    { status: "PASS", check_name: "Firewall", detail: "Firewall is on" },
    { status: "PASS", check_name: "FileVault", detail: "FileVault enabled" },
    { status: "FAIL", check_name: "Bluetooth", detail: "Bluetooth is on" },
    { status: "FAIL", check_name: "Admin User", detail: "Running as admin" },
  ],
  raw_report: "E2E test report - third host",
  scanned_at: new Date(Date.now() + 180000).toISOString(),
  agent_version: "1.0.0",
};

const FOURTH_HOST_SCAN = {
  hostname: "e2e-fourth-host.local",
  platform: "macos",
  os_version: "15.3",
  score: 80,
  grade: "B",
  passed: 19,
  failed: 3,
  fixed: 0,
  skipped: 0,
  checks: [
    { status: "PASS", check_name: "Firewall", detail: "Firewall is on" },
    { status: "FAIL", check_name: "Bluetooth", detail: "Bluetooth is on" },
  ],
  raw_report: "E2E test report - fourth host (should be blocked)",
  scanned_at: new Date(Date.now() + 240000).toISOString(),
  agent_version: "1.0.0",
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function setup() {
  log("SETUP", "Creating test org and user...");

  // Create test user via admin auth
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (authErr || !authData.user) throw new Error(`Failed to create user: ${authErr?.message}`);
  userId = authData.user.id;

  // Create org
  const { data: org, error: orgErr } = await sb
    .from("organizations")
    .insert({ name: TEST_ORG_NAME, plan: "free" })
    .select("id")
    .single();
  if (orgErr || !org) throw new Error(`Failed to create org: ${orgErr?.message}`);
  orgId = org.id;

  // Link user to org
  const { error: memberErr } = await sb
    .from("org_members")
    .insert({ org_id: orgId, user_id: userId, role: "owner" });
  if (memberErr) throw new Error(`Failed to create org_member: ${memberErr.message}`);

  log("SETUP", `org=${orgId}, user=${userId}`);

  // Create API key
  log("SETUP", "Creating API key...");
  const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
  apiKey = rawKey;
  const keyPrefix = rawKey.slice(0, 16);
  keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { error: keyErr } = await sb.from("api_keys").insert({
    org_id: orgId,
    name: "e2e-test-key",
    key_prefix: keyPrefix,
    key_hash: keyHash,
  });
  if (keyErr) throw new Error(`Failed to create API key: ${keyErr.message}`);

  log("SETUP", `API key created: ${keyPrefix}...`);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

async function scenario1_apiKeyAuth(): Promise<string> {
  // Verify key format
  assert(apiKey.startsWith("ck_live_"), "Key starts with ck_live_");

  // Verify key_hash is in DB
  const { data: keyRow } = await sb
    .from("api_keys")
    .select("id, key_hash")
    .eq("key_hash", keyHash)
    .single();
  assert(!!keyRow, "Key hash found in api_keys table");

  // Valid key + empty body → 400 (not 401)
  const { status: emptyStatus } = await apiPost("/api/v1/scans", {}, apiKey);
  assert(emptyStatus === 400, `Empty body returns 400 (got ${emptyStatus})`);

  // Invalid key → 401
  const { status: badKeyStatus } = await apiPost("/api/v1/scans", {}, "ck_live_invalid_key_here");
  assert(badKeyStatus === 401, `Bad key returns 401 (got ${badKeyStatus})`);

  // No auth header → 401
  const { status: noAuthStatus } = await apiPost("/api/v1/scans", {});
  assert(noAuthStatus === 401, `No auth returns 401 (got ${noAuthStatus})`);

  return "key validates, rejects bad key";
}

async function scenario2_firstScan(): Promise<string> {
  const { status, body } = await apiPost("/api/v1/scans", MACOS_SCAN_1, apiKey);
  assert(status === 200, `HTTP 200 (got ${status}: ${JSON.stringify(body)})`);
  assert(!!body.host_id, "Response has host_id");
  assert(!!body.scan_id, "Response has scan_id");

  const hostId = body.host_id as string;
  const scanId = body.scan_id as string;
  hostIds.push(hostId);
  scanIds.push(scanId);

  // Verify host row
  const { data: host } = await sb.from("hosts").select("*").eq("id", hostId).single();
  assert(host !== null, "Host row exists");
  assert(host!.hostname === "e2e-macbook-docker.local", "Hostname matches");
  assert(host!.platform === "macos", "Platform matches");
  assert(host!.last_grade === "C", `Grade is C (got ${host!.last_grade})`);
  assert(host!.last_score === 72, `Score is 72 (got ${host!.last_score})`);

  // Verify scan row
  const { data: scan } = await sb.from("scans").select("*").eq("id", scanId).single();
  assert(scan !== null, "Scan row exists");
  assert(scan!.score === 72, "Scan score matches");
  assert(scan!.grade === "C", "Scan grade matches");
  assert(scan!.passed === 18, "Scan passed matches");
  assert(scan!.failed === 4, "Scan failed matches");

  // Verify scan_checks
  const { data: checks, count } = await sb
    .from("scan_checks")
    .select("*", { count: "exact" })
    .eq("scan_id", scanId);
  assert(count === MACOS_DOCKER_CHECKS.length, `${MACOS_DOCKER_CHECKS.length} scan_checks (got ${count})`);

  // Spot-check a few statuses
  const firewallCheck = checks!.find((c: { check_name: string }) => c.check_name === "Firewall");
  assert(firewallCheck?.status === "PASS", "Firewall is PASS");
  const bluetoothCheck = checks!.find((c: { check_name: string }) => c.check_name === "Bluetooth");
  assert(bluetoothCheck?.status === "FAIL", "Bluetooth is FAIL");

  // Verify events (wait briefly for fire-and-forget)
  await sleep(500);
  const { data: events } = await sb
    .from("events")
    .select("event_type")
    .eq("org_id", orgId)
    .eq("host_id", hostId);
  const eventTypes = events!.map((e: { event_type: string }) => e.event_type);
  assert(eventTypes.includes("host.registered"), "host.registered event created");
  assert(eventTypes.includes("scan.completed"), "scan.completed event created");

  return `host created, ${count} checks, ${events!.length} events`;
}

async function scenario3_gradeChange(): Promise<string> {
  const { status, body } = await apiPost("/api/v1/scans", MACOS_SCAN_2, apiKey);
  assert(status === 200, `HTTP 200 (got ${status}: ${JSON.stringify(body)})`);

  const hostId = body.host_id as string;
  const scanId = body.scan_id as string;
  scanIds.push(scanId);

  // Same host_id as scenario 2
  assert(hostId === hostIds[0], `Same host_id returned (got ${hostId}, expected ${hostIds[0]})`);

  // Verify host updated
  const { data: host } = await sb.from("hosts").select("*").eq("id", hostId).single();
  assert(host!.last_grade === "D", `Grade updated to D (got ${host!.last_grade})`);
  assert(host!.last_score === 52, `Score updated to 52 (got ${host!.last_score})`);

  // Wait for async events
  await sleep(500);

  // Verify events
  const { data: events } = await sb
    .from("events")
    .select("event_type, title")
    .eq("org_id", orgId)
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  const eventTypes = events!.map((e: { event_type: string }) => e.event_type);
  assert(eventTypes.includes("grade.changed"), "grade.changed event exists");
  assert(eventTypes.includes("check.flipped"), "check.flipped event exists");

  // Verify 2 scans total for this host
  const { count: scanCount } = await sb
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("host_id", hostId);
  assert(scanCount === 2, `2 scans for host (got ${scanCount})`);

  return "host updated, grade.changed event";
}

async function scenario4_secondHost(): Promise<string> {
  const { status, body } = await apiPost("/api/v1/scans", LINUX_SCAN, apiKey);
  assert(
    status === 403,
    `Second host blocked by free tier (got ${status}: ${JSON.stringify(body)})`
  );
  assert(
    typeof body.error === "string" && (body.error as string).toLowerCase().includes("host limit"),
    "Error mentions host limit"
  );

  // Free plan should remain capped at one host
  const { count } = await sb
    .from("hosts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  assert(count === 1, `Org remains at 1 host (got ${count})`);

  return "second host correctly blocked on free plan";
}

async function scenario5_tierLimit(): Promise<string> {
  // Additional host attempts should be blocked on free plan (1 host max)
  const { status: thirdStatus, body: thirdBody } = await apiPost("/api/v1/scans", THIRD_HOST_SCAN, apiKey);
  assert(thirdStatus === 403, `2nd host attempt blocked (got ${thirdStatus})`);
  assert(
    typeof thirdBody.error === "string" && (thirdBody.error as string).toLowerCase().includes("host limit"),
    "Error mentions host limit"
  );

  // Repeated attempts should also be blocked
  const { status: fourthStatus, body: fourthBody } = await apiPost("/api/v1/scans", FOURTH_HOST_SCAN, apiKey);
  assert(fourthStatus === 403, `repeat host attempt blocked with 403 (got ${fourthStatus})`);
  assert(
    typeof fourthBody.error === "string" && (fourthBody.error as string).toLowerCase().includes("limit"),
    "Error mentions limit"
  );

  // Verify org still has exactly 1 host
  const { count } = await sb
    .from("hosts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  assert(count === 1, `Still 1 host (got ${count})`);

  return "additional hosts blocked at free-tier cap";
}

async function scenario6_agentEvents(): Promise<string> {
  const eventsEndpoint = "/api/v1/events";
  const macHost = "e2e-macbook-docker.local";

  const agentEvents: { event_type: string; hostname: string }[] = [
    { event_type: "agent.installed", hostname: macHost },
    { event_type: "agent.started", hostname: macHost },
    { event_type: "agent.stopped", hostname: macHost },
  ];

  for (const evt of agentEvents) {
    const { status } = await apiPost(eventsEndpoint, evt, apiKey);
    assert(status === 200, `${evt.event_type} returned 200 (got ${status})`);
  }

  // Verify events in DB
  await sleep(300);
  const { data: events } = await sb
    .from("events")
    .select("event_type")
    .eq("org_id", orgId)
    .in("event_type", ["agent.installed", "agent.started", "agent.stopped"]);

  assert(events!.length >= 3, `3 agent events created (got ${events!.length})`);

  return "3 events created";
}

async function scenario7_invalidPayloads(): Promise<string> {
  let rejectedCount = 0;

  // Missing hostname
  const r1 = await apiPost("/api/v1/scans", { platform: "macos", score: 50, grade: "D", checks: [] }, apiKey);
  if (r1.status === 400) rejectedCount++;

  // score: 101
  const r2 = await apiPost("/api/v1/scans", { hostname: "x", platform: "macos", score: 101, grade: "A", checks: [] }, apiKey);
  if (r2.status === 400) rejectedCount++;

  // grade: "Z"
  const r3 = await apiPost("/api/v1/scans", { hostname: "x", platform: "macos", score: 50, grade: "Z", checks: [] }, apiKey);
  if (r3.status === 400) rejectedCount++;

  // checks not array
  const r4 = await apiPost("/api/v1/scans", { hostname: "x", platform: "macos", score: 50, grade: "D", checks: "nope" }, apiKey);
  if (r4.status === 400) rejectedCount++;

  // Invalid API key
  const r5 = await apiPost("/api/v1/scans", MACOS_SCAN_1, "ck_live_totally_fake_key");
  if (r5.status === 401) rejectedCount++;

  // No auth header
  const r6 = await apiPost("/api/v1/scans", MACOS_SCAN_1);
  if (r6.status === 401) rejectedCount++;

  // Check with invalid status
  const r7 = await apiPost(
    "/api/v1/scans",
    { hostname: "x", platform: "macos", score: 50, grade: "D", checks: [{ status: "INVALID", check_name: "Test", detail: "" }] },
    apiKey
  );
  if (r7.status === 400) rejectedCount++;

  assert(rejectedCount === 7, `7/7 rejected (got ${rejectedCount}/7)`);
  return `${rejectedCount}/7 rejected correctly`;
}

async function scenario8_dashboardData(): Promise<string> {
  const verifications: string[] = [];

  // Hosts: 1 total with correct grade
  const { data: hosts } = await sb
    .from("hosts")
    .select("hostname, last_grade, last_score")
    .eq("org_id", orgId)
    .order("hostname");

  assert(hosts!.length === 1, `1 host (got ${hosts!.length})`);
  verifications.push("1 host");

  // Find host
  const macHost = hosts!.find((h: { hostname: string }) => h.hostname === "e2e-macbook-docker.local");

  assert(macHost?.last_grade === "D", `macOS host grade=D (got ${macHost?.last_grade})`);
  verifications.push("grade correct");

  // Average score
  const avgScore = Math.round(macHost!.last_score);
  verifications.push(`avg score=${avgScore}`);

  // Failing hosts (D or F)
  const failingHosts = hosts!.filter(
    (h: { last_grade: string }) => h.last_grade === "D" || h.last_grade === "F"
  ).length;
  assert(failingHosts === 1, `1 failing host (got ${failingHosts})`);
  verifications.push("1 failing host");

  // Grade distribution
  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const h of hosts!) {
    gradeDistribution[(h as { last_grade: string }).last_grade]++;
  }
  assert(gradeDistribution.D === 1, "1 D-grade host");
  verifications.push("grade dist OK");

  // Total scans (macOS has 2)
  const { count: totalScans } = await sb
    .from("scans")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  assert(totalScans === 2, `2 total scans (got ${totalScans})`);
  verifications.push("2 scans");

  // macOS host detail: 2 scans, latest grade D
  const macHostId = hostIds[0];
  const { data: macScans } = await sb
    .from("scans")
    .select("grade, score")
    .eq("host_id", macHostId)
    .order("scanned_at", { ascending: false });
  assert(macScans!.length === 2, "macOS host has 2 scans");
  assert(macScans![0].grade === "D", "Latest macOS scan is grade D");
  verifications.push("host detail OK");

  // scan_checks for latest macOS scan — grouped by phase
  const latestMacScanId = scanIds[1]; // second scan
  const { data: latestChecks } = await sb
    .from("scan_checks")
    .select("check_name, status")
    .eq("scan_id", latestMacScanId);
  assert(
    latestChecks!.length === MACOS_SCAN_2_CHECKS.length,
    `${MACOS_SCAN_2_CHECKS.length} checks in latest scan (got ${latestChecks!.length})`
  );
  verifications.push("checks grouped");

  // Events: check presence of key event types
  const { data: allEvents } = await sb
    .from("events")
    .select("event_type")
    .eq("org_id", orgId);

  const allEventTypes = new Set(allEvents!.map((e: { event_type: string }) => e.event_type));
  assert(allEventTypes.has("host.registered"), "has host.registered");
  assert(allEventTypes.has("scan.completed"), "has scan.completed");
  assert(allEventTypes.has("grade.changed"), "has grade.changed");
  assert(allEventTypes.has("check.flipped"), "has check.flipped");
  assert(allEventTypes.has("agent.installed"), "has agent.installed");
  assert(allEventTypes.has("agent.started"), "has agent.started");
  assert(allEventTypes.has("agent.stopped"), "has agent.stopped");
  verifications.push("all event types");

  return `all counts match (${verifications.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  log("CLEANUP", "Removing test data...");

  // Delete in FK-safe order
  // scan_checks (via scan_id → scans)
  for (const scanId of scanIds) {
    await sb.from("scan_checks").delete().eq("scan_id", scanId);
  }

  // scans
  await sb.from("scans").delete().eq("org_id", orgId);

  // alert_events
  await sb.from("alert_events").delete().eq("org_id", orgId);

  // events
  await sb.from("events").delete().eq("org_id", orgId);

  // hosts
  await sb.from("hosts").delete().eq("org_id", orgId);

  // api_keys
  await sb.from("api_keys").delete().eq("org_id", orgId);

  // org_members
  await sb.from("org_members").delete().eq("org_id", orgId);

  // organizations
  await sb.from("organizations").delete().eq("id", orgId);

  // auth user
  if (userId) {
    await sb.auth.admin.deleteUser(userId);
  }

  log("CLEANUP", "Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("");
  console.log("\u2550\u2550\u2550 Clawkeeper E2E Test \u2550\u2550\u2550");
  console.log("");

  try {
    // Setup
    process.stdout.write("[SETUP] Creating test org and user...".padEnd(52));
    await setup();
    console.log("\u2713");

    const TOTAL = 8;

    await scenario(1, TOTAL, "API Key Authentication", scenario1_apiKeyAuth);
    await scenario(2, TOTAL, "First Scan Upload (macOS Docker)", scenario2_firstScan);
    await scenario(3, TOTAL, "Grade Change Scan (C\u2192D)", scenario3_gradeChange);
    await scenario(4, TOTAL, "Second Host (Linux Native)", scenario4_secondHost);
    await scenario(5, TOTAL, "Free Tier Host Limit", scenario5_tierLimit);
    await scenario(6, TOTAL, "Agent Lifecycle Events", scenario6_agentEvents);
    await scenario(7, TOTAL, "Invalid Payloads", scenario7_invalidPayloads);
    await scenario(8, TOTAL, "Dashboard Data Verification", scenario8_dashboardData);

  } catch (err) {
    console.error("\nFATAL:", err);
    failed++;
  } finally {
    // Always cleanup
    console.log("");
    process.stdout.write("[CLEANUP] Removing test data...".padEnd(52));
    try {
      await cleanup();
      console.log("\u2713");
    } catch (err) {
      console.log("\u2717 cleanup error:", err);
    }
  }

  console.log("");
  console.log(`\u2550\u2550\u2550 ${passed}/${passed + failed} scenarios passed \u2550\u2550\u2550`);
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
