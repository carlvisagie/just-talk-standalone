import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import { withTimeout, retryWithBackoff, API_TIMEOUTS } from "./_core/apiConfig";

// Lazy initialization - only create Stripe instance when needed
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = ENV.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error(
        "STRIPE_SECRET_KEY environment variable is not set. Please add it to your Render environment variables."
      );
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: "2025-12-15.clover",
    });
  }
  return stripeInstance;
}

// Cache for product/price IDs to avoid repeated searches
const priceCache: { [key: string]: string } = {};

async function getOrCreatePrice(stripe: Stripe, plan: "voice" | "phone"): Promise<string> {
  // Check cache first
  if (priceCache[plan]) {
    console.log(`[Stripe] Using cached price ID for ${plan}:`, priceCache[plan]);
    return priceCache[plan];
  }

  const productName = plan === "voice" ? "Voice Plan" : "Phone Plan";
  const amount = plan === "voice" ? 1200 : 2900; // $12 or $29 in cents

  console.log(`[Stripe] Searching for product: "${productName}"`);

  // Search for existing product by name
  const products = await stripe.products.search({
    query: `name:"${productName}" AND active:"true"`,
  });

  let priceId: string;

  if (products.data.length > 0) {
    // Product exists, get its price
    const product = products.data[0];
    console.log(`[Stripe] Found existing product:`, product.id);

    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: "recurring",
    });

    if (prices.data.length > 0) {
      priceId = prices.data[0].id;
      console.log(`[Stripe] Found existing price:`, priceId);
    } else {
      // Product exists but no price, create one
      console.log(`[Stripe] No price found, creating new price for existing product`);
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      console.log(`[Stripe] Created new price:`, priceId);
    }
  } else {
    // Product doesn't exist, create it
    console.log(`[Stripe] Product not found, creating new product and price`);
    const product = await stripe.products.create({
      name: productName,
      description: plan === "voice" 
        ? "Unlimited conversations with voice input/output"
        : "Everything in Voice + call from any phone + SMS support",
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: "usd",
      recurring: { interval: "month" },
    });

    priceId = price.id;
    console.log(`[Stripe] Created new product:`, product.id);
    console.log(`[Stripe] Created new price:`, priceId);
  }

  // Cache the result
  priceCache[plan] = priceId;
  return priceId;
}

export const stripeRouter = router({
  createCheckoutSession: publicProcedure
    .input(
      z.object({
        plan: z.enum(["voice", "phone"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("[Stripe Checkout] Starting checkout for plan:", input.plan);
        
        const stripe = getStripe();
        console.log("[Stripe Checkout] Stripe instance created successfully");
      
        // Auto-search/create product/price with timeout and retry
        console.log("[Stripe Checkout] Getting or creating price for plan:", input.plan);
        const priceId = await retryWithBackoff(
          () => withTimeout(
            getOrCreatePrice(stripe, input.plan),
            API_TIMEOUTS.stripe,
            "Stripe product lookup"
          ),
          { maxRetries: 2 }
        );

        console.log("[Stripe Checkout] Got price ID:", priceId);
        console.log("[Stripe Checkout] Creating checkout session...");
        
        const session = await retryWithBackoff(
          () => withTimeout(
            stripe.checkout.sessions.create({
              payment_method_types: ["card"],
              line_items: [
                {
                  price: priceId,
                  quantity: 1,
                },
              ],
              mode: "subscription",
              // Disable Adaptive Pricing to prevent auto-conversion to local currency (TRY, EUR, etc.)
              // This ensures customers always see USD prices as intended
              adaptive_pricing: { enabled: false },
              success_url: `${process.env.FRONTEND_URL || 'https://just-talk.onrender.com'}/chat?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${process.env.FRONTEND_URL || 'https://just-talk.onrender.com'}`,
              allow_promotion_codes: true,
              billing_address_collection: "auto",
              metadata: {
                plan: input.plan,
              },
            }),
            API_TIMEOUTS.stripe,
            "Stripe checkout session"
          ),
          { maxRetries: 2 }
        );

        console.log("[Stripe Checkout] Session created successfully:", session.id);
        console.log("[Stripe Checkout] Checkout URL:", session.url);
        
        return { url: session.url };
      } catch (error) {
        console.error("[Stripe Checkout ERROR] Full error:", error);
        console.error("[Stripe Checkout ERROR] Error message:", error instanceof Error ? error.message : String(error));
        console.error("[Stripe Checkout ERROR] Error stack:", error instanceof Error ? error.stack : "No stack");
        throw error;
      }
    }),
});
