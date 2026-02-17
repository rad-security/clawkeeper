import { cn } from "../lib/utils";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import type { ScanSummaryData } from "../types/scan";

const gradeColors: Record<string, { text: string; bg: string; border: string }> = {
  A: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  B: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  C: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  D: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  F: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
};

export function ScanSummary({ summary }: { summary: ScanSummaryData }) {
  const colors = gradeColors[summary.grade] ?? gradeColors.F;

  return (
    <div
      className={cn(
        "rounded-xl border p-6 animate-in",
        colors.bg,
        colors.border,
      )}
    >
      <div className="flex items-center gap-6">
        {/* Grade */}
        <div className="text-center">
          <div className={cn("text-5xl font-bold", colors.text)}>
            {summary.grade}
          </div>
          <div className={cn("text-lg font-semibold mt-1", colors.text)}>
            {Math.round(summary.score)}%
          </div>
        </div>

        {/* Divider */}
        <div className="h-16 w-px bg-[var(--border)]" />

        {/* Counts */}
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-lg font-bold">{summary.passed}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Passed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-lg font-bold">{summary.failed}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Failed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MinusCircle className="h-4 w-4 text-zinc-400" />
            <div>
              <p className="text-lg font-bold">{summary.skipped}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Skipped</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
