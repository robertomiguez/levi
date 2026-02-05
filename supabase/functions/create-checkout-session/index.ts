/**
 * Create Stripe Checkout Session Edge Function
 * 
 * Creates a Stripe Checkout session for subscription sign-up with trial period.
 */

import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
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

    // Initialize clients early for logging
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body
    const body = await req.json();
    const { planName, providerId, providerEmail, successUrl, cancelUrl, locale, termsAccepted, termsVersion, userId, mode = "subscription" } = body;

    // --- SECURITY CHECK START ---
    // Manually verify the user since verify_jwt is false
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let authenticatedUser = null;
    if (token) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (user) authenticatedUser = user;
        else console.warn("Manual auth check failed:", authError);
    }

    if (!authenticatedUser) {
        console.error("Unauthorized: No valid user token found.");
         return new Response(
            JSON.stringify({ error: "Unauthorized: Please log in again." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    // --- SECURITY CHECK END ---

    // Log start of request
    await supabase.from("debug_logs").insert({
        message: "create-checkout-session started",
        details: { 
            planName, 
            providerId, 
            userId, 
            email: providerEmail, 
            authUserId: authenticatedUser.id,
            mode
        }
    });

    // Validate minimum requirements
    // For subscription: planName is required
    // For setup: planName is NOT required
    if (mode === 'subscription' && (!planName || !providerEmail)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: planName, providerEmail" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine target User ID and Provider ID
    let targetProviderId = providerId;
    let targetUserId = userId;

    // If we have a userId but no providerId, check if provider exists or create stub
    if (!targetProviderId && targetUserId) {
         const { data: existingProvider } = await supabase
            .from("providers")
            .select("id")
            .eq("auth_user_id", targetUserId)
            .single();
        
        if (existingProvider) {
            targetProviderId = existingProvider.id;
        } else {
            // Create stub
            const { data: newProvider, error: createError } = await supabase
                .from("providers")
                .insert({
                    auth_user_id: targetUserId,
                    email: providerEmail,
                    business_name: "", // Leave blank as requested
                })
                .select("id")
                .single();
            
            if (!createError && newProvider) {
                targetProviderId = newProvider.id;
            }
        }
    }

    if (!targetProviderId) {
         return new Response(
            JSON.stringify({ error: "Could not resolve Provider ID" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
    }
    
    // Record Terms Acceptance if we can resolve the user
    if (termsAccepted && termsVersion) {
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";
        
        // Find user_id if we don't have it
        if (!targetUserId) {
             const { data: pData } = await supabase.from("providers").select("auth_user_id").eq("id", targetProviderId).single();
             targetUserId = pData?.auth_user_id;
        }

        if (targetUserId) {
            await supabase.from("user_agreements").insert({
                user_id: targetUserId,
                agreement_type: "provider_terms",
                version: termsVersion,
                ip_address: ip,
                user_agent: userAgent
            });
        }
    }

    let plan: any = null;
    let priceId: string | undefined;
    let discounts: { coupon: string }[] | undefined;
    const trialDays = 30;

    // Only fetch plan details if in subscription mode
    if (mode === 'subscription') {
        // Get plan details from database
        const { data: planData, error: planError } = await supabase
          .from("plans")
          .select("*")
          .eq("name", planName)
          .eq("is_active", true)
          .single();
        
        plan = planData;

        if (planError || !plan) {
          console.error("Plan not found:", planError);
          return new Response(
            JSON.stringify({ error: "Plan not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
    }

    // Check if provider already has a Stripe customer ID
    // We need customer ID for BOTH modes
    const { data: provider } = await supabase
      .from("providers")
      .select("id, email, business_name")
      .eq("id", targetProviderId)
      .single();

    // Check existing subscription for stripe_customer_id
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("provider_id", targetProviderId)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .single();

    let stripeCustomerId = existingSub?.stripe_customer_id;

    // Create Stripe customer if needed
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: providerEmail,
        name: provider?.business_name || undefined,
        metadata: {
          provider_id: targetProviderId,
        },
      });
      stripeCustomerId = customer.id;

      // Update subscription with new customer ID to persist it
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("provider_id", targetProviderId);
        
      if (updateError) {
          console.error("Failed to persist stripe_customer_id:", updateError);
          // Non-blocking error, but worth logging
          await supabase.from("debug_logs").insert({ 
              message: "Failed to persist stripe_customer_id", 
              details: { providerId: targetProviderId, error: updateError }
          });
      }
    }

    // Prepare session parameters
    const baseSuccessUrl = successUrl || `${req.headers.get("origin")}/provider/checkout/success`;
    const baseCancelUrl = cancelUrl || `${req.headers.get("origin")}/provider/checkout/cancel`;

    // Normalize locale...
    const supportedLocales = [
      "auto", "bg", "cs", "da", "de", "el", "en", "en-GB", "es", "es-419", "et", "fi", "fil", "fr", "fr-CA", "hr", "hu", "id", "it", "ja", "ko", "lt", "lv", "ms", "mt", "nb", "nl", "pl", "pt", "pt-BR", "ro", "ru", "sk", "sl", "sv", "th", "tr", "vi", "zh", "zh-HK", "zh-TW"
    ];

    let stripeLocale = locale || "auto";
    if (!supportedLocales.includes(stripeLocale)) {
        if (stripeLocale.includes('-')) {
             const base = stripeLocale.split('-')[0];
             if (supportedLocales.includes(base)) {
                 stripeLocale = base;
             } else {
                 stripeLocale = "auto";
             }
        } else {
             stripeLocale = "auto";
        }
    }

    let sessionParams: any = {
        customer: stripeCustomerId,
        mode: mode,
        locale: stripeLocale,
        success_url: mode === 'setup' 
            ? `${baseSuccessUrl}&session_id={CHECKOUT_SESSION_ID}` // Maintain pattern
            : `${baseSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: baseCancelUrl,
    };

    if (mode === 'setup') {
        sessionParams = {
            ...sessionParams,
            currency: 'usd', // Required for setup mode
            payment_method_types: ['card'],
            metadata: {
                provider_id: targetProviderId,
                action: 'add_payment_method'
            }
        };
    } else {
        // Subscription Mode Logic
        
        // --- CURRENCY RESOLUTION LOGIC ---
        // 1. Define Main Currencies (Fixed Price)
        const MAIN_CURRENCIES = ['usd', 'cad', 'eur', 'gbp', 'brl'];
        
        // 2. Map Locale to Currency
        const getCurrencyForLocale = (loc: string): string => {
            const l = loc.toLowerCase();
            if (l.startsWith('en-ca') || l.startsWith('fr-ca')) return 'cad';
            if (l.startsWith('en-gb')) return 'gbp';
            if (l.startsWith('pt-br')) return 'brl';
            // Eurozone approximation (simplified)
            const euroLocales = ['fr', 'de', 'it', 'es', 'pt', 'nl', 'be', 'at', 'fi', 'ie'];
            if (euroLocales.some(el => l === el || l.startsWith(`${el}-`))) return 'eur';
            // Default to USD for everyone else (Floating Exchange Rate)
            return 'usd';
        };

        const targetCurrency = getCurrencyForLocale(stripeLocale);
        let currencyToUse = 'usd';
        let unitAmount = Math.round(plan.price_monthly * 100);

        // 3. Check if plan has a specific FIXED price for this currency
        if (targetCurrency !== 'usd' && plan.prices && plan.prices[targetCurrency]) {
            currencyToUse = targetCurrency;
            unitAmount = Math.round(plan.prices[targetCurrency]); // Assumes prices in DB are in cents? Or need mult?
            // Convention: plan.prices in DB should probably be in cents to avoid float issues, 
            // BUT plan.price_monthly is likely in dollars based on `Math.round(plan.price_monthly * 100)` above.
            // Let's assume plan.prices values are also in integer MAJOR units (e.g. 9 for 9 EUR) for consistency with price_monthly
            // SO we multiply by 100. 
            // Wait, looking at plan.price_monthly usage: `Math.round(plan.price_monthly * 100)`. 
            // So price_monthly is 10.00.
            // So plan.prices['eur'] should be 9.00.
            unitAmount = Math.round(plan.prices[targetCurrency] * 100);
        } else {
            // Fallback to USD (Floating)
            currencyToUse = 'usd';
            unitAmount = Math.round(plan.price_monthly * 100);
        }

        // Get or create Price
        const priceLookupKey = `plan_${planName}_${currencyToUse}`;
        
        const prices = await stripe.prices.list({
          lookup_keys: [priceLookupKey],
          limit: 1,
        });

        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
        } else {
          // Create product and price in Stripe
          // Check if Product exists first to avoid duplicates or use existing
           const products = await stripe.products.search({
                query: `metadata['plan_name']:'${planName}'`,
                limit: 1
           });
           
           let productId;
           if (products.data.length > 0) {
               productId = products.data[0].id;
           } else {
               const product = await stripe.products.create({
                name: plan.display_name,
                description: plan.description || undefined,
                metadata: {
                  plan_id: plan.id,
                  plan_name: planName,
                },
              });
              productId = product.id;
           }

          const price = await stripe.prices.create({
            product: productId,
            unit_amount: unitAmount,
            currency: currencyToUse,
            recurring: {
              interval: "month",
            },
            lookup_key: priceLookupKey,
            metadata: {
              plan_id: plan.id,
              region_currency: currencyToUse
            },
          });

          priceId = price.id;
        }

        // Handle discounts (Coupons)
        if (plan.discount_percent && plan.discount_percent > 0 && plan.discount_duration_months && plan.discount_duration_months > 0) {
          const couponId = `promo_${plan.discount_percent}off_${plan.discount_duration_months}mo`;
          try {
            await stripe.coupons.retrieve(couponId);
            discounts = [{ coupon: couponId }];
          } catch (err) {
            try {
              await stripe.coupons.create({
                id: couponId,
                percent_off: plan.discount_percent,
                duration: "repeating",
                duration_in_months: plan.discount_duration_months,
                name: `${plan.discount_percent}% off for ${plan.discount_duration_months} months`,
              });
              discounts = [{ coupon: couponId }];
            } catch (createErr) {
              console.error("Error creating coupon:", createErr);
            }
          }
        }

        sessionParams = {
             ...sessionParams,
            payment_method_collection: "if_required",
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: trialDays,
                trial_settings: {
                  end_behavior: {
                    missing_payment_method: "pause",
                  },
                },
                metadata: {
                  provider_id: targetProviderId,
                  plan_id: plan.id,
                  plan_name: planName,
                  currency: currencyToUse
                },
            },
            metadata: {
                provider_id: targetProviderId,
                plan_id: plan.id,
                plan_name: planName,
                currency: currencyToUse
            },
        };

        // Apply discounts OR allow promotion codes (mutually exclusive)
        if (discounts) {
          sessionParams.discounts = discounts;
        } else {
          sessionParams.allow_promotion_codes = true;
        }
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`Created checkout session ${session.id} for provider ${providerId}`);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    
    // Try to log error to debug_logs if possible
    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            await supabase.from("debug_logs").insert({
                message: "create-checkout-session failed",
                details: { error: error.message, stack: error.stack }
            });
        }
    } catch (logError) {
        console.error("Failed to log error to database:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
