"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import type { ShieldSecurityLevel } from "@/types";

interface Policy {
  security_level: ShieldSecurityLevel;
  custom_blacklist: string[];
  trusted_sources: string[];
  entropy_threshold: number;
  max_input_length: number;
  auto_block: boolean;
}

const DEFAULT_POLICY: Policy = {
  security_level: "strict",
  custom_blacklist: [],
  trusted_sources: [],
  entropy_threshold: 4.5,
  max_input_length: 10000,
  auto_block: true,
};

const LEVELS: { value: ShieldSecurityLevel; label: string; desc: string }[] = [
  { value: "paranoid", label: "Paranoid", desc: "Block on any single detection layer flag" },
  { value: "strict", label: "Strict", desc: "Block on 2+ flags or any critical detection" },
  { value: "moderate", label: "Moderate", desc: "Block on 2+ flags with critical/high severity" },
  { value: "minimal", label: "Minimal", desc: "Only block explicit blacklist or critical regex" },
];

export function ShieldPolicyPanel() {
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blacklistText, setBlacklistText] = useState("");
  const [trustedText, setTrustedText] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/shield/policy")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setPolicy(data);
          setBlacklistText((data.custom_blacklist || []).join("\n"));
          setTrustedText((data.trusted_sources || []).join("\n"));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const updated = {
      ...policy,
      custom_blacklist: blacklistText.split("\n").map((s) => s.trim()).filter(Boolean),
      trusted_sources: trustedText.split("\n").map((s) => s.trim()).filter(Boolean),
    };

    try {
      const res = await fetch("/api/dashboard/shield/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
        setPolicy(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          <CardTitle className="text-base">Shield Policy</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Security Level */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Security Level</span>
          <div className="grid gap-2">
            {LEVELS.map((l) => (
              <label
                key={l.value}
                className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                  policy.security_level === l.value
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="security_level"
                  checked={policy.security_level === l.value}
                  onChange={() => setPolicy({ ...policy, security_level: l.value })}
                  className="mt-0.5 accent-cyan-500"
                />
                <div>
                  <span className="text-sm font-medium">{l.label}</span>
                  <p className="text-xs text-muted-foreground">{l.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-block */}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={policy.auto_block}
            onChange={(e) => setPolicy({ ...policy, auto_block: e.target.checked })}
            className="h-4 w-4 rounded border-border accent-cyan-500"
          />
          <span className="text-sm">Auto-block detected threats</span>
        </label>

        {/* Blacklist */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Custom Blacklist</span>
          <textarea
            value={blacklistText}
            onChange={(e) => setBlacklistText(e.target.value)}
            placeholder="One entry per line..."
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <p className="text-xs text-muted-foreground">
            Exact match + fuzzy (Levenshtein distance &le; 2)
          </p>
        </div>

        {/* Trusted Sources */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Trusted Sources</span>
          <textarea
            value={trustedText}
            onChange={(e) => setTrustedText(e.target.value)}
            placeholder="One source per line..."
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-cyan-500 text-black font-medium hover:bg-cyan-400"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Policy"
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-cyan-400">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
