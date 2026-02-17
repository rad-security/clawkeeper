import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AlertEventRow {
  id: string;
  message: string;
  notified_at: string;
  hosts: { hostname: string } | null;
  alert_rules: { name: string } | null;
}

export function AlertHistory({ events }: { events: AlertEventRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert History</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No alerts triggered yet.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-md border p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {event.alert_rules?.name || "Alert"}
                    {event.hosts?.hostname && (
                      <span className="ml-2 text-muted-foreground">
                        — {event.hosts.hostname}
                      </span>
                    )}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.notified_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
