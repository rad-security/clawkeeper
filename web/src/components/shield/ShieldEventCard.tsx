"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ShieldEvent } from "@/types";

interface ShieldEventCardProps {
  event: ShieldEvent;
}

const verdictConfig = {
  blocked: { label: "BLOCKED", className: "bg-red-500/10 text-red-500 border-red-500/30" },
  warned: { label: "WARNED", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  passed: { label: "PASSED", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
};

const layerLabels: Record<string, string> = {
  regex: "Regex",
  semantic: "Semantic",
  context_integrity: "Context",
  blacklist: "Blacklist",
  entropy_heuristic: "Entropy",
};

export function ShieldEventCard({ event }: ShieldEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  const verdict = verdictConfig[event.verdict] || verdictConfig.passed;

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className={`text-[10px] ${verdict.className}`}>
          {verdict.label}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {layerLabels[event.detection_layer] || event.detection_layer}
        </Badge>
        <span className="text-sm font-medium">{event.hostname}</span>
        {event.pattern_name && (
          <span className="font-mono text-xs text-muted-foreground">{event.pattern_name}</span>
        )}
        {event.confidence !== null && (
          <span className="ml-auto text-xs text-muted-foreground">
            {Math.round((event.confidence || 0) * 100)}% conf
          </span>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{new Date(event.created_at).toLocaleString()}</span>
        <span>&middot;</span>
        <span>{event.severity}</span>
        {event.input_length && (
          <>
            <span>&middot;</span>
            <span>{event.input_length} chars</span>
          </>
        )}
      </div>
      {expanded && Object.keys(event.context).length > 0 && (
        <pre className="mt-2 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
          {JSON.stringify(event.context, null, 2)}
        </pre>
      )}
    </div>
  );
}
