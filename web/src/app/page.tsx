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
  Monitor,
  Bell,
  BarChart3,
  Terminal,
  Clock,
  Check,
  Building2,
  Bug,
  KeyRound,
} from "lucide-react";
import { CopyCommand } from "@/components/landing/CopyCommand";

const features = [
  {
    icon: Terminal,
    title: "One-Line Install",
    description:
      "Scan any OpenClaw installation with a single command. Works on macOS and Linux — no EDR, no dependencies, no account required for the CLI.",
  },
  {
    icon: Bug,
    title: "Malicious Skill Detection",
    description:
      "Detect known-malicious and suspicious skills from ClawHub. Clawkeeper checks installed skills against a threat intelligence feed.",
  },
  {
    icon: KeyRound,
    title: "Credential Exposure Checks",
    description:
      "Find leaked API keys, tokens, and secrets in OpenClaw config files, environment variables, and skill data directories.",
  },
  {
    icon: Monitor,
    title: "Multi-Instance Monitoring",
    description:
      "Track security posture across all your OpenClaw deployments in one dashboard. See grades, scores, and trends at a glance.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get notified when grades drop, new skills are installed, credentials are exposed, or scores fall below thresholds.",
  },
  {
    icon: BarChart3,
    title: "Score History & Trends",
    description:
      "Visualize how your OpenClaw security posture changes over time. Catch config drift and regressions before they become incidents.",
  },
  {
    icon: Shield,
    title: "CVE & Version Checks",
    description:
      "Detect outdated OpenClaw versions with known CVEs like CVE-2026-25253 (WebSocket RCE). Stay ahead of public exploits.",
  },
  {
    icon: Clock,
    title: "Continuous Compliance",
    description:
      "OpenClaw configurations drift over time. Hourly scans catch changes as they happen, not weeks later during an audit.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">Clawkeeper</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </a>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center">
        <Badge variant="secondary" className="mb-4">
          Open source CLI + SaaS dashboard
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Secure your OpenClaw
          <br />
          <span className="text-primary">AI agent deployment</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          OpenClaw has 180k+ stars and critical security gaps. Clawkeeper scans
          your installation for misconfigurations, exposed credentials, malicious
          skills, and known CVEs — then gives you a letter grade and a plan to fix it.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/signup">
            <Button size="lg">Start free</Button>
          </Link>
          <a
            href="https://github.com/clawkeeper/clawkeeper"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg">
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Copyable install command */}
        <div className="mt-6 w-full max-w-lg">
          <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
        </div>

        {/* Terminal mockup */}
        <div className="mt-12 w-full max-w-2xl overflow-hidden rounded-lg border bg-zinc-950 text-left">
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-zinc-500">Terminal</span>
          </div>
          <pre className="overflow-x-auto p-4 text-sm text-green-400">
{`$ clawkeeper scan

  Clawkeeper v1.0 — OpenClaw Security Scanner

  Scanning OpenClaw installation...

  ✓ OpenClaw v0.42.1 detected (⚠ CVE-2026-25253 applies)
  ✓ WebSocket binding: localhost only
  ✗ API keys exposed in ~/.openclaw/config.yaml
  ✗ 2 suspicious skills detected (flagged on ClawHub)
  ✓ Auth enabled on admin interface
  ✗ No firewall rule for port 3000

  Security Grade: C (68/100)
  ✓ Passed: 14   ✗ Failed: 5   ⊘ Skipped: 2

  Run clawkeeper scan --fix to auto-remediate where possible.`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">
            Everything you need to secure OpenClaw
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            From a single-machine scan to org-wide continuous monitoring of every
            OpenClaw instance.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <f.icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{f.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            The CLI is free and open source. Add the dashboard when you need
            fleet-wide visibility and alerts.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Free */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <div className="text-3xl font-bold">
                  $0<span className="text-base font-normal text-muted-foreground">/mo</span>
                </div>
                <CardDescription>
                  Perfect for individual developers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    "1 OpenClaw instance",
                    "7 days scan history",
                    "1 API key",
                    "Dashboard overview",
                    "Grade & score tracking",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 block">
                  <Button variant="outline" className="w-full">
                    Get started free
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Pro</CardTitle>
                  <Badge>Popular</Badge>
                </div>
                <div className="text-3xl font-bold">
                  $29<span className="text-base font-normal text-muted-foreground">/mo</span>
                </div>
                <CardDescription>
                  For teams running OpenClaw across multiple machines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    "Up to 50 instances",
                    "365 days scan history",
                    "10 API keys",
                    "Email alerts (grade drop, skill install, credential exposure)",
                    "Up to 20 alert rules",
                    "Priority support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="mt-6 block">
                  <Button className="w-full">Upgrade to Pro</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">Enterprise</CardTitle>
                </div>
                <div className="text-3xl font-bold">
                  Custom
                </div>
                <CardDescription>
                  Fleet-wide OpenClaw security with RAD Security platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {[
                    "Unlimited instances",
                    "Kubernetes-native discovery",
                    "Runtime behavioral analysis",
                    "SSO / SAML integration",
                    "SIEM & SOAR integrations",
                    "Dedicated support & SLA",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:sales@clawkeeper.dev"
                  className="mt-6 block"
                >
                  <Button variant="outline" className="w-full">
                    Contact us
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Clawkeeper
          </div>
          <p className="text-sm text-muted-foreground">
            By RAD Security
          </p>
        </div>
      </footer>
    </div>
  );
}
