import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS ensures user can only delete hosts from their org
  const { error } = await supabase.from("hosts").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete host" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
