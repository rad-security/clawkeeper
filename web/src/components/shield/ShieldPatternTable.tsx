"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ShieldEvent } from "@/types";

interface PatternRow {
  pattern_name: string;
  count: number;
  last_seen: string;
  severity: string;
}

interface ShieldPatternTableProps {
  events: ShieldEvent[];
}

const severityColor: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-zinc-500/10 text-zinc-400",
};

export function ShieldPatternTable({ events }: ShieldPatternTableProps) {
  const patternMap = new Map<string, PatternRow>();
  for (const e of events) {
    if (!e.pattern_name) continue;
    const existing = patternMap.get(e.pattern_name);
    if (existing) {
      existing.count++;
      if (new Date(e.created_at) > new Date(existing.last_seen)) {
        existing.last_seen = e.created_at;
        existing.severity = e.severity;
      }
    } else {
      patternMap.set(e.pattern_name, {
        pattern_name: e.pattern_name,
        count: 1,
        last_seen: e.created_at,
        severity: e.severity,
      });
    }
  }

  const patterns = Array.from(patternMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (patterns.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No attack patterns detected yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pattern</TableHead>
          <TableHead className="text-right">Count</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Last Seen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patterns.map((p) => (
          <TableRow key={p.pattern_name}>
            <TableCell className="font-mono text-xs">{p.pattern_name}</TableCell>
            <TableCell className="text-right font-bold">{p.count}</TableCell>
            <TableCell>
              <Badge variant="outline" className={`text-[10px] ${severityColor[p.severity] || ""}`}>
                {p.severity.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(p.last_seen).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
