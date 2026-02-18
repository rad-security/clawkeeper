import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function main() {
  // Find the first org
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name")
    .limit(1)
    .single();

  if (orgErr || !org) {
    console.error("No org found:", orgErr);
    return;
  }
  console.log("Org:", org.id, org.name);

  // Insert mock host
  const { data: host, error: hostErr } = await supabase
    .from("hosts")
    .insert({
      org_id: org.id,
      hostname: "jimmy-macbook.local",
      platform: "macos",
      os_version: "15.3",
      agent_version: "1.0.0",
      last_grade: "C",
      last_score: 72,
      last_scan_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (hostErr || !host) {
    console.error("Failed to create host:", hostErr);
    return;
  }
  console.log("Host created:", host.id);

  // Insert mock scan
  const { data: scan, error: scanErr } = await supabase
    .from("scans")
    .insert({
      host_id: host.id,
      org_id: org.id,
      score: 72,
      grade: "C",
      passed: 14,
      failed: 5,
      fixed: 2,
      skipped: 3,
      raw_report:
        "CLAW Keeper Security Report\nGenerated: 2026-02-17\nHostname: jimmy-macbook.local\nOS: macOS 15.3\n\nScore: 72%\nPassed: 14\nFixed: 2\nFailed: 5\nAccepted risks: 3",
      scanned_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (scanErr || !scan) {
    console.error("Failed to create scan:", scanErr);
    return;
  }
  console.log("Scan created:", scan.id);

  // Insert mock scan checks
  const checks = [
    { scan_id: scan.id, status: "PASS", check_name: "macOS Firewall", detail: "Firewall is enabled" },
    { scan_id: scan.id, status: "PASS", check_name: "FileVault Disk Encryption", detail: "FileVault is enabled" },
    { scan_id: scan.id, status: "PASS", check_name: "Siri", detail: "Siri is disabled" },
    { scan_id: scan.id, status: "PASS", check_name: "Location Services", detail: "Location services disabled" },
    { scan_id: scan.id, status: "PASS", check_name: "Bluetooth", detail: "Bluetooth is off" },
    { scan_id: scan.id, status: "PASS", check_name: "AirDrop", detail: "AirDrop is disabled" },
    { scan_id: scan.id, status: "PASS", check_name: "Analytics", detail: "Analytics sharing disabled" },
    { scan_id: scan.id, status: "PASS", check_name: "Spotlight Suggestions", detail: "Spotlight suggestions disabled" },
    { scan_id: scan.id, status: "FAIL", check_name: "Admin User", detail: "Running as admin user" },
    { scan_id: scan.id, status: "PASS", check_name: "iCloud", detail: "iCloud Drive disabled" },
    { scan_id: scan.id, status: "FAIL", check_name: "Automatic Login", detail: "Automatic login is enabled" },
    { scan_id: scan.id, status: "PASS", check_name: "Network Isolation", detail: "Binding to localhost only" },
    { scan_id: scan.id, status: "PASS", check_name: "Screen Sharing", detail: "Screen sharing is off" },
    { scan_id: scan.id, status: "PASS", check_name: "Remote Login", detail: "Remote login is off" },
    { scan_id: scan.id, status: "PASS", check_name: "mDNS/Bonjour", detail: "mDNS not exposed" },
    { scan_id: scan.id, status: "FIXED", check_name: "Homebrew", detail: "Homebrew installed via remediation" },
    { scan_id: scan.id, status: "FIXED", check_name: "Node.js", detail: "Node.js 22 installed via remediation" },
    { scan_id: scan.id, status: "PASS", check_name: "Docker Installed", detail: "Docker 27.1.1 running" },
    { scan_id: scan.id, status: "FAIL", check_name: "Credential Exposure", detail: "API key found in ~/.openclaw/config.yaml" },
    { scan_id: scan.id, status: "FAIL", check_name: "Skills Security", detail: "2 suspicious skills from ClawHub" },
    { scan_id: scan.id, status: "FAIL", check_name: "OpenClaw Hardening", detail: "Auth not enabled on admin interface" },
    { scan_id: scan.id, status: "SKIPPED", check_name: "Container Security", detail: "Not running in Docker mode" },
    { scan_id: scan.id, status: "SKIPPED", check_name: "Soul Security", detail: "No soul.json found" },
    { scan_id: scan.id, status: "SKIPPED", check_name: "Environment File", detail: "No .env file present" },
  ];

  const { error: checksErr } = await supabase.from("scan_checks").insert(checks);
  if (checksErr) {
    console.error("Failed to insert checks:", checksErr);
    return;
  }
  console.log("Inserted", checks.length, "scan checks");
  console.log("\nDone! Mock host should now appear at /hosts in the dashboard.");
}

main();
