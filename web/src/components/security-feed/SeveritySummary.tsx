import type { CVEFeedItem } from "@/lib/cve-feed";

const severityConfig = {
  CRITICAL: "bg-red-500/10 border-red-500/30 text-red-400",
  HIGH: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  MEDIUM: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  LOW: "bg-blue-500/10 border-blue-500/30 text-blue-400",
} as const;

export function SeveritySummary({ items }: { items: CVEFeedItem[] }) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const item of items) {
    counts[item.severity]++;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-zinc-500">
        {items.length} advisories
      </span>
      {(Object.keys(counts) as Array<keyof typeof counts>).map(
        (severity) =>
          counts[severity] > 0 && (
            <span
              key={severity}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${severityConfig[severity]}`}
            >
              {counts[severity]} {severity.charAt(0) + severity.slice(1).toLowerCase()}
            </span>
          )
      )}
    </div>
  );
}
