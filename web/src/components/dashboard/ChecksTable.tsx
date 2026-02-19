"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { CheckStatusBadge } from "@/components/dashboard/CheckStatusBadge";
import { getRemediation } from "@/lib/remediation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Check {
  id: string;
  status: string;
  check_name: string;
  friendlyDetail: string;
}

export function ChecksTable({ checks }: { checks: Check[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[100px]">Status</TableHead>
          <TableHead>Check</TableHead>
          <TableHead>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checks.map((check) => {
          const isFail = check.status === "FAIL";
          const remediation = isFail ? getRemediation(check.check_name) : null;
          const isExpanded = expandedId === check.id;
          const canExpand = isFail && remediation;

          return (
            <TableRow
              key={check.id}
              className={canExpand ? "cursor-pointer" : undefined}
              onClick={canExpand ? () => setExpandedId(isExpanded ? null : check.id) : undefined}
            >
              <TableCell className="align-top">
                <CheckStatusBadge status={check.status} />
              </TableCell>
              <TableCell className="align-top font-medium">
                <div className="flex items-center gap-1.5">
                  {canExpand && (
                    isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {check.check_name}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground">
                  {check.friendlyDetail}
                </span>
                {isExpanded && remediation && (
                  <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Wrench className="h-4 w-4 text-primary" />
                      How to Remediate
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {remediation.summary}
                    </p>
                    <ol className="mt-3 space-y-1.5">
                      {remediation.steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="shrink-0 font-medium text-primary">
                            {i + 1}.
                          </span>
                          <span className="text-muted-foreground font-mono text-xs leading-relaxed">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
