"use client";

import { useState } from "react";
import {
  MonitorCheck,
  TrendingDown,
  ToggleRight,
  Server,
  Download,
  Play,
  Square,
  Trash2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event, EventType } from "@/types";
import { cn } from "@/lib/utils";

const EVENT_CONFIG: Record<
  EventType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    category: string;
  }
> = {
  "scan.completed": {
    icon: MonitorCheck,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    category: "Scan",
  },
  "grade.changed": {
    icon: TrendingDown,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    category: "Scan",
  },
  "check.flipped": {
    icon: ToggleRight,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    category: "Scan",
  },
  "host.registered": {
    icon: Server,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    category: "Host",
  },
  "agent.installed": {
    icon: Download,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    category: "Agent",
  },
  "agent.started": {
    icon: Play,
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10",
    category: "Agent",
  },
  "agent.stopped": {
    icon: Square,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    category: "Agent",
  },
  "agent.uninstalled": {
    icon: Trash2,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    category: "Agent",
  },
  "shield.blocked": {
    icon: ShieldAlert,
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    category: "Shield",
  },
  "shield.warned": {
    icon: ShieldCheck,
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    category: "Shield",
  },
};

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface EventFeedProps {
  initialEvents: Event[];
  hostId?: string;
  eventType?: string;
  maxEvents?: number;
  showLoadMore?: boolean;
}

export function EventFeed({
  initialEvents,
  hostId,
  eventType,
  maxEvents,
  showLoadMore = true,
}: EventFeedProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    showLoadMore && initialEvents.length >= 20
  );

  const displayEvents = maxEvents ? events.slice(0, maxEvents) : events;

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);

    const lastEvent = events[events.length - 1];
    const params = new URLSearchParams({
      cursor: lastEvent.created_at,
      limit: "20",
    });
    if (hostId) params.set("host_id", hostId);
    if (eventType) params.set("event_type", eventType);

    try {
      const res = await fetch(`/api/dashboard/events?${params}`);
      const data = await res.json();
      setEvents((prev) => [...prev, ...data.events]);
      setHasMore(data.has_more);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (displayEvents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No activity yet. Events will appear here as scans run and agents report.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {displayEvents.map((event) => {
        const config = EVENT_CONFIG[event.event_type] ?? EVENT_CONFIG["scan.completed"];
        const Icon = config.icon;
        const hostname =
          event.hosts?.hostname ??
          (event.detail as Record<string, string>)?.hostname ??
          "";

        return (
          <div
            key={event.id}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                config.bgColor
              )}
            >
              <Icon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{event.title}</p>
              <p className="text-xs text-muted-foreground">
                {hostname && <span>{hostname} &middot; </span>}
                {relativeTime(event.created_at)}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {config.category}
            </Badge>
          </div>
        );
      })}

      {showLoadMore && hasMore && (
        <div className="pt-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
