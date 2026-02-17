import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export interface ApiKeyResult {
  org_id: string;
  key_id: string;
}

/**
 * Validate an API key from the Authorization header.
 * Returns { org_id, key_id } on success, or an error NextResponse.
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyResult | NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  const supabase = createAdminClient();

  const { data: keyRow, error: keyError } = await supabase
    .from("api_keys")
    .select("id, org_id")
    .eq("key_hash", keyHash)
    .single();

  if (keyError || !keyRow) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(() => {});

  return { org_id: keyRow.org_id, key_id: keyRow.id };
}

/** Type guard: true if result is an error response */
export function isAuthError(
  result: ApiKeyResult | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
