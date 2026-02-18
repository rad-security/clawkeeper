import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

async function main() {
  const { data } = await sb
    .from("api_keys")
    .select("id, name, key_prefix, org_id")
    .limit(5);
  console.log("API keys:", JSON.stringify(data, null, 2));

  if (!data || data.length === 0) {
    console.log("\nNo API keys found. Creating a test key...");
    const rawKey = `ck_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // Get org
    const { data: org } = await sb
      .from("organizations")
      .select("id")
      .limit(1)
      .single();

    if (!org) {
      console.error("No org found");
      return;
    }

    const { error } = await sb.from("api_keys").insert({
      org_id: org.id,
      name: "test-key",
      key_prefix: keyPrefix,
      key_hash: keyHash,
    });

    if (error) {
      console.error("Insert error:", error);
      return;
    }

    console.log("\nCreated test API key:");
    console.log(rawKey);
    console.log("\nUse this to test: curl -X POST https://clawkeeper.dev/api/v1/scans -H 'Authorization: Bearer " + rawKey + "' ...");
  }
}

main();
