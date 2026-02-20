"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddHostWizard } from "@/components/hosts/AddHostWizard";
import { canAddHost, type Plan } from "@/lib/tier";

interface AddHostButtonProps {
  orgId: string;
  existingKeyCount: number;
  hostCount: number;
  plan: Plan;
}

export function AddHostButton({
  orgId,
  existingKeyCount,
  hostCount,
  plan,
}: AddHostButtonProps) {
  const [open, setOpen] = useState(false);

  if (!canAddHost(plan, hostCount)) {
    return (
      <Link href="/upgrade?reason=host_limit">
        <Button size="sm" className="gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          Upgrade to add hosts
        </Button>
      </Link>
    );
  }

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add Host
      </Button>
      <AddHostWizard
        orgId={orgId}
        existingKeyCount={existingKeyCount}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
