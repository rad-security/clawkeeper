// ============================================================================
// Host Analysis — pure TypeScript module (no React)
// Parses scan_checks data into zones, deployment type, and phase groupings.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeploymentType = "docker" | "standalone" | "unknown";
export type ZoneStatus = "green" | "yellow" | "red" | "unknown";
export type ZoneName = "gateway" | "channels" | "tools";
export type Phase = "security_audit" | "host_hardening" | "network" | "prerequisites";

export interface CheckInput {
  id: string;
  status: string;
  check_name: string;
  detail: string | null;
}

export interface AnalyzedCheck {
  id: string;
  status: string;
  check_name: string;
  detail: string | null;
  friendlyDetail: string;
  phase: Phase;
}

export interface ZoneAnalysis {
  zone: ZoneName;
  status: ZoneStatus;
  summary: string;
  passed: number;
  total: number;
  checks: AnalyzedCheck[];
}

export interface HostAnalysis {
  deployment: DeploymentType;
  deploymentDetail: string;
  zones: ZoneAnalysis[];
  hasOpenClawChecks: boolean;
  phaseGroups: Record<Phase, AnalyzedCheck[]>;
}

// ---------------------------------------------------------------------------
// Zone mapping — check_name → zone
// ---------------------------------------------------------------------------

const ZONE_MAP: Record<string, ZoneName> = {
  // Gateway
  "OpenClaw Gateway": "gateway",
  "Config Permissions": "gateway",
  "Config File Permissions": "gateway",
  "gateway.bind": "gateway",
  "gateway.auth": "gateway",
  "gateway.controlUI": "gateway",
  "gateway.discover": "gateway",
  "exec.ask": "gateway",
  "Port Binding": "gateway",
  "Network Mode": "gateway",

  // Channels
  "DM Scope": "channels",
  "DM Policy": "channels",

  // Tools & Sandbox
  "Sandbox Mode": "tools",
  "Exec Policy": "tools",
  "Filesystem Restriction": "tools",
  "Log Redaction Level": "tools",
  "logging.redactSensitive": "tools",
  "Container User": "tools",
  "Capabilities": "tools",
  "Cap Add": "tools",
  "Privileged Mode": "tools",
  "No New Privileges": "tools",
  "Read-Only FS": "tools",
  "Memory Limit": "tools",
  "CPU Limit": "tools",
  "Container Bonjour": "tools",
  "Volume Mounts": "tools",
  "Skills Directory Permissions": "tools",
  "Skills Install Commands": "tools",
  "Skills Secret Injection": "tools",
  "Skills Data Exfiltration": "tools",
  "Credential Exposure": "tools",
  "Credential Exposure Config": "tools",
  "Credential Exposure History": "tools",
  "Credential Exposure Memory": "tools",
  "Credential Exposure Sessions": "tools",
  "SOUL.md Permissions": "tools",
  "SOUL.md Sensitive Data": "tools",
  "SOUL.md Integrity": "tools",
  "SOUL.md Size": "tools",
  ".env Permissions": "tools",
};

// ---------------------------------------------------------------------------
// Phase mapping — check_name → phase
// ---------------------------------------------------------------------------

const PHASE_MAP: Record<string, Phase> = {
  // Security audit
  "OpenClaw Gateway": "security_audit",
  "Config Permissions": "security_audit",
  "Config File Permissions": "security_audit",
  "gateway.bind": "security_audit",
  "gateway.auth": "security_audit",
  "gateway.controlUI": "security_audit",
  "gateway.discover": "security_audit",
  "exec.ask": "security_audit",
  "logging.redactSensitive": "security_audit",
  "Credential Exposure": "security_audit",
  "Sandbox Mode": "security_audit",
  "Exec Policy": "security_audit",
  "DM Scope": "security_audit",
  "DM Policy": "security_audit",
  "Filesystem Restriction": "security_audit",
  "Log Redaction Level": "security_audit",
  ".env Permissions": "security_audit",
  "Container User": "security_audit",
  "Capabilities": "security_audit",
  "Cap Add": "security_audit",
  "Privileged Mode": "security_audit",
  "No New Privileges": "security_audit",
  "Read-Only FS": "security_audit",
  "Port Binding": "security_audit",
  "Memory Limit": "security_audit",
  "CPU Limit": "security_audit",
  "Network Mode": "security_audit",
  "Container Bonjour": "security_audit",
  "Volume Mounts": "security_audit",
  "Skills Directory Permissions": "security_audit",
  "Skills Install Commands": "security_audit",
  "Skills Secret Injection": "security_audit",
  "Skills Data Exfiltration": "security_audit",
  "Credential Exposure Config": "security_audit",
  "Credential Exposure History": "security_audit",
  "Credential Exposure Memory": "security_audit",
  "Credential Exposure Sessions": "security_audit",
  "SOUL.md Permissions": "security_audit",
  "SOUL.md Sensitive Data": "security_audit",
  "SOUL.md Integrity": "security_audit",
  "SOUL.md Size": "security_audit",

  // Host hardening (macOS)
  "Siri": "host_hardening",
  "Location Services": "host_hardening",
  "Bluetooth": "host_hardening",
  "AirDrop": "host_hardening",
  "Handoff": "host_hardening",
  "Firewall": "host_hardening",
  "Analytics": "host_hardening",
  "FileVault": "host_hardening",
  "Spotlight": "host_hardening",
  "Admin User": "host_hardening",
  "User Account": "host_hardening",
  "iCloud": "host_hardening",
  "Automatic Login": "host_hardening",
  // Host hardening (Linux)
  "SSH Hardening": "host_hardening",
  "Disk Encryption": "host_hardening",
  "Firewall (UFW)": "host_hardening",
  "Automatic Security Updates": "host_hardening",
  "Fail2ban": "host_hardening",
  "Unnecessary Services": "host_hardening",

  // Network
  "Network Isolation": "network",
  "Screen Sharing": "network",
  "Remote Login": "network",
  "mDNS / Bonjour": "network",
  "Network Configuration": "network",
  "Open Ports Audit": "network",

  // Prerequisites
  "Homebrew": "prerequisites",
  "Node.js": "prerequisites",
  "Docker Desktop": "prerequisites",
  "Docker Engine": "prerequisites",
  "Essential Packages": "prerequisites",
  "OpenClaw (npm)": "prerequisites",
};

// ---------------------------------------------------------------------------
// Friendly detail mappings
// ---------------------------------------------------------------------------

const FRIENDLY_DETAILS: Record<string, string> = {
  // gateway.bind
  "gateway.bind = loopback": "Gateway only accepts local connections",
  "gateway.bind is set but NOT to loopback": "Gateway may be accessible from the network",
  "gateway.bind not configured (should be 'loopback')": "Gateway binding not set — could accept remote connections",

  // gateway.auth
  "gateway.auth.mode = token": "Authentication requires a valid token",
  "Token authentication not configured": "Anyone with network access could reach the gateway",

  // gateway.controlUI
  "gateway.controlUI = false (web UI disabled)": "Web control panel is disabled",
  "Web control UI should be disabled (controlUI: false)": "Web control panel is accessible — disable it",

  // gateway.discover
  "gateway.discover.mode = off (mDNS disabled)": "Not broadcasting on the local network",
  "mDNS discovery should be disabled (discover.mode: off)": "Broadcasting presence on the local network via mDNS",

  // exec.ask
  "exec.ask = on (explicit consent mode)": "Agents must ask before executing commands",
  "Explicit consent not enabled (exec.ask should be 'on')": "Agents can execute commands without asking",

  // logging.redactSensitive
  "logging.redactSensitive is configured": "Sensitive data is redacted from logs",
  "Sensitive log redaction not configured": "Logs may contain sensitive data",

  // Sandbox Mode
  "agents.defaults.sandbox.mode = all": "All agent actions run inside the sandbox",
  "Sandbox mode should be 'all' (agents.defaults.sandbox.mode)": "Agents can run outside the sandbox",

  // Exec Policy
  "tools.exec.host = sandbox": "Commands execute in the sandbox, not the host",
  "Exec host should be 'sandbox' (not gateway/elevated)": "Commands run directly on the host",

  // DM Scope
  "session.dmScope = per-channel-peer": "Each channel has isolated DM sessions",
  "DM scope should be 'per-channel-peer' for isolation": "DM sessions may leak across channels",

  // DM Policy
  "DM policy = pairing (requires mutual opt-in)": "DMs require mutual opt-in between users",
  "DM policy should be 'pairing' (not 'open')": "Anyone can send DMs directly to the bot",

  // Filesystem Restriction
  "tools.fs.workspaceOnly = true": "File access limited to workspace directory",
  "Filesystem access should be restricted to workspace only": "Agents can access files outside the workspace",

  // Log Redaction Level
  "logging.redactSensitive = tools (full redaction)": "Full log redaction is active",
  "Log redaction should be 'tools' for complete coverage": "Log redaction is incomplete",
  "logging.redactSensitive not configured": "No log redaction configured",

  // Container checks
  "Container is running as ROOT (uid 0)": "Container runs as root — high risk",
  "All capabilities dropped (cap_drop: ALL)": "All Linux capabilities removed",
  "Capabilities not fully dropped — add cap_drop: ALL": "Container retains dangerous Linux capabilities",
  "No extra capabilities added": "No extra capabilities granted",
  "Container is NOT privileged": "Container has no host-level privileges",
  "CRITICAL: Container is running in PRIVILEGED mode": "Container has full host access — critical risk",
  "no-new-privileges is set": "Processes cannot gain new privileges",
  "no-new-privileges not set — add security_opt: no-new-privileges:true": "Processes could escalate privileges",
  "Root filesystem is read-only": "Container filesystem is read-only",
  "Root filesystem is writable — add read_only: true to compose": "Container filesystem is writable",
  "All ports bound to localhost only": "Ports only reachable from this machine",
  "CRITICAL: Ports bound to 0.0.0.0 (all interfaces)": "Ports exposed to the entire network",
  "No memory limit set — container can consume all host memory": "No memory limit — could exhaust host RAM",
  "No CPU limit set — runaway agent can consume all CPUs": "No CPU limit — could exhaust host CPUs",
  "OPENCLAW_DISABLE_BONJOUR=1 is set": "Bonjour discovery disabled in container",
  "OPENCLAW_DISABLE_BONJOUR not set in container environment": "Container may broadcast via Bonjour",
  "No sensitive host paths mounted": "No risky host directories mounted",
  "Sensitive host paths are mounted into the container": "Sensitive host directories are exposed to the container",
};

// Critical checks — FAIL on these counts as critical
const CRITICAL_CHECKS = new Set([
  "Privileged Mode",
  "Port Binding",
  "OpenClaw Gateway",
  "Credential Exposure",
  "Credential Exposure Config",
  "Skills Install Commands",
]);

// ---------------------------------------------------------------------------
// Phase labels
// ---------------------------------------------------------------------------

export const PHASE_LABELS: Record<Phase, string> = {
  security_audit: "Security Audit",
  host_hardening: "Host Hardening",
  network: "Network",
  prerequisites: "Prerequisites",
};

// Phase display order
export const PHASE_ORDER: Phase[] = [
  "security_audit",
  "host_hardening",
  "network",
  "prerequisites",
];

// ---------------------------------------------------------------------------
// Zone labels & icons (icon name for lucide-react)
// ---------------------------------------------------------------------------

export const ZONE_LABELS: Record<ZoneName, string> = {
  gateway: "Gateway",
  channels: "Channels",
  tools: "Tools & Sandbox",
};

export const ZONE_ICONS: Record<ZoneName, string> = {
  gateway: "Shield",
  channels: "MessageSquare",
  tools: "Terminal",
};

// ---------------------------------------------------------------------------
// Core analysis function
// ---------------------------------------------------------------------------

export function analyzeHost(checks: CheckInput[]): HostAnalysis {
  // --- Deployment inference ---
  let deployment: DeploymentType = "unknown";
  let deploymentDetail = "Could not determine deployment type";

  for (const c of checks) {
    if (c.detail && c.detail.includes("Found Docker container")) {
      deployment = "docker";
      deploymentDetail = c.detail;
      break;
    }
    if (c.detail && c.detail.includes("Found bare-metal process")) {
      deployment = "standalone";
      deploymentDetail = c.detail;
      break;
    }
  }

  // If still unknown, infer from presence of container security checks
  if (deployment === "unknown") {
    const hasContainerChecks = checks.some((c) =>
      ["Container User", "Capabilities", "Privileged Mode", "Network Mode"].includes(c.check_name)
    );
    if (hasContainerChecks) {
      deployment = "docker";
      deploymentDetail = "Inferred from container security checks";
    }
  }

  // --- Analyze each check ---
  const analyzedChecks: AnalyzedCheck[] = checks.map((c) => ({
    id: c.id,
    status: c.status,
    check_name: c.check_name,
    detail: c.detail,
    friendlyDetail: getFriendlyDetail(c.detail),
    phase: PHASE_MAP[c.check_name] || "security_audit",
  }));

  // --- Zone analysis ---
  const zoneChecks: Record<ZoneName, AnalyzedCheck[]> = {
    gateway: [],
    channels: [],
    tools: [],
  };

  for (const c of analyzedChecks) {
    const zone = ZONE_MAP[c.check_name];
    if (zone) {
      zoneChecks[zone].push(c);
    }
  }

  const zones: ZoneAnalysis[] = (["gateway", "channels", "tools"] as ZoneName[]).map((zone) => {
    const zChecks = zoneChecks[zone];
    const passed = zChecks.filter((c) => c.status === "PASS" || c.status === "FIXED").length;
    const failed = zChecks.filter((c) => c.status === "FAIL").length;
    const total = zChecks.filter((c) => c.status !== "SKIPPED").length;

    return {
      zone,
      status: computeZoneStatus(zChecks),
      summary: generateZoneSummary(zone, zChecks, passed, failed, total),
      passed,
      total,
      checks: zChecks,
    };
  });

  const hasOpenClawChecks = zones.some((z) => z.checks.length > 0);

  // --- Phase groups ---
  const phaseGroups: Record<Phase, AnalyzedCheck[]> = {
    security_audit: [],
    host_hardening: [],
    network: [],
    prerequisites: [],
  };

  for (const c of analyzedChecks) {
    phaseGroups[c.phase].push(c);
  }

  return {
    deployment,
    deploymentDetail,
    zones,
    hasOpenClawChecks,
    phaseGroups,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFriendlyDetail(detail: string | null): string {
  if (!detail) return "No details available";

  // Exact match
  if (FRIENDLY_DETAILS[detail]) return FRIENDLY_DETAILS[detail];

  // Partial match — check if the detail starts with a known key
  for (const [key, friendly] of Object.entries(FRIENDLY_DETAILS)) {
    if (detail.startsWith(key)) return friendly;
  }

  // Container user — dynamic
  if (detail.match(/^Container running as non-root/)) {
    return "Container runs as a non-root user";
  }
  if (detail.match(/^Memory limit set/)) {
    return "Memory usage is capped";
  }
  if (detail.match(/^CPU limit set/)) {
    return "CPU usage is capped";
  }
  if (detail.match(/^Container using isolated network/)) {
    return "Container uses an isolated network";
  }
  if (detail.match(/^Only NET_BIND_SERVICE/)) {
    return "Minimal capabilities granted";
  }

  // Firewall
  if (detail.match(/^Firewall is on/)) {
    return "macOS firewall is active";
  }

  // Config permissions
  if (detail.match(/^Config directory permissions are 700/)) {
    return "Config directory is owner-only";
  }
  if (detail.match(/^Config file permissions are 600/)) {
    return "Config file is owner-only";
  }

  // Homebrew / Node
  if (detail.match(/^Homebrew is installed/)) {
    return "Homebrew is installed";
  }
  if (detail.match(/^Node\.js .* installed/)) {
    return "Node.js is installed";
  }

  // Default: return the original detail
  return detail;
}

function computeZoneStatus(checks: AnalyzedCheck[]): ZoneStatus {
  if (checks.length === 0) return "unknown";

  const actionable = checks.filter((c) => c.status !== "SKIPPED");
  if (actionable.length === 0) return "unknown";

  const failCount = actionable.filter((c) => c.status === "FAIL").length;
  const hasCriticalFail = actionable.some(
    (c) => c.status === "FAIL" && CRITICAL_CHECKS.has(c.check_name)
  );

  if (failCount === 0) return "green";
  if (hasCriticalFail || failCount / actionable.length > 0.5) return "red";
  return "yellow";
}

function generateZoneSummary(
  zone: ZoneName,
  checks: AnalyzedCheck[],
  passed: number,
  failed: number,
  total: number
): string {
  if (checks.length === 0) {
    return "No checks available for this zone.";
  }

  if (failed === 0) {
    switch (zone) {
      case "gateway":
        return "Your gateway is locked down and properly configured.";
      case "channels":
        return "Channel isolation and DM policies are correctly set.";
      case "tools":
        return "Sandbox, tools, and credentials are properly secured.";
    }
  }

  if (zone === "gateway") {
    if (failed >= total / 2) {
      return "Action needed: multiple gateway settings are misconfigured.";
    }
    return `Almost there: ${failed} gateway setting${failed > 1 ? "s" : ""} need${failed === 1 ? "s" : ""} attention.`;
  }

  if (zone === "channels") {
    return `Action needed: ${failed} channel policy issue${failed > 1 ? "s" : ""} found.`;
  }

  // tools
  if (failed >= total / 2) {
    return "Action needed: the sandbox and tools are not fully secured.";
  }
  return `Almost there: ${failed} tool/sandbox setting${failed > 1 ? "s" : ""} need${failed === 1 ? "s" : ""} attention.`;
}
