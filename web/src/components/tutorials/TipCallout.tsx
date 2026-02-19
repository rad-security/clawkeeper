import { AlertTriangle, Info, Lightbulb, ShieldAlert } from "lucide-react";

type CalloutVariant = "tip" | "warning" | "info" | "danger";

interface TipCalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
}

const config: Record<CalloutVariant, { icon: typeof Info; border: string; bg: string; iconColor: string; titleColor: string }> = {
  tip: {
    icon: Lightbulb,
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    iconColor: "text-emerald-400",
    titleColor: "text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    iconColor: "text-amber-400",
    titleColor: "text-amber-400",
  },
  info: {
    icon: Info,
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    iconColor: "text-cyan-400",
    titleColor: "text-cyan-400",
  },
  danger: {
    icon: ShieldAlert,
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    iconColor: "text-red-400",
    titleColor: "text-red-400",
  },
};

export function TipCallout({ variant = "tip", title, children }: TipCalloutProps) {
  const c = config[variant];
  const Icon = c.icon;

  return (
    <div className={`my-6 rounded-lg border ${c.border} ${c.bg} px-4 py-3`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${c.iconColor}`} />
        {title && <span className={`text-sm font-medium ${c.titleColor}`}>{title}</span>}
      </div>
      <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}
