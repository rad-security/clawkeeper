import type { Metadata } from "next";
import {
  Download,
  Apple,
  Terminal,
  Container,
  Shield,
  Puzzle,
  Activity,
} from "lucide-react";
import { TutorialCard } from "@/components/tutorials/TutorialCard";

export const metadata: Metadata = {
  title: "Tutorials — Learn OpenClaw Security | Clawkeeper",
  description:
    "Step-by-step tutorials for installing, hardening, and securing OpenClaw deployments on macOS and Linux. Learn Docker setup, security audits, skills vetting, and continuous monitoring.",
  openGraph: {
    title: "Tutorials — Learn OpenClaw Security",
    description:
      "Step-by-step tutorials for installing, hardening, and securing OpenClaw deployments.",
    type: "website",
    url: "https://clawkeeper.dev/tutorials",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tutorials — Learn OpenClaw Security",
    description:
      "Step-by-step tutorials for installing, hardening, and securing OpenClaw deployments.",
  },
};

const tutorials = [
  {
    href: "/tutorials/install-openclaw",
    icon: Download,
    title: "Install OpenClaw Securely",
    description:
      "Three installation methods — npm, Docker, and VPS — with security verification for each approach.",
    difficulty: "Beginner" as const,
    minutes: 10,
  },
  {
    href: "/tutorials/harden-macos-for-openclaw",
    icon: Apple,
    title: "Harden macOS for OpenClaw",
    description:
      "Lock down firewall, FileVault, network services, and 15 macOS-specific security settings.",
    difficulty: "Beginner" as const,
    minutes: 15,
  },
  {
    href: "/tutorials/harden-linux-for-openclaw",
    icon: Terminal,
    title: "Harden Linux for OpenClaw",
    description:
      "SSH hardening, firewall rules, fail2ban, auto-updates, and 9 Linux server security checks.",
    difficulty: "Intermediate" as const,
    minutes: 15,
  },
  {
    href: "/tutorials/deploy-openclaw-docker",
    icon: Container,
    title: "Deploy OpenClaw in Docker",
    description:
      "Production-ready Docker Compose with container hardening, volume mounts, and network isolation.",
    difficulty: "Intermediate" as const,
    minutes: 12,
  },
  {
    href: "/tutorials/openclaw-security-audit",
    icon: Shield,
    title: "OpenClaw Security Audit",
    description:
      "Audit versions, CVEs, config, credentials, prompt injection, rogue commands, and hardening settings with all 13 security checks.",
    difficulty: "Intermediate" as const,
    minutes: 20,
  },
  {
    href: "/tutorials/openclaw-skills-security",
    icon: Puzzle,
    title: "Skills Security",
    description:
      "Vet ClawHub skills for supply chain risks, detect dangerous patterns, and protect SOUL.md integrity.",
    difficulty: "Advanced" as const,
    minutes: 15,
  },
  {
    href: "/tutorials/continuous-monitoring",
    icon: Activity,
    title: "Continuous Monitoring",
    description:
      "Set up automated scanning with launchd/systemd, grade tracking, alerts, and multi-host scaling.",
    difficulty: "Advanced" as const,
    minutes: 18,
  },
];

export default function TutorialsIndexPage() {
  return (
    <div>
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Tutorials</h1>
      <p className="mb-10 text-lg text-zinc-400">
        Step-by-step guides to install, harden, and monitor OpenClaw securely.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {tutorials.map((t) => (
          <TutorialCard key={t.href} {...t} />
        ))}
      </div>
    </div>
  );
}
