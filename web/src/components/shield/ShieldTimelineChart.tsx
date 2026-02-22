"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ShieldEvent } from "@/types";

interface ShieldTimelineChartProps {
  events: ShieldEvent[];
}

export function ShieldTimelineChart({ events }: ShieldTimelineChartProps) {
  const [range, setRange] = useState<"24h" | "7d">("7d");

  const data = useMemo(() => {
    if (events.length === 0) {
      return [];
    }
    const latestEventMs = events.reduce((latest, event) => {
      const eventMs = new Date(event.created_at).getTime();
      return eventMs > latest ? eventMs : latest;
    }, 0);
    const cutoff = range === "24h"
      ? latestEventMs - 24 * 3600_000
      : latestEventMs - 7 * 86_400_000;
    const bucketSize = range === "24h" ? 3600_000 : 86_400_000;
    const format = range === "24h"
      ? (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : (d: Date) => d.toLocaleDateString([], { month: "short", day: "numeric" });

    const filtered = events.filter((e) => new Date(e.created_at).getTime() >= cutoff);
    const buckets = new Map<number, { blocked: number; warned: number; passed: number }>();

    for (const e of filtered) {
      const t = new Date(e.created_at).getTime();
      const key = Math.floor(t / bucketSize) * bucketSize;
      const bucket = buckets.get(key) || { blocked: 0, warned: 0, passed: 0 };
      if (e.verdict === "blocked") bucket.blocked++;
      else if (e.verdict === "warned") bucket.warned++;
      else bucket.passed++;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([key, vals]) => ({
        time: format(new Date(key)),
        ...vals,
      }));
  }, [events, range]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setRange("24h")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            range === "24h" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          24h
        </button>
        <button
          onClick={() => setRange("7d")}
          className={`rounded-md px-3 py-1 text-xs font-medium transition ${
            range === "7d" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          7d
        </button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#71717a" }} />
          <YAxis tick={{ fontSize: 11, fill: "#71717a" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Area type="monotone" dataKey="blocked" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
          <Area type="monotone" dataKey="warned" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.3} />
          <Area type="monotone" dataKey="passed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
