"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyCommand } from "@/components/landing/CopyCommand";
import {
  Check,
  Copy,
  Download,
  Shield,
  Wifi,
  Loader2,
  Monitor,
  Rocket,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

type OnboardingPath = null | "deploy" | "monitor";

export function OnboardingFlow({ orgId }: { orgId: string }) {
  const [path, setPath] = useState<OnboardingPath>(null);
  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const creatingRef = useRef(false);

  // Polling for first scan
  useEffect(() => {
    if (!polling) return;

    pollRef.current = setInterval(() => {
      router.refresh();
    }, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, router]);

  async function autoCreateKey() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "First host", org_id: orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create key");
        return;
      }

      setApiKey(data.key);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      creatingRef.current = false;
    }
  }

  function selectPath(p: "deploy" | "monitor") {
    setPath(p);
    setStep(1);
    setPolling(false);
    autoCreateKey();
  }

  function goBack() {
    setPath(null);
    setStep(1);
    setPolling(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const totalSteps = path === "deploy" ? 4 : 3;

  const stepLabels =
    path === "deploy"
      ? ["Install", "Setup", "Connect", "Verify"]
      : ["Install", "Connect", "Verify"];

  // --- Path Selection Screen ---
  if (path === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Welcome to Clawkeeper</h2>
          <p className="mt-1 text-muted-foreground">
            How would you like to get started?
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <button
            onClick={() => selectPath("deploy")}
            className="group cursor-pointer rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-6 text-left transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/10"
          >
            <Rocket className="mb-3 h-8 w-8 text-cyan-400" />
            <h3 className="text-lg font-semibold">Deploy OpenClaw securely</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              I don&apos;t have OpenClaw yet
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-cyan-400" />
                Install the Clawkeeper CLI
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-cyan-400" />
                Deploy &amp; harden your instance
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-cyan-400" />
                Connect to this dashboard
              </li>
            </ul>
          </button>

          <button
            onClick={() => selectPath("monitor")}
            className="group cursor-pointer rounded-lg border border-white/10 p-6 text-left transition-colors hover:border-white/20 hover:bg-white/5"
          >
            <Monitor className="mb-3 h-8 w-8 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              Monitor existing deployment
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              I already have OpenClaw running
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                Install the Clawkeeper CLI
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                Connect to this dashboard
              </li>
            </ul>
          </button>
        </div>
      </div>
    );
  }

  // --- Step Flows ---

  // Map logical step to content
  function renderStepContent() {
    if (path === "deploy") {
      switch (step) {
        case 1:
          return renderInstallStep();
        case 2:
          return renderSetupStep();
        case 3:
          return renderConnectStep();
        case 4:
          return renderVerifyStep();
      }
    } else {
      switch (step) {
        case 1:
          return renderInstallStep();
        case 2:
          return renderConnectStep();
        case 3:
          return renderVerifyStep();
      }
    }
  }

  function renderInstallStep() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Install Clawkeeper CLI</h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Generating API key&hellip;
            </p>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => autoCreateKey()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-sm font-medium">Your API Key:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all">
                  {apiKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText(apiKey, "key")}
                >
                  {copied === "key" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-amber-400/80">
                Save this key &mdash; you won&apos;t be able to see it again.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Run this on the host you want to secure:
              </p>
              <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
              <p className="mt-2 text-xs text-muted-foreground">
                Downloads the Clawkeeper CLI which handles hardening,
                deployment, and monitoring.
              </p>
            </div>
          </>
        )}

        <Button
          onClick={() => setStep(step + 1)}
          className="w-full"
          disabled={loading || !!error}
        >
          Next
        </Button>
      </div>
    );
  }

  function renderSetupStep() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Deploy &amp; Harden</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Run the interactive setup wizard to deploy OpenClaw with hardened
          defaults &mdash; firewall, encryption, SSH, and more. Every change
          asks for your approval.
        </p>

        <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
          <p className="mb-2 text-sm font-medium text-cyan-400">
            Recommended: Interactive setup
          </p>
          <CopyCommand command="clawkeeper.sh setup" />
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Alternative: Read-only audit
          </p>
          <CopyCommand command="clawkeeper.sh scan" />
          <p className="mt-2 text-xs text-muted-foreground">
            Scans without making changes &mdash; use this if you just want to
            see your current security posture.
          </p>
        </div>

        <Button onClick={() => setStep(step + 1)} className="w-full">
          Next
        </Button>
      </div>
    );
  }

  function renderConnectStep() {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Connect to Dashboard</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Install a background agent that scans hourly and uploads results.
          You&apos;ll be prompted for the API key below.
        </p>

        <CopyCommand command="clawkeeper.sh agent --install" />

        <div>
          <p className="mb-2 text-sm font-medium">Your API Key:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm break-all">
              {apiKey}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyText(apiKey, "key-connect")}
            >
              {copied === "key-connect" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          onClick={() => {
            setPolling(true);
            setStep(step + 1);
          }}
          className="w-full"
        >
          I&apos;ve connected the agent
        </Button>
      </div>
    );
  }

  function renderVerifyStep() {
    return (
      <div className="space-y-4 py-6 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <div>
          <p className="text-sm text-muted-foreground">
            Waiting for your first scan result&hellip; This page will update
            automatically.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            You can trigger a scan manually:
          </p>
          <div className="mx-auto mt-2 max-w-sm">
            <CopyCommand command="clawkeeper.sh agent run" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-bold">
          {path === "deploy"
            ? "Deploy OpenClaw securely"
            : "Monitor existing deployment"}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {path === "deploy"
            ? "We'll walk you through deploying and hardening OpenClaw."
            : "Connect your existing OpenClaw instance to the dashboard."}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const num = i + 1;
          return (
            <div key={num} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                  step > num
                    ? "bg-primary text-primary-foreground"
                    : step === num
                    ? "border-2 border-primary text-primary"
                    : "border-2 border-muted text-muted-foreground"
                }`}
              >
                {step > num ? <Check className="h-4 w-4" /> : num}
              </div>
              {num < totalSteps && (
                <div
                  className={`h-0.5 flex-1 ${
                    step > num ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card>
        <CardContent className="pt-6">{renderStepContent()}</CardContent>
      </Card>
    </div>
  );
}
