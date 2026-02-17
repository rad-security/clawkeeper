import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_PRICING } from "@/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Map plan + billing to env var names for pre-created Stripe prices
const PRICE_ENV_MAP: Record<string, string> = {
  "pro:monthly": "STRIPE_PRO_MONTHLY_PRICE_ID",
  "pro:annual": "STRIPE_PRO_ANNUAL_PRICE_ID",
  "enterprise:monthly": "STRIPE_ENTERPRISE_MONTHLY_PRICE_ID",
  "enterprise:annual": "STRIPE_ENTERPRISE_ANNUAL_PRICE_ID",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const plan = body.plan as "pro" | "enterprise";
    const billing = (body.billing || "monthly") as "monthly" | "annual";

    if (!plan || !["pro", "enterprise"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    // Get org
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: org } = await admin
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", membership.org_id)
      .single();

    // Create or reuse Stripe customer
    let customerId = org?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { org_id: membership.org_id, user_id: user.id },
      });
      customerId = customer.id;

      await admin
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", membership.org_id);
    }

    // Resolve Stripe price: check env var first, fall back to inline price_data
    const envKey = PRICE_ENV_MAP[`${plan}:${billing}`];
    const priceId = envKey ? process.env[envKey] : undefined;

    const pricing = PLAN_PRICING[plan];
    const amount = billing === "annual" ? pricing.annual : pricing.monthly;
    const interval = billing === "annual" ? "year" : "month";
    const planLabel = plan === "pro" ? "Clawkeeper Pro" : "Clawkeeper Enterprise";
    const intervalLabel = billing === "annual" ? "annual" : "monthly";

    // Build line_items — use pre-created price if available, otherwise inline
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${planLabel} (${intervalLabel})`,
              },
              unit_amount: amount,
              recurring: { interval },
            },
            quantity: 1,
          },
        ];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: `${req.nextUrl.origin}/settings?upgraded=true`,
      cancel_url: `${req.nextUrl.origin}/upgrade`,
      metadata: { org_id: membership.org_id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
