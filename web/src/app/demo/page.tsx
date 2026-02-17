"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Shield,
  Check,
  ArrowLeft,
  Fingerprint,
  Layers,
  Globe,
  Lock,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

export default function DemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [clusters, setClusters] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, clusters }),
      });
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-4">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900 text-white">
          <CardHeader className="text-center">
            <Shield className="mx-auto mb-2 h-10 w-10 text-cyan-400" />
            <CardTitle className="text-white">Demo request received</CardTitle>
            <CardDescription className="text-zinc-400">
              We&apos;ll reach out to <strong className="text-white">{email}</strong> within
              one business day to schedule your demo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full border-white/10 text-zinc-300 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black">
      {/* Left: value proposition */}
      <div className="hidden flex-1 flex-col justify-center px-12 lg:flex">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white">
          Enterprise AI Agent Security
          <br />
          <span className="gradient-text">for Kubernetes</span>
        </h1>
        <p className="mt-4 max-w-md text-lg text-zinc-400">
          Deploy hardened OpenClaw in your K8s clusters with runtime detection
          powered by RAD Security&apos;s eBPF platform.
        </p>
        <div className="mt-8 space-y-4">
          {[
            {
              icon: Layers,
              text: "Hardened Helm charts with security-first defaults",
            },
            {
              icon: Fingerprint,
              text: "eBPF behavioral fingerprinting for every agent",
            },
            {
              icon: Lock,
              text: "Real-time KSPM against CIS & NSA benchmarks",
            },
            {
              icon: Globe,
              text: "Deploy to AWS EKS, GCP GKE, or Azure AKS",
            },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 shrink-0 text-violet-400" />
              <span className="text-sm text-zinc-300">{item.text}</span>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-zinc-600">
          Powered by RAD Security — the eBPF Kubernetes security platform.
        </p>
      </div>

      {/* Right: form */}
      <div className="flex flex-1 items-center justify-center px-4">
        <Card className="w-full max-w-md border-white/10 bg-zinc-900">
          <CardHeader>
            <div className="lg:hidden">
              <Logo className="text-white" />
            </div>
            <CardTitle className="text-white">Schedule a demo</CardTitle>
            <CardDescription className="text-zinc-400">
              Tell us about your deployment and we&apos;ll set up a personalized
              walkthrough.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">
                  Full name
                </Label>
                <Input
                  id="name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">
                  Work email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-zinc-300">
                  Company
                </Label>
                <Input
                  id="company"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clusters" className="text-zinc-300">
                  Number of K8s clusters
                </Label>
                <Input
                  id="clusters"
                  placeholder="e.g. 3-5"
                  value={clusters}
                  onChange={(e) => setClusters(e.target.value)}
                  className="border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
                />
              </div>
              <Button
                type="submit"
                className="btn-rad w-full bg-violet-500 text-white font-medium hover:bg-violet-400"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Request demo"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
