import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getChecksByPhase,
  PHASE_LABELS,
  PHASES,
  type Check,
} from "@/lib/docs/check-loader";

export function generateStaticParams() {
  return PHASES.map((phase) => ({ phase }));
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    macos: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    linux: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    all: "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${colors[platform] || colors.all}`}
    >
      {platform}
    </span>
  );
}

function CheckCard({ check }: { check: Check }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white">{check.name}</h3>
          <code className="text-xs text-zinc-500">{check.id}</code>
        </div>
        <PlatformBadge platform={check.platform} />
      </div>
      <p className="mb-3 text-sm leading-relaxed text-zinc-400">
        {check.description}
      </p>
      <div className="flex gap-4 text-xs text-zinc-500">
        {check.requiresSudo && (
          <span className="text-yellow-400">Requires sudo</span>
        )}
        {check.hasRemediation ? (
          <span className="text-green-400">Auto-fix available</span>
        ) : (
          <span>Manual fix only</span>
        )}
        <span>Order: {check.order}</span>
      </div>
    </div>
  );
}

export default async function PhasePage({
  params,
}: {
  params: Promise<{ phase: string }>;
}) {
  const { phase } = await params;

  if (!PHASES.includes(phase)) {
    notFound();
  }

  const checks = await getChecksByPhase(phase);
  const label = PHASE_LABELS[phase];

  return (
    <>
      <div className="mb-2">
        <Link
          href="/docs/checks"
          className="text-sm text-zinc-500 hover:text-zinc-300"
        >
          All Checks
        </Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-sm text-zinc-300">{label}</span>
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {label}
      </h1>
      <p className="mb-8 text-zinc-400">
        {checks.length} security checks in the {label.toLowerCase()} phase.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {checks.map((check) => (
          <CheckCard key={check.id} check={check} />
        ))}
      </div>

      {/* Phase navigation */}
      <div className="mt-12 flex flex-wrap gap-2 border-t border-white/10 pt-6">
        {PHASES.map((p) => (
          <Link
            key={p}
            href={`/docs/checks/${p}`}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              p === phase
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
            }`}
          >
            {PHASE_LABELS[p]}
          </Link>
        ))}
      </div>
    </>
  );
}
