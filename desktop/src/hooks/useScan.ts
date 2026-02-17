import { useState, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import type { ScanEvent, ScanState, CheckState } from "../types/scan";

const initialState: ScanState = {
  running: false,
  checks: new Map(),
  phases: [],
  summary: null,
};

export function useScan() {
  const [state, setState] = useState<ScanState>(initialState);

  const startScan = useCallback(async () => {
    setState({ running: true, checks: new Map(), phases: [], summary: null });

    const onEvent = new Channel<ScanEvent>();

    onEvent.onmessage = (evt: ScanEvent) => {
      setState((prev) => {
        const checks = new Map(prev.checks);

        switch (evt.event) {
          case "ScanStarted": {
            for (const meta of evt.checks) {
              checks.set(meta.id, {
                meta,
                status: "pending",
                detail: "",
                messages: [],
              });
            }
            return { ...prev, checks, phases: evt.phases };
          }

          case "CheckStarted": {
            const check = checks.get(evt.check_id);
            if (check) {
              checks.set(evt.check_id, { ...check, status: "running" });
            }
            return { ...prev, checks };
          }

          case "Info": {
            const check = checks.get(evt.check_id);
            if (check) {
              checks.set(evt.check_id, {
                ...check,
                messages: [
                  ...check.messages,
                  { type: "info", message: evt.message },
                ],
              });
            }
            return { ...prev, checks };
          }

          case "Warn": {
            const check = checks.get(evt.check_id);
            if (check) {
              checks.set(evt.check_id, {
                ...check,
                messages: [
                  ...check.messages,
                  { type: "warn", message: evt.message },
                ],
              });
            }
            return { ...prev, checks };
          }

          case "CheckCompleted": {
            const check = checks.get(evt.check_id);
            if (check) {
              checks.set(evt.check_id, {
                ...check,
                status: evt.status as CheckState["status"],
                detail: evt.detail,
              });
            }
            return { ...prev, checks };
          }

          case "Prompt": {
            const check = checks.get(evt.check_id);
            if (check) {
              checks.set(evt.check_id, {
                ...check,
                messages: [
                  ...check.messages,
                  { type: "warn", message: evt.message },
                ],
              });
            }
            return { ...prev, checks };
          }

          case "Error": {
            const check = checks.get(evt.check_id);
            if (check) {
              checks.set(evt.check_id, {
                ...check,
                messages: [
                  ...check.messages,
                  { type: "error", message: evt.message },
                ],
              });
            }
            return { ...prev, checks };
          }

          case "ScanCompleted": {
            return {
              ...prev,
              running: false,
              summary: {
                passed: evt.passed,
                failed: evt.failed,
                skipped: evt.skipped,
                total: evt.total,
                score: evt.score,
                grade: evt.grade,
              },
            };
          }

          default:
            return prev;
        }
      });
    };

    try {
      await invoke("start_scan", { onEvent });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        running: false,
        summary: prev.summary ?? {
          passed: 0,
          failed: 0,
          skipped: 0,
          total: 0,
          score: 0,
          grade: "F",
        },
      }));
      console.error("Scan failed:", err);
    }
  }, []);

  const getChecksForPhase = useCallback(
    (phaseId: string): CheckState[] => {
      return Array.from(state.checks.values()).filter(
        (c) => c.meta.phase === phaseId,
      );
    },
    [state.checks],
  );

  return { state, startScan, getChecksForPhase };
}
