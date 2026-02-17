"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "scan", label: "Scan" },
  { value: "agent", label: "Agent" },
] as const;

// Maps category filter to event_type prefix for the API
const CATEGORY_TYPES: Record<string, string> = {
  scan: "scan.completed", // API will filter by prefix via event_type param
  agent: "agent.installed",
};

interface EventFiltersProps {
  hosts: { id: string; hostname: string }[];
}

export function EventFilters({ hosts }: EventFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category") || "";
  const activeHostId = searchParams.get("host_id") || "";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/activity?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant="ghost"
            size="sm"
            className={cn(
              activeCategory === cat.value && "bg-muted font-semibold"
            )}
            onClick={() => updateParams("category", cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {hosts.length > 0 && (
        <select
          className="h-8 rounded-md border bg-background px-2 text-sm"
          value={activeHostId}
          onChange={(e) => updateParams("host_id", e.target.value)}
        >
          <option value="">All hosts</option>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.hostname}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export { CATEGORY_TYPES };
