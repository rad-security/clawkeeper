import Link from "next/link";
import {
  getAllChecks,
  PHASE_LABELS,
  PHASES,
  type Check,
} from "@/lib/docs/check-loader";

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

function CheckRow({ check }: { check: Check }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-2.5 pr-3 font-mono text-sm text-cyan-300">
        {check.id}
      </td>
      <td className="py-2.5 pr-3 text-sm text-white">{check.name}</td>
      <td className="py-2.5 pr-3">
        <PlatformBadge platform={check.platform} />
      </td>
      <td className="py-2.5 pr-3 text-sm text-zinc-400">
        {check.description}
      </td>
      <td className="py-2.5 pr-3 text-center text-sm">
        {check.requiresSudo ? (
          <span className="text-yellow-400" title="Requires sudo">
            sudo
          </span>
        ) : (
          <span className="text-zinc-600">-</span>
        )}
      </td>
      <td className="py-2.5 text-center text-sm">
        {check.hasRemediation ? (
          <span className="text-green-400">yes</span>
        ) : (
          <span className="text-zinc-600">no</span>
        )}
      </td>
    </tr>
  );
}

export default async function ChecksPage() {
  const checks = await getAllChecks();

  const grouped = PHASES.reduce(
    (acc, phase) => {
      acc[phase] = checks.filter((c) => c.phase === phase);
      return acc;
    },
    {} as Record<string, Check[]>
  );

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Security Checks Reference
      </h1>
      <p className="mb-8 text-zinc-400">
        Clawkeeper runs {checks.length} automated security checks across{" "}
        {PHASES.length} phases. This page is auto-generated from the check
        definitions in the source code.
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        {PHASES.map((phase) => (
          <Link
            key={phase}
            href={`/docs/checks/${phase}`}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            {PHASE_LABELS[phase]}{" "}
            <span className="text-zinc-600">({grouped[phase]?.length || 0})</span>
          </Link>
        ))}
      </div>

      {PHASES.map((phase) => {
        const phaseChecks = grouped[phase] || [];
        if (phaseChecks.length === 0) return null;

        return (
          <section key={phase} className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">
                {PHASE_LABELS[phase]}
              </h2>
              <span className="text-sm text-zinc-600">
                {phaseChecks.length} checks
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-left">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-zinc-400">
                      ID
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-zinc-400">
                      Name
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-zinc-400">
                      Platform
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-zinc-400">
                      Description
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400">
                      Sudo
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-400">
                      Auto-fix
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {phaseChecks.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}
