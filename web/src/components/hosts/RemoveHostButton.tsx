"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function RemoveHostButton({
  hostId,
  hostname,
}: {
  hostId: string;
  hostname: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const confirmed = window.confirm(
      `Remove "${hostname}" from your dashboard?\n\n` +
        `This will permanently delete all scans and check history for this host.\n\n` +
        `If the Clawkeeper agent is still running on this machine, ` +
        `uninstall it first to prevent re-registration:\n` +
        `  clawkeeper.sh agent --uninstall`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/hosts/${hostId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete host");
      }
      router.push("/hosts");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete host");
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={loading}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="mr-1.5 h-4 w-4" />
      )}
      Remove
    </Button>
  );
}
