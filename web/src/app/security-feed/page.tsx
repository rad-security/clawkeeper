import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { CopyCommand } from "@/components/landing/CopyCommand";
import { getCVEFeed } from "@/lib/cve-feed";
import { SeveritySummary } from "@/components/security-feed/SeveritySummary";
import { CVECard } from "@/components/security-feed/CVECard";

export const metadata: Metadata = {
  title: "Security Feed — OpenClaw CVE Advisories | Clawkeeper",
  description:
    "Daily-updated CVE advisories for OpenClaw deployments. Track vulnerabilities in Node.js, Docker, and WebSocket infrastructure with severity scores and remediation guidance.",
  openGraph: {
    title: "Security Feed — OpenClaw CVE Advisories",
    description:
      "Daily-updated CVE advisories for OpenClaw deployments. Track vulnerabilities in Node.js, Docker, and WebSocket infrastructure.",
    type: "website",
    url: "https://clawkeeper.dev/security-feed",
  },
  twitter: {
    card: "summary_large_image",
    title: "Security Feed — OpenClaw CVE Advisories",
    description:
      "Daily-updated CVE advisories for OpenClaw deployments.",
  },
};

export const revalidate = 86400; // 24 hours

export default async function SecurityFeedPage() {
  const feed = await getCVEFeed();

  const lastUpdated = new Date(feed.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      {/* ───── Nav ───── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/">
            <Logo className="text-white" />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/#problem"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Why
            </Link>
            <Link
              href="/#features"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Features
            </Link>
            <Link
              href="/#deploy"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Deploy
            </Link>
            <Link
              href="/#pricing"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Docs
            </Link>
            <Link
              href="/security-feed"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Security Feed
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white"
              >
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                size="sm"
                className="btn-rad bg-cyan-500 text-black font-medium hover:bg-cyan-400"
              >
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ───── Hero ───── */}
      <section className="border-b border-white/10 bg-zinc-950 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <Badge className="mb-6 border-white/10 bg-white/5 text-zinc-300 backdrop-blur">
            <Shield className="mr-1 h-3 w-3" />
            Security Intelligence
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            OpenClaw{" "}
            <span className="gradient-text">Security Feed</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Daily-updated CVE advisories for the OpenClaw tech stack.
            Node.js, Docker, and WebSocket vulnerabilities — tracked and
            scored so you can prioritize what matters.
          </p>

          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-sm text-zinc-500">
              Last updated: {lastUpdated}
            </p>
            <SeveritySummary items={feed.items} />
          </div>
        </div>
      </section>

      {/* ───── CVE List ───── */}
      <section className="py-12">
        <div className="mx-auto max-w-4xl px-4">
          {feed.items.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-zinc-600" />
              <h2 className="mt-4 text-lg font-semibold text-white">
                No advisories found
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                No CVEs matching the OpenClaw tech stack were found in the
                last 90 days. Check back tomorrow for updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feed.items.map((item) => (
                <CVECard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="border-t border-white/10 bg-zinc-950 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Protect your OpenClaw deployment
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Clawkeeper scans your OpenClaw instance against known CVEs,
            misconfigurations, and exposed credentials — then tells you
            exactly what to fix.
          </p>

          <div className="mx-auto mt-8 max-w-lg">
            <CopyCommand command="curl -fsSL https://clawkeeper.dev/install.sh | bash" />
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button
                size="lg"
                className="btn-rad bg-cyan-500 px-8 text-black font-medium hover:bg-cyan-400"
              >
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/docs">
              <Button
                variant="outline"
                size="lg"
                className="btn-rad border-white/10 text-zinc-300 hover:border-white/20 hover:text-white"
              >
                Read the docs
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo className="text-white" />
              <p className="mt-3 text-sm text-zinc-500">
                Security scanner and hardening platform for OpenClaw AI agent
                deployments.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <Link href="/#features" className="hover:text-zinc-300">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/#pricing" className="hover:text-zinc-300">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#enterprise" className="hover:text-zinc-300">
                    Enterprise
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/rad-security/clawkeeper"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <Link href="/docs" className="hover:text-zinc-300">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/security-feed" className="hover:text-zinc-300">
                    Security Feed
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-zinc-300">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/#deploy" className="hover:text-zinc-300">
                    Download
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@clawkeeper.dev"
                    className="hover:text-zinc-300"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500">
                <li>
                  <a
                    href="https://www.radsecurity.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-300"
                  >
                    RAD Security
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:sales@clawkeeper.dev"
                    className="hover:text-zinc-300"
                  >
                    Contact sales
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} RAD Security, Inc. All rights
              reserved.
            </p>
            <p className="text-xs text-zinc-600">
              CVE data sourced from the{" "}
              <a
                href="https://nvd.nist.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-400"
              >
                National Vulnerability Database
              </a>
              .
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
