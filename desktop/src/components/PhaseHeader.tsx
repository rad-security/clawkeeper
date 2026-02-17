import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { CheckState, PhaseInfo } from "../types/scan";

export function PhaseHeader({
  phase,
  checks,
}: {
  phase: PhaseInfo;
  checks: CheckState[];
}) {
  const passed = checks.filter((c) => c.status === "PASS").length;
  const failed = checks.filter((c) => c.status === "FAIL").length;
  const skipped = checks.filter((c) => c.status === "SKIPPED").length;
  const done = passed + failed + skipped;
  const total = checks.length;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--muted)]/50">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {phase.label}
      </h3>
      <div className="flex items-center gap-2.5">
        {passed > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {passed}
          </span>
        )}
        {failed > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-red-400">
            <XCircle className="h-3 w-3" />
            {failed}
          </span>
        )}
        {skipped > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-zinc-400">
            <MinusCircle className="h-3 w-3" />
            {skipped}
          </span>
        )}
        {done > 0 && (
          <span className="text-[11px] text-[var(--muted-foreground)]">
            {done}/{total}
          </span>
        )}
      </div>
    </div>
  );
}
