import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorialFooterProps {
  nextHref?: string;
  nextLabel?: string;
}

export function TutorialFooter({ nextHref, nextLabel }: TutorialFooterProps) {
  return (
    <div className="mt-16 space-y-8 border-t border-white/10 pt-8">
      {nextHref && nextLabel && (
        <div className="flex justify-end">
          <Link href={nextHref}>
            <Button variant="ghost" className="gap-2 text-cyan-400 hover:text-cyan-300 hover:bg-white/5">
              Next: {nextLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="mb-2 text-sm text-zinc-400">
          Automate these checks with Clawkeeper
        </p>
        <p className="mb-4 text-xs text-zinc-500">
          One command scans your entire OpenClaw deployment and gives you an A-F security grade.
        </p>
        <Link href="/signup">
          <Button className="btn-rad bg-cyan-500 text-black font-medium hover:bg-cyan-400">
            Get started free
          </Button>
        </Link>
      </div>
    </div>
  );
}
