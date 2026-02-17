import { PhaseHeader } from "./PhaseHeader";
import { CheckRow } from "./CheckRow";
import type { CheckState, PhaseInfo } from "../types/scan";

export function CheckList({
  phases,
  getChecksForPhase,
}: {
  phases: PhaseInfo[];
  getChecksForPhase: (phaseId: string) => CheckState[];
}) {
  return (
    <div className="space-y-3">
      {phases.map((phase) => {
        const checks = getChecksForPhase(phase.id);
        if (checks.length === 0) return null;

        return (
          <div
            key={phase.id}
            className="rounded-xl border border-[var(--border)] overflow-hidden animate-in"
          >
            <PhaseHeader phase={phase} checks={checks} />
            <div>
              {checks.map((check) => (
                <CheckRow key={check.meta.id} check={check} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
