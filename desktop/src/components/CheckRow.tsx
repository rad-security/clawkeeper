import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/utils";
import { StatusBadge } from "./StatusBadge";
import type { CheckState } from "../types/scan";

export function CheckRow({ check }: { check: CheckState }) {
  const [expanded, setExpanded] = useState(false);
  const hasMessages = check.messages.length > 0 || check.detail;

  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
          hasMessages
            ? "hover:bg-[var(--muted)]/50 cursor-pointer"
            : "cursor-default",
        )}
        onClick={() => hasMessages && setExpanded(!expanded)}
      >
        <span className="w-4 shrink-0 flex justify-center">
          {hasMessages ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
            )
          ) : null}
        </span>

        <span className="flex-1 text-[13px] font-medium">{check.meta.name}</span>
        <StatusBadge status={check.status} />
      </button>

      {expanded && hasMessages && (
        <div className="px-4 pb-2.5 pl-11 space-y-1 animate-in">
          {check.detail && (
            <p className="text-xs text-[var(--muted-foreground)]">
              {check.detail}
            </p>
          )}
          {check.messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              {msg.type === "info" && (
                <Info className="h-3 w-3 shrink-0 mt-0.5 text-blue-400" />
              )}
              {msg.type === "warn" && (
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-400" />
              )}
              {msg.type === "error" && (
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-400" />
              )}
              <span
                className={cn(
                  "leading-relaxed",
                  msg.type === "info" && "text-[var(--muted-foreground)]",
                  msg.type === "warn" && "text-amber-400/80",
                  msg.type === "error" && "text-red-400/80",
                )}
              >
                {msg.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
