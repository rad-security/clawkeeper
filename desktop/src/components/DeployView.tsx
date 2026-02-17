import { useState, useEffect } from "react";
import {
  Rocket,
  Container,
  Terminal,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  AlertTriangle,
  Info,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useDeploy } from "../hooks/useDeploy";

type DeployMode = "docker" | "native" | null;
type WizardStep = "detect" | "mode" | "apikey" | "deploying" | "done";

export function DeployView() {
  const {
    detecting,
    status,
    deploying,
    steps,
    completed,
    completedMessage,
    detect,
    startDeploy,
    reset,
  } = useDeploy();

  const [wizardStep, setWizardStep] = useState<WizardStep>("detect");
  const [mode, setMode] = useState<DeployMode>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Auto-detect on mount
  useEffect(() => {
    detect();
  }, [detect]);

  // Move to mode selection when detection completes
  useEffect(() => {
    if (status && !detecting && wizardStep === "detect") {
      setWizardStep("mode");
    }
  }, [status, detecting, wizardStep]);

  // Move to deploying step when deploy starts
  useEffect(() => {
    if (deploying) {
      setWizardStep("deploying");
    }
  }, [deploying]);

  // Move to done step when deploy completes
  useEffect(() => {
    if (completed) {
      setWizardStep("done");
    }
  }, [completed]);

  function handleStartDeploy() {
    if (!mode) return;
    startDeploy(mode, apiKey || undefined);
  }

  function handleReset() {
    reset();
    setWizardStep("detect");
    setMode(null);
    setApiKey("");
    detect();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Deploy OpenClaw</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Set up a hardened OpenClaw installation with secure defaults
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-1.5">
        {(
          [
            { id: "mode", label: "Mode" },
            { id: "apikey", label: "API Key" },
            { id: "deploying", label: "Deploy" },
            { id: "done", label: "Done" },
          ] as const
        ).map((step, i, arr) => {
          const stepOrder = ["mode", "apikey", "deploying", "done"];
          const currentIdx = stepOrder.indexOf(wizardStep);
          const stepIdx = stepOrder.indexOf(step.id);
          const isActive = stepIdx === currentIdx;
          const isDone = stepIdx < currentIdx;

          return (
            <div key={step.id} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors",
                  isDone && "bg-emerald-500/20 text-emerald-400",
                  isActive && "bg-[var(--foreground)] text-[var(--background)]",
                  !isDone &&
                    !isActive &&
                    "bg-[var(--muted)] text-[var(--muted-foreground)]",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-foreground)]",
                )}
              >
                {step.label}
              </span>
              {i < arr.length - 1 && (
                <div
                  className={cn(
                    "h-px w-6",
                    isDone ? "bg-emerald-500/30" : "bg-[var(--border)]",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Detection loading */}
      {wizardStep === "detect" && detecting && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-[var(--muted-foreground)]" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Detecting current OpenClaw installation...
          </p>
        </div>
      )}

      {/* Step 1: Mode selection */}
      {wizardStep === "mode" && status && (
        <div className="space-y-4 animate-in">
          {/* Existing install warning */}
          {status.installed && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">
                  OpenClaw already installed
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Detected {status.install_type} installation
                  {status.running ? " (running)" : " (stopped)"}.
                  Re-deploying will overwrite the configuration with hardened
                  defaults.
                </p>
              </div>
            </div>
          )}

          <p className="text-sm text-[var(--muted-foreground)]">
            How would you like to run OpenClaw?
          </p>

          {/* Docker option */}
          <button
            onClick={() => setMode("docker")}
            disabled={!status.docker_available}
            className={cn(
              "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
              mode === "docker"
                ? "border-blue-500/50 bg-blue-500/5"
                : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--ring)]",
              !status.docker_available && "opacity-40 cursor-not-allowed",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Container className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Docker</p>
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Runs in an isolated container. Limits what a compromised agent
                can access.
              </p>
              {!status.docker_available && (
                <p className="text-xs text-red-400 mt-1">
                  Docker not found. Install Docker Desktop first.
                </p>
              )}
            </div>
            <div
              className={cn(
                "h-4 w-4 rounded-full border-2 shrink-0",
                mode === "docker"
                  ? "border-blue-400 bg-blue-400"
                  : "border-[var(--ring)]",
              )}
            />
          </button>

          {/* Native option */}
          <button
            onClick={() => setMode("native")}
            disabled={!status.node_available}
            className={cn(
              "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all",
              mode === "native"
                ? "border-purple-500/50 bg-purple-500/5"
                : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--ring)]",
              !status.node_available && "opacity-40 cursor-not-allowed",
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
              <Terminal className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Native (npm)</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Runs directly on your OS. Simpler setup, shares your filesystem.
              </p>
              {!status.node_available && (
                <p className="text-xs text-red-400 mt-1">
                  Node.js not found. Install via Homebrew first.
                </p>
              )}
            </div>
            <div
              className={cn(
                "h-4 w-4 rounded-full border-2 shrink-0",
                mode === "native"
                  ? "border-purple-400 bg-purple-400"
                  : "border-[var(--ring)]",
              )}
            />
          </button>

          <button
            onClick={() => setWizardStep("apikey")}
            disabled={!mode}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 2: API key */}
      {wizardStep === "apikey" && (
        <div className="space-y-4 animate-in">
          <button
            onClick={() => setWizardStep("mode")}
            className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-medium">Anthropic API Key</h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Optional. OpenClaw needs an LLM API key to function. You can add
                this later by editing the .env file.
              </p>
            </div>

            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 pr-10 text-sm placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--ring)]"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-[var(--muted)]/50 p-3">
              <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--muted-foreground)]">
                The key is stored locally in{" "}
                <code className="rounded bg-[var(--muted)] px-1 py-0.5 text-[11px]">
                  ~/.openclaw/.env
                </code>{" "}
                with 600 permissions. It is never sent to Clawkeeper servers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleStartDeploy}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-90"
            >
              <Rocket className="h-4 w-4" />
              Deploy {mode === "docker" ? "with Docker" : "Native"}
            </button>
            {!apiKey && (
              <button
                onClick={handleStartDeploy}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                Skip, deploy without API key
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Deploying */}
      {wizardStep === "deploying" && (
        <div className="space-y-3 animate-in">
          {steps.map((step) => (
            <div
              key={step.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {step.status === "running" && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400 shrink-0" />
                )}
                {step.status === "completed" && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
                {step.status === "failed" && (
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                )}
                {step.status === "pending" && (
                  <div className="h-4 w-4 rounded-full border border-[var(--ring)] shrink-0" />
                )}
                <span className="text-sm font-medium">{step.label}</span>
              </div>

              {step.logs.length > 0 && (
                <div className="border-t border-[var(--border)] px-4 py-2 space-y-1">
                  {step.logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className={cn(
                          log.level === "success" && "text-emerald-400",
                          log.level === "info" && "text-[var(--muted-foreground)]",
                          log.level === "warn" && "text-amber-400",
                          log.level === "error" && "text-red-400",
                        )}
                      >
                        {log.level === "success" && "✓"}
                        {log.level === "info" && "·"}
                        {log.level === "warn" && "⚠"}
                        {log.level === "error" && "✗"}
                      </span>
                      <span
                        className={cn(
                          log.level === "success" && "text-emerald-400/80",
                          log.level === "info" && "text-[var(--muted-foreground)]",
                          log.level === "warn" && "text-amber-400/80",
                          log.level === "error" && "text-red-400/80",
                        )}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 4: Done */}
      {wizardStep === "done" && (
        <div className="space-y-4 animate-in">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold">Deployment Complete</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              {completedMessage}
            </p>
          </div>

          {/* Show completed steps */}
          {steps.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 text-sm">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span className="text-[var(--muted-foreground)]">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              Deploy Again
            </button>
          </div>
        </div>
      )}

      {/* What gets configured */}
      {(wizardStep === "mode" || wizardStep === "apikey") && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
            What gets configured
          </h3>
          <div className="space-y-2.5">
            {[
              {
                title: "Secure directories",
                desc: "~/.openclaw and ~/openclaw/workspace with 700 permissions",
              },
              {
                title: "Gateway token",
                desc: "48-char hex token generated via openssl for API auth",
              },
              {
                title: "Hardened config",
                desc: "Localhost binding, token auth, no mDNS, no web UI, exec approval required",
              },
              mode === "docker"
                ? {
                    title: "Docker container",
                    desc: "Non-root, read-only FS, dropped capabilities, resource limits, isolated network",
                  }
                : {
                    title: "LaunchAgent",
                    desc: "Auto-start on login via macOS LaunchAgent with Bonjour disabled",
                  },
            ]
              .filter(Boolean)
              .map((item) => (
                <div key={item!.title} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium">{item!.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item!.desc}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
