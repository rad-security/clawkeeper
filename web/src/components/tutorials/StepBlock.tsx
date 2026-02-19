interface StepBlockProps {
  step: number;
  title: string;
  children: React.ReactNode;
}

export function StepBlock({ step, title, children }: StepBlockProps) {
  return (
    <div className="my-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-bold text-cyan-400">
          {step}
        </span>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="ml-11 space-y-4 text-sm leading-relaxed text-zinc-300">
        {children}
      </div>
    </div>
  );
}
