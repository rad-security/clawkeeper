"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Globe, Loader2, CheckCircle2 } from "lucide-react";

interface Settings {
  email_enabled: boolean;
  email_address: string | null;
  webhook_enabled: boolean;
  webhook_url: string | null;
  webhook_secret: string | null;
  notify_on_cve: boolean;
  notify_on_critical: boolean;
  notify_on_grade_drop: boolean;
  notify_on_new_host: boolean;
  notify_on_shield_block: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  email_enabled: false,
  email_address: null,
  webhook_enabled: false,
  webhook_url: null,
  webhook_secret: null,
  notify_on_cve: true,
  notify_on_critical: true,
  notify_on_grade_drop: true,
  notify_on_new_host: false,
  notify_on_shield_block: true,
};

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/dashboard/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
      } else {
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
          <Bell className="h-5 w-5 text-cyan-400" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Get alerted when Clawkeeper detects security issues on your hosts.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Email Alerts</span>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.email_enabled}
              onChange={(e) =>
                setSettings({ ...settings, email_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-border accent-cyan-500"
            />
            <span className="text-sm">Enable email notifications</span>
          </label>
          {settings.email_enabled && (
            <input
              type="email"
              placeholder="alerts@yourcompany.com"
              value={settings.email_address || ""}
              onChange={(e) =>
                setSettings({ ...settings, email_address: e.target.value || null })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          )}
        </div>

        {/* Webhook Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Webhook Alerts</span>
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.webhook_enabled}
              onChange={(e) =>
                setSettings({ ...settings, webhook_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-border accent-cyan-500"
            />
            <span className="text-sm">Enable webhook notifications</span>
          </label>
          {settings.webhook_enabled && (
            <div className="space-y-2">
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={settings.webhook_url || ""}
                onChange={(e) =>
                  setSettings({ ...settings, webhook_url: e.target.value || null })
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <input
                type="text"
                placeholder="Webhook secret (optional, for HMAC signing)"
                value={settings.webhook_secret || ""}
                onChange={(e) =>
                  setSettings({ ...settings, webhook_secret: e.target.value || null })
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <p className="text-xs text-muted-foreground">
                Payloads are signed with HMAC-SHA256 via the <code className="text-cyan-400">X-Clawkeeper-Signature</code> header.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Event Type Toggles */}
        <div className="space-y-3">
          <span className="text-sm font-medium">Notify me about</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={settings.notify_on_cve}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_cve: e.target.checked })
                }
                className="h-4 w-4 rounded border-border accent-cyan-500"
              />
              <div>
                <span className="text-sm">CVE vulnerabilities</span>
                <p className="text-xs text-muted-foreground">
                  Known CVEs affecting your OpenClaw installation
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={settings.notify_on_critical}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_critical: e.target.checked })
                }
                className="h-4 w-4 rounded border-border accent-cyan-500"
              />
              <div>
                <span className="text-sm">Critical misconfigurations</span>
                <p className="text-xs text-muted-foreground">
                  Credential exposure, container escapes, regressions
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={settings.notify_on_grade_drop}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_grade_drop: e.target.checked })
                }
                className="h-4 w-4 rounded border-border accent-cyan-500"
              />
              <div>
                <span className="text-sm">Grade drops</span>
                <p className="text-xs text-muted-foreground">
                  When a host&apos;s security grade decreases
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={settings.notify_on_new_host}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_new_host: e.target.checked })
                }
                className="h-4 w-4 rounded border-border accent-cyan-500"
              />
              <div>
                <span className="text-sm">New host registered</span>
                <p className="text-xs text-muted-foreground">
                  When a new machine starts reporting scans
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 rounded-md border p-3">
              <input
                type="checkbox"
                checked={settings.notify_on_shield_block}
                onChange={(e) =>
                  setSettings({ ...settings, notify_on_shield_block: e.target.checked })
                }
                className="h-4 w-4 rounded border-border accent-cyan-500"
              />
              <div>
                <span className="text-sm">Shield blocks</span>
                <p className="text-xs text-muted-foreground">
                  When Runtime Shield blocks prompt injection attempts
                </p>
              </div>
            </label>
          </div>
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
              "Save Notification Settings"
            )}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-cyan-400">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
          {error && (
            <span className="text-sm text-destructive">{error}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
