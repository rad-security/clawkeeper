"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AlertRuleForm({
  orgId,
  ruleCount,
}: {
  orgId: string;
  ruleCount: number;
}) {
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("score_below");
  const [threshold, setThreshold] = useState("70");
  const [checkName, setCheckName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const config: Record<string, unknown> = {};
    if (ruleType === "score_below") config.threshold = Number(threshold);
    if (ruleType === "check_fail") config.check_name = checkName;

    const res = await fetch("/api/dashboard/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rule_type: ruleType, config, org_id: orgId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create rule");
    } else {
      setName("");
      setThreshold("70");
      setCheckName("");
      router.refresh();
    }
    setLoading(false);
  }

  if (ruleCount >= 20) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Alert Rule</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g., Score drops below 70"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Rule Type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value)}
              >
                <option value="score_below">Score drops below threshold</option>
                <option value="grade_drop">Grade drops from previous scan</option>
                <option value="check_fail">Specific check fails</option>
              </select>
            </div>
          </div>

          {ruleType === "score_below" && (
            <div className="space-y-2">
              <Label>Score Threshold</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          )}

          {ruleType === "check_fail" && (
            <div className="space-y-2">
              <Label>Check Name</Label>
              <Input
                placeholder="e.g., Firewall"
                value={checkName}
                onChange={(e) => setCheckName(e.target.value)}
                required
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Rule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
