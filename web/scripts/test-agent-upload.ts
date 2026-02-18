import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

const API_URL = "https://clawkeeper.dev/api/v1/scans";

async function main() {
  // List all orgs and their members
  const { data: orgs } = await sb
    .from("organizations")
    .select("id, name");
  console.log("Organizations:", JSON.stringify(orgs, null, 2));

  const { data: members } = await sb
    .from("org_members")
    .select("org_id, user_id, role");
  console.log("\nMembers:", JSON.stringify(members, null, 2));

  const { data: keys } = await sb
    .from("api_keys")
    .select("id, name, key_prefix, org_id, key_hash");

  console.log("\nAPI keys:", keys?.map(k => ({
    id: k.id,
    name: k.name,
    prefix: k.key_prefix,
    org_id: k.org_id,
  })));

  // Create a fresh test key for first org that has a member
  if (!members || members.length === 0) {
    console.error("No members found");
    return;
  }

  const targetOrgId = members[0].org_id;
  console.log("\nTarget org:", targetOrgId);

  // Generate a key we can actually use
  const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 16);
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  const { error: insertErr } = await sb.from("api_keys").insert({
    org_id: targetOrgId,
    name: "e2e-test-key",
    key_prefix: keyPrefix,
    key_hash: keyHash,
  });

  if (insertErr) {
    console.error("Failed to create key:", insertErr);
    return;
  }

  console.log("\nTest API key created:", rawKey);

  // Now test the full upload
  console.log("\n=== Testing API upload ===");

  const payload = {
    hostname: "e2e-test-host.local",
    platform: "macos",
    os_version: "15.3",
    score: 72,
    grade: "C",
    passed: 14,
    failed: 5,
    fixed: 2,
    skipped: 1,
    checks: [
      { status: "PASS", check_name: "macOS Firewall", detail: "Firewall is enabled" },
      { status: "PASS", check_name: "FileVault", detail: "FileVault is enabled" },
      { status: "FAIL", check_name: "Bluetooth", detail: "Bluetooth is on" },
      { status: "FAIL", check_name: "Admin User", detail: "Running as admin user" },
      { status: "FIXED", check_name: "Homebrew", detail: "Installed via remediation" },
      { status: "FIXED", check_name: "Node.js", detail: "Node.js 22 installed" },
      { status: "SKIPPED", check_name: "Container Security", detail: "Not in Docker mode" },
    ],
    raw_report: "Test report content",
    scanned_at: new Date().toISOString(),
    agent_version: "1.0.0",
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${rawKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();
  console.log(`HTTP ${response.status}:`, JSON.stringify(body, null, 2));

  if (response.ok) {
    console.log("\nSUCCESS! Host should appear in dashboard.");

    // Clean up test key
    await sb.from("api_keys").delete().eq("name", "e2e-test-key");
    console.log("Cleaned up test key.");
  } else {
    console.error("\nFAILED. Investigate the error above.");
  }
}

main();
