"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, X } from "lucide-react";
import { useState } from "react";

export function UpgradeBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3">
      <Zap className="h-5 w-5 shrink-0 text-cyan-600" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cyan-900">
          Upgrade to Pro for fleet monitoring
        </p>
        <p className="text-xs text-cyan-700">
          Monitor up to 50 hosts with alerts, score trends, and 365-day history.
        </p>
      </div>
      <Link href="/upgrade">
        <Button size="sm" className="shrink-0 bg-cyan-600 text-white hover:bg-cyan-700">
          Upgrade
        </Button>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-cyan-400 hover:text-cyan-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
