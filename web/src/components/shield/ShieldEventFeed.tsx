"use client";

import { useState } from "react";
import { ShieldEventCard } from "./ShieldEventCard";
import { Button } from "@/components/ui/button";
import type { ShieldEvent } from "@/types";

interface ShieldEventFeedProps {
  initialEvents: ShieldEvent[];
  total: number;
}

export function ShieldEventFeed({ initialEvents, total }: ShieldEventFeedProps) {
  const [events, setEvents] = useState(initialEvents);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const hasMore = events.length < total;

  async function loadMore() {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/dashboard/shield?page=${nextPage}&limit=50`);
      const data = await res.json();
      if (data.events?.length) {
        setEvents((prev) => [...prev, ...data.events]);
        setPage(nextPage);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  if (events.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No shield events yet. Install the Runtime Shield skill to start monitoring.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <ShieldEventCard key={event.id} event={event} />
      ))}
      {hasMore && (
        <div className="pt-2 text-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
