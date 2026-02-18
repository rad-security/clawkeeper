"use client";

import { Shield, MessageSquare, Terminal, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckStatusBadge } from "@/components/dashboard/CheckStatusBadge";
import type { ZoneAnalysis, ZoneName, ZoneStatus } from "@/lib/host-analysis";

const ZONE_ICON: Record<ZoneName, typeof Shield> = {
  gateway: Shield,
  channels: MessageSquare,
  tools: Terminal,
};

const STATUS_DOT: Record<ZoneStatus, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  unknown: "bg-zinc-400",
};

const STATUS_BORDER: Record<ZoneStatus, string> = {
  green: "border-l-emerald-500",
  yellow: "border-l-amber-500",
  red: "border-l-red-500",
  unknown: "border-l-zinc-400",
};

const ZONE_LABEL: Record<ZoneName, string> = {
  gateway: "Gateway",
  channels: "Channels",
  tools: "Tools & Sandbox",
};

export function ZoneCard({ zone }: { zone: ZoneAnalysis }) {
  const Icon = ZONE_ICON[zone.zone];

  return (
    <Card className={`border-l-4 ${STATUS_BORDER[zone.status]}`}>
      <CardContent className="pt-5 pb-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`inline-block size-2.5 rounded-full ${STATUS_DOT[zone.status]}`} />
            <Icon className="size-4 text-muted-foreground" />
            <span className="font-medium">{ZONE_LABEL[zone.zone]}</span>
          </div>
          <Badge variant="secondary" className="text-xs tabular-nums">
            {zone.passed}/{zone.total}
          </Badge>
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground">{zone.summary}</p>

        {/* Expandable check details */}
        {zone.checks.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              View checks
            </summary>
            <div className="mt-2 space-y-1.5">
              {zone.checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-start gap-2 text-sm py-1 px-1 rounded"
                >
                  <CheckStatusBadge status={check.status} />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">
                      {check.check_name}
                    </span>
                    <p className="text-xs text-muted-foreground truncate">
                      {check.friendlyDetail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
