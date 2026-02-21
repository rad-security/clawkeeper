"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff } from "lucide-react";
import Link from "next/link";

interface ShieldStatusCardProps {
  shieldActive: boolean;
  shieldLastSeenAt: string | null;
  recentBlocks: number;
  hostId: string;
}

export function ShieldStatusCard({
  shieldActive,
  shieldLastSeenAt,
  recentBlocks,
  hostId,
}: ShieldStatusCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {shieldActive ? (
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle className="text-base">Runtime Shield</CardTitle>
          </div>
          <Badge
            variant="outline"
            className={
              shieldActive
                ? "border-cyan-500/30 text-cyan-400"
                : "border-muted-foreground/30 text-muted-foreground"
            }
          >
            {shieldActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Last Heartbeat</p>
            <p className="font-medium">
              {shieldLastSeenAt
                ? new Date(shieldLastSeenAt).toLocaleString()
                : "Never"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Recent Blocks (24h)</p>
            <p className="font-medium">{recentBlocks}</p>
          </div>
        </div>
        <Link
          href={`/shield?host_id=${hostId}`}
          className="inline-block text-xs text-cyan-400 hover:underline"
        >
          View shield events &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}
