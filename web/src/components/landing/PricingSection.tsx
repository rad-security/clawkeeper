"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Minus } from "lucide-react";
import { FREE_FEATURES, PRO_FEATURES, ENTERPRISE_FEATURES } from "@/types";

const comparisonFeatures = [
  { name: "CLI scanner (35+ checks)", free: true, pro: true, enterprise: true },
  { name: "Auto-fix remediation", free: true, pro: true, enterprise: true },
  { name: "Dashboard hosts", free: "1", pro: "50", enterprise: "Unlimited" },
  { name: "Scan history", free: "7 days", pro: "365 days", enterprise: "Unlimited" },
  { name: "API keys", free: "1", pro: "10", enterprise: "Unlimited" },
  { name: "Alert rules", free: false, pro: "20", enterprise: "Unlimited" },
  { name: "Email & webhook alerts", free: false, pro: true, enterprise: true },
  { name: "Score history & trends", free: false, pro: true, enterprise: true },
  { name: "Hardened Helm charts", free: false, pro: false, enterprise: true },
  { name: "eBPF runtime detection", free: false, pro: false, enterprise: true },
  { name: "Real-time KSPM", free: false, pro: false, enterprise: true },
  { name: "KBOM inventory", free: false, pro: false, enterprise: true },
  { name: "Cloud-native ITDR", free: false, pro: false, enterprise: true },
  { name: "Multi-cloud deploy", free: false, pro: false, enterprise: true },
  { name: "SSO / SAML", free: false, pro: false, enterprise: true },
  { name: "Dedicated support & SLA", free: false, pro: false, enterprise: true },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-cyan-400" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-zinc-700" />;
  return <span className="text-sm text-zinc-300">{value}</span>;
}

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const proPrice = billing === "annual" ? "$24" : "$29";
  const enterprisePrice = billing === "annual" ? "$119" : "$149";

  return (
    <>
      {/* Billing toggle */}
      <div className="mt-8 flex items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 w-fit mx-auto">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            billing === "monthly"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            billing === "annual"
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Annual
          <Badge className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
            Save 17%
          </Badge>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {/* Free */}
        <Card className="flex flex-col border-white/10 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-xl text-white">Free</CardTitle>
            <div className="text-4xl font-bold text-white">
              $0
              <span className="text-base font-normal text-zinc-500">
                /forever
              </span>
            </div>
            <CardDescription className="text-zinc-500">
              For individual developers securing their own OpenClaw
              installation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ul className="flex-1 space-y-3 text-sm text-zinc-300">
              {FREE_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 block">
              <Button variant="outline" className="btn-rad w-full border-white/10 text-zinc-300 hover:border-white/20 hover:text-white">
                Get started free
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pro */}
        <Card className="relative flex flex-col border-cyan-500/30 bg-cyan-500/5 shadow-lg shadow-cyan-500/5">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-cyan-500 text-black font-medium">Most popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-xl text-white">Pro</CardTitle>
            <div className="text-4xl font-bold text-white">
              {proPrice}
              <span className="text-base font-normal text-zinc-500">
                /host/mo
              </span>
            </div>
            {billing === "annual" && (
              <p className="text-xs text-cyan-400">
                Billed annually — save $60/year vs monthly
              </p>
            )}
            <CardDescription className="text-zinc-500">
              For teams running OpenClaw across multiple machines. Fleet
              visibility and alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ul className="flex-1 space-y-3 text-sm text-zinc-300">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 block">
              <Button className="btn-rad w-full bg-cyan-500 text-black font-medium hover:bg-cyan-400">
                Upgrade to Pro
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Enterprise */}
        <Card className="flex flex-col border-violet-500/30 bg-violet-500/5">
          <CardHeader>
            <CardTitle className="text-xl text-white">Enterprise</CardTitle>
            <div className="text-4xl font-bold text-white">
              {enterprisePrice}
              <span className="text-base font-normal text-zinc-500">
                /cluster/mo
              </span>
            </div>
            {billing === "annual" && (
              <p className="text-xs text-violet-400">
                Billed annually — save $360/year vs monthly
              </p>
            )}
            <CardDescription className="text-zinc-500">
              For organizations deploying hardened OpenClaw in Kubernetes with
              runtime security.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <ul className="flex-1 space-y-3 text-sm text-zinc-300">
              {ENTERPRISE_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link href="/demo" className="mt-8 block">
              <Button
                variant="outline"
                className="btn-rad w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
              >
                Schedule a demo
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Feature comparison table */}
      <div className="mt-16">
        <h3 className="mb-6 text-center text-lg font-semibold text-white">
          Compare plans
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-3 pr-4 text-left font-medium text-zinc-500">
                  Feature
                </th>
                <th className="px-4 py-3 text-center font-medium text-zinc-300">Free</th>
                <th className="px-4 py-3 text-center font-medium text-cyan-400">
                  Pro
                </th>
                <th className="px-4 py-3 text-center font-medium text-violet-400">
                  Enterprise
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((f) => (
                <tr key={f.name} className="border-b border-white/5 last:border-0">
                  <td className="py-3 pr-4 text-left text-zinc-300">{f.name}</td>
                  <td className="px-4 py-3 text-center">
                    <CellValue value={f.free} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue value={f.pro} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <CellValue value={f.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
