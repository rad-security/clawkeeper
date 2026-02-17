"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Zap, Container } from "lucide-react";
import { PRO_FEATURES, ENTERPRISE_FEATURES } from "@/types";

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const router = useRouter();

  async function handleCheckout(plan: "pro" | "enterprise") {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upgrade your plan</h1>
        <p className="text-muted-foreground">
          Unlock more hosts, alerts, and enterprise features.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            billing === "monthly"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            billing === "annual"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <Badge variant="secondary" className="ml-2">
            Save 17%
          </Badge>
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Pro */}
        <Card className="border-cyan-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-cyan-600" />
              <CardTitle>Pro</CardTitle>
            </div>
            <div className="text-3xl font-bold">
              {billing === "annual" ? "$24" : "$29"}
              <span className="text-base font-normal text-muted-foreground">
                /host/mo
              </span>
            </div>
            {billing === "annual" && (
              <p className="text-sm text-cyan-600">
                $288/year — save $60 vs monthly
              </p>
            )}
            <CardDescription>
              Fleet monitoring, alerts, and extended history for teams.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full bg-cyan-600 text-white hover:bg-cyan-700"
              onClick={() => handleCheckout("pro")}
              disabled={loading === "pro"}
            >
              {loading === "pro" ? "Redirecting..." : "Upgrade to Pro"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise */}
        <Card className="border-violet-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Container className="h-5 w-5 text-violet-600" />
              <CardTitle>Enterprise</CardTitle>
            </div>
            <div className="text-3xl font-bold">
              {billing === "annual" ? "$119" : "$149"}
              <span className="text-base font-normal text-muted-foreground">
                /cluster/mo
              </span>
            </div>
            {billing === "annual" && (
              <p className="text-sm text-violet-600">
                $1,428/year — save $360 vs monthly
              </p>
            )}
            <CardDescription>
              Hardened K8s deployment with eBPF runtime detection.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {ENTERPRISE_FEATURES.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-600" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-6 w-full border-violet-400 text-violet-700 hover:bg-violet-50"
              onClick={() => router.push("/demo")}
            >
              Schedule a demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
