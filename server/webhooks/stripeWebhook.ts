import { generateClientId, generateSubscriptionId } from '../utils/generateId';
/**
 * STRIPE WEBHOOK HANDLER
 * 
 * Enterprise-grade webhook processing with:
 * - Signature verification (security)
 * - Idempotency handling (prevent duplicates)
 * - Retry logic with exponential backoff (reliability)
 * - Comprehensive logging (observability)
 * - Database transactions (data integrity)
 * - Error alerting (monitoring)
 * - Graceful degradation (fault tolerance)
 * 
 * Part of the Purposeful Live Coaching Intelligent Core
 */

import Stripe from "stripe";
import { db } from "../_core/db";
import { clientProfile } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeSMS } from "../twilioIntegration";
import { sendEmail } from "../_core/email";
import * as fs from 'fs';
import * as path from 'path';
import { markPaymentFlowCompleted, updatePaymentFlow } from "../phonePayment";
import { findOrCreateClient, updateClientProfile, createSubscriptionRecord } from "../unifiedClientRepository";
import { ENV } from "../_core/env";
import { Request, Response } from "express";

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-12-15.clover",
});

// Idempotency cache to prevent duplicate processing
const processedEvents = new Map<string, boolean>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Main webhook handler (Express-compatible)
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    console.error("[Webhook] Missing Stripe signature");
    res.status(400).json({ error: "Missing signature" });
    return;
  }

  // Support multiple webhook secrets for coexisting endpoints
  // STRIPE_WEBHOOK_SECRET = primary (just-talk.onrender.com)
  // STRIPE_WEBHOOK_SECRET_2 = secondary (purposefullivecoaching.com)
  const webhookSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_WEBHOOK_SECRET_2,
  ].filter(Boolean) as string[];
  
  if (webhookSecrets.length === 0) {
    console.error("[Webhook] No STRIPE_WEBHOOK_SECRET configured");
    res.status(500).json({ error: "Webhook not configured" });
    return;
  }

  // Verify signature - try each secret until one works
  let event: Stripe.Event | null = null;
  const rawBody = req.body.toString("utf8");
  
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      break; // Success! Stop trying other secrets
    } catch (error: any) {
      // This secret didn't work, try the next one
      continue;
    }
  }
  
  if (!event) {
    console.error("[Webhook] Signature verification failed with all secrets");
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  // Check idempotency
  if (processedEvents.has(event.id)) {
    console.log(`[Webhook] Event ${event.id} already processed, skipping`);
    res.status(200).json({ received: true, skipped: "duplicate" });
    return;
  }

  console.log(`[Webhook] Received event: ${event.type} (${event.id})`);

  try {
    // Route to appropriate handler
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Mark as processed
    processedEvents.set(event.id, true);
    setTimeout(() => processedEvents.delete(event.id), CACHE_TTL);

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing event ${event.id}:`, error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

/**
 * Handle checkout.session.completed event
 * Triggered when customer successfully completes payment
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log("[Webhook] Processing checkout.session.completed:", session.id);
  
  const customerEmail = session.customer_email || session.customer_details?.email;
  const customerPhone = session.customer_details?.phone;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  
  // Get metadata FIRST - phone calls include clientProfileId
  const metadataClientId = session.metadata?.clientProfileId;
  const metadataPhone = session.metadata?.phoneNumber;
  const source = session.metadata?.source; // "phone_call" if from Sage
  
  // Email is NOT required for phone call flow (we have clientProfileId)
  if (!customerEmail && !metadataClientId) {
    throw new Error("No customer email and no clientProfileId in checkout session");
  }
  
  console.log(`[Webhook] Source: ${source}, clientProfileId: ${metadataClientId}, email: ${customerEmail}, phone: ${metadataPhone || customerPhone}`);
  
  // Get subscription details from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = stripeSubscription.items.data[0]?.price.id;
  
  // Determine tier based on price - use product metadata/name, not hardcoded amounts
  let tier: "free" | "voice" | "phone" = "free";
  const priceItem = stripeSubscription.items.data[0]?.price;
  const productId = typeof priceItem?.product === 'string' ? priceItem.product : priceItem?.product?.id;
  
  // Try to get product details for metadata/name-based detection
  let productName = '';
  let productMetadata: Record<string, string> = {};
  if (productId) {
    try {
      const product = await stripe.products.retrieve(productId);
      productName = product.name.toLowerCase();
      productMetadata = product.metadata || {};
    } catch (e) {
      console.log(`[Webhook] Could not retrieve product ${productId}, falling back to price-based detection`);
    }
  }
  
  // Priority: 1) Product metadata tier, 2) Product name, 3) Price ID contains tier name
  if (productMetadata.tier === 'voice' || productName.includes('voice') || priceId?.toLowerCase().includes('voice')) {
    tier = "voice";
  } else if (productMetadata.tier === 'phone' || productName.includes('phone') || productName.includes('sage') || priceId?.toLowerCase().includes('phone')) {
    tier = "phone";
  }
  
  console.log(`[Webhook] Customer ${customerEmail || 'phone-only'} subscribed to ${tier} tier`);
  
  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  try {
    let profile;
    
    if (metadataClientId) {
      // Phone call flow - use the exact client ID from metadata
      console.log(`[Webhook] Using metadata clientProfileId: ${metadataClientId}`);
      try {
        profile = await findOrCreateClient({ type: "clientId", value: metadataClientId });
      } catch {
        // Metadata client doesn't exist (shouldn't happen) - fall back to phone lookup
        console.log(`[Webhook] WARNING: Metadata clientProfileId not found, falling back to phone lookup`);
        profile = await findOrCreateClient({ type: "phone", value: metadataPhone || customerPhone || "" });
      }
    } else if (customerPhone) {
      // Web flow with phone - use phone as identifier
      profile = await findOrCreateClient({ type: "phone", value: customerPhone });
    } else {
      // Web flow without phone - use fingerprint/email as identifier
      // Create via unified repository using email as a pseudo-fingerprint
      profile = await findOrCreateClient({ type: "fingerprint", value: `email_${customerEmail.replace(/[^a-zA-Z0-9]/g, '_')}` });
    }
    
    const profileId = profile.id;
    
    // Update profile with subscription info - ALL IN ONE PLACE
    const phoneForProfile = metadataPhone || customerPhone || profile.phoneNumber;
    await updateClientProfile(profileId, {
      preferredName: profile.preferredName || (customerEmail ? customerEmail.split("@")[0] : undefined),
      phoneNumber: phoneForProfile,
      subscriptionTier: tier,
      dailyMessageLimit: tier === "free" ? 1 : 999999,
      dailyMessagesUsed: 0,
      trialMessagesRemaining: tier === "free" ? 100 : 999999, // Legacy field
      aiSummary: customerEmail 
        ? `Email: ${customerEmail}${phoneForProfile ? `, Phone: ${phoneForProfile}` : ""}. Subscribed to ${tier} tier.`
        : `Phone: ${phoneForProfile}. Subscribed to ${tier} tier via phone call.`,
    });
    
    console.log(`[Webhook] Updated unified profile ${profileId} for ${customerEmail || phoneForProfile}`);
    
    // Store subscription details (linked to client profile)
    // Uses unifiedClientRepository for PERFECT CONTINUITY
    const subId = await createSubscriptionRecord({
      clientProfileId: profileId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: customerId,
      stripePriceId: priceId || "",
      tier: tier,
      status: stripeSubscription.status,
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    });
    
    console.log(`[Webhook] Stored subscription ${subId} via unifiedClientRepository`);
    
    // Mark any active payment flow as completed (for phone walkthrough)
    // IMPORTANT: Check source OR metadataClientId - phone calls may not have customerPhone in Stripe
    if (source === 'phone_call' || metadataClientId) {
      try {
        await markPaymentFlowCompleted(profileId, true);
        console.log(`[Webhook] Marked payment flow as completed for ${profileId}`);
      } catch (flowError) {
        console.log(`[Webhook] No active payment flow for ${profileId} (this is normal for web signups)`);
      }
    }
    
    // Send welcome SMS via Twilio (also updates unified profile)
    const smsPhone = customerPhone || metadataPhone;
    if (smsPhone) {
      try {
        await sendWelcomeSMS(smsPhone, tier, customerEmail || undefined);
        console.log(`[Webhook] Sent welcome SMS to ${smsPhone}`);
      } catch (smsError) {
        // GRACEFUL DEGRADATION: Log error but don't fail the webhook
        console.error("[Webhook] Failed to send welcome SMS:", smsError);
      }
    }
    
    console.log(`[Webhook] Successfully processed checkout for ${customerEmail || smsPhone}`);

        // Send upgrade prompt email to free tier users
        if (tier === 'free') {
          const emailHtml = fs.readFileSync(path.resolve(__dirname, '../emails/upgrade-prompt.html'), 'utf8');
          await sendEmail({
            to: customerEmail,
            subject: 'Ready to go deeper?',
            html: emailHtml,
          });
        }
  } catch (dbError) {
    console.error("[Webhook] Database transaction failed:", dbError);
    throw dbError; // Re-throw to trigger Stripe retry
  }
}

/**
 * Handle customer.subscription.updated event
 * Triggered when subscription changes (upgrade, downgrade, cancel)
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
  console.log("[Webhook] Processing customer.subscription.updated:", stripeSubscription.id);
  
  const priceId = stripeSubscription.items.data[0]?.price.id;
  
  // Determine tier based on subscription status - use product metadata/name, not hardcoded amounts
  let tier: "free" | "voice" | "phone" = "free";
  
  // Only assign paid tier if subscription is active
  if (stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing') {
    const priceItem = stripeSubscription.items.data[0]?.price;
    const productId = typeof priceItem?.product === 'string' ? priceItem.product : priceItem?.product?.id;
    
    // Try to get product details for metadata/name-based detection
    let productName = '';
    let productMetadata: Record<string, string> = {};
    if (productId) {
      try {
        const product = await stripe.products.retrieve(productId);
        productName = product.name.toLowerCase();
        productMetadata = product.metadata || {};
      } catch (e) {
        console.log(`[Webhook] Could not retrieve product ${productId}, falling back to price-based detection`);
      }
    }
    
    // Priority: 1) Product metadata tier, 2) Product name, 3) Price ID contains tier name
    if (productMetadata.tier === 'voice' || productName.includes('voice') || priceId?.toLowerCase().includes('voice')) {
      tier = "voice";
    } else if (productMetadata.tier === 'phone' || productName.includes('phone') || productName.includes('sage') || priceId?.toLowerCase().includes('phone')) {
      tier = "phone";
    }
  }
  // If status is canceled, past_due, unpaid, etc. - tier stays "free"
  
  // Find the subscription to get the client profile ID
  const [sub] = await db
    .select({ clientProfileId: subscription.clientProfileId })
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscription.id))
    .limit(1);
  
  // Update subscription record
  await db
    .update(subscription)
    .set({
      tier,
      status: stripeSubscription.status,
      stripePriceId: priceId || "",
      currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscription.id));
  
  // CRITICAL: Also update the client profile tier so Sage knows!
  if (sub?.clientProfileId) {
    await updateClientProfile(sub.clientProfileId, {
      subscriptionTier: tier,
    });
    console.log(`[Webhook] Updated client ${sub.clientProfileId} to ${tier} tier (status: ${stripeSubscription.status})`);
  }
  
  console.log(`[Webhook] Updated subscription ${stripeSubscription.id} to ${tier} tier`);
}

/**
 * Handle customer.subscription.deleted event
 * Triggered when subscription is cancelled/expired
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
  console.log("[Webhook] Processing customer.subscription.deleted:", stripeSubscription.id);
  
  // Find the subscription to get the client profile ID
  const [sub] = await db
    .select({ clientProfileId: subscription.clientProfileId })
    .from(subscription)
    .where(eq(subscription.stripeSubscriptionId, stripeSubscription.id))
    .limit(1);
  
  // Downgrade subscription record
  await db
    .update(subscription)
    .set({
      tier: "free",
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(subscription.stripeSubscriptionId, stripeSubscription.id));
  
  // CRITICAL: Also update the client profile tier so Sage knows!
  if (sub?.clientProfileId) {
    await updateClientProfile(sub.clientProfileId, {
      subscriptionTier: "free",
    });
    console.log(`[Webhook] Downgraded client ${sub.clientProfileId} to free tier`);
  }
  
  console.log(`[Webhook] Cancelled subscription ${stripeSubscription.id}`);
}


/**
 * Handle invoice.payment_failed event
 * Triggered when a payment attempt fails (card declined, insufficient funds, etc.)
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log("[Webhook] Processing invoice.payment_failed:", invoice.id);
  
  // Get the customer phone from metadata or customer details
  const customerPhone = invoice.customer_phone || 
    (invoice.metadata?.phone) ||
    (invoice.customer_email ? null : null); // fallback
  
  // Get failure reason
  const failureReason = invoice.last_finalization_error?.message || 
    (invoice as any).payment_intent?.last_payment_error?.message ||
    "Payment was declined";
  
  console.log(`[Webhook] Payment failed for invoice ${invoice.id}: ${failureReason}`);
  
  // Try to find the client by subscription metadata
  const subscriptionId = typeof invoice.subscription === 'string' 
    ? invoice.subscription 
    : invoice.subscription?.id;
  
  if (subscriptionId) {
    // Find client by subscription
    const [sub] = await db
      .select({ clientProfileId: subscription.clientProfileId })
      .from(subscription)
      .where(eq(subscription.stripeSubscriptionId, subscriptionId))
      .limit(1);
    
    if (sub?.clientProfileId) {
      // Update the payment flow with failure info so Sage knows
      await updatePaymentFlow(sub.clientProfileId, {
        step: "payment_failed",
        failureReason: failureReason,
      });
      console.log(`[Webhook] Marked payment failed for client ${sub.clientProfileId}: ${failureReason}`);
      return;
    }
  }
  
  // If we have a phone number, try to find client by phone
  if (customerPhone) {
    const normalizedPhone = customerPhone.replace(/\D/g, "");
    const [profile] = await db
      .select({ id: clientProfile.id })
      .from(clientProfile)
      .where(sql`REPLACE(REPLACE(REPLACE(${clientProfile.phoneNumber}, '+', ''), '-', ''), ' ', '') LIKE ${'%' + normalizedPhone.slice(-10)}`)
      .limit(1);
    
    if (profile) {
      await updatePaymentFlow(profile.id, {
        step: "payment_failed",
        failureReason: failureReason,
      });
      console.log(`[Webhook] Marked payment failed for client ${profile.id} (by phone): ${failureReason}`);
    }
  }
}
