import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Check, X, Minus } from "lucide-react";

export const metadata: Metadata = {
  title: "Clawkeeper vs OpenClaw Native Security — Comparison",
  description:
    "Feature comparison between Clawkeeper's 44 checks and OpenClaw's built-in `openclaw security audit`. See the coverage gap.",
  openGraph: {
    title: "Clawkeeper vs OpenClaw Native Security Audit",
    description:
      "OpenClaw's native audit covers ~10 checks. Clawkeeper covers 44. See the full breakdown.",
  },
};

function StatusIcon({ status }: { status: "yes" | "no" | "partial" }) {
  if (status === "yes")
    return <Check className="mx-auto h-4 w-4 text-green-400" />;
  if (status === "partial")
    return <Minus className="mx-auto h-4 w-4 text-yellow-400" />;
  return <X className="mx-auto h-4 w-4 text-zinc-600" />;
}

type Feature = { name: string; ck: "yes" | "no" | "partial"; oc: "yes" | "no" | "partial" };

const overview = [
  { label: "Type", ck: "External scanner + fleet dashboard", oc: "Built-in CLI command" },
  { label: "Checks", ck: "44 automated across 5 phases", oc: "~10-15 (config + permissions)" },
  { label: "Scope", ck: "Full-stack: host + network + container + config + credentials", oc: "OpenClaw config and runtime only" },
  { label: "Auto-Fix", ck: "Interactive remediation for 20+ issues", oc: "--fix flag for some issues" },
  { label: "Dashboard", ck: "Web dashboard with history and alerts", oc: "None (terminal output)" },
  { label: "Requires OpenClaw", ck: "No (pure bash, zero deps)", oc: "Yes" },
  { label: "Grading", ck: "A-F letter grade + 0-100 score", oc: "Pass/warn/fail per check" },
];

const categories: { title: string; features: Feature[] }[] = [
  {
    title: "OpenClaw Configuration",
    features: [
      { name: "gateway.bind mode", ck: "yes" as const, oc: "yes" as const },
      { name: "Gateway authentication", ck: "yes" as const, oc: "yes" as const },
      { name: "Web control UI (controlUI)", ck: "yes" as const, oc: "yes" as const },
      { name: "mDNS discovery mode", ck: "yes" as const, oc: "yes" as const },
      { name: "exec.ask consent mode", ck: "yes" as const, oc: "yes" as const },
      { name: "Log redaction", ck: "yes" as const, oc: "yes" as const },
      { name: "Config file permissions", ck: "yes" as const, oc: "yes" as const },
      { name: "Sandbox mode", ck: "yes" as const, oc: "yes" as const },
      { name: "DM scope & policy", ck: "yes" as const, oc: "yes" as const },
      { name: "Filesystem restriction", ck: "yes" as const, oc: "yes" as const },
    ],
  },
  {
    title: "Advanced Gateway Security",
    features: [
      { name: "Elevated tool access", ck: "yes" as const, oc: "partial" as const },
      { name: "Browser control exposure", ck: "yes" as const, oc: "partial" as const },
      { name: "Group access policy (requireMention)", ck: "yes" as const, oc: "partial" as const },
      { name: "Plugin allowlist", ck: "yes" as const, oc: "partial" as const },
      { name: "Trusted proxy configuration", ck: "yes" as const, oc: "no" as const },
      { name: "Dangerous tool deny list", ck: "yes" as const, oc: "partial" as const },
      { name: "Live gateway probe (--deep)", ck: "no" as const, oc: "yes" as const },
    ],
  },
  {
    title: "Host OS Hardening",
    features: [
      { name: "Firewall (macOS + Linux UFW)", ck: "yes" as const, oc: "no" as const },
      { name: "Disk encryption (FileVault + LUKS)", ck: "yes" as const, oc: "no" as const },
      { name: "User account security", ck: "yes" as const, oc: "no" as const },
      { name: "Bluetooth / AirDrop / Siri", ck: "yes" as const, oc: "no" as const },
      { name: "Analytics & telemetry", ck: "yes" as const, oc: "no" as const },
      { name: "Auto-login / Location / Spotlight", ck: "yes" as const, oc: "no" as const },
      { name: "SSH hardening (Linux)", ck: "yes" as const, oc: "no" as const },
      { name: "Fail2ban", ck: "yes" as const, oc: "no" as const },
      { name: "Auto-updates", ck: "yes" as const, oc: "no" as const },
      { name: "Unnecessary services", ck: "yes" as const, oc: "no" as const },
    ],
  },
  {
    title: "Network Security",
    features: [
      { name: "mDNS broadcast detection", ck: "yes" as const, oc: "no" as const },
      { name: "Open ports audit", ck: "yes" as const, oc: "no" as const },
      { name: "Network isolation review", ck: "yes" as const, oc: "no" as const },
      { name: "Remote login / screen sharing", ck: "yes" as const, oc: "no" as const },
    ],
  },
  {
    title: "Container Security",
    features: [
      { name: "Non-root user", ck: "yes" as const, oc: "no" as const },
      { name: "Capabilities (drop ALL)", ck: "yes" as const, oc: "no" as const },
      { name: "Privileged mode", ck: "yes" as const, oc: "no" as const },
      { name: "no-new-privileges", ck: "yes" as const, oc: "no" as const },
      { name: "Read-only root filesystem", ck: "yes" as const, oc: "no" as const },
      { name: "Port binding (localhost only)", ck: "yes" as const, oc: "no" as const },
      { name: "Memory / CPU limits", ck: "yes" as const, oc: "no" as const },
      { name: "Network mode isolation", ck: "yes" as const, oc: "no" as const },
      { name: "Sensitive volume mounts", ck: "yes" as const, oc: "no" as const },
    ],
  },
  {
    title: "Credentials & Secrets",
    features: [
      { name: "Config file credential scan", ck: "yes" as const, oc: "no" as const },
      { name: "Shell history scan", ck: "yes" as const, oc: "no" as const },
      { name: "MEMORY.md credential scan", ck: "yes" as const, oc: "no" as const },
      { name: "Session log credential scan", ck: "yes" as const, oc: "no" as const },
      { name: "Credential store permissions", ck: "yes" as const, oc: "no" as const },
      { name: "OAuth profile permissions", ck: "yes" as const, oc: "no" as const },
      { name: ".env file permissions", ck: "yes" as const, oc: "no" as const },
      { name: "Session prompt injection scan", ck: "yes" as const, oc: "no" as const },
      { name: "Memory prompt injection scan", ck: "yes" as const, oc: "no" as const },
      { name: "Session rogue command scan", ck: "yes" as const, oc: "no" as const },
      { name: "Log file content scan", ck: "yes" as const, oc: "no" as const },
      { name: "detect-secrets CI integration", ck: "no" as const, oc: "yes" as const },
    ],
  },
  {
    title: "Skills & SOUL.md",
    features: [
      { name: "Dangerous install commands", ck: "yes" as const, oc: "no" as const },
      { name: "Secret injection detection", ck: "yes" as const, oc: "no" as const },
      { name: "Data exfiltration patterns", ck: "yes" as const, oc: "no" as const },
      { name: "SOUL.md prompt injection", ck: "yes" as const, oc: "no" as const },
      { name: "SOUL.md base64 / Unicode steganography", ck: "yes" as const, oc: "no" as const },
      { name: "SOUL.md credential leaks", ck: "yes" as const, oc: "no" as const },
      { name: "Skills prompt injection detection", ck: "yes" as const, oc: "no" as const },
    ],
  },
  {
    title: "CVE & Version",
    features: [
      { name: "Known CVE detection", ck: "yes" as const, oc: "no" as const },
      { name: "Version currency check", ck: "yes" as const, oc: "no" as const },
    ],
  },
  {
    title: "Monitoring & Reporting",
    features: [
      { name: "A-F letter grade + score", ck: "yes" as const, oc: "no" as const },
      { name: "Fleet dashboard", ck: "yes" as const, oc: "no" as const },
      { name: "AI-powered security insights", ck: "yes" as const, oc: "no" as const },
      { name: "Score trend tracking", ck: "yes" as const, oc: "no" as const },
      { name: "Historical trending", ck: "yes" as const, oc: "no" as const },
      { name: "Email & webhook alerts", ck: "yes" as const, oc: "no" as const },
      { name: "Team management", ck: "yes" as const, oc: "no" as const },
    ],
  },
];

export default function OpenClawNativeComparePage() {
  const allFeatures: Feature[] = categories.flatMap((c) => c.features);
  const ckWins = allFeatures.filter((f) => f.ck === "yes" && f.oc !== "yes").length;
  const ocWins = allFeatures.filter((f) => f.oc === "yes" && f.ck !== "yes").length;
  const both = allFeatures.filter((f) => f.ck === "yes" && f.oc === "yes").length;

  return (
    <>
      <div className="mb-2">
        <Link
          href="/docs/checks"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          Docs
        </Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-sm text-zinc-300">Compare</span>
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Clawkeeper vs OpenClaw Native Security
      </h1>
      <p className="mb-6 text-zinc-400">
        How Clawkeeper compares to OpenClaw&apos;s built-in{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-sm">
          openclaw security audit
        </code>{" "}
        command.
      </p>

      {/* Score summary */}
      <div className="mb-8 grid grid-cols-3 gap-4 rounded-lg border border-white/10 bg-white/5 p-4 text-center">
        <div>
          <div className="text-2xl font-bold text-cyan-400">{ckWins}</div>
          <div className="text-xs text-zinc-500">Clawkeeper only</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-zinc-400">{both}</div>
          <div className="text-xs text-zinc-500">Both</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-400">{ocWins}</div>
          <div className="text-xs text-zinc-500">OpenClaw only</div>
        </div>
      </div>

      {/* Key differentiator */}
      <div className="mb-8 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="mb-1 flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-semibold text-cyan-400">
            Key Differentiator
          </span>
        </div>
        <p className="text-sm text-zinc-300">
          OpenClaw&apos;s audit tells you if the front door is locked. Clawkeeper
          checks the front door, back door, windows, foundation, roof, alarm system,
          and the neighborhood. Clawkeeper starts where OpenClaw&apos;s audit stops.
        </p>
      </div>

      {/* Overview table */}
      <h2 className="mb-4 text-xl font-bold text-white">At a Glance</h2>
      <div className="mb-8 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold text-zinc-400" />
              <th className="px-4 py-2 text-xs font-semibold text-cyan-400">
                Clawkeeper
              </th>
              <th className="px-4 py-2 text-xs font-semibold text-purple-400">
                OpenClaw Native
              </th>
            </tr>
          </thead>
          <tbody>
            {overview.map((row) => (
              <tr key={row.label} className="border-b border-white/5">
                <td className="px-4 py-2 font-medium text-zinc-300">
                  {row.label}
                </td>
                <td className="px-4 py-2 text-zinc-400">{row.ck}</td>
                <td className="px-4 py-2 text-zinc-400">{row.oc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature comparison by category */}
      {categories.map((cat) => (
        <section key={cat.title} className="mb-8">
          <h2 className="mb-3 text-lg font-bold text-white">{cat.title}</h2>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-zinc-400">
                    Feature
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-cyan-400">
                    Clawkeeper
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-purple-400">
                    OpenClaw
                  </th>
                </tr>
              </thead>
              <tbody>
                {cat.features.map((f) => (
                  <tr key={f.name} className="border-b border-white/5">
                    <td className="px-4 py-2 text-zinc-300">{f.name}</td>
                    <td className="px-4 py-2">
                      <StatusIcon status={f.ck} />
                    </td>
                    <td className="px-4 py-2">
                      <StatusIcon status={f.oc} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Honest assessment */}
      <h2 className="mb-4 text-xl font-bold text-white">
        Where OpenClaw Native Excels
      </h2>
      <div className="mb-8 space-y-3 text-sm text-zinc-400">
        <p>
          <strong className="text-purple-400">Live gateway probing</strong> —
          The <code className="rounded bg-white/10 px-1">--deep</code> flag probes live gateway
          connections, detecting real-time exposure that static config analysis can miss.
        </p>
        <p>
          <strong className="text-purple-400">Zero setup</strong> —
          Already built into OpenClaw. No additional installation or configuration needed.
        </p>
        <p>
          <strong className="text-purple-400">detect-secrets CI integration</strong> —
          Provides a CI-level secret scanning baseline workflow for code repositories.
        </p>
      </div>

      {/* Recommendation */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="mb-2 text-lg font-bold text-white">Recommendation</h2>
        <p className="text-sm text-zinc-400">
          Use both. Run <code className="rounded bg-white/10 px-1">openclaw security audit</code>{" "}
          for its built-in checks and live probing. Run Clawkeeper for the 33+ additional
          checks covering your host OS, containers, network, credentials, CVEs, and skills.
          The CLI is free — there&apos;s no reason not to layer both.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/docs/checks"
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            View all 44 checks
          </Link>
          <Link
            href="/docs/compare/clawsec"
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            Compare vs ClawSec
          </Link>
        </div>
      </div>
    </>
  );
}
