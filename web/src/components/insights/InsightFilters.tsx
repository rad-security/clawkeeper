"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEVERITY_TABS = [
  { value: "", label: "All" },
  { value: "cve", label: "CVEs" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
] as const;

export function InsightFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSeverity = searchParams.get("severity") || "";
  const showResolved = searchParams.get("resolved") === "true";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/insights?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        {SEVERITY_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant="ghost"
            size="sm"
            className={cn(
              activeSeverity === tab.value && "bg-muted font-semibold"
            )}
            onClick={() => updateParams("severity", tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className={cn(showResolved && "bg-muted font-semibold")}
        onClick={() => updateParams("resolved", showResolved ? "" : "true")}
      >
        Show resolved
      </Button>
    </div>
  );
}
