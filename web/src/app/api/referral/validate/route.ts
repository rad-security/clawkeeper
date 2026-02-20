import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateReferralCode } from "@/lib/referral";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code || !/^CK[A-Z2-9]{6}$/i.test(code)) {
    return NextResponse.json({ valid: false }, { status: 200 });
  }

  const admin = createAdminClient();
  const result = await validateReferralCode(admin, code);

  return NextResponse.json(result);
}
