"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";

export function BillingPortalButton() {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openPortal}
      disabled={loading}
    >
      <CreditCard className="mr-2 h-4 w-4" />
      {loading ? "Opening..." : "Manage billing"}
    </Button>
  );
}
