import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { Check, X, Shield } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: shared } = await admin
    .from("shared_scans")
    .select("scan_id")
    .eq("share_code", code)
    .eq("is_public", true)
    .single();

  if (!shared) return { title: "Clawkeeper" };

  const { data: scan } = await admin
    .from("scans")
    .select("grade, score")
    .eq("id", shared.scan_id)
    .single();

  if (!scan) return { title: "Clawkeeper" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://clawkeeper.dev";
  const title = `Grade ${scan.grade} — ${scan.score}/100 | Clawkeeper Security Report`;
  const description = `This OpenClaw deployment scored ${scan.score}/100 (Grade ${scan.grade}). Scan yours free at clawkeeper.dev.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`${appUrl}/api/og/scan/${code}`],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/api/og/scan/${code}`],
    },
  };
}

export default async function SharedScanPage({ params }: Props) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: shared } = await admin
    .from("shared_scans")
    .select("scan_id, org_id")
    .eq("share_code", code)
    .eq("is_public", true)
    .single();

  if (!shared) notFound();

  const { data: scan } = await admin
    .from("scans")
    .select("grade, score, passed, failed, skipped, scanned_at")
    .eq("id", shared.scan_id)
    .single();

  if (!scan) notFound();

  // Get top failed checks (no raw report exposed)
  const { data: failedChecks } = await admin
    .from("scan_checks")
    .select("check_name, detail")
    .eq("scan_id", shared.scan_id)
    .eq("status", "FAIL")
    .limit(5);

  // Get referral code for the sharer to embed in CTA
  const { data: refCode } = await admin
    .from("referral_codes")
    .select("code")
    .eq("org_id", shared.org_id)
    .eq("is_active", true)
    .single();

  const signupUrl = refCode ? `/signup?ref=${refCode.code}` : "/signup";

  const gradeColors: Record<string, string> = {
    A: "text-green-400 border-green-400",
    B: "text-green-400 border-green-400",
    C: "text-yellow-400 border-yellow-400",
    D: "text-orange-400 border-orange-400",
    F: "text-red-400 border-red-400",
  };
  const gradeColor = gradeColors[scan.grade] || "text-red-400 border-red-400";

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <Logo className="text-white" />
          </Link>
          <Link href={signupUrl}>
            <Button size="sm" className="bg-cyan-500 text-black font-medium hover:bg-cyan-400">
              Scan yours free
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Grade hero */}
          <div className="text-center">
            <div className="mb-2 text-sm text-zinc-500">
              <Shield className="mr-1 inline h-4 w-4" />
              Clawkeeper Security Report
            </div>
            <div className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 ${gradeColor}`}>
              <span className={`text-7xl font-extrabold ${gradeColor.split(" ")[0]}`}>
                {scan.grade}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold">{scan.score}/100</p>
            <p className="text-sm text-zinc-500">
              Scanned {new Date(scan.scanned_at).toLocaleDateString()}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <Card className="border-white/10 bg-zinc-900/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-400">{scan.passed}</div>
                <p className="text-xs text-zinc-500">Passed</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-zinc-900/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-400">{scan.failed}</div>
                <p className="text-xs text-zinc-500">Failed</p>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-zinc-900/50">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-400">{scan.skipped}</div>
                <p className="text-xs text-zinc-500">Skipped</p>
              </CardContent>
            </Card>
          </div>

          {/* Top failed checks */}
          {failedChecks && failedChecks.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Top Failed Checks</h2>
              <div className="space-y-2">
                {failedChecks.map((check, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3"
                  >
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-medium">{check.check_name}</p>
                      {check.detail && (
                        <p className="text-xs text-zinc-500">{check.detail}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
            <h2 className="text-xl font-bold">Scan your OpenClaw deployment</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Get your own security grade in under 60 seconds. Free forever.
            </p>
            <Link href={signupUrl}>
              <Button className="mt-4 bg-cyan-500 text-black font-medium hover:bg-cyan-400">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 text-center text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400">clawkeeper.dev</Link>
      </footer>
    </div>
  );
}
