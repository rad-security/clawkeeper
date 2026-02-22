import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIER_LIMITS } from "@/types";
import type { PlanType } from "@/types";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

function getCustomerId(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

/** Downgrade org to free: set plan, cap credits at free tier limit. */
async function downgradeToFree(
  admin: ReturnType<typeof createAdminClient>,
  customerId: string
) {
  const freeCap = TIER_LIMITS.free.credits_monthly;

  // Read current balance so we can cap it
  const { data: org } = await admin
    .from("organizations")
    .select("credits_balance")
    .eq("stripe_customer_id", customerId)
    .single();

  const cappedBalance = Math.min(org?.credits_balance ?? 0, freeCap);

  await admin
    .from("organizations")
    .update({
      plan: "free",
      credits_monthly_cap: freeCap,
      credits_balance: cappedBalance,
    })
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.org_id;
      const plan = session.metadata?.plan;
      const upgradeReason = session.metadata?.upgrade_reason || "unknown";
      const referralCodeUsed = session.metadata?.referral_code_used || "";
      const referralAttributed = session.metadata?.referral_attributed === "true";

      if (orgId && plan) {
        const newCredits = TIER_LIMITS[plan as PlanType]?.credits_monthly ?? 10;

        // Read current balance to preserve existing credits (rollover-aware)
        const { data: currentOrg } = await admin
          .from("organizations")
          .select("credits_balance")
          .eq("id", orgId)
          .single();

        const existingBalance = currentOrg?.credits_balance ?? 0;
        const newBalance =
          newCredits === -1
            ? 0 // Enterprise: unlimited, balance unused
            : Math.min(existingBalance + newCredits, newCredits * 2);

        await admin
          .from("organizations")
          .update({
            plan,
            stripe_customer_id: session.customer as string,
            credits_balance: newBalance,
            credits_monthly_cap: newCredits === -1 ? 0 : newCredits,
            credits_last_refill_at: new Date().toISOString(),
          })
          .eq("id", orgId);
      }

      if (session.customer && typeof session.customer === "string") {
        await stripe.customers.update(session.customer, {
          metadata: {
            last_upgrade_reason: upgradeReason,
            referral_attributed: referralAttributed ? "true" : "false",
            referral_code_used: referralCodeUsed,
            last_checkout_completed_at: new Date().toISOString(),
          },
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription);

      if (subscription.status === "active") {
        // Plan stays active — no change needed
      } else if (
        subscription.status === "canceled" ||
        subscription.status === "unpaid"
      ) {
        await downgradeToFree(admin, customerId);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = getCustomerId(subscription);
      await downgradeToFree(admin, customerId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
