import { SupabaseClient } from "@supabase/supabase-js";
import { ScanUploadPayload, InsightType, InsightSeverity, InsightCategory } from "@/types";
import { sendNotifications } from "@/lib/notifications";

// Critical checks that always warrant an insight when they fail
// NOTE: These names MUST match the exact check_name strings emitted by the CLI scanner
const CRITICAL_CHECKS: Record<string, { severity: InsightSeverity; category: InsightCategory }> = {
  // Container security
  "Privileged Mode": { severity: "critical", category: "security" },
  "Network Mode": { severity: "critical", category: "security" },
  "Port Binding": { severity: "high", category: "security" },
  "Container User": { severity: "high", category: "security" },
  "Volume Mounts": { severity: "high", category: "security" },
  // SSH hardening (Linux)
  "PermitRootLogin": { severity: "critical", category: "security" },
  "PasswordAuthentication": { severity: "high", category: "security" },
  // OpenClaw gateway
  "OpenClaw Gateway": { severity: "critical", category: "security" },
  "Open Ports": { severity: "high", category: "security" },
  "gateway.bind": { severity: "high", category: "security" },
  "gateway.auth": { severity: "high", category: "security" },
  // Integrity
  "SOUL.md Integrity": { severity: "high", category: "security" },
  "User Account": { severity: "high", category: "security" },
  // Prompt injection & rogue commands
  "Session Prompt Injection": { severity: "critical", category: "security" },
  "Session Rogue Commands": { severity: "critical", category: "security" },
  "Memory Prompt Injection": { severity: "critical", category: "security" },
  "Skills Prompt Injection": { severity: "critical", category: "security" },
  "Log File Content": { severity: "high", category: "security" },
};

// Checks related to credential exposure — these roll up into a single "credential_exposure" insight
const CREDENTIAL_CHECKS = [
  "Credential Exposure",
  "Credential Exposure Config",
  "Credential Exposure History",
  "Credential Exposure Memory",
  "Credential Exposure Sessions",
  "SOUL.md Sensitive Data",
  "Credential Files",
  "Credential Directory",
];

// CVE check name prefix — scan checks from the CVE audit have names like "CVE: CVE-2026-25253"
const CVE_CHECK_PREFIX = "CVE: ";

// Easy-fix checks that make great quick wins
// NOTE: These names MUST match the exact check_name strings emitted by the CLI scanner
const QUICK_WIN_CHECKS: Record<string, string> = {
  // macOS
  "Firewall": "Enable the firewall:\n  macOS: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on\n  Linux: sudo ufw enable",
  "FileVault": "Enable FileVault: sudo fdesetup enable",
  "Auto Updates": "Enable automatic updates:\n  macOS: sudo softwareupdate --schedule on\n  Linux: sudo apt install unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades",
  "Remote Login": "Disable remote login: sudo systemsetup -setremotelogin off",
  "Siri": "Disable Siri: System Settings → Siri & Spotlight → Disable Ask Siri",
  "Bluetooth": "Disable Bluetooth: System Settings → Bluetooth → Turn Off",
  "AirDrop & Handoff": "Disable AirDrop: System Settings → General → AirDrop & Handoff → turn both off",
  "Location Services": "Disable Location Services: System Settings → Privacy & Security → Location Services → turn off",
  "Spotlight Indexing": "Disable Spotlight indexing: sudo mdutil -a -i off",
  "iCloud": "Sign out of iCloud: System Settings → Apple ID → Sign Out",
  "Automatic Login": "Disable automatic login: System Settings → Users & Groups → Login Options → turn off",
  "Screen Sharing": "Disable Screen Sharing: System Settings → General → Sharing → Screen Sharing → turn off",
  "Analytics & Telemetry": "Disable analytics: System Settings → Privacy & Security → Analytics & Improvements → turn all off",
  // Container
  "Container Bonjour": "Set OPENCLAW_DISABLE_BONJOUR=1 in your container environment variables",
  "mDNS": "Disable mDNS broadcasting — check OpenClaw config or set OPENCLAW_DISABLE_BONJOUR=1",
  // OpenClaw config
  "gateway.controlUI": "Disable the web control UI: set controlUI: false in gateway config",
  "gateway.discover": "Disable mDNS discovery: set discover.mode: off in gateway config",
  "exec.ask": "Enable explicit consent: set exec.ask: on in OpenClaw config",
  "logging.redactSensitive": "Enable log redaction: set logging.redactSensitive: tools in OpenClaw config",
  // Linux
  "Disk Encryption": "Enable LUKS disk encryption on your Linux volumes",
  "Fail2ban": "Install and enable fail2ban:\n  sudo apt install fail2ban && sudo systemctl enable --now fail2ban",
};

// Specific remediation instructions per check
const REMEDIATION_MAP: Record<string, string> = {
  // Container
  "Privileged Mode": "Run containers without --privileged flag. Use specific capabilities with --cap-add instead.",
  "Network Mode": "Do not use host network mode. Use bridge or custom networks: docker run --network=bridge",
  "Port Binding": "Bind ports to localhost only: use 127.0.0.1:PORT:PORT instead of PORT:PORT in docker-compose.",
  "Container User": "Run containers as non-root: add USER openclaw to Dockerfile or user: \"1000:1000\" in compose.",
  "Volume Mounts": "Remove sensitive host path mounts (/, /etc, /var/run/docker.sock). Use named volumes instead.",
  // SSH
  "PermitRootLogin": "In /etc/ssh/sshd_config set PermitRootLogin no. Restart sshd: sudo systemctl restart sshd",
  "PasswordAuthentication": "In /etc/ssh/sshd_config set PasswordAuthentication no. Use key-based auth instead. Restart sshd.",
  // Credentials
  "Credential Exposure": "1. Rotate all exposed credentials immediately\n2. Move secrets to environment variables or a secrets manager\n3. Re-scan to verify",
  "Credential Exposure Config": "1. Remove credentials from openclaw.json\n2. Move API keys/tokens to environment variables\n3. Re-scan to verify",
  "Credential Exposure History": "1. Clear sensitive commands from shell history: history -c\n2. Add sensitive patterns to HISTIGNORE\n3. Rotate any exposed credentials",
  "Credential Exposure Memory": "1. Fix MEMORY.md permissions: chmod 600 MEMORY.md\n2. Remove any embedded credentials\n3. Rotate exposed secrets",
  "Credential Exposure Sessions": "1. Fix session log permissions: chmod 700 sessions/\n2. Remove any logged credentials\n3. Rotate exposed secrets",
  "SOUL.md Sensitive Data": "Remove sensitive data from SOUL.md. Move secrets to environment variables or a secrets manager.",
  "Credential Files": "Fix credential file permissions: chmod 600 on all credential files",
  "Credential Directory": "Fix credential directory permissions: chmod 700 on credential directories",
  // Gateway
  "OpenClaw Gateway": "Bind the gateway to localhost only. Set gateway.bind: loopback in OpenClaw config.",
  "Open Ports": "Restrict port bindings to localhost. Avoid exposing OpenClaw gateway (18789) on all interfaces.",
  "gateway.bind": "Set gateway.bind: loopback in OpenClaw config to restrict access to local connections only.",
  "gateway.auth": "Enable token authentication: set gateway.auth.mode: token in OpenClaw config.",
  // Integrity
  "SOUL.md Integrity": "Inspect SOUL.md for prompt injection patterns. Remove any suspicious instructions or encoded content.",
  "User Account": "Switch to a non-root/non-admin user. Create a dedicated 'openclaw' standard user account.",
  // Prompt injection & rogue commands
  "Session Prompt Injection": "1. Review flagged session JSONL files for injected instructions\n2. Rotate credentials if agent was compromised\n3. Enable sandbox mode and exec.ask",
  "Session Rogue Commands": "1. Review flagged session files for suspicious commands\n2. Audit what data was accessed or transmitted\n3. Rotate all credentials\n4. Enable sandbox mode",
  "Memory Prompt Injection": "1. Open MEMORY.md and remove injected/poisoned instructions\n2. Remove base64 blocks and invisible Unicode\n3. chmod 600 MEMORY.md\n4. Re-scan",
  "Skills Prompt Injection": "1. Quarantine the flagged skill (rename SKILL.md)\n2. Review the skill body for injection language\n3. Only use skills from trusted sources",
  "Log File Content": "1. Review log files for leaked credentials\n2. Rotate any exposed secrets\n3. Enable log redaction in OpenClaw config",
  // Quick wins (also used for quick_win insight remediation display)
  "Firewall": "Enable the firewall:\n  macOS: sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on\n  Linux: sudo ufw enable",
  "FileVault": "Enable FileVault: sudo fdesetup enable",
  "Auto Updates": "Enable automatic updates:\n  macOS: sudo softwareupdate --schedule on\n  Linux: sudo apt install unattended-upgrades",
  "Remote Login": "Disable remote login: sudo systemsetup -setremotelogin off",
  "Siri": "Disable Siri in System Settings → Siri & Spotlight",
  "Bluetooth": "Disable Bluetooth in System Settings → Bluetooth",
  "AirDrop & Handoff": "Disable AirDrop and Handoff in System Settings → General → AirDrop & Handoff",
  "Location Services": "Disable Location Services in System Settings → Privacy & Security",
  "Spotlight Indexing": "Disable Spotlight indexing: sudo mdutil -a -i off",
  "iCloud": "Sign out of iCloud in System Settings → Apple ID",
  "Automatic Login": "Disable automatic login in System Settings → Users & Groups → Login Options",
  "Screen Sharing": "Disable Screen Sharing in System Settings → General → Sharing",
  "Analytics & Telemetry": "Disable analytics in System Settings → Privacy & Security → Analytics & Improvements",
  "Container Bonjour": "Set OPENCLAW_DISABLE_BONJOUR=1 in container environment",
  "mDNS": "Disable mDNS broadcasting in OpenClaw config or set OPENCLAW_DISABLE_BONJOUR=1",
  "gateway.controlUI": "Set controlUI: false in gateway config",
  "gateway.discover": "Set discover.mode: off in gateway config",
  "exec.ask": "Set exec.ask: on in OpenClaw config for explicit consent mode",
  "logging.redactSensitive": "Set logging.redactSensitive: tools in OpenClaw config",
  "Disk Encryption": "Enable LUKS disk encryption on Linux volumes",
  "Fail2ban": "Install and enable fail2ban: sudo apt install fail2ban && sudo systemctl enable --now fail2ban",
};

interface PendingInsight {
  insight_type: InsightType;
  severity: InsightSeverity;
  category: InsightCategory;
  title: string;
  description: string;
  remediation: string;
  affected_hosts: { host_id: string; hostname: string; detail: string }[];
  metadata: Record<string, unknown>;
  scan_id: string;
}

export async function generateInsights(
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  const pending: PendingInsight[] = [];

  // Run all analyzers
  analyzeCriticalFailures(pending, hostId, scanId, data);
  analyzeCredentialExposure(pending, hostId, scanId, data);
  analyzePromptInjection(pending, hostId, scanId, data);
  analyzeCVEVulnerabilities(pending, hostId, scanId, data);
  await analyzeNewRegressions(pending, supabase, orgId, hostId, scanId, data);
  await analyzeGradeDegradation(pending, supabase, orgId, hostId, scanId, data);
  analyzeQuickWins(pending, hostId, scanId, data);

  // Fleet-level analyzers need data from other hosts
  await analyzeFleetInconsistency(pending, supabase, orgId, hostId, scanId, data);
  await analyzeStaleHosts(pending, supabase, orgId, scanId);

  console.log(`[insights] Generated ${pending.length} pending insights for host ${data.hostname} (scan ${scanId})`);

  // Upsert each pending insight with deduplication
  for (const insight of pending) {
    try {
      await upsertInsight(supabase, orgId, insight);
    } catch (err) {
      console.error(`[insights] Failed to upsert insight "${insight.title}":`, err);
    }
  }

  // Auto-resolve: checks that now pass should remove this host from affected_hosts
  await autoResolve(supabase, orgId, hostId, data);

  // Send email notifications for critical/high severity new insights
  await notifyIfNeeded(supabase, orgId, pending);
}

// --- Analyzer 1: Critical Failures ---
function analyzeCriticalFailures(
  pending: PendingInsight[],
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  for (const check of data.checks) {
    if (check.status !== "FAIL") continue;
    const critInfo = CRITICAL_CHECKS[check.check_name];
    if (!critInfo) continue;

    // Skip credential checks (handled by dedicated analyzer)
    if (CREDENTIAL_CHECKS.includes(check.check_name)) continue;

    pending.push({
      insight_type: "critical_failure",
      severity: critInfo.severity,
      category: critInfo.category,
      title: `${check.check_name} Failed`,
      description: check.detail || `Critical security check "${check.check_name}" is failing.`,
      remediation: REMEDIATION_MAP[check.check_name] || `Review and fix the "${check.check_name}" check configuration.`,
      affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: check.detail || "" }],
      metadata: { check_name: check.check_name },
      scan_id: scanId,
    });
  }
}

// --- Analyzer 2: Credential Exposure ---
function analyzeCredentialExposure(
  pending: PendingInsight[],
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  const credFails = data.checks.filter(
    (c) => c.status === "FAIL" && CREDENTIAL_CHECKS.includes(c.check_name)
  );
  if (credFails.length === 0) return;

  const checkNames = credFails.map((c) => c.check_name).join(", ");
  pending.push({
    insight_type: "credential_exposure",
    severity: "critical",
    category: "security",
    title: "Credential Exposure Detected",
    description: `${credFails.length} credential-related check(s) failing: ${checkNames}.`,
    remediation: "1. Rotate all exposed credentials immediately\n2. Move secrets to environment variables or a secrets manager\n3. Re-scan to verify remediation",
    affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: checkNames }],
    metadata: { check_names: credFails.map((c) => c.check_name) },
    scan_id: scanId,
  });
}

// --- Analyzer 2b: Prompt Injection ---
const PROMPT_INJECTION_CHECKS = [
  "Session Prompt Injection",
  "Session Rogue Commands",
  "Memory Prompt Injection",
  "Skills Prompt Injection",
];

function analyzePromptInjection(
  pending: PendingInsight[],
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  const injectionFails = data.checks.filter(
    (c) => c.status === "FAIL" && PROMPT_INJECTION_CHECKS.includes(c.check_name)
  );
  if (injectionFails.length === 0) return;

  const checkNames = injectionFails.map((c) => c.check_name).join(", ");
  const details = injectionFails.map((c) => c.detail).filter(Boolean).join("; ");

  pending.push({
    insight_type: "prompt_injection",
    severity: "critical",
    category: "security",
    title: "Prompt Injection Detected",
    description: `${injectionFails.length} prompt injection/rogue command check(s) failing: ${checkNames}. ${details}`,
    remediation:
      "1. Review the flagged session files and MEMORY.md for injected instructions\n" +
      "2. Remove any suspicious content from MEMORY.md\n" +
      "3. Quarantine any skills with prompt injection language\n" +
      "4. Rotate credentials if rogue commands accessed sensitive data\n" +
      "5. Review session transcripts for unauthorized tool use\n" +
      "6. Re-scan to verify remediation",
    affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: checkNames }],
    metadata: { check_names: injectionFails.map((c) => c.check_name) },
    scan_id: scanId,
  });
}

// --- Analyzer 3: New Regressions (PASS→FAIL since last scan) ---
async function analyzeNewRegressions(
  pending: PendingInsight[],
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  // Get the previous scan's checks for this host
  const { data: prevScans } = await supabase
    .from("scans")
    .select("id")
    .eq("host_id", hostId)
    .eq("org_id", orgId)
    .neq("id", scanId)
    .order("scanned_at", { ascending: false })
    .limit(1);

  if (!prevScans?.length) return;

  const { data: prevChecks } = await supabase
    .from("scan_checks")
    .select("check_name, status")
    .eq("scan_id", prevScans[0].id);

  if (!prevChecks) return;

  const prevMap = new Map(prevChecks.map((c) => [c.check_name, c.status]));

  for (const check of data.checks) {
    if (check.status !== "FAIL") continue;
    const prevStatus = prevMap.get(check.check_name);
    if (prevStatus !== "PASS") continue;

    const isCritical = check.check_name in CRITICAL_CHECKS;
    pending.push({
      insight_type: "new_regression",
      severity: isCritical ? "high" : "medium",
      category: "drift",
      title: `Regression: ${check.check_name}`,
      description: `"${check.check_name}" flipped from PASS to FAIL on ${data.hostname}.`,
      remediation: REMEDIATION_MAP[check.check_name] || `Investigate what changed and restore the passing configuration for "${check.check_name}".`,
      affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: check.detail || "" }],
      metadata: { check_name: check.check_name, previous_status: "PASS" },
      scan_id: scanId,
    });
  }
}

// --- Analyzer 4: Grade Degradation (vs 7 days ago) ---
async function analyzeGradeDegradation(
  pending: PendingInsight[],
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const { data: oldScans } = await supabase
    .from("scans")
    .select("grade, score")
    .eq("host_id", hostId)
    .eq("org_id", orgId)
    .lte("scanned_at", sevenDaysAgo)
    .order("scanned_at", { ascending: false })
    .limit(1);

  if (!oldScans?.length) return;

  const oldGrade = oldScans[0].grade;
  const gradeOrder = ["A", "B", "C", "D", "F"];
  const oldIdx = gradeOrder.indexOf(oldGrade);
  const newIdx = gradeOrder.indexOf(data.grade);

  // Higher index = worse grade
  if (newIdx <= oldIdx) return;

  const drop = newIdx - oldIdx;
  pending.push({
    insight_type: "grade_degradation",
    severity: drop >= 2 ? "high" : "medium",
    category: "compliance",
    title: `Grade Degraded on ${data.hostname}`,
    description: `Grade dropped ${oldGrade} → ${data.grade} over the last 7 days.`,
    remediation: `Review recent scan results on ${data.hostname} to identify which checks changed. Focus on fixing critical and high-severity failures first.`,
    affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: `${oldGrade} → ${data.grade}` }],
    metadata: { old_grade: oldGrade, new_grade: data.grade, old_score: oldScans[0].score, new_score: data.score },
    scan_id: scanId,
  });
}

// --- Analyzer 5: Fleet Inconsistency ---
async function analyzeFleetInconsistency(
  pending: PendingInsight[],
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  // Get all hosts in the org (need at least 2 for fleet comparison)
  const { data: hosts } = await supabase
    .from("hosts")
    .select("id, hostname, last_scan_at")
    .eq("org_id", orgId);

  if (!hosts || hosts.length < 2) return;

  // Get the most recent scan for each other host
  const otherHosts = hosts.filter((h) => h.id !== hostId && h.last_scan_at);
  if (otherHosts.length === 0) return;

  // Get latest scan checks from other hosts
  const otherScanIds: string[] = [];
  for (const h of otherHosts) {
    const { data: latestScan } = await supabase
      .from("scans")
      .select("id")
      .eq("host_id", h.id)
      .order("scanned_at", { ascending: false })
      .limit(1);
    if (latestScan?.length) otherScanIds.push(latestScan[0].id);
  }

  if (otherScanIds.length === 0) return;

  const { data: otherChecks } = await supabase
    .from("scan_checks")
    .select("scan_id, check_name, status")
    .in("scan_id", otherScanIds);

  if (!otherChecks) return;

  // Build map: check_name → { passing: count, failing: count }
  const checkStats: Record<string, { passing: number; failing: number }> = {};
  for (const c of otherChecks) {
    if (!checkStats[c.check_name]) checkStats[c.check_name] = { passing: 0, failing: 0 };
    if (c.status === "PASS") checkStats[c.check_name].passing++;
    else if (c.status === "FAIL") checkStats[c.check_name].failing++;
  }

  // Find checks where this host fails but majority of fleet passes
  for (const check of data.checks) {
    if (check.status !== "FAIL") continue;
    const stats = checkStats[check.check_name];
    if (!stats) continue;
    const total = stats.passing + stats.failing;
    if (total < 1) continue;

    // If >60% of fleet passes this check but this host fails, it's inconsistent
    if (stats.passing / total > 0.6) {
      pending.push({
        insight_type: "fleet_inconsistency",
        severity: "medium",
        category: "drift",
        title: `Fleet Drift: ${check.check_name}`,
        description: `"${check.check_name}" passes on ${stats.passing}/${total} other hosts but fails on ${data.hostname}.`,
        remediation: `Standardize the configuration for "${check.check_name}" across your fleet. Use a passing host as the reference configuration.`,
        affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: check.detail || "" }],
        metadata: { check_name: check.check_name, fleet_passing: stats.passing, fleet_total: total },
        scan_id: scanId,
      });
    }
  }
}

// --- Analyzer 6: Stale Hosts ---
async function analyzeStaleHosts(
  pending: PendingInsight[],
  supabase: SupabaseClient,
  orgId: string,
  scanId: string
) {
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const { data: staleHosts } = await supabase
    .from("hosts")
    .select("id, hostname, last_scan_at")
    .eq("org_id", orgId)
    .lt("last_scan_at", threeDaysAgo);

  if (!staleHosts?.length) return;

  for (const host of staleHosts) {
    const daysSince = Math.floor(
      (Date.now() - new Date(host.last_scan_at!).getTime()) / 86_400_000
    );

    pending.push({
      insight_type: "stale_host",
      severity: daysSince >= 7 ? "medium" : "low",
      category: "performance",
      title: `Stale Host: ${host.hostname}`,
      description: `${host.hostname} hasn't scanned in ${daysSince} days.`,
      remediation: `Verify the Clawkeeper agent is running on ${host.hostname}. Check if the host is online and the agent service is active.`,
      affected_hosts: [{ host_id: host.id, hostname: host.hostname, detail: `Last scan: ${daysSince} days ago` }],
      metadata: { days_since_scan: daysSince, last_scan_at: host.last_scan_at },
      scan_id: scanId,
    });
  }
}

// --- Analyzer 7: CVE Vulnerabilities ---
function analyzeCVEVulnerabilities(
  pending: PendingInsight[],
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  const cveFails = data.checks.filter(
    (c) => c.status === "FAIL" && c.check_name.startsWith(CVE_CHECK_PREFIX)
  );

  if (cveFails.length === 0) return;

  for (const check of cveFails) {
    const cveId = check.check_name.replace(CVE_CHECK_PREFIX, "").trim();
    const detail = check.detail || "";

    // Parse severity from the detail string (format: "HIGH (8.8): description — affects pkg [upgrade to >= X.Y.Z]")
    let severity: InsightSeverity = "high";
    if (detail.startsWith("CRITICAL")) severity = "critical";
    else if (detail.startsWith("HIGH")) severity = "high";
    else if (detail.startsWith("MEDIUM")) severity = "medium";
    else if (detail.startsWith("LOW")) severity = "low";

    // Extract the fix version from the detail (e.g., "[upgrade to >= 2026.1.29]")
    const fixMatch = detail.match(/\[upgrade to >= ([^\]]+)\]/);
    const fixVersion = fixMatch ? fixMatch[1] : "latest";

    // Extract the affected packages
    const pkgMatch = detail.match(/affects ([^[]+)\[/);
    const packages = pkgMatch ? pkgMatch[1].trim().replace(/\s*—\s*$/, "") : "openclaw";

    pending.push({
      insight_type: "cve_vulnerability",
      severity,
      category: "security",
      title: `${cveId}: Vulnerability Detected`,
      description: detail,
      remediation: `1. Upgrade OpenClaw to version ${fixVersion} or later:\n   npm install -g openclaw@latest\n   (or update your Docker image to the latest tag)\n\n2. If using Docker Compose, update the image tag and run:\n   docker compose pull && docker compose up -d\n\n3. Re-run the Clawkeeper scan to verify the fix:\n   clawkeeper scan\n\nAffected packages: ${packages}\nMore info: https://nvd.nist.gov/vuln/detail/${cveId}`,
      affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail }],
      metadata: { check_name: check.check_name, cve_id: cveId, fix_version: fixVersion, packages },
      scan_id: scanId,
    });
  }
}

// --- Analyzer 8: Quick Wins ---
function analyzeQuickWins(
  pending: PendingInsight[],
  hostId: string,
  scanId: string,
  data: ScanUploadPayload
) {
  for (const check of data.checks) {
    if (check.status !== "FAIL") continue;
    const fix = QUICK_WIN_CHECKS[check.check_name];
    if (!fix) continue;

    // Skip if already covered by critical/credential analyzers
    if (check.check_name in CRITICAL_CHECKS) continue;
    if (CREDENTIAL_CHECKS.includes(check.check_name)) continue;

    pending.push({
      insight_type: "quick_win",
      severity: "low",
      category: "compliance",
      title: `Quick Win: ${check.check_name}`,
      description: `"${check.check_name}" is an easy fix that will improve your security score.`,
      remediation: fix,
      affected_hosts: [{ host_id: hostId, hostname: data.hostname, detail: check.detail || "" }],
      metadata: { check_name: check.check_name },
      scan_id: scanId,
    });
  }
}

// --- Deduplication: upsert or update affected_hosts ---
async function upsertInsight(
  supabase: SupabaseClient,
  orgId: string,
  insight: PendingInsight
) {
  // Build dedup query based on insight type
  let query = supabase
    .from("insights")
    .select("id, affected_hosts")
    .eq("org_id", orgId)
    .eq("insight_type", insight.insight_type)
    .eq("is_resolved", false);

  // Check-specific types dedupe by check_name
  const checkName = insight.metadata.check_name as string | undefined;
  if (checkName) {
    query = query.eq("metadata->>check_name", checkName);
  }

  const { data: existing } = await query.limit(1);

  if (existing?.length) {
    // Update existing insight: merge affected_hosts (avoid duplicates by host_id)
    const record = existing[0];
    const hosts = record.affected_hosts as { host_id: string; hostname: string; detail: string }[];
    const newHost = insight.affected_hosts[0];

    const existingIdx = hosts.findIndex((h) => h.host_id === newHost.host_id);
    if (existingIdx >= 0) {
      hosts[existingIdx] = newHost; // Update detail
    } else {
      hosts.push(newHost);
    }

    await supabase
      .from("insights")
      .update({
        affected_hosts: hosts,
        description: insight.description,
        scan_id: insight.scan_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.id);
  } else {
    // Insert new insight
    await supabase.from("insights").insert({
      org_id: orgId,
      insight_type: insight.insight_type,
      severity: insight.severity,
      category: insight.category,
      title: insight.title,
      description: insight.description,
      remediation: insight.remediation,
      affected_hosts: insight.affected_hosts,
      metadata: insight.metadata,
      scan_id: insight.scan_id,
    });
  }
}

// --- Auto-resolve: remove host from insights when checks pass ---
async function autoResolve(
  supabase: SupabaseClient,
  orgId: string,
  hostId: string,
  data: ScanUploadPayload
) {
  const passingChecks = data.checks
    .filter((c) => c.status === "PASS")
    .map((c) => c.check_name);

  if (passingChecks.length === 0) return;

  // Get unresolved insights for this org that have check_name metadata
  const { data: unresolvedInsights } = await supabase
    .from("insights")
    .select("id, affected_hosts, metadata, insight_type")
    .eq("org_id", orgId)
    .eq("is_resolved", false);

  if (!unresolvedInsights) return;

  // When "CVE Audit" passes (no CVEs found), resolve all CVE vulnerability insights for this host.
  // Also track currently-failing CVE IDs so we can resolve individual CVEs that were fixed.
  const cveAuditPassed = passingChecks.includes("CVE Audit");
  const failingCVECheckNames = new Set(
    data.checks
      .filter((c) => c.status === "FAIL" && c.check_name.startsWith(CVE_CHECK_PREFIX))
      .map((c) => c.check_name)
  );
  // CVE audit ran (either passed or had individual CVE results)
  const cveAuditRan = cveAuditPassed || failingCVECheckNames.size > 0 ||
    data.checks.some((c) => c.check_name === "CVE Audit");

  for (const insight of unresolvedInsights) {
    const checkName = (insight.metadata as Record<string, unknown>)?.check_name as string | undefined;
    const isCVEInsight = insight.insight_type === "cve_vulnerability";

    if (isCVEInsight && cveAuditPassed) {
      // CVE audit passed entirely — resolve all CVE insights for this host
    } else if (isCVEInsight && cveAuditRan && checkName && !failingCVECheckNames.has(checkName)) {
      // CVE audit ran but this specific CVE is no longer failing — it was fixed
    } else if (!checkName || !passingChecks.includes(checkName)) {
      continue;
    }

    const hosts = insight.affected_hosts as { host_id: string; hostname: string; detail: string }[];
    const filtered = hosts.filter((h) => h.host_id !== hostId);

    if (filtered.length === 0) {
      // No more affected hosts — resolve the insight
      await supabase
        .from("insights")
        .update({
          affected_hosts: [],
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", insight.id);
    } else if (filtered.length < hosts.length) {
      // Remove this host from affected_hosts
      await supabase
        .from("insights")
        .update({
          affected_hosts: filtered,
          updated_at: new Date().toISOString(),
        })
        .eq("id", insight.id);
    }
  }
}

// --- Notifications for insights (email + webhook via org settings) ---

/** Map insight types to notification payload types */
function toNotificationType(
  insightType: InsightType
): "cve_vulnerability" | "critical_failure" | "credential_exposure" | "grade_degradation" | "new_regression" | "new_host" {
  switch (insightType) {
    case "cve_vulnerability":
      return "cve_vulnerability";
    case "credential_exposure":
      return "credential_exposure";
    case "prompt_injection":
      return "critical_failure";
    case "grade_degradation":
      return "grade_degradation";
    case "new_regression":
      return "new_regression";
    default:
      return "critical_failure";
  }
}

async function notifyIfNeeded(
  supabase: SupabaseClient,
  orgId: string,
  insights: PendingInsight[]
) {
  if (insights.length === 0) return;

  // Rate limit: 1 notification per insight type per hour
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();

  for (const insight of insights) {
    const { count } = await supabase
      .from("insights")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("insight_type", insight.insight_type)
      .gte("created_at", oneHourAgo);

    // Skip if there's already a recent insight of this type (dedup)
    if ((count || 0) > 1) continue;

    const hostname = insight.affected_hosts[0]?.hostname || "unknown";

    try {
      await sendNotifications(supabase, orgId, {
        type: toNotificationType(insight.insight_type),
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        remediation: insight.remediation,
        hostname,
        metadata: insight.metadata,
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  }
}
