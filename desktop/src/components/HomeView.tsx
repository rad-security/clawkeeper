import { Shield, Scan, Rocket, ArrowRight } from "lucide-react";
import type { AppView } from "../types/scan";

export function HomeView({ onNavigate }: { onNavigate: (v: AppView) => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <div className="max-w-lg w-full space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[var(--muted)] mb-2">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Clawkeeper
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm mx-auto">
            Secure your OpenClaw AI agent deployment. Scan for
            misconfigurations, deploy with hardened defaults, and monitor your
            security posture.
          </p>
        </div>

        {/* Action cards */}
        <div className="space-y-3">
          <button
            onClick={() => onNavigate("scan")}
            className="group flex w-full items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:border-[var(--ring)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Scan className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Scan Existing Installation</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Audit your current OpenClaw setup with 27 security checks
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={() => onNavigate("deploy")}
            className="group flex w-full items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 text-left transition-colors hover:border-[var(--ring)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
              <Rocket className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Deploy OpenClaw Securely</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Full setup wizard with hardened defaults via Docker or native npm
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Quick info */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Checks", value: "27" },
            { label: "Phases", value: "4" },
            { label: "Platform", value: "macOS" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center"
            >
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
