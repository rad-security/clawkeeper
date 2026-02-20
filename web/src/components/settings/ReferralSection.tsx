"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Gift, Twitter, Linkedin, Users } from "lucide-react";

interface ReferralStats {
  code: string | null;
  total_referrals: number;
  total_credits_earned: number;
}

export function ReferralSection() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/referral/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function generateCode() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/referral/generate", { method: "POST" });
      const data = await res.json();
      if (data.code) {
        setStats((prev) => prev ? { ...prev, code: data.code } : { code: data.code, total_referrals: 0, total_credits_earned: 0 });
      } else {
        setError(data.error || "Failed to generate code");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!stats?.code) return;
    const url = `https://clawkeeper.dev/r/${stats.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-cyan-400" />
            <CardTitle>Referrals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const shareUrl = stats?.code ? `https://clawkeeper.dev/r/${stats.code}` : "";
  const shareText = "Check your OpenClaw security posture with Clawkeeper — free CLI scanner with 44 automated checks:";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-cyan-400" />
          <CardTitle>Referrals</CardTitle>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">
            Earn credits
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your referral link. When someone signs up, you get <strong className="text-foreground">+5 scan credits</strong> and they get <strong className="text-foreground">+5 bonus credits</strong>.
        </p>

        {stats?.code ? (
          <>
            {/* Code display */}
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border bg-muted/50 px-4 py-2.5 font-mono text-sm">
                {shareUrl}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>

            {/* Share buttons */}
            <div className="flex items-center gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Twitter className="h-3.5 w-3.5" />
                  Twitter
                </Button>
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Linkedin className="h-3.5 w-3.5" />
                  LinkedIn
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{stats.total_referrals}</span>
                </div>
                <p className="text-xs text-muted-foreground">Referrals</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <Gift className="h-4 w-4 text-cyan-400" />
                  <span className="text-2xl font-bold">{stats.total_credits_earned}</span>
                </div>
                <p className="text-xs text-muted-foreground">Credits earned</p>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Button onClick={generateCode} disabled={generating} className="bg-cyan-500 text-black font-medium hover:bg-cyan-400">
              <Gift className="mr-1.5 h-4 w-4" />
              {generating ? "Generating..." : "Generate referral code"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
