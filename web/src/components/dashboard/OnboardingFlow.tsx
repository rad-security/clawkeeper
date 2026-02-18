"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Copy, Key, Download, Loader2, Apple } from "lucide-react";

export function OnboardingFlow({ orgId }: { orgId: string }) {
  const [step, setStep] = useState(1);
  const [keyName, setKeyName] = useState("My OpenClaw Instance");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"key" | "curl" | null>(null);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3: poll for first host
  useEffect(() => {
    if (step !== 3) return;

    pollRef.current = setInterval(() => {
      router.refresh();
    }, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, router]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/dashboard/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: keyName, org_id: orgId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create key");
      setLoading(false);
      return;
    }

    setApiKey(data.key);
    setLoading(false);
    setStep(2);
  }

  function copyToClipboard(text: string, type: "key" | "curl") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const installCommand = `curl -fsSL https://clawkeeper.dev/install.sh | bash`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome to Clawkeeper</h2>
        <p className="mt-1 text-muted-foreground">
          Let&apos;s secure your first OpenClaw instance in 3 easy steps.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                step > s
                  ? "bg-primary text-primary-foreground"
                  : step === s
                  ? "border-2 border-primary text-primary"
                  : "border-2 border-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 flex-1 ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Generate API Key */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Generate an API Key</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              The agent needs an API key to authenticate with Clawkeeper. Give it
              a name to identify this key later.
            </p>
            <form onSubmit={createKey} className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g., Dev Laptop OpenClaw"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Generate Key"}
              </Button>
            </form>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Install the Agent */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <CardTitle>Install the Agent</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">Your API Key:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">
                  {apiKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(apiKey, "key")}
                >
                  {copied === "key" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                Run this on any machine with OpenClaw installed:
              </p>
              <div className="flex items-center gap-2">
                <pre className="flex-1 overflow-x-auto rounded-md bg-black border border-white/10 px-3 py-2 text-sm text-cyan-400">
                  {installCommand}
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(installCommand, "curl")}
                >
                  {copied === "curl" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                You&apos;ll be prompted to enter your API key during installation. The
                agent scans your OpenClaw instance hourly and uploads results.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">
                or use the desktop app
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <a
              href="https://github.com/rad-security/clawkeeper/releases/latest/download/Clawkeeper.dmg"
              className="flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Apple className="h-4 w-4" />
              Download for macOS
            </a>

            <Button onClick={() => setStep(3)} className="w-full">
              I&apos;ve installed the agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Waiting for first scan */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Waiting for first scan&hellip;</CardTitle>
          </CardHeader>
          <CardContent className="py-8 text-center">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              We&apos;re listening for your first scan result. This page will
              automatically update once a scan is received.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              If the agent is already installed, you can trigger a scan manually
              with{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">
                clawkeeper.sh agent run
              </code>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
