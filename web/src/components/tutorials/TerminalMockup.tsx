interface TerminalMockupProps {
  title?: string;
  children: React.ReactNode;
}

export function TerminalMockup({ title = "Terminal", children }: TerminalMockupProps) {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-white/10">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-500/60" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <span className="h-3 w-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs text-zinc-500">{title}</span>
      </div>
      <div className="bg-black p-4 font-mono text-sm leading-relaxed text-zinc-300 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}
