"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyCommand } from "@/components/landing/CopyCommand";
import {
  Check,
  Copy,
  Key,
  Download,
  Shield,
  Wifi,
  Loader2,
} from "lucide-react";

interface AddHostWizardProps {
  orgId: string;
  existingKeyCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { label: "API Key", icon: Key },
  { label: "Install", icon: Download },
  { label: "Harden", icon: Shield },
  { label: "Connect", icon: Wifi },
] as const;

export function AddHostWizard({
  orgId,
  existingKeyCount,
  open,
  onOpenChange,
}: AddHostWizardProps) {
  const hasKeys = existingKeyCount > 0;
  const [step, setStep] = useState(hasKeys ? 2 : 1);
  const [keyName, setKeyName] = useState("My Host");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep(hasKeys ? 2 : 1);
      setApiKey("");
      setError("");
      setPolling(false);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, hasKeys]);

  // Polling for new host in step 4
  useEffect(() => {
    if (!polling) return;

    pollRef.current = setInterval(() => {
      router.refresh();
    }, 10_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [polling, router]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, org_id: orgId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create key");
        return;
      }

      setApiKey(data.key);
      setStep(2);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a Host</DialogTitle>
          <DialogDescription>
            Set up and harden a new host with the Clawkeeper CLI.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
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
                {num < STEPS.length && (
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

        {/* Step 1: Generate API Key */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Generate an API Key</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Your host needs an API key to upload scan results. Give it a name
              to identify this key later.
            </p>
            <form onSubmit={createKey} className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Key Name</Label>
                <Input
                  placeholder="e.g., Production Server"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Generate Key"}
              </Button>
            </form>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {/* Step 2: Install the CLI */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Install the CLI</h3>
            </div>

            {hasKeys && !apiKey && (
              <p className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-400">
                You already have an API key. Use your existing key in the steps
                below, or go to{" "}
                <button
                  onClick={() => setStep(1)}
                  className="underline hover:text-cyan-300"
                >
                  step 1
                </button>{" "}
                to create a new one.
              </p>
            )}

            {apiKey && (
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
              </div>
            )}

            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Run this on the host you want to monitor:
              </p>
              <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
            </div>

            <Button onClick={() => setStep(3)} className="w-full">
              Next: Harden Your Host
            </Button>
          </div>
        )}

        {/* Step 3: Harden Your Host */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Harden Your Host</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Run the interactive hardening wizard to secure your host. This
              walks you through enabling the firewall, disk encryption, SSH
              settings, file permissions, and more.
            </p>

            <div className="space-y-3">
              <div className="rounded-md border border-cyan-500/20 bg-cyan-500/5 p-3">
                <p className="mb-2 text-sm font-medium text-cyan-400">
                  Recommended: Interactive hardening
                </p>
                <CopyCommand command="clawkeeper.sh setup" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Guides you through each fix with explanations. Safe to
                  re-run&mdash;skips already-hardened items.
                </p>
              </div>

              <div className="rounded-md border p-3">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Alternative: Read-only audit
                </p>
                <CopyCommand command="clawkeeper.sh scan" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Scans without making changes. Use this if you just want to see
                  your current security posture.
                </p>
              </div>
            </div>

            <Button onClick={() => setStep(4)} className="w-full">
              Next: Connect to Dashboard
            </Button>
          </div>
        )}

        {/* Step 4: Connect to Dashboard */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Connect to Dashboard</h3>
            </div>

            {!polling ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Install the agent daemon so your host reports scan results to
                  this dashboard automatically.
                </p>
                <CopyCommand command="clawkeeper.sh agent --install" />
                <p className="text-xs text-muted-foreground">
                  You&apos;ll be prompted for your API key during setup. The
                  agent scans hourly and uploads results.
                </p>
                <Button
                  onClick={() => setPolling(true)}
                  className="w-full"
                >
                  I&apos;ve connected the agent
                </Button>
              </>
            ) : (
              <div className="py-6 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Waiting for your first scan result&hellip; The hosts page
                  will update automatically. You can close this dialog and check back later.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Trigger a scan manually with{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5">
                    clawkeeper.sh agent run
                  </code>
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
