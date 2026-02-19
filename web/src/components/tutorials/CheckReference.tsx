import Link from "next/link";
import { Shield } from "lucide-react";

interface CheckReferenceProps {
  name: string;
  phase: string;
  description: string;
}

const phaseHref: Record<string, string> = {
  host_hardening: "/docs/checks/host_hardening",
  network: "/docs/checks/network",
  prerequisites: "/docs/checks/prerequisites",
  security_audit: "/docs/checks/security_audit",
};

export function CheckReference({ name, phase, description }: CheckReferenceProps) {
  const href = phaseHref[phase] || "/docs/checks";

  return (
    <Link
      href={href}
      className="my-4 flex items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 transition hover:border-cyan-500/40"
    >
      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
      <div>
        <span className="text-sm font-medium text-cyan-400">{name}</span>
        <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
      </div>
    </Link>
  );
}
