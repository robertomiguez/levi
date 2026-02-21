/**
 * Stripe Webhook Handler Edge Function
 * 
 * Handles Stripe webhook events to sync subscription state with the database.
 */

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe status to our subscription status
function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    trialing: "trialing",
    active: "active",
    past_due: "past_due",
    canceled: "cancelled",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "expired",
    paused: "cancelled",
  };
  return statusMap[stripeStatus] || "active";
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error("Missing Stripe configuration");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      await supabase.from("debug_logs").insert({ message: "Signature verification failed", details: { error: err.message } });

      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook event: ${event.type}`);
    await supabase.from("debug_logs").insert({ message: "Received Webhook", details: { type: event.type, id: event.id } });


    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase.from("debug_logs").insert({ message: "Handling Checkout Session", details: { session_id: session.id, metadata: session.metadata, subscription: session.subscription } });
        await handleCheckoutComplete(supabase, stripe, session);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(supabase, invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        await supabase.from("debug_logs").insert({ message: "Unhandled Event", details: { type: event.type } });

    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Webhook error:", error);
    try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supabase.from("debug_logs").insert({ message: "Crash in Webhook", details: { error: error.message, stack: error.stack } });
    } catch(e) {}

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Handle checkout.session.completed - Create subscription record
 */
async function handleCheckoutComplete(
  supabase: any,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const providerId = session.metadata?.provider_id;
  const planId = session.metadata?.plan_id;
  const stripeSubscriptionId = session.subscription as string;
  const stripeCustomerId = session.customer as string;
  const mode = session.mode;

  // Handle Setup Mode (Add Payment Method)
  // In setup mode, we don't have a subscription or plan connection to make
  if (mode === 'setup') {
      console.log(`Setup session completed for provider ${providerId}`);
      await supabase.from("debug_logs").insert({ 
          message: "Setup Session Completed", 
          details: { providerId, stripeCustomerId } 
      });
      return;
  }

  if (!providerId || !planId || !stripeSubscriptionId) {
    console.error("Missing metadata in checkout session:", session.id);
    await supabase.from("debug_logs").insert({ message: "Missing Metadata or Sub ID", details: { providerId, planId, stripeSubscriptionId } });
    return;
  }

  console.log(`Checkout completed for provider ${providerId}, plan ${planId}`);

  try {
      // Get subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      // Get plan details for pricing snapshot
      const { data: plan, error: planError } = await supabase
        .from("plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError || !plan) {
        console.error("Plan not found:", planId);
        await supabase.from("debug_logs").insert({ message: "Plan not found", details: { planId, error: planError } });
        return;
      }

      const now = new Date();
      const trialEndsAt = stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : null;
      const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
      const currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);

      // Calculate discount end date if applicable
      let discountEndsAt: Date | null = null;
      if (plan.discount_duration_months && plan.discount_duration_months > 0 && trialEndsAt) {
        discountEndsAt = new Date(trialEndsAt.getTime());
        discountEndsAt.setMonth(discountEndsAt.getMonth() + plan.discount_duration_months);
      }

      // Check for existing subscription
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("provider_id", providerId)
        .single();
      
      const currency = session.currency || 'usd';
      // Determine locked price based on currency
      let lockedPrice = plan.price_monthly; // Default USD
      if (currency !== 'usd' && plan.prices && plan.prices[currency]) {
          lockedPrice = plan.prices[currency];
      }

      if (existingSub) {
        // Update existing subscription
        await supabase.from("debug_logs").insert({ message: "Updating existing subscription", details: { id: existingSub.id } });
        
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            status: mapStripeStatus(stripeSubscription.status),
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: stripeCustomerId,
            trial_ends_at: trialEndsAt?.toISOString(),
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            locked_price: lockedPrice,
            locked_discount_percent: plan.discount_percent || 0,
            discount_ends_at: discountEndsAt?.toISOString(),
            cancel_at_period_end: false,
            cancelled_at: null,
            updated_at: now.toISOString(),
            currency: currency
          })
          .eq("id", existingSub.id);

        if (updateError) {
          console.error("Error updating subscription:", updateError);
          await supabase.from("debug_logs").insert({ message: "Error updating subscription", details: { error: updateError } });
        } else {
          console.log(`Updated subscription ${existingSub.id}`);
        }
      } else {
        // Create new subscription
        await supabase.from("debug_logs").insert({ message: "Creating new subscription", details: { providerId, planId } });

        const { data: newSub, error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            provider_id: providerId,
            plan_id: planId,
            status: mapStripeStatus(stripeSubscription.status),
            stripe_subscription_id: stripeSubscriptionId,
            stripe_customer_id: stripeCustomerId,
            trial_ends_at: trialEndsAt?.toISOString(),
            current_period_start: currentPeriodStart.toISOString(),
            current_period_end: currentPeriodEnd.toISOString(),
            locked_price: lockedPrice,
            locked_discount_percent: plan.discount_percent || 0,
            discount_ends_at: discountEndsAt?.toISOString(),
            cancel_at_period_end: false,
            currency: currency
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating subscription:", insertError);
          await supabase.from("debug_logs").insert({ message: "Error creating subscription", details: { error: insertError } });
        } else {
          console.log(`Created subscription ${newSub.id}`);

          // Update provider with subscription_id
          await supabase
            .from("providers")
            .update({ subscription_id: newSub.id })
            .eq("id", providerId);
        }
      }
  } catch (err: any) {
      console.error("Error in handleCheckoutComplete:", err);
      await supabase.from("debug_logs").insert({ message: "Exception in handleCheckoutComplete", details: { error: err.message, stack: err.stack } });
  }
}

/**
 * Handle subscription updates from Stripe
 */
async function handleSubscriptionUpdate(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const stripeSubscriptionId = subscription.id;
  const providerId = subscription.metadata?.provider_id;

  // Find subscription by stripe_subscription_id
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id, provider_id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (!existingSub) {
    console.log(`Subscription not found for stripe_subscription_id: ${stripeSubscriptionId}`);
    return;
  }

  // Safe date parser to avoid "Invalid time value" crashes
  const safeIsoDate = (ts: any) => {
    if (ts === undefined) return undefined;
    if (ts === null) return null;
    
    // If it's already a valid ISO or date string
    if (typeof ts === 'string' && !isNaN(Date.parse(ts))) {
      return new Date(ts).toISOString();
    }
    
    // If it's a number (unix timestamp in seconds)
    if (typeof ts === 'number') {
      const date = new Date(ts * 1000);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    // Fallback: try to cast string to number
    const num = Number(ts);
    if (!isNaN(num)) {
       const date = new Date(num * 1000);
       return isNaN(date.getTime()) ? undefined : date.toISOString();
    }
    
    return undefined;
  };

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: mapStripeStatus(subscription.status),
      current_period_start: safeIsoDate(subscription.current_period_start),
      current_period_end: safeIsoDate(subscription.current_period_end),
      trial_ends_at: safeIsoDate(subscription.trial_end),
      cancel_at_period_end: subscription.cancel_at_period_end,
      cancelled_at: safeIsoDate(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingSub.id);

  if (updateError) {
    console.error("Error updating subscription:", updateError);
  } else {
    console.log(`Updated subscription ${existingSub.id} to status: ${subscription.status}`);
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const stripeSubscriptionId = subscription.id;

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (updateError) {
    console.error("Error marking subscription as cancelled:", updateError);
  } else {
    console.log(`Marked subscription as cancelled: ${stripeSubscriptionId}`);
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaid(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const stripeSubscriptionId = invoice.subscription as string;
  
  if (!stripeSubscriptionId) {
    console.log("Invoice not associated with a subscription");
    return;
  }

  // Find subscription
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (!existingSub) {
    console.log(`Subscription not found for invoice: ${invoice.id}`);
    return;
  }

  // Update subscription status to active
  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingSub.id);

  // Record payment
  const { error: paymentError } = await supabase
    .from("payments")
    .insert({
      subscription_id: existingSub.id,
      amount: (invoice.amount_paid || 0) / 100, // Convert from cents
      currency: invoice.currency,
      status: "succeeded",
      payment_method: "card",
      stripe_payment_intent_id: invoice.payment_intent as string,
      invoice_url: invoice.hosted_invoice_url,
      paid_at: new Date().toISOString(),
      description: invoice.billing_reason === "subscription_create"
        ? "Initial subscription payment"
        : invoice.billing_reason === "subscription_cycle"
        ? "Monthly subscription renewal"
        : "Subscription payment",
    });

  if (paymentError) {
    console.error("Error recording payment:", paymentError);
  } else {
    console.log(`Recorded payment for subscription ${existingSub.id}`);
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const stripeSubscriptionId = invoice.subscription as string;
  
  if (!stripeSubscriptionId) {
    return;
  }

  // Update subscription status to past_due
  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (updateError) {
    console.error("Error updating subscription to past_due:", updateError);
  } else {
    console.log(`Marked subscription as past_due: ${stripeSubscriptionId}`);
  }

  // Record failed payment
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .single();

  if (existingSub) {
    await supabase
      .from("payments")
      .insert({
        subscription_id: existingSub.id,
        amount: (invoice.amount_due || 0) / 100,
        currency: invoice.currency,
        status: "failed",
        payment_method: "card",
        stripe_payment_intent_id: invoice.payment_intent as string,
        description: "Payment failed",
      });
  }
}
