import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/get-org-id";
import { isPaidPlan } from "@/lib/tier";
import type { PlanType } from "@/types";

// GET — fetch notification settings for the current org
export async function GET() {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  // Check plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as PlanType;
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      { error: "Notifications are a Pro feature" },
      { status: 403 }
    );
  }

  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("org_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return existing settings or defaults
  return NextResponse.json(
    data || {
      email_enabled: false,
      email_address: null,
      webhook_enabled: false,
      webhook_url: null,
      webhook_secret: null,
      notify_on_cve: true,
      notify_on_critical: true,
      notify_on_grade_drop: true,
      notify_on_new_host: false,
    }
  );
}

// PUT — upsert notification settings
export async function PUT(request: Request) {
  const supabase = await createClient();
  const orgId = await getOrgId(supabase);

  // Check plan
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", orgId)
    .single();

  const plan = (org?.plan || "free") as PlanType;
  if (!isPaidPlan(plan)) {
    return NextResponse.json(
      { error: "Notifications are a Pro feature" },
      { status: 403 }
    );
  }

  const body = await request.json();

  // Validate webhook URL if provided
  if (body.webhook_url) {
    try {
      const url = new URL(body.webhook_url);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return NextResponse.json(
          { error: "Webhook URL must use http or https" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL" },
        { status: 400 }
      );
    }
  }

  // Validate email if provided
  if (body.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email_address)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  const settings = {
    org_id: orgId,
    email_enabled: !!body.email_enabled,
    email_address: body.email_address || null,
    webhook_enabled: !!body.webhook_enabled,
    webhook_url: body.webhook_url || null,
    webhook_secret: body.webhook_secret || null,
    notify_on_cve: body.notify_on_cve !== false,
    notify_on_critical: body.notify_on_critical !== false,
    notify_on_grade_drop: body.notify_on_grade_drop !== false,
    notify_on_new_host: !!body.notify_on_new_host,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("notification_settings")
    .upsert(settings, { onConflict: "org_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
