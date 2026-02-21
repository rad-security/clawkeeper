import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Check, X, Minus } from "lucide-react";

export const metadata: Metadata = {
  title: "Clawkeeper vs ClawSec — Comparison",
  description:
    "Feature-by-feature comparison of Clawkeeper and ClawSec (Prompt Security) for OpenClaw security. See how 39 full-stack checks compare to skill-level advisory monitoring.",
  openGraph: {
    title: "Clawkeeper vs ClawSec — Full Comparison",
    description:
      "Clawkeeper covers the full stack with 39 checks. ClawSec focuses on skill advisories. See the detailed breakdown.",
  },
};

function StatusIcon({ status }: { status: "yes" | "no" | "partial" }) {
  if (status === "yes")
    return <Check className="mx-auto h-4 w-4 text-green-400" />;
  if (status === "partial")
    return <Minus className="mx-auto h-4 w-4 text-yellow-400" />;
  return <X className="mx-auto h-4 w-4 text-zinc-600" />;
}

const overview = [
  { label: "Type", ck: "External scanner + dashboard", cs: "OpenClaw skill (runs inside agent)" },
  { label: "Checks", ck: "39 automated across 5 phases", cs: "~12 (advisory + reputation + audit)" },
  { label: "Scope", ck: "Full-stack: host + network + container + config", cs: "OpenClaw-only: skills + advisories" },
  { label: "Platform", ck: "macOS + Linux (bare metal, Docker, K8s)", cs: "Any OS with Node.js" },
  { label: "Remediation", ck: "Interactive auto-fix for 20+ issues", cs: "Advisory-gated skill removal only" },
  { label: "Dashboard", ck: "Pro web dashboard with fleet monitoring", cs: "None (CLI output only)" },
  { label: "Deployment", ck: "Independent bash script (zero deps)", cs: "Installed as OpenClaw skill" },
  { label: "Pricing", ck: "Free CLI / from $16 Pro / Enterprise", cs: "Free (open source)" },
];

const features = [
  { name: "Host OS hardening (firewall, disk encryption, users)", ck: "yes" as const, cs: "no" as const },
  { name: "Network security (mDNS, ports, SSH, screen sharing)", ck: "yes" as const, cs: "no" as const },
  { name: "Container security (13 Docker sub-checks)", ck: "yes" as const, cs: "no" as const },
  { name: "Gateway config audit (bind, auth, UI, mDNS)", ck: "yes" as const, cs: "no" as const },
  { name: "Advanced gateway (elevated tools, browser, proxies)", ck: "yes" as const, cs: "no" as const },
  { name: "Sandbox & execution policy", ck: "yes" as const, cs: "no" as const },
  { name: "DM scope & policy", ck: "yes" as const, cs: "no" as const },
  { name: "Credential scanning (config, history, memory, sessions)", ck: "yes" as const, cs: "no" as const },
  { name: "Credential store permissions", ck: "yes" as const, cs: "no" as const },
  { name: "SOUL.md integrity (injection, steganography, base64)", ck: "yes" as const, cs: "no" as const },
  { name: "Skills static analysis (install cmds, exfiltration)", ck: "yes" as const, cs: "partial" as const },
  { name: ".env file security", ck: "yes" as const, cs: "no" as const },
  { name: "Session prompt injection detection", ck: "yes" as const, cs: "no" as const },
  { name: "Session rogue command scanning", ck: "yes" as const, cs: "no" as const },
  { name: "MEMORY.md prompt injection detection", ck: "yes" as const, cs: "no" as const },
  { name: "Skills prompt injection detection", ck: "yes" as const, cs: "no" as const },
  { name: "Log file content scanning", ck: "yes" as const, cs: "no" as const },
  { name: "CVE / version vulnerability check", ck: "yes" as const, cs: "yes" as const },
  { name: "Cryptographic advisory feed", ck: "no" as const, cs: "yes" as const },
  { name: "Skill reputation scoring (7-check system)", ck: "no" as const, cs: "yes" as const },
  { name: "Guarded skill installation hook", ck: "no" as const, cs: "yes" as const },
  { name: "Real-time advisory monitoring (heartbeat)", ck: "no" as const, cs: "yes" as const },
  { name: "Advisory suppression config", ck: "no" as const, cs: "yes" as const },
  { name: "A-F letter grade + scoring", ck: "yes" as const, cs: "no" as const },
  { name: "Interactive auto-fix (20+ remediations)", ck: "yes" as const, cs: "no" as const },
  { name: "Fleet monitoring dashboard", ck: "yes" as const, cs: "no" as const },
  { name: "AI-powered security insights", ck: "yes" as const, cs: "no" as const },
  { name: "Email & webhook alerting", ck: "yes" as const, cs: "no" as const },
  { name: "Score trend tracking", ck: "yes" as const, cs: "no" as const },
  { name: "Enterprise K8s + eBPF path", ck: "yes" as const, cs: "no" as const },
];

export default function ClawsecComparePage() {
  const ckWins = features.filter((f) => f.ck === "yes" && f.cs !== "yes").length;
  const csWins = features.filter((f) => f.cs === "yes" && f.ck !== "yes").length;
  const both = features.filter((f) => f.ck === "yes" && f.cs === "yes").length;

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
        Clawkeeper vs ClawSec
      </h1>
      <p className="mb-6 text-zinc-400">
        How Clawkeeper compares to{" "}
        <a
          href="https://github.com/prompt-security/clawsec"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:underline"
        >
          ClawSec by Prompt Security
        </a>
        , an OpenClaw skill suite for advisory monitoring and skill reputation.
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
          <div className="text-2xl font-bold text-amber-400">{csWins}</div>
          <div className="text-xs text-zinc-500">ClawSec only</div>
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
          ClawSec runs <strong>inside</strong> the agent to monitor skill advisories.
          Clawkeeper runs <strong>outside</strong> the agent to scan the entire deployment
          stack — host OS, network, containers, config, and credentials. They&apos;re
          complementary, not competing.
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
              <th className="px-4 py-2 text-xs font-semibold text-amber-400">
                ClawSec
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
                <td className="px-4 py-2 text-zinc-400">{row.cs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feature comparison */}
      <h2 className="mb-4 text-xl font-bold text-white">
        Feature-by-Feature Comparison
      </h2>
      <div className="mb-8 overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold text-zinc-400">
                Feature
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-cyan-400">
                Clawkeeper
              </th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-amber-400">
                ClawSec
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.name} className="border-b border-white/5">
                <td className="px-4 py-2 text-zinc-300">{f.name}</td>
                <td className="px-4 py-2">
                  <StatusIcon status={f.ck} />
                </td>
                <td className="px-4 py-2">
                  <StatusIcon status={f.cs} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* What ClawSec does better */}
      <h2 className="mb-4 text-xl font-bold text-white">
        Where ClawSec Excels
      </h2>
      <div className="mb-8 space-y-3 text-sm text-zinc-400">
        <p>
          <strong className="text-amber-400">Cryptographic advisory feed</strong> —
          ClawSec maintains a signed JSON feed with Ed25519 signatures and SHA-256
          checksums, automatically polling NVD for new OpenClaw CVEs via GitHub Actions.
        </p>
        <p>
          <strong className="text-amber-400">Skill reputation scoring</strong> —
          A 7-check system (existence, age, staleness, author reputation, downloads,
          VirusTotal, version validation) with a 0-100 score and configurable threshold.
        </p>
        <p>
          <strong className="text-amber-400">Guarded installation</strong> —
          Intercepts <code className="rounded bg-white/10 px-1">clawhub install</code>{" "}
          to block unsafe skills before they&apos;re installed. Clawkeeper scans
          post-installation.
        </p>
        <p>
          <strong className="text-amber-400">Real-time monitoring</strong> —
          Hook-based heartbeat runs every 5 minutes inside the agent, checking for
          new advisories matching installed skills.
        </p>
      </div>

      {/* What Clawkeeper does better */}
      <h2 className="mb-4 text-xl font-bold text-white">
        Where Clawkeeper Excels
      </h2>
      <div className="mb-8 space-y-3 text-sm text-zinc-400">
        <p>
          <strong className="text-cyan-400">Full-stack coverage</strong> — 43
          checks across host OS, network, containers, OpenClaw config, credentials,
          skills, CVEs, and SOUL.md. ClawSec only covers skills and advisories.
        </p>
        <p>
          <strong className="text-cyan-400">External trust boundary</strong> —
          Clawkeeper runs outside the agent as an independent bash script. If the
          agent is compromised, the scanner still works. ClawSec runs inside the agent.
        </p>
        <p>
          <strong className="text-cyan-400">Interactive remediation</strong> — Auto-fix
          for 20+ issues with user confirmation: firewalls, permissions, SSH hardening,
          skill quarantine, and more. ClawSec only removes skills matching advisories.
        </p>
        <p>
          <strong className="text-cyan-400">Fleet dashboard</strong> — Centralized
          web dashboard with historical trends, A-F grades, alert rules, and team
          management. ClawSec has no monitoring UI.
        </p>
        <p>
          <strong className="text-cyan-400">Enterprise path</strong> — Kubernetes
          hardening with eBPF runtime detection via RAD Security. ClawSec has no
          enterprise offering.
        </p>
      </div>

      {/* Recommendation */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h2 className="mb-2 text-lg font-bold text-white">Recommendation</h2>
        <p className="text-sm text-zinc-400">
          Use both. ClawSec and Clawkeeper are complementary — they cover different
          layers of the security stack with essentially zero overlap. ClawSec handles
          real-time advisory monitoring and supply-chain gating inside the agent.
          Clawkeeper handles full-stack security posture scanning from the outside.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/docs/checks"
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            View all 39 checks
          </Link>
          <Link
            href="/docs/compare/openclaw-native"
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
          >
            Compare vs OpenClaw Native
          </Link>
        </div>
      </div>
    </>
  );
}
