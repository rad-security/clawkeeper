"use client";

import { Card, CardContent } from "@/components/ui/card";

interface ShieldStatsProps {
  total: number;
  blocked: number;
  warned: number;
  passed: number;
  uniquePatterns: number;
}

export function ShieldStats({ total, blocked, warned, passed, uniquePatterns }: ShieldStatsProps) {
  const stats = [
    { label: "Total Events", count: total, color: "text-zinc-300" },
    { label: "Blocked", count: blocked, color: "text-red-500" },
    { label: "Warned", count: warned, color: "text-yellow-500" },
    { label: "Passed", count: passed, color: "text-emerald-500" },
    { label: "Unique Patterns", count: uniquePatterns, color: "text-violet-500" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-5 pb-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
