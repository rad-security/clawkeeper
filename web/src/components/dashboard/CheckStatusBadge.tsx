import { Badge } from "@/components/ui/badge";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PASS: { label: "Pass", variant: "default" },
  FIXED: { label: "Fixed", variant: "default" },
  FAIL: { label: "Fail", variant: "destructive" },
  SKIPPED: { label: "Skipped", variant: "secondary" },
};

export function CheckStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    label: status,
    variant: "outline" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
