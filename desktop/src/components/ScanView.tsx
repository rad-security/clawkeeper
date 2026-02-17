import { Play, Loader2, RotateCcw } from "lucide-react";
import { useScan } from "../hooks/useScan";
import { CheckList } from "./CheckList";
import { ScanSummary } from "./ScanSummary";

export function ScanView() {
  const { state, startScan, getChecksForPhase } = useScan();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Security Scan</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Audit your macOS host and OpenClaw installation
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={startScan}
          disabled={state.running}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : state.summary ? (
            <>
              <RotateCcw className="h-4 w-4" />
              Re-scan
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Scan
            </>
          )}
        </button>

        {state.running && (
          <span className="text-xs text-[var(--muted-foreground)]">
            {Array.from(state.checks.values()).filter(
              (c) => c.status !== "pending" && c.status !== "running",
            ).length}{" "}
            of {state.checks.size} checks complete
          </span>
        )}
      </div>

      {/* Summary */}
      {state.summary && !state.running && (
        <ScanSummary summary={state.summary} />
      )}

      {/* Check list */}
      {state.phases.length > 0 && (
        <CheckList
          phases={state.phases}
          getChecksForPhase={getChecksForPhase}
        />
      )}

      {/* Empty state */}
      {!state.running && state.phases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-[var(--muted)] flex items-center justify-center mb-4">
            <Play className="h-5 w-5 text-[var(--muted-foreground)]" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Click <strong>Run Scan</strong> to start auditing your system
          </p>
        </div>
      )}
    </div>
  );
}
