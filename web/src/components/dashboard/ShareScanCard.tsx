"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Check, Twitter, Linkedin } from "lucide-react";

export function ShareScanCard({ scanId, grade, score }: { scanId: string; grade: string; score: number }) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch("/api/share/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scanId }),
      });
      const data = await res.json();
      if (data.share_url) {
        setShareUrl(data.share_url);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = `Security score challenge: my OpenClaw deployment scored ${score}/100 (Grade ${grade}) on Clawkeeper. Can you beat it?`;

  if (!shareUrl) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={loading}
        className="gap-1.5"
      >
        <Share2 className="h-3.5 w-3.5" />
        {loading ? "Creating link..." : "Challenge a friend"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="gap-1.5"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy challenge link"}
      </Button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm" className="px-2">
          <Twitter className="h-3.5 w-3.5" />
        </Button>
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant="outline" size="sm" className="px-2">
          <Linkedin className="h-3.5 w-3.5" />
        </Button>
      </a>
    </div>
  );
}
