import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureOrganization } from "@/lib/ensure-organization";
import { LogOut, AlertTriangle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarNav, MobileNav } from "@/components/dashboard/SidebarNav";

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
    await ensureOrganization(supabase, admin, user.id, user.email ?? "user");
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

  // Get plan for sidebar upgrade CTA
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .single();
  let plan = "free";
  if (membership) {
    const { data: orgData } = await supabase
      .from("organizations")
      .select("plan")
      .eq("id", membership.org_id)
      .single();
    plan = orgData?.plan || "free";
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Logo />
        </div>
        <SidebarNav plan={plan} />
        <Separator />
        <div className="p-4">
          <p className="mb-2 truncate text-xs text-muted-foreground">
            {user.email}
          </p>
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
        <MobileNav />

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
