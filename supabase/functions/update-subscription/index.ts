/**
 * Update Subscription Edge Function
 * 
 * Handles plan changes (upgrades, downgrades) by synchronizing with Stripe.
 */

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json();
    const { subscriptionId, newPlanId, isDowngrade } = body;

    if (!subscriptionId || !newPlanId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SECURITY CHECK START ---
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let authenticatedUser = null;
    if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (user) authenticatedUser = user;
    }

    if (!authenticatedUser) {
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    // --- SECURITY CHECK END ---

    // 1. Fetch Subscription and Provider to verify ownership
    const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*, provider:providers!subscriptions_provider_id_fkey(auth_user_id)')
        .eq('id', subscriptionId)
        .single();
        
    if (subError || !subData) {
        console.error("Subscription Error:", subError);
        return new Response(JSON.stringify({ error: `Subscription not found: ${subError?.message || ''}` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (subData.provider?.auth_user_id !== authenticatedUser.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: newPlanData, error: newPlanError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', newPlanId)
        .single();

    if (newPlanError || !newPlanData) {
        console.error("Plan Error:", newPlanError);
        return new Response(JSON.stringify({ error: `New plan not found: ${newPlanError?.message || ''}` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripeSubscriptionId = subData.stripe_subscription_id;
    if (!stripeSubscriptionId) {
       // If no stripe subscription, just return success (it's a trial/free likely)
       return new Response(JSON.stringify({ success: true, message: "Local only update" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Get/Create Stripe Price ID for new plan
    const currency = subData.currency || 'usd';
    const planName = newPlanData.name;
    let unitAmount = Math.round(newPlanData.price_monthly * 100);
    
    if (currency !== 'usd' && newPlanData.prices && newPlanData.prices[currency]) {
        unitAmount = Math.round(newPlanData.prices[currency] * 100);
    }

    const priceLookupKey = `plan_${planName}_${currency}`;
    let priceId: string;

    const prices = await stripe.prices.list({
        lookup_keys: [priceLookupKey],
        limit: 1,
    });

    if (prices.data.length > 0) {
        priceId = prices.data[0].id;
    } else {
        // Find product
        const products = await stripe.products.search({ query: `metadata['plan_name']:'${planName}'`, limit: 1 });
        let productId;
        if (products.data.length > 0) {
            productId = products.data[0].id;
        } else {
            const product = await stripe.products.create({
                name: newPlanData.display_name,
                description: newPlanData.description || undefined,
                metadata: { plan_id: newPlanData.id, plan_name: planName },
            });
            productId = product.id;
        }

        const price = await stripe.prices.create({
            product: productId,
            unit_amount: unitAmount,
            currency: currency,
            recurring: { interval: "month" },
            lookup_key: priceLookupKey,
            metadata: { plan_id: newPlanData.id, region_currency: currency },
        });
        priceId = price.id;
    }

    // 3. Update Stripe Subscription
    // Check if there's an existing schedule and cancel it if upgrading, or we need to modify it
    const schedules = await stripe.subscriptionSchedules.list({
        customer: subData.stripe_customer_id,
        limit: 10
    });
    
    // Find active schedule for this subscription
    const activeSchedule = schedules.data.find((s: any) => 
        s.subscription === stripeSubscriptionId && 
        (s.status === 'active' || s.status === 'not_started')
    );

    if (isDowngrade) {
        // For downgrades, we schedule the change at the end of the current period
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        if (activeSchedule) {
            // Update existing schedule
            await stripe.subscriptionSchedules.update(activeSchedule.id, {
                end_behavior: 'release',
                phases: [
                    {
                        items: [{ price: stripeSub.items.data[0].price.id, quantity: 1 }],
                        start_date: activeSchedule.current_phase?.start_date || Math.floor(Date.now() / 1000),
                        end_date: stripeSub.current_period_end,
                    },
                    {
                        items: [{ price: priceId, quantity: 1 }],
                        start_date: stripeSub.current_period_end,
                        proration_behavior: 'none',
                    }
                ]
            });
        } else {
            // Create new schedule
            await stripe.subscriptionSchedules.create({
                from_subscription: stripeSubscriptionId,
            });
            
            // Now retrieve the newly created schedule to update its phases
            const newSchedules = await stripe.subscriptionSchedules.list({
                customer: subData.stripe_customer_id,
                limit: 1
            });
            
            if (newSchedules.data.length > 0) {
               await stripe.subscriptionSchedules.update(newSchedules.data[0].id, {
                    end_behavior: 'release',
                    phases: [
                        {
                            items: [{ price: stripeSub.items.data[0].price.id, quantity: 1 }],
                            start_date: Math.floor(Date.now() / 1000),
                            end_date: stripeSub.current_period_end,
                        },
                        {
                            items: [{ price: priceId, quantity: 1 }],
                            start_date: stripeSub.current_period_end,
                            proration_behavior: 'none',
                        }
                    ]
                });
            }
        }
    } else {
        // Upgrade / Lateral move - apply immediately
        if (activeSchedule) {
            // Release the schedule so we can update the subscription directly
            await stripe.subscriptionSchedules.release(activeSchedule.id);
        }
        
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        
        await stripe.subscriptions.update(stripeSubscriptionId, {
            items: [{
                id: stripeSub.items.data[0].id,
                price: priceId,
            }],
            proration_behavior: 'always_invoice',
        });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error updating subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
