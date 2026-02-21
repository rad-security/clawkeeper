import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureOrganization } from "@/lib/ensure-organization";
import { getCreditBalance } from "@/lib/credits";
import { LogOut, AlertTriangle, Crown } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, MobileNav } from "@/components/dashboard/SidebarNav";
import { PendingReferralProcessor } from "@/components/dashboard/PendingReferralProcessor";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Guarantee org exists — auto-creates if missing
  let orgError: string | null = null;
  try {
    const admin = createAdminClient();
    await ensureOrganization(supabase, admin, user.id, user.email ?? "user", user.user_metadata);
  } catch (err) {
    orgError =
      err instanceof Error ? err.message : "Failed to initialize organization";
  }

  // If org setup failed (e.g. migration not applied), show inline error
  if (orgError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <h1 className="text-xl font-bold">Setup Required</h1>
          <p className="text-sm text-muted-foreground">
            The database schema hasn&apos;t been initialized yet. Run the
            Supabase migration to create the required tables:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-left text-xs">
            supabase db push
          </pre>
          <p className="text-xs text-muted-foreground">
            Error: {orgError}
          </p>
          <form action="/api/auth/signout" method="POST">
            <Button variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Get plan + credits for sidebar
  const admin2 = createAdminClient();
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();
  let plan = "free";
  let creditsRemaining = 0;
  let creditsCap = 10;
  if (membership) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", membership.org_id)
      .single();
    plan = orgData?.plan || "free";
    const credits = await getCreditBalance(admin2, membership.org_id);
    creditsRemaining = credits.credits_remaining;
    creditsCap = credits.credits_monthly_cap;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Logo />
        </div>
        <SidebarNav plan={plan} creditsRemaining={creditsRemaining} creditsCap={creditsCap} />
        <Separator />
        <div className="p-4">
          <div className="mb-2 flex items-center gap-1.5">
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            {(plan === "pro" || plan === "enterprise") && (
              <Badge variant="outline" className="shrink-0 border-cyan-500/30 text-cyan-400 text-[10px] px-1.5 py-0">
                <Crown className="mr-0.5 h-2.5 w-2.5" />
                Pro
              </Badge>
            )}
          </div>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <MobileNav plan={plan} />

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
        <PendingReferralProcessor />
      </div>
    </div>
  );
}
