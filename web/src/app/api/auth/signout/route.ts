import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL;
  const origin = request.headers.get("origin");
  if (appOrigin && origin && origin !== appOrigin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
