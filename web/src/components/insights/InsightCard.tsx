"use client";

import { useState } from "react";
import { ChevronDown, X, ExternalLink, ShieldAlert, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Insight, InsightSeverity } from "@/types";

const SEVERITY_BORDER: Record<InsightSeverity, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-blue-500",
  info: "border-l-zinc-400",
};

const SEVERITY_BADGE: Record<InsightSeverity, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  info: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    try {
      const res = await fetch("/api/dashboard/insights", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: insight.id }),
      });
      if (res.ok) {
        setDismissed(true);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setDismissing(false);
    }
  }

  if (dismissed) return null;

  return (
    <Card className={cn("border-l-4", SEVERITY_BORDER[insight.severity])}>
      <CardContent className="space-y-3 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-[10px] uppercase", SEVERITY_BADGE[insight.severity])}
              >
                {insight.severity}
              </Badge>
              <span className="font-medium">{insight.title}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {insight.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
            disabled={dismissing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* CVE-specific info */}
        {insight.insight_type === "cve_vulnerability" && insight.metadata && (() => {
          const cveId = String(insight.metadata.cve_id || "");
          const packages = String(insight.metadata.packages || "");
          const fixVersion = String(insight.metadata.fix_version || "");
          return (
            <div className="flex flex-wrap items-center gap-2">
              {cveId && (
                <a
                  href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <ShieldAlert className="h-3 w-3" />
                  {cveId}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {packages && (
                <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                  <Package className="mr-1 h-3 w-3" />
                  {packages}
                </Badge>
              )}
              {fixVersion && (
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">
                  Fix: &gt;= {fixVersion}
                </Badge>
              )}
            </div>
          );
        })()}

        {/* Affected hosts */}
        {insight.affected_hosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {insight.affected_hosts.map((h) => (
              <Badge key={h.host_id} variant="secondary" className="text-xs">
                {h.hostname}
              </Badge>
            ))}
          </div>
        )}

        {/* Expandable remediation */}
        <details
          className="group"
          open={expanded}
          onToggle={(e) => setExpanded((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            Remediation
          </summary>
          <div className="mt-2 rounded-md bg-muted/50 p-3 text-sm whitespace-pre-line">
            {insight.remediation}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
