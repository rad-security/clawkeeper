"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, X } from "lucide-react";
import { useState } from "react";

interface UpgradeBannerProps {
  creditsRemaining?: number;
}

export function UpgradeBanner({ creditsRemaining }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isLowCredits = creditsRemaining !== undefined && creditsRemaining <= 1;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-3">
      <Zap className="h-5 w-5 shrink-0 text-cyan-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cyan-300">
          {isLowCredits
            ? `${creditsRemaining === 0 ? "No" : creditsRemaining} scan credit${creditsRemaining === 1 ? "" : "s"} remaining`
            : "Upgrade to Pro for fleet monitoring"
          }
        </p>
        <p className="text-xs text-cyan-400/70">
          {isLowCredits
            ? "Upgrade to Pro for 200 scans/month with rollover — from $16/mo. Or refer a friend for +5 bonus credits."
            : "200 scans/month, CVE intelligence, AI insights, alerts, score trends, 365-day history — from $16/mo."
          }
        </p>
      </div>
      <Link href="/upgrade">
        <Button size="sm" className="shrink-0 bg-cyan-500 text-black font-medium hover:bg-cyan-400">
          Upgrade
        </Button>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-zinc-500 hover:text-zinc-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
