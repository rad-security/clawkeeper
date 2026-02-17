import { cn } from "../lib/utils";
import type { CheckStatus } from "../types/scan";

const statusStyles: Record<CheckStatus, string> = {
  pending: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  running: "bg-blue-500/15 text-blue-400",
  PASS: "bg-emerald-500/15 text-emerald-400",
  FAIL: "bg-red-500/15 text-red-400",
  SKIPPED: "bg-zinc-500/15 text-zinc-400",
};

const statusLabels: Record<CheckStatus, string> = {
  pending: "Pending",
  running: "Running",
  PASS: "Pass",
  FAIL: "Fail",
  SKIPPED: "Skipped",
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        statusStyles[status],
        status === "running" && "animate-pulse-dot",
      )}
    >
      {status === "running" && (
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-400" />
      )}
      {statusLabels[status]}
    </span>
  );
}
