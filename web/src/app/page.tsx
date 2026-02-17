import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Monitor,
  Bell,
  BarChart3,
  Terminal,
  Clock,
  Check,
  Bug,
  KeyRound,
  Zap,
  ArrowRight,
  Fingerprint,
  Layers,
  Globe,
  AlertTriangle,
  Container,
  Eye,
  Network,
  Apple,
  Download,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { CopyCommand } from "@/components/landing/CopyCommand";
import { PricingSection } from "@/components/landing/PricingSection";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* ───── Nav ───── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Logo className="text-white" />
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#problem"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Why
            </a>
            <a
              href="#features"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Features
            </a>
            <a
              href="#deploy"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Deploy
            </a>
            <a
              href="#pricing"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Pricing
            </a>
            <Link
              href="/docs"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Docs
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="btn-rad bg-cyan-500 text-black font-medium hover:bg-cyan-400"
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="hero-gradient grid-bg relative overflow-hidden">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-28 pt-24 text-center">
          <Badge className="mb-6 border-white/10 bg-white/5 text-zinc-300 backdrop-blur">
            Created by RAD Security, the leaders in agent AI security
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your AI agents
            <br />
            <span className="gradient-text">are&nbsp;exposed.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            OpenClaw has 180,000+ stars and zero built&#8209;in security.
            Exposed API keys, malicious skills from ClawHub, unpatched RCE
            vulnerabilities — one scan reveals what attackers already see.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-rad bg-cyan-500 px-8 text-black font-medium hover:bg-cyan-400"
              >
                Start free scan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <a href="#enterprise">
              <Button
                variant="outline"
                size="lg"
                className="btn-rad border-white/10 px-8 text-zinc-300 hover:border-white/20 hover:text-white"
              >
                Enterprise K8s security
              </Button>
            </a>
          </div>

          {/* Install options */}
          <div className="mt-8 w-full max-w-lg">
            <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500">
            <a
              href="https://github.com/clawkeeper/clawkeeper/releases/latest/download/Clawkeeper.dmg"
              className="flex items-center gap-1.5 transition hover:text-zinc-300"
            >
              <Apple className="h-3.5 w-3.5" />
              macOS app
            </a>
            <span className="text-zinc-700">|</span>
            <a
              href="#deploy"
              className="flex items-center gap-1.5 transition hover:text-zinc-300"
            >
              <Container className="h-3.5 w-3.5" />
              Kubernetes + Helm
            </a>
          </div>

          {/* Terminal mockup */}
          <div className="glow-cyan mt-14 w-full max-w-2xl overflow-hidden rounded-xl border border-white/10 bg-black text-left">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <div className="h-3 w-3 rounded-full bg-green-500/80" />
              <span className="ml-2 text-xs text-zinc-600">
                clawkeeper scan
              </span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-cyan-400/90">
              {`$ clawkeeper scan

  Clawkeeper v1.0 — OpenClaw Security Scanner

  Phase 1: Host Hardening
  ✓ Firewall enabled              ✓ Disk encryption on
  ✗ SSH password auth enabled     ✓ Auto-updates active

  Phase 2: Network Security
  ✓ WebSocket binding: localhost   ✗ Port 3000 exposed to 0.0.0.0

  Phase 3: Prerequisites
  ✓ Node.js 22.5.0                ✓ Docker 27.1.1 running

  Phase 4: OpenClaw Installation
  ✓ OpenClaw v0.42.1 installed    ✓ Running on port 3000

  Phase 5: Security Audit
  ✓ OpenClaw v0.42.1 detected     ⚠ CVE-2026-25253 applies
  ✗ API keys in ~/.openclaw/config.yaml
  ✗ 2 suspicious skills flagged on ClawHub
  ✓ Auth enabled on admin interface

  Security Grade: C  (68/100)
  ── 14 passed  2 fixed  5 failed  2 skipped ──

  Run clawkeeper scan --fix to auto-remediate.`}
            </pre>
          </div>
        </div>
      </section>

      {/* ───── Stats bar ───── */}
      <section className="border-y border-white/10 bg-zinc-950">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">
          {[
            { value: "35+", label: "Security checks" },
            { value: "180k+", label: "OpenClaw installs at risk" },
            { value: "<60s", label: "Time to first scan" },
            { value: "A–F", label: "Letter grade scoring" },
          ].map((s) => (
            <div key={s.label} className="px-6 py-6 text-center">
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-sm text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Problem section ───── */}
      <section id="problem" className="section-glow py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/10 bg-white/5 text-zinc-400">
              The problem
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              OpenClaw wasn&apos;t built to be secure.
              <br />
              <span className="text-zinc-500">
                Every installation is a liability.
              </span>
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              AI agents run with broad system access, execute arbitrary code, and
              pull skills from an unvetted marketplace. Without hardening, every
              OpenClaw instance is an open door.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: KeyRound,
                title: "Exposed Credentials",
                description:
                  "API keys, tokens, and secrets stored in plain text config files. One leaked key compromises your entire infrastructure.",
                color: "text-red-400",
              },
              {
                icon: Bug,
                title: "Malicious Skills",
                description:
                  "ClawHub skills run with full agent permissions. No vetting, no sandboxing, no integrity checks. Supply chain attacks are trivial.",
                color: "text-orange-400",
              },
              {
                icon: AlertTriangle,
                title: "Unpatched CVEs",
                description:
                  "CVE-2026-25253 enables WebSocket RCE on any OpenClaw instance. Most deployments are still running vulnerable versions.",
                color: "text-yellow-400",
              },
              {
                icon: Eye,
                title: "Config Drift",
                description:
                  "Developers change settings, disable auth, open ports. Without monitoring, secure configs quietly become insecure over weeks.",
                color: "text-cyan-400",
              },
            ].map((p) => (
              <Card key={p.title} className="border-white/10 bg-zinc-900/50">
                <CardHeader>
                  <p.icon className={`mb-2 h-8 w-8 ${p.color}`} />
                  <CardTitle className="text-base text-white">{p.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed text-zinc-500">
                    {p.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How it works ───── */}
      <section className="border-t border-white/10 bg-zinc-950 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4 border-white/10 bg-white/5 text-zinc-400">
              How it works
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Secure in 60 seconds
            </h2>
            <p className="mt-4 text-zinc-400">
              One command. No agents, no dependencies, no account required.
            </p>
          </div>

          <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                icon: Terminal,
                title: "Install",
                description:
                  "One curl command downloads the scanner. Pure bash — runs on any macOS or Linux machine. Nothing to configure.",
              },
              {
                step: "02",
                icon: ShieldCheck,
                title: "Scan",
                description:
                  "35+ automated checks across 5 phases: host hardening, network, prerequisites, installation, and security audit. Results in under 60 seconds.",
              },
              {
                step: "03",
                icon: Zap,
                title: "Fix",
                description:
                  "Get a letter grade (A–F), a prioritized fix list, and auto-remediation for common issues. Run --fix to patch what can be patched automatically.",
              },
              {
                step: "04",
                icon: Monitor,
                title: "Monitor",
                description:
                  "Connect to the Pro dashboard to track every host in one view. Get alerts on grade drops, new skills, and config drift across your fleet.",
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <s.icon className="h-7 w-7 text-cyan-400" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-cyan-400">
                  Step {s.step}
                </div>
                <h3 className="text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {s.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Feature tiers ───── */}
      <section id="features" className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/10 bg-white/5 text-zinc-400">
              Features
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Security that scales with you
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Start with a free CLI scan. Add monitoring as you grow. Deploy
              hardened K8s clusters when you go to production.
            </p>
          </div>

          {/* Tier 1: Free */}
          <div className="mt-20">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <Terminal className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Instant Security Scan</h3>
                <p className="text-sm text-zinc-500">
                  Free forever — no account required
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Terminal,
                  title: "One-Line Install",
                  desc: "Single curl command. Pure bash, zero dependencies. Works on macOS and Linux.",
                },
                {
                  icon: Bug,
                  title: "Malicious Skill Detection",
                  desc: "Scans installed skills against a curated threat intelligence feed from ClawHub.",
                },
                {
                  icon: KeyRound,
                  title: "Credential Exposure",
                  desc: "Finds leaked API keys, tokens, and secrets in configs, env vars, and skill data.",
                },
                {
                  icon: ShieldAlert,
                  title: "CVE Detection",
                  desc: "Detects outdated versions with known vulnerabilities like CVE-2026-25253 (WebSocket RCE).",
                },
              ].map((f) => (
                <Card key={f.title} className="border-white/10 bg-zinc-900/50">
                  <CardHeader className="pb-2">
                    <f.icon className="mb-1 h-5 w-5 text-zinc-400" />
                    <CardTitle className="text-sm text-white">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed text-zinc-500">
                      {f.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tier 2: Pro */}
          <div className="mt-20">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                <Monitor className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Continuous Monitoring</h3>
                <p className="text-sm text-zinc-500">
                  Pro — $29/host/month for teams
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Monitor,
                  title: "Fleet Dashboard",
                  desc: "See every OpenClaw instance, grade, and score in one view. Spot the weakest links instantly.",
                },
                {
                  icon: Bell,
                  title: "Smart Alerts",
                  desc: "Get notified on grade drops, new skill installs, credential exposures, or score thresholds.",
                },
                {
                  icon: BarChart3,
                  title: "Score History",
                  desc: "Track security posture over time. Catch config drift and regressions before incidents.",
                },
                {
                  icon: Clock,
                  title: "Continuous Scans",
                  desc: "Automated scheduled scans catch changes as they happen, not weeks later during an audit.",
                },
              ].map((f) => (
                <Card
                  key={f.title}
                  className="border-cyan-500/20 bg-cyan-500/5"
                >
                  <CardHeader className="pb-2">
                    <f.icon className="mb-1 h-5 w-5 text-cyan-400" />
                    <CardTitle className="text-sm text-white">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed text-zinc-500">
                      {f.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="mt-20">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
                <Container className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Hardened Kubernetes Deployment
                </h3>
                <p className="text-sm text-zinc-500">
                  Enterprise — $149/cluster/month
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Layers,
                  title: "Hardened Helm Charts",
                  desc: "Production-ready OpenClaw deployed with security-first defaults. NetworkPolicies, RBAC, read-only rootfs.",
                },
                {
                  icon: Fingerprint,
                  title: "Runtime Detection",
                  desc: "eBPF-powered behavioral fingerprinting catches anomalous agent behavior in real time. Zero overhead.",
                },
                {
                  icon: Network,
                  title: "KSPM & Compliance",
                  desc: "Real-time Kubernetes Security Posture Management. Continuous compliance against CIS, NSA, and custom benchmarks.",
                },
                {
                  icon: Globe,
                  title: "Multi-Cloud Deploy",
                  desc: "One-click deployment to AWS EKS, GCP GKE, or Azure AKS. Terraform and Helm for your IaC pipeline.",
                },
              ].map((f) => (
                <Card key={f.title} className="border-violet-500/20 bg-violet-500/5">
                  <CardHeader className="pb-2">
                    <f.icon className="mb-1 h-5 w-5 text-violet-400" />
                    <CardTitle className="text-sm text-white">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed text-zinc-500">
                      {f.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Enterprise — RAD Security ───── */}
      <section
        id="enterprise"
        className="enterprise-gradient relative overflow-hidden border-t border-white/10 py-24"
      >
        <div className="grid-bg absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left: copy */}
            <div>
              <Badge className="mb-6 border-violet-500/30 bg-violet-500/10 text-violet-300">
                Powered by RAD Security
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                OpenClaw + RAD Security.
                <br />
                <span className="gradient-text">One Helm chart.</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-zinc-400">
                In production, your AI agents run in Kubernetes. The Clawkeeper
                Helm chart deploys OpenClaw bundled with RAD Security&apos;s
                runtime protection — so you get a hardened agent deployment and
                continuous security monitoring from a single install.
              </p>
              <p className="mt-4 leading-relaxed text-zinc-500">
                No separate security tooling to configure. No bolting things on
                after the fact. One chart gives you the AI agent and the
                security layer it needs, working together from day one.
              </p>

              <div className="glow-magenta mt-8 w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-black">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <pre className="overflow-x-auto p-4 font-mono text-sm text-violet-400/90">
                  {`$ helm repo add clawkeeper https://charts.clawkeeper.dev
$ helm install openclaw clawkeeper/openclaw-stack \\
    --set rad.enabled=true`}
                </pre>
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/demo">
                  <Button
                    size="lg"
                    className="btn-rad bg-violet-500 px-8 text-white font-medium hover:bg-violet-400"
                  >
                    Schedule a demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#pricing">
                  <Button
                    variant="outline"
                    size="lg"
                    className="btn-rad border-white/10 px-8 text-zinc-300 hover:border-white/20 hover:text-white"
                  >
                    See pricing
                  </Button>
                </a>
              </div>
            </div>

            {/* Right: what's in the chart */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                What&apos;s in the chart
              </h3>
              {[
                {
                  icon: Container,
                  title: "Hardened OpenClaw",
                  desc: "Production-ready OpenClaw deployment with security-first defaults, non-root containers, and locked-down configurations.",
                },
                {
                  icon: Shield,
                  title: "RAD Security Runtime",
                  desc: "Continuous runtime protection for your AI agents. Detect anomalous behavior, enforce policies, and respond to threats automatically.",
                },
                {
                  icon: ShieldCheck,
                  title: "Security Posture Management",
                  desc: "Ongoing compliance monitoring for your cluster. Know when configurations drift and catch issues before they become incidents.",
                },
                {
                  icon: Monitor,
                  title: "Unified Dashboard",
                  desc: "One view for agent health, security grades, and runtime alerts. The same Clawkeeper dashboard you already use, with enterprise data.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                >
                  <div className="flex items-start gap-4">
                    <c.icon className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {c.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                        {c.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* RAD Security trust badge */}
              <div className="gradient-border flex items-center gap-3 rounded-xl px-5 py-3 backdrop-blur">
                <Shield className="h-5 w-5 shrink-0 text-cyan-400" />
                <p className="text-xs text-zinc-400">
                  Powered by{" "}
                  <span className="font-semibold text-white">
                    RAD Security
                  </span>{" "}
                  — cloud-native runtime security for Kubernetes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Deploy ───── */}
      <section id="deploy" className="border-t border-white/10 bg-zinc-950 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4 border-white/10 bg-white/5 text-zinc-400">
              Deploy
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              One product, three ways to deploy
            </h2>
            <p className="mt-4 text-zinc-400">
              Same security checks. Same dashboard. Choose the deployment
              method that fits your environment.
            </p>
          </div>
          <div className="mx-auto mt-12 grid gap-6 lg:grid-cols-3">
            {/* CLI */}
            <Card className="flex flex-col border-white/10 bg-zinc-900/50">
              <CardHeader>
                <Terminal className="mb-2 h-8 w-8 text-zinc-400" />
                <CardTitle className="text-base text-white">CLI</CardTitle>
                <CardDescription className="text-zinc-500">
                  One-line install for macOS and Linux. Scan from your terminal
                  with zero dependencies.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3">
                <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
                <ul className="flex-1 space-y-2 text-sm text-zinc-400">
                  {[
                    "No account required",
                    "Interactive setup wizard",
                    "macOS + Linux",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Desktop app */}
            <Card className="flex flex-col border-cyan-500/30 bg-cyan-500/5">
              <CardHeader>
                <Download className="mb-2 h-8 w-8 text-cyan-400" />
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-white">Desktop App</CardTitle>
                  <Badge className="bg-cyan-500 text-black">New</Badge>
                </div>
                <CardDescription className="text-zinc-500">
                  Native macOS app. Visual scan results, guided deployment, and
                  security grade at a glance.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3">
                <a
                  href="https://github.com/clawkeeper/clawkeeper/releases/latest/download/Clawkeeper.dmg"
                  className="btn-rad flex items-center justify-center gap-2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-cyan-400"
                >
                  <Apple className="h-4 w-4" />
                  Download for macOS
                </a>
                <ul className="flex-1 space-y-2 text-sm text-zinc-400">
                  {[
                    "Real-time scan results",
                    "Guided Docker/native deploy",
                    "~5 MB native binary",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Kubernetes */}
            <Card className="flex flex-col border-violet-500/30 bg-violet-500/5">
              <CardHeader>
                <Container className="mb-2 h-8 w-8 text-violet-400" />
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-white">Kubernetes</CardTitle>
                  <Badge className="border-violet-500/30 bg-violet-500/10 text-violet-300">
                    Enterprise
                  </Badge>
                </div>
                <CardDescription className="text-zinc-500">
                  Deploy OpenClaw into Kubernetes with a Helm chart that bundles
                  hardened defaults and{" "}
                  <span className="font-medium text-white">
                    RAD Security
                  </span>{" "}
                  runtime protection.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col space-y-3">
                <CopyCommand command="helm install openclaw clawkeeper/openclaw-stack" />
                <ul className="flex-1 space-y-2 text-sm text-zinc-400">
                  {[
                    "OpenClaw + RAD Security in one chart",
                    "Runtime detection & KSPM",
                    "Production-ready security defaults",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-violet-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/demo">
                  <Button
                    variant="outline"
                    className="btn-rad w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                  >
                    Schedule a demo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="border-t border-white/10 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Badge className="mb-4 border-white/10 bg-white/5 text-zinc-400">
              Pricing
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start free. Scale when ready.
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              The CLI is free and open source forever. Add monitoring for your
              team or hardened K8s deployment for production.
            </p>
          </div>

          <PricingSection />
        </div>
      </section>

      {/* ───── Social proof / Trust ───── */}
      <section className="border-t border-white/10 bg-zinc-950 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h3 className="text-center text-lg font-semibold text-white">
            Created by RAD Security, the leaders in agent AI security
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-zinc-500">
            RAD Security is the cloud-native runtime security platform built on
            eBPF. Trusted by enterprises for Kubernetes security posture
            management, behavioral fingerprinting, and identity threat
            detection. Clawkeeper extends that expertise to the fastest-growing
            AI agent framework in the world.
          </p>

          {/* Trust stats */}
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "$20M+", label: "RAD Security funding" },
              { value: "Series A", label: "Backed by top VCs" },
              { value: "eBPF", label: "Kernel-level detection" },
              { value: "AWS", label: "EKS Add-on partner" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-bold gradient-text">{s.value}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="cta-gradient relative overflow-hidden border-t border-white/10 py-24">
        <div className="grid-bg absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start securing your AI agents
            <br />
            <span className="gradient-text">in 60 seconds.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            One command to scan. One dashboard to monitor. One platform to
            harden. No matter where you are on the journey, start now.
          </p>

          <div className="mx-auto mt-8 max-w-lg">
            <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-rad bg-cyan-500 px-8 text-black font-medium hover:bg-cyan-400"
              >
                Create free account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button
                variant="outline"
                size="lg"
                className="btn-rad border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
              >
                Talk to enterprise sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Logo className="text-white" />
              <p className="mt-3 text-sm text-zinc-500">
                Security scanner and hardening platform for OpenClaw AI agent
                deployments.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <a href="#features" className="hover:text-zinc-300">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-zinc-300">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#enterprise" className="hover:text-zinc-300">
                    Enterprise
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/clawkeeper/clawkeeper"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-white">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <Link href="/docs" className="hover:text-zinc-300">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-zinc-300">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <a href="#download" className="hover:text-zinc-300">
                    Download
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:support@clawkeeper.dev"
                    className="hover:text-zinc-300"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <a
                    href="https://rad.security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300"
                  >
                    RAD Security
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:sales@clawkeeper.dev"
                    className="hover:text-zinc-300"
                  >
                    Contact sales
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} RAD Security, Inc. All rights
              reserved.
            </p>
            <p className="text-xs text-zinc-600">
              Clawkeeper is not affiliated with or endorsed by the OpenClaw
              project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
