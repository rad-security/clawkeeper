import { useState, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import type { DeployEvent, DeployStep, OpenClawStatus } from "../types/scan";

export function useDeploy() {
  const [detecting, setDetecting] = useState(false);
  const [status, setStatus] = useState<OpenClawStatus | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [steps, setSteps] = useState<DeployStep[]>([]);
  const [completed, setCompleted] = useState(false);
  const [completedMessage, setCompletedMessage] = useState("");

  const detect = useCallback(async () => {
    setDetecting(true);
    try {
      const result = await invoke<OpenClawStatus>("detect_openclaw");
      setStatus(result);
    } catch (err) {
      console.error("Detection failed:", err);
    } finally {
      setDetecting(false);
    }
  }, []);

  const startDeploy = useCallback(
    async (mode: string, apiKey?: string) => {
      setDeploying(true);
      setSteps([]);
      setCompleted(false);

      const onEvent = new Channel<DeployEvent>();

      onEvent.onmessage = (evt: DeployEvent) => {
        switch (evt.event) {
          case "StepStarted": {
            setSteps((prev) => [
              ...prev,
              {
                id: evt.step_id,
                label: evt.label,
                status: "running",
                logs: [],
              },
            ]);
            break;
          }
          case "StepLog": {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === evt.step_id
                  ? {
                      ...s,
                      logs: [
                        ...s.logs,
                        { level: evt.level, message: evt.message },
                      ],
                    }
                  : s,
              ),
            );
            break;
          }
          case "StepCompleted": {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === evt.step_id
                  ? { ...s, status: evt.success ? "completed" : "failed" }
                  : s,
              ),
            );
            break;
          }
          case "DeployCompleted": {
            setDeploying(false);
            setCompleted(true);
            setCompletedMessage(evt.message);
            break;
          }
        }
      };

      try {
        await invoke("start_deploy", {
          mode,
          apiKey: apiKey || null,
          onEvent,
        });
      } catch (err) {
        setDeploying(false);
        console.error("Deploy failed:", err);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setSteps([]);
    setCompleted(false);
    setCompletedMessage("");
    setStatus(null);
  }, []);

  return {
    detecting,
    status,
    deploying,
    steps,
    completed,
    completedMessage,
    detect,
    startDeploy,
    reset,
  };
}
