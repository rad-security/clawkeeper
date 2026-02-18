"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIER_LIMITS, type PlanType } from "@/types";
import { Trash2, Copy, Check } from "lucide-react";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

export function ApiKeyManager({
  orgId,
  keys,
  plan,
}: {
  orgId: string;
  keys: ApiKeyRow[];
  plan: PlanType;
}) {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const limit = TIER_LIMITS[plan].api_keys;

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNewKey("");

    const res = await fetch("/api/dashboard/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, org_id: orgId }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create key");
    } else {
      setNewKey(data.key);
      setName("");
      router.refresh();
    }
    setLoading(false);
  }

  async function deleteKey(id: string, name: string) {
    if (!window.confirm(`Delete API key "${name}"? This cannot be undone and will break any agents using this key.`)) {
      return;
    }
    const res = await fetch(`/api/dashboard/api-keys/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.refresh();
    }
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Keys ({keys.length}/{limit})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New key display */}
        {newKey && (
          <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
            <p className="mb-2 text-sm font-medium text-green-800 dark:text-green-200">
              Copy your API key now — it won&apos;t be shown again:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white px-3 py-2 text-sm dark:bg-black">
                {newKey}
              </code>
              <Button size="sm" variant="outline" onClick={copyKey}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Create form */}
        {keys.length < limit && (
          <form onSubmit={createKey} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label>Key Name</Label>
              <Input
                placeholder="e.g., Production Mac Mini"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Key"}
            </Button>
          </form>
        )}

        {keys.length >= limit && plan === "free" && (
          <p className="text-sm text-muted-foreground">
            Free plan is limited to {limit} API key. Upgrade to Pro for more.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Key list */}
        {keys.length > 0 && (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {key.key_prefix}... · Created{" "}
                    {new Date(key.created_at).toLocaleDateString()}
                    {key.last_used_at &&
                      ` · Last used ${new Date(key.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteKey(key.id, key.name)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
