"use client";

import { CopyCommand } from "@/components/landing/CopyCommand";

interface CommandBlockProps {
  title?: string;
  command: string;
  annotation?: string;
}

export function CommandBlock({ title, command, annotation }: CommandBlockProps) {
  return (
    <div className="my-4">
      {title && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </p>
      )}
      <CopyCommand command={command} />
      {annotation && (
        <p className="mt-2 text-xs text-zinc-500">{annotation}</p>
      )}
    </div>
  );
}
