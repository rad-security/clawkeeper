import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface TutorialCardProps {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  minutes: number;
}

const difficultyColor: Record<string, string> = {
  Beginner: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Intermediate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Advanced: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function TutorialCard({ href, icon: Icon, title, description, difficulty, minutes }: TutorialCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-cyan-500/30 hover:bg-white/[0.04]"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-cyan-500/10 p-2.5">
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
        <Badge className={difficultyColor[difficulty]}>{difficulty}</Badge>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white group-hover:text-cyan-400 transition">
        {title}
      </h3>
      <p className="mb-4 text-sm leading-relaxed text-zinc-400">{description}</p>
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Clock className="h-3.5 w-3.5" />
        <span>{minutes} min read</span>
      </div>
    </Link>
  );
}
