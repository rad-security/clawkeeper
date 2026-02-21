"use client";

import { useEffect } from "react";

export function PendingReferralProcessor() {
  useEffect(() => {
    const code = localStorage.getItem("pending_referral");
    if (!code) return;

    localStorage.removeItem("pending_referral");

    fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {
      // Silent failure — referral is best-effort
    });
  }, []);

  return null;
}
