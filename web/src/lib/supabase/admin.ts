import { createClient } from "@supabase/supabase-js";

// Service-role client for admin operations (API key validation, agent uploads)
// NEVER expose this on the client side
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
