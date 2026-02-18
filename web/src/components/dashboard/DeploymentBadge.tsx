"use client";

import { Badge } from "@/components/ui/badge";
import { Container, Server } from "lucide-react";
import type { DeploymentType } from "@/lib/host-analysis";

export function DeploymentBadge({
  deployment,
  detail,
}: {
  deployment: DeploymentType;
  detail: string;
}) {
  if (deployment === "unknown") return null;

  const Icon = deployment === "docker" ? Container : Server;
  const label = deployment === "docker" ? "Docker" : "Standalone";

  return (
    <Badge variant="outline" title={detail} className="gap-1.5 cursor-default">
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}
