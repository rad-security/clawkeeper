"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ArrowRight,
  Zap,
  Container,
  AlertTriangle,
} from "lucide-react";
import {
  PRO_FEATURES,
  ENTERPRISE_FEATURES,
  TIER_LIMITS,
  type PlanType,
} from "@/types";
import { toast } from "sonner";

interface UpgradeContentProps {
  plan: PlanType;
  hostCount: number;
  keyCount: number;
  limits: (typeof TIER_LIMITS)[PlanType];
  reason?: string;
}

const contextualHeaders: Record<string, { title: string; subtitle: string }> = {
  host_limit: {
    title: "You've reached your host limit",
    subtitle:
      "Upgrade to Pro to monitor up to 15 hosts with full security insights.",
  },
  insights: {
    title: "Unlock AI-powered security insights",
    subtitle:
      "Pro includes automated fleet analysis, CVE vulnerability detection, and remediation guidance.",
  },
  activity: {
    title: "See your full activity stream",
    subtitle:
      "Pro unlocks unlimited event history, audit trail, and fleet monitoring.",
  },
  alerts: {
    title: "Set up security alerts",
    subtitle:
      "Pro includes email and webhook alerts for grade drops, check failures, and new CVEs.",
  },
  notifications: {
    title: "Unlock email & webhook notifications",
    subtitle:
      "Get alerted instantly when Clawkeeper detects CVEs, credential exposures, misconfigurations, or grade drops on your hosts.",
  },
  dashboard: {
    title: "Upgrade to monitor your fleet continuously",
    subtitle:
      "Pro unlocks 200 scans/month, score trends, alerts, and AI insights so you can keep every host secure as you scale.",
  },
  low_credits: {
    title: "You're almost out of scan credits",
    subtitle:
      "Upgrade to Pro for 200 monthly credits with rollover and keep scanning without interruption.",
  },
  shield: {
    title: "Unlock Runtime Shield for active defense",
    subtitle:
      "Pro enables Runtime Shield with centralized policy, detection analytics, and host-level protection.",
  },
};

const defaultHeader = {
  title: "Unlock your full security posture",
  subtitle:
    "200 scans/month with rollover, CVE auditing, AI insights, alerts, and up to 15 hosts — from $16/mo.",
};

export function UpgradeContent({
  plan,
  hostCount,
  keyCount,
  limits,
  reason,
}: UpgradeContentProps) {
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const header = (reason && contextualHeaders[reason]) || defaultHeader;
  const proLimits = TIER_LIMITS.pro;
  const isAlreadyPro = plan === "pro" || plan === "enterprise";

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", billing, reason: reason || "upgrade_page" }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Contextual header */}
      <div>
        <h1 className="text-2xl font-bold">{header.title}</h1>
        <p className="text-muted-foreground">{header.subtitle}</p>
      </div>

      {/* Current usage meters */}
      {!isAlreadyPro && (
        <div className="grid gap-3 sm:grid-cols-3">
          <UsageMeter
            label="Hosts"
            current={hostCount}
            limit={limits.hosts}
            proLimit={proLimits.hosts}
            atLimit={limits.hosts > 0 && hostCount >= limits.hosts}
          />
          <UsageMeter
            label="API Keys"
            current={keyCount}
            limit={limits.api_keys}
            proLimit={proLimits.api_keys}
            atLimit={limits.api_keys > 0 && keyCount >= limits.api_keys}
          />
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm text-muted-foreground">Scan History</span>
            <div className="text-right">
              <p className="text-sm font-medium">{limits.scan_history_days} days</p>
              <p className="text-xs text-cyan-400">
                Pro: {proLimits.scan_history_days} days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Already on Pro */}
      {isAlreadyPro && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Check className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium">
                You&apos;re on the {plan === "enterprise" ? "Enterprise" : "Pro"} plan
              </p>
              <p className="text-xs text-muted-foreground">
                All Pro features are already unlocked.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing toggle */}
      {!isAlreadyPro && (
        <div className="flex items-center justify-center gap-1 rounded-full border p-1 w-fit mx-auto">
          <button
            onClick={() => setBilling("monthly")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              billing === "monthly"
                ? "bg-primary/10 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              billing === "annual"
                ? "bg-primary/10 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              Save 20%
            </Badge>
          </button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Pro */}
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-400" />
              <CardTitle>Pro</CardTitle>
            </div>
            <div className="text-3xl font-bold">
              {billing === "annual" ? "$16" : "$20"}
              <span className="text-base font-normal text-muted-foreground">
                /mo
              </span>
            </div>
            {billing === "annual" && (
              <p className="text-sm text-cyan-400">
                $192/year — save 20% vs monthly
              </p>
            )}
            {billing === "monthly" && (
              <p className="text-sm text-muted-foreground">
                Switch to annual and save 20%
              </p>
            )}
            <CardDescription>
              200 scans/month with rollover, full security platform with insights,
              alerts, and fleet monitoring for up to 15 hosts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>
            {!isAlreadyPro && (
              <Button
                className="mt-6 w-full bg-cyan-500 text-black font-medium hover:bg-cyan-400"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? "Redirecting to checkout..." : "Upgrade to Pro"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            )}
            {isAlreadyPro && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Current plan
              </p>
            )}
          </CardContent>
        </Card>

        {/* Enterprise */}
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Container className="h-5 w-5 text-violet-400" />
              <CardTitle>Enterprise</CardTitle>
            </div>
            <div className="text-3xl font-bold">Custom</div>
            <p className="text-sm text-violet-400">
              Tailored to your infrastructure and compliance needs
            </p>
            <CardDescription>
              Unlimited hosts, Kubernetes deployment, eBPF runtime detection,
              SSO, and dedicated support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {ENTERPRISE_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/demo" className="mt-6 block">
              <Button
                variant="outline"
                className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
              >
                Schedule a demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="space-y-4 pt-4">
        <h2 className="text-lg font-semibold">Common questions</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Can I cancel anytime?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Yes. Cancel from the billing portal — no long-term commitment. Your plan stays active until the end of the billing period.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">
              What happens if I downgrade?
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your scan data is preserved. Free tier limits (1 host, 7-day history) are reapplied. Hosts beyond the limit stop receiving new scans.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Need more than 15 hosts?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enterprise includes unlimited hosts plus Kubernetes, eBPF, and SSO.{" "}
              <Link href="/demo" className="text-violet-400 underline">
                Schedule a demo
              </Link>{" "}
              to discuss your needs.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">Do you offer invoicing?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enterprise customers can pay via invoice with NET-30 terms. Contact{" "}
              <a
                href="mailto:sales@clawkeeper.dev"
                className="text-cyan-400 underline"
              >
                sales@clawkeeper.dev
              </a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsageMeter({
  label,
  current,
  limit,
  proLimit,
  atLimit,
}: {
  label: string;
  current: number;
  limit: number;
  proLimit: number;
  atLimit: boolean;
}) {
  const fmtLimit = (v: number) => (v === -1 ? "Unlimited" : String(v));
  const pct = limit > 0 ? Math.min(100, (current / limit) * 100) : 0;

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          {atLimit && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          )}
          <span className="text-sm font-medium">
            {current}/{fmtLimit(limit)}
          </span>
        </div>
      </div>
      {limit > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              atLimit ? "bg-amber-500" : "bg-cyan-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-cyan-400">
        Pro: {fmtLimit(proLimit)}
      </p>
    </div>
  );
}
