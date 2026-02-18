"use client";

import { useState } from "react";
import { ExternalLink, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CVEFeedItem } from "@/lib/cve-feed";

const severityConfig = {
  CRITICAL: "bg-red-500/10 border-red-500/30 text-red-400",
  HIGH: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  MEDIUM: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  LOW: "bg-blue-500/10 border-blue-500/30 text-blue-400",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CVECard({ item }: { item: CVEFeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.description.length > 200;
  const displayDesc =
    !expanded && isLong
      ? item.description.slice(0, 200) + "..."
      : item.description;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      {/* Top row: severity + date */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityConfig[item.severity]}`}
        >
          {item.severity} &middot; {item.cvssScore.toFixed(1)}
        </span>
        <span className="flex items-center gap-1 text-xs text-zinc-500">
          <Calendar className="h-3 w-3" />
          {formatDate(item.publishedDate)}
        </span>
      </div>

      {/* CVE ID */}
      <h3 className="mt-3 text-sm font-semibold text-white">{item.id}</h3>

      {/* CWE badges */}
      {item.cweIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.cweIds.map((cwe) => (
            <Badge
              key={cwe}
              variant="outline"
              className="border-white/10 text-zinc-500 text-[10px]"
            >
              {cwe}
            </Badge>
          ))}
        </div>
      )}

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        {displayDesc}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}

      {/* NVD link */}
      <a
        href={item.nvdUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 transition hover:text-cyan-300"
      >
        View on NVD
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
