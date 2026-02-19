import { ShieldCheck, ShieldAlert } from "lucide-react";

interface ComparisonBlockProps {
  secureTitle?: string;
  insecureTitle?: string;
  secure: React.ReactNode;
  insecure: React.ReactNode;
}

export function ComparisonBlock({
  secureTitle = "Secure",
  insecureTitle = "Insecure",
  secure,
  insecure,
}: ComparisonBlockProps) {
  return (
    <div className="my-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-red-500/20 bg-red-500/5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-red-500/20 px-4 py-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <span className="text-xs font-medium text-red-400">{insecureTitle}</span>
        </div>
        <div className="p-4 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto">
          {insecure}
        </div>
      </div>
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-emerald-500/20 px-4 py-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">{secureTitle}</span>
        </div>
        <div className="p-4 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto">
          {secure}
        </div>
      </div>
    </div>
  );
}
