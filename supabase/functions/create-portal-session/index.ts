/**
 * Create Stripe Customer Portal Session Edge Function
 * 
 * Creates a Stripe Customer Portal session for billing management.
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json();
    const { providerId, returnUrl } = body;

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

    // Get Provider ID if not passed (validate user owns provider)
    let targetProviderId = providerId;
    if (!targetProviderId) {
        const { data: provider } = await supabase
            .from("providers")
            .select("id")
            .eq("auth_user_id", authenticatedUser.id)
            .single();
        targetProviderId = provider?.id;
    } else {
        // Verify ownership
        const { data: provider } = await supabase
            .from("providers")
            .select("auth_user_id")
            .eq("id", targetProviderId)
            .single();
        
        if (!provider || provider.auth_user_id !== authenticatedUser.id) {
             return new Response(
                JSON.stringify({ error: "Unauthorized access to provider" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
    }

    if (!targetProviderId) {
        return new Response(
            JSON.stringify({ error: "Provider not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Get Stripe Customer ID
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("provider_id", targetProviderId)
        .single();
    
    if (!subscription || !subscription.stripe_customer_id) {
        return new Response(
            JSON.stringify({ error: "No billing account found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Create Portal Session
    const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl || req.headers.get("origin"),
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error: any) {
    console.error("Error creating portal session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
