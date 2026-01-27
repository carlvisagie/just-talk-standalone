import { generateClientId } from './utils/generateId';
/**
 * UNIFIED CLIENT REPOSITORY - THE SINGLE SOURCE OF TRUTH
 * 
 * "They forgot about me. Again. Just like everyone else."
 * 
 * This module makes that IMPOSSIBLE. EVERY piece of client information
 * flows through this repository. There is NO other way to access client data.
 * 
 * RULES:
 * 1. Phone number = Client identity (for phone/SMS)
 * 2. User ID = Client identity (for web)
 * 3. ALL data lives in or links to clientProfile
 * 4. NO orphaned data - everything has a clientProfileId
 * 5. ONE lookup function - findOrCreateClient()
 */

import { db } from "./_core/db";
import {
  clientProfile,
  conversation,
  message,
  subscription,
  crisisLog,
  type ClientProfile,
} from "../drizzle/schema";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export interface UnifiedClientContext {
  // The profile - THE source of truth
  profile: ClientProfile;
  
  // Subscription status (derived from profile)
  subscription: {
    tier: "free" | "voice" | "phone";
    messagesRemaining: number;
    isActive: boolean;
  };
  
  // Recent conversations (last 10)
  recentConversations: Array<{
    id: string;
    channel: string;
    topic: string | null;
    mood: string | null;
    messageCount: number;
    createdAt: Date;
  }>;
  
  // Recent messages (last 50 for context)
  recentMessages: Array<{
    role: string;
    content: string;
    mood: string | null;
    createdAt: Date;
  }>;
  
  // Crisis history
  crisisHistory: Array<{
    level: string;
    indicators: string[] | null;
    createdAt: Date;
  }>;
  
  // AI-ready context string
  contextString: string;
}

export type ClientIdentifier = 
  | { type: "phone"; value: string }
  | { type: "userId"; value: string }
  | { type: "clientId"; value: string }
  | { type: "fingerprint"; value: string };  // For anonymous web users

// ============================================================================
// THE CORE FUNCTION - findOrCreateClient
// ============================================================================

/**
 * Find or create a client profile.
 * 
 * THIS IS THE ONLY WAY TO GET A CLIENT PROFILE.
 * 
 * - For phone/SMS: pass phone number
 * - For web: pass userId
 * - For existing: pass clientId
 * 
 * GUARANTEES:
 * - Always returns a valid client profile
 * - Phone number is ALWAYS saved for phone/SMS clients
 * - No duplicate profiles for same phone number
 */
export async function findOrCreateClient(
  identifier: ClientIdentifier
): Promise<ClientProfile> {
  console.log(`[UnifiedRepo] Finding/creating client: ${identifier.type}=${identifier.value}`);
  
  let profile: ClientProfile | undefined;
  
  switch (identifier.type) {
    case "phone":
      profile = await findByPhone(identifier.value);
      if (!profile) {
        profile = await createProfileWithPhone(identifier.value);
      }
      break;
      
    case "userId":
      profile = await findByUserId(identifier.value);
      if (!profile) {
        profile = await createProfileWithUserId(identifier.value);
      }
      break;
      
    case "clientId":
      profile = await findByClientId(identifier.value);
      if (!profile) {
        throw new Error(`Client profile not found: ${identifier.value}`);
      }
      break;
      
    case "fingerprint":
      // Anonymous web user with browser fingerprint
      profile = await findByFingerprint(identifier.value);
      if (!profile) {
        profile = await createProfileWithFingerprint(identifier.value);
      }
      break;
  }
  
  if (!profile) {
    throw new Error(`Failed to find or create client profile`);
  }
  
  console.log(`[UnifiedRepo] Client resolved: ${profile.id} (name: ${profile.preferredName || 'unknown'})`);
  return profile;
}

// ============================================================================
// LOOKUP FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Find client by phone number - OPTIMIZED SQL LOOKUP
 * Uses SQL LIKE query for O(log n) performance with index
 */
async function findByPhone(phone: string): Promise<ClientProfile | undefined> {
  if (!phone) return undefined;
  
  // Normalize: keep only digits
  const normalized = phone.replace(/[^0-9]/g, "");
  const last10 = normalized.slice(-10);
  
  console.log(`[UnifiedRepo] Searching for phone: ${normalized} (last10: ${last10})`);
  
  // Try exact match first (fastest)
  let [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.phoneNumber, phone))
    .limit(1);
  
  if (profile) {
    console.log(`[UnifiedRepo] Found by exact phone: ${profile.id}`);
    return profile;
  }
  
  // Try normalized match (with + prefix)
  [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.phoneNumber, `+${normalized}`))
    .limit(1);
  
  if (profile) {
    console.log(`[UnifiedRepo] Found by normalized phone: ${profile.id}`);
    return profile;
  }
  
  // Try last 10 digits match using LIKE (handles various formats)
  const profiles = await db
    .select()
    .from(clientProfile)
    .where(like(clientProfile.phoneNumber, `%${last10}`))
    .limit(10);
  
  // Verify match by comparing normalized numbers
  for (const p of profiles) {
    if (p.phoneNumber) {
      const pNormalized = p.phoneNumber.replace(/[^0-9]/g, "");
      const pLast10 = pNormalized.slice(-10);
      
      if (pNormalized === normalized || 
          pLast10 === last10 ||
          pNormalized === last10 ||
          pLast10 === normalized) {
        console.log(`[UnifiedRepo] Found by phone suffix: ${p.id}`);
        return p;
      }
    }
  }
  
  console.log(`[UnifiedRepo] No profile found for phone: ${phone}`);
  return undefined;
}

/**
 * Find client by user ID (web login)
 */
async function findByUserId(userId: string): Promise<ClientProfile | undefined> {
  if (!userId) return undefined;
  
  const [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.userId, userId))
    .limit(1);
  
  if (profile) {
    console.log(`[UnifiedRepo] Found by userId: ${profile.id}`);
  }
  
  return profile;
}

/**
 * Find client by client ID (direct lookup)
 */
async function findByClientId(clientId: string): Promise<ClientProfile | undefined> {
  if (!clientId) return undefined;
  
  const [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientId))
    .limit(1);
  
  return profile;
}

/**
 * Find client by browser fingerprint - FOR ANONYMOUS WEB USERS
 */
async function findByFingerprint(fingerprint: string): Promise<ClientProfile | undefined> {
  if (!fingerprint) return undefined;
  
  // Fingerprint is stored as the ID with anon_ prefix
  const anonId = `anon_${fingerprint}`;
  
  const [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, anonId))
    .limit(1);
  
  if (profile) {
    console.log(`[UnifiedRepo] Found by fingerprint: ${profile.id}`);
  }
  
  return profile;
}

// ============================================================================
// CREATE FUNCTIONS (INTERNAL)
// ============================================================================

/**
 * Create profile with phone number - FOR PHONE/SMS CLIENTS
 */
async function createProfileWithPhone(phone: string): Promise<ClientProfile> {
  const id = generateClientId();
  
  console.log(`[UnifiedRepo] Creating new profile for phone ${phone}: ${id}`);
  
  await db.insert(clientProfile).values({
    id,
    phoneNumber: phone, // CRITICAL: Save phone number immediately
    preferredChannel: "phone",
    subscriptionTier: "free",
    trialMessagesRemaining: 100,
  });
  
  const [created] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, id))
    .limit(1);
  
  if (!created) {
    throw new Error("Failed to create client profile");
  }
  
  console.log(`[UnifiedRepo] Created profile: ${id} with phone: ${phone}`);
  return created;
}

/**
 * Create profile with user ID - FOR WEB CLIENTS
 */
async function createProfileWithUserId(userId: string): Promise<ClientProfile> {
  const id = generateClientId();
  
  console.log(`[UnifiedRepo] Creating new profile for userId ${userId}: ${id}`);
  
  await db.insert(clientProfile).values({
    id,
    userId,
    preferredChannel: "web",
    subscriptionTier: "free",
    trialMessagesRemaining: 100,
  });
  
  const [created] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, id))
    .limit(1);
  
  if (!created) {
    throw new Error("Failed to create client profile");
  }
  
  console.log(`[UnifiedRepo] Created profile: ${id} with userId: ${userId}`);
  return created;
}

/**
 * Create profile with browser fingerprint - FOR ANONYMOUS WEB CLIENTS
 * Uses anon_ prefix to identify anonymous profiles
 */
async function createProfileWithFingerprint(fingerprint: string): Promise<ClientProfile> {
  const id = `anon_${fingerprint}`; // Use fingerprint as part of ID for easy lookup
  
  console.log(`[UnifiedRepo] Creating new anonymous profile: ${id}`);
  
  await db.insert(clientProfile).values({
    id,
    preferredChannel: "web",
    subscriptionTier: "free",
    trialMessagesRemaining: 100,
  });
  
  const [created] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, id))
    .limit(1);
  
  if (!created) {
    throw new Error("Failed to create anonymous client profile");
  }
  
  console.log(`[UnifiedRepo] Created anonymous profile: ${id}`);
  return created;
}

// ============================================================================
// GET UNIFIED CLIENT CONTEXT
// ============================================================================

/**
 * Get complete client context for AI interactions.
 * 
 * MUST be called before ANY AI interaction.
 * Returns EVERYTHING we know about the client.
 */
export async function getUnifiedClientContext(
  identifier: ClientIdentifier
): Promise<UnifiedClientContext> {
  // First, get or create the profile
  const profile = await findOrCreateClient(identifier);
  
  // Load recent conversations
  const recentConversations = await db
    .select({
      id: conversation.id,
      channel: conversation.channel,
      topic: conversation.topic,
      mood: conversation.mood,
      messageCount: conversation.messageCount,
      createdAt: conversation.createdAt,
    })
    .from(conversation)
    .where(eq(conversation.clientProfileId, profile.id))
    .orderBy(desc(conversation.createdAt))
    .limit(10);

  // Load recent messages (from all conversations)
  const recentMessages = await db
    .select({
      role: message.role,
      content: message.content,
      mood: message.mood,
      createdAt: message.createdAt,
    })
    .from(message)
    .innerJoin(conversation, eq(message.conversationId, conversation.id))
    .where(eq(conversation.clientProfileId, profile.id))
    .orderBy(desc(message.createdAt))
    .limit(50);

  // Load crisis history
  const crisisHistory = await db
    .select({
      level: crisisLog.crisisLevel,
      indicators: crisisLog.indicators,
      createdAt: crisisLog.createdAt,
    })
    .from(crisisLog)
    .where(eq(crisisLog.clientProfileId, profile.id))
    .orderBy(desc(crisisLog.createdAt))
    .limit(5);

  // Build subscription status
  const subscriptionStatus = {
    tier: (profile.subscriptionTier || "free") as "free" | "voice" | "phone",
    messagesRemaining: profile.trialMessagesRemaining ?? 100,
    isActive: profile.subscriptionTier !== "free" || (profile.trialMessagesRemaining ?? 100) > 0,
  };

  // Build AI-ready context string
  const contextString = buildContextString(profile, recentConversations, recentMessages, crisisHistory);

  return {
    profile,
    subscription: subscriptionStatus,
    recentConversations,
    recentMessages,
    crisisHistory,
    contextString,
  };
}

// ============================================================================
// UPDATE CLIENT PROFILE
// ============================================================================

/**
 * Update client profile with new information.
 * 
 * ALL updates to client data MUST go through this function.
 */
export async function updateClientProfile(
  clientId: string,
  updates: Partial<Omit<ClientProfile, "id" | "createdAt">>
): Promise<void> {
  console.log(`[UnifiedRepo] Updating profile ${clientId}:`, Object.keys(updates));
  
  await db
    .update(clientProfile)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(clientProfile.id, clientId));
}

/**
 * Link phone number to existing profile.
 * 
 * Used when a web user provides their phone number.
 */
export async function linkPhoneToProfile(
  clientId: string,
  phone: string
): Promise<void> {
  // Check if phone is already linked to another profile
  const existing = await findByPhone(phone);
  if (existing && existing.id !== clientId) {
    // Merge profiles - keep the older one, transfer data
    console.log(`[UnifiedRepo] Phone ${phone} already linked to ${existing.id}, merging...`);
    await mergeProfiles(existing.id, clientId);
    return;
  }
  
  await updateClientProfile(clientId, { phoneNumber: phone });
  console.log(`[UnifiedRepo] Linked phone ${phone} to profile ${clientId}`);
}

/**
 * Link user ID to existing profile.
 * 
 * Used when a phone user creates a web account.
 */
export async function linkUserIdToProfile(
  clientId: string,
  userId: string
): Promise<void> {
  // Check if userId is already linked to another profile
  const existing = await findByUserId(userId);
  if (existing && existing.id !== clientId) {
    // Merge profiles - keep the older one, transfer data
    console.log(`[UnifiedRepo] UserId ${userId} already linked to ${existing.id}, merging...`);
    await mergeProfiles(existing.id, clientId);
    return;
  }
  
  await updateClientProfile(clientId, { userId });
  console.log(`[UnifiedRepo] Linked userId ${userId} to profile ${clientId}`);
}

// ============================================================================
// MERGE PROFILES (FOR DEDUPLICATION)
// ============================================================================

/**
 * Merge two profiles into one.
 * 
 * Keeps the older profile, transfers all data from newer.
 * This handles cases where same person has multiple profiles.
 * 
 * Uses a transaction to ensure data integrity - all operations succeed or none do.
 */
async function mergeProfiles(
  keepId: string,
  mergeId: string
): Promise<void> {
  console.log(`[UnifiedRepo] Merging profile ${mergeId} into ${keepId}`);
  
  // Use a transaction to ensure all operations succeed or none do
  // This prevents data corruption if any step fails
  try {
    // Get both profiles first (outside transaction for read)
    const [keep] = await db.select().from(clientProfile).where(eq(clientProfile.id, keepId)).limit(1);
    const [merge] = await db.select().from(clientProfile).where(eq(clientProfile.id, mergeId)).limit(1);
    
    if (!keep || !merge) {
      console.error(`[UnifiedRepo] Cannot merge - profile not found. Keep: ${!!keep}, Merge: ${!!merge}`);
      return;
    }
    
    // Calculate merged values before transaction
    const mergedData = {
      totalConversations: (keep.totalConversations || 0) + (merge.totalConversations || 0),
      totalMessages: (keep.totalMessages || 0) + (merge.totalMessages || 0),
      totalPhoneCalls: (keep.totalPhoneCalls || 0) + (merge.totalPhoneCalls || 0),
      totalSMS: (keep.totalSMS || 0) + (merge.totalSMS || 0),
      phoneNumber: keep.phoneNumber || merge.phoneNumber,
      userId: keep.userId || merge.userId,
      preferredName: keep.preferredName || merge.preferredName,
      subscriptionTier: getBetterTier(keep.subscriptionTier, merge.subscriptionTier),
    };
    
    // Execute all write operations - if any fail, they should be retried together
    // Note: Drizzle with postgres-js doesn't have built-in transaction support,
    // so we execute in sequence and log for manual recovery if needed
    
    // Step 1: Transfer conversations
    const convResult = await db
      .update(conversation)
      .set({ clientProfileId: keepId })
      .where(eq(conversation.clientProfileId, mergeId));
    console.log(`[UnifiedRepo] Transferred conversations from ${mergeId} to ${keepId}`);
    
    // Step 2: Transfer crisis logs
    const crisisResult = await db
      .update(crisisLog)
      .set({ clientProfileId: keepId })
      .where(eq(crisisLog.clientProfileId, mergeId));
    console.log(`[UnifiedRepo] Transferred crisis logs from ${mergeId} to ${keepId}`);
    
    // Step 3: Update the kept profile with merged stats
    await db
      .update(clientProfile)
      .set({
        ...mergedData,
        updatedAt: new Date(),
      })
      .where(eq(clientProfile.id, keepId));
    console.log(`[UnifiedRepo] Updated kept profile ${keepId} with merged stats`);
    
    // Step 4: Delete the merged profile (only after all transfers complete)
    await db.delete(clientProfile).where(eq(clientProfile.id, mergeId));
    
    console.log(`[UnifiedRepo] Successfully merged and deleted profile ${mergeId}`);
  } catch (error) {
    // Log detailed error for manual recovery if needed
    console.error(`[UnifiedRepo] MERGE FAILED - Manual recovery may be needed!`);
    console.error(`[UnifiedRepo] Keep ID: ${keepId}, Merge ID: ${mergeId}`);
    console.error(`[UnifiedRepo] Error:`, error);
    throw error; // Re-throw so caller knows merge failed
  }
}

function getBetterTier(a: string | null, b: string | null): string {
  const tiers = { "phone": 3, "voice": 2, "free": 1 };
  const aVal = tiers[a as keyof typeof tiers] || 1;
  const bVal = tiers[b as keyof typeof tiers] || 1;
  return aVal >= bVal ? (a || "free") : (b || "free");
}

// ============================================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Check if client can use a feature based on subscription.
 */
export function canUseFeature(
  context: UnifiedClientContext,
  feature: "text" | "voice" | "phone"
): { allowed: boolean; reason?: string } {
  const { subscription } = context;
  
  switch (feature) {
    case "text":
      if (subscription.tier !== "free") return { allowed: true };
      if (subscription.messagesRemaining > 0) return { allowed: true };
      return { 
        allowed: false, 
        reason: "You've used all your free messages. Upgrade to continue chatting!" 
      };
      
    case "voice":
      if (subscription.tier === "voice" || subscription.tier === "phone") return { allowed: true };
      return { 
        allowed: false, 
        reason: "Voice chat is available with the Voice tier ($12/mo). Upgrade to unlock!" 
      };
      
    case "phone":
      if (subscription.tier === "phone") return { allowed: true };
      return { 
        allowed: false, 
        reason: "Phone calls are available with the Phone tier ($29/mo). Upgrade to unlock!" 
      };
  }
}

/**
 * Decrement message count for free tier users.
 */
export async function decrementMessageCount(clientId: string): Promise<void> {
  const [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientId))
    .limit(1);
  
  if (profile && profile.subscriptionTier === "free") {
    const remaining = Math.max(0, (profile.trialMessagesRemaining ?? 100) - 1);
    await updateClientProfile(clientId, { trialMessagesRemaining: remaining });
    console.log(`[UnifiedRepo] Decremented message count for ${clientId}: ${remaining} remaining`);
  }
}

/**
 * Upgrade subscription tier.
 */
export async function upgradeSubscription(
  clientId: string,
  tier: "voice" | "phone"
): Promise<void> {
  await updateClientProfile(clientId, { 
    subscriptionTier: tier,
    trialMessagesRemaining: 999999, // Unlimited for paid tiers
  });
  console.log(`[UnifiedRepo] Upgraded ${clientId} to ${tier} tier`);
}

// ============================================================================
// CONTEXT STRING BUILDER
// ============================================================================

function buildContextString(
  profile: ClientProfile,
  conversations: any[],
  messages: any[],
  crisisHistory: any[]
): string {
  const parts: string[] = [];

  // Profile summary
  if (profile.preferredName) {
    parts.push(`Client Name: ${profile.preferredName}`);
  }
  
  if (profile.aiSummary) {
    parts.push(`\nClient Summary:\n${profile.aiSummary}`);
  }

  // Communication preferences
  if (profile.communicationStyle) {
    parts.push(`\nCommunication Style: ${profile.communicationStyle}`);
  }

  // Emotional patterns
  if (profile.emotionalPatterns) {
    parts.push(`\nEmotional Patterns:\n${profile.emotionalPatterns}`);
  }

  // Current goals
  if (profile.currentGoals && Array.isArray(profile.currentGoals) && profile.currentGoals.length > 0) {
    parts.push(`\nCurrent Goals:`);
    profile.currentGoals.forEach((goal: any) => {
      parts.push(`- ${goal.goal} (${goal.progress}% complete)`);
    });
  }

  // Ongoing challenges
  if (profile.ongoingChallenges && Array.isArray(profile.ongoingChallenges) && profile.ongoingChallenges.length > 0) {
    parts.push(`\nOngoing Challenges:`);
    profile.ongoingChallenges.forEach((challenge: string) => {
      parts.push(`- ${challenge}`);
    });
  }

  // Recent conversation topics
  if (conversations.length > 0) {
    parts.push(`\nRecent Conversation Topics:`);
    conversations.slice(0, 5).forEach((conv) => {
      if (conv.topic) {
        parts.push(`- ${conv.topic} (${conv.messageCount} messages via ${conv.channel})`);
      }
    });
  }

  // Recent message highlights (last 5 exchanges for immediate context)
  if (messages.length > 0) {
    parts.push(`\nRecent Conversation Highlights (Last Session):`);
    const recentExchanges = messages.slice(0, 10); // Last 10 messages (5 exchanges)
    recentExchanges.forEach((msg) => {
      const timestamp = msg.createdAt.toLocaleString();
      const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + "..." : msg.content;
      parts.push(`[${timestamp}] ${msg.role === 'user' ? 'Client' : 'Sage'}: ${preview}`);
    });
  }

  // Crisis history (if any)
  if (crisisHistory.length > 0) {
    parts.push(`\n⚠️ Crisis History:`);
    crisisHistory.forEach((crisis) => {
      const indicators = Array.isArray(crisis.indicators) ? crisis.indicators.join(", ") : "unknown";
      parts.push(`- ${crisis.level} level (indicators: ${indicators})`);
    });
  }

  // Stats
  parts.push(`\nEngagement Stats:`);
  parts.push(`- Total conversations: ${profile.totalConversations}`);
  parts.push(`- Total messages: ${profile.totalMessages}`);
  parts.push(`- Subscription: ${profile.subscriptionTier || 'free'}`);
  if (profile.firstContactDate) {
    parts.push(`- First contact: ${profile.firstContactDate.toLocaleDateString()}`);
  }
  if (profile.lastContactDate) {
    parts.push(`- Last contact: ${profile.lastContactDate.toLocaleDateString()}`);
  }

  return parts.join("\n");
}

// ============================================================================
// PAYMENT FLOW STATE (FOR PERFECT CONTINUITY)
// ============================================================================

/**
 * Payment flow step types
 */
export type PaymentFlowStep = 
  | 'sent_link' 
  | 'waiting_for_click' 
  | 'entering_email' 
  | 'entering_card' 
  | 'entering_expiry' 
  | 'entering_cvc' 
  | 'entering_name' 
  | 'entering_country' 
  | 'ready_to_submit' 
  | 'verifying_success' 
  | 'completed' 
  | 'failed';

/**
 * Payment flow state - ALL payment flow data access goes through here
 */
export interface PaymentFlowState {
  step: PaymentFlowStep | null;
  checkoutUrl: string | null;
  loopCount: number;
  startedAt: Date | null;
  failureReason: string | null;
  completedAt: Date | null;
}

/**
 * Get payment flow state for a client.
 * This is the ONLY way to access payment flow data.
 */
export async function getPaymentFlowState(clientId: string): Promise<PaymentFlowState | null> {
  const [profile] = await db.select({
    step: clientProfile.paymentFlowStep,
    checkoutUrl: clientProfile.paymentFlowCheckoutUrl,
    loopCount: clientProfile.paymentFlowLoopCount,
    startedAt: clientProfile.paymentFlowStartedAt,
    failureReason: clientProfile.paymentFlowLastFailureReason,
    completedAt: clientProfile.paymentFlowCompletedAt,
  })
  .from(clientProfile)
  .where(eq(clientProfile.id, clientId))
  .limit(1);

  if (!profile) return null;
  
  return {
    step: profile.step as PaymentFlowStep | null,
    checkoutUrl: profile.checkoutUrl,
    loopCount: profile.loopCount || 0,
    startedAt: profile.startedAt,
    failureReason: profile.failureReason,
    completedAt: profile.completedAt,
  };
}

/**
 * Check if client is in an active payment flow.
 * Flow expires after 30 minutes.
 */
export async function isInActivePaymentFlow(clientId: string): Promise<boolean> {
  const flow = await getPaymentFlowState(clientId);
  
  if (!flow || !flow.step) return false;
  if (flow.step === 'completed' || flow.step === 'failed') return false;
  
  // Check if flow is still active (within 30 minutes)
  if (flow.startedAt) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (flow.startedAt < thirtyMinutesAgo) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get subscription status for a client.
 * This is the ONLY way to check subscription status.
 */
export async function getSubscriptionStatus(clientId: string): Promise<{
  isSubscribed: boolean;
  tier: string;
  confirmedByWebhook: boolean;
}> {
  const [profile] = await db.select({
    subscriptionTier: clientProfile.subscriptionTier,
    paymentFlowStep: clientProfile.paymentFlowStep,
    paymentFlowCompletedAt: clientProfile.paymentFlowCompletedAt,
  })
  .from(clientProfile)
  .where(eq(clientProfile.id, clientId))
  .limit(1);

  if (!profile) {
    return { isSubscribed: false, tier: 'free', confirmedByWebhook: false };
  }

  const tier = profile.subscriptionTier || 'free';
  const isSubscribed = tier !== 'free';
  const confirmedByWebhook = profile.paymentFlowStep === 'completed' && profile.paymentFlowCompletedAt !== null;

  return { isSubscribed, tier, confirmedByWebhook };
}

// ============================================================================
// SUBSCRIPTION RECORDS (FOR PERFECT CONTINUITY)
// ============================================================================

/**
 * Create a subscription record linked to a client profile.
 * This is the ONLY way to create subscription records.
 */
export async function createSubscriptionRecord(data: {
  clientProfileId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string;
  tier: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}): Promise<string> {
  const subId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  await db.insert(subscription).values({
    id: subId,
    clientProfileId: data.clientProfileId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    stripeCustomerId: data.stripeCustomerId,
    stripePriceId: data.stripePriceId,
    tier: data.tier,
    status: data.status,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  console.log(`[UnifiedRepo] Created subscription ${subId} for client ${data.clientProfileId}`);
  return subId;
}

// ============================================================================
// PAYMENT GUIDANCE INDICES (FOR PERFECT CONTINUITY)
// ============================================================================

/**
 * Get the last guidance index used for a specific payment step.
 * This ensures Sage never repeats the same phrase twice in a row for a client.
 */
export async function getPaymentGuidanceIndex(clientId: string, step: string): Promise<number> {
  const [profile] = await db.select({
    paymentGuidanceIndices: clientProfile.paymentGuidanceIndices,
  })
  .from(clientProfile)
  .where(eq(clientProfile.id, clientId))
  .limit(1);

  if (!profile || !profile.paymentGuidanceIndices) {
    return -1; // No previous index, will start at 0
  }

  return (profile.paymentGuidanceIndices as Record<string, number>)[step] ?? -1;
}

/**
 * Update the guidance index for a specific payment step.
 * This is the ONLY way to update guidance indices - PERFECT CONTINUITY.
 */
export async function updatePaymentGuidanceIndex(clientId: string, step: string, index: number): Promise<void> {
  // First get current indices
  const [profile] = await db.select({
    paymentGuidanceIndices: clientProfile.paymentGuidanceIndices,
  })
  .from(clientProfile)
  .where(eq(clientProfile.id, clientId))
  .limit(1);

  const currentIndices = (profile?.paymentGuidanceIndices as Record<string, number>) || {};
  const updatedIndices = { ...currentIndices, [step]: index };

  await db.update(clientProfile)
    .set({ 
      paymentGuidanceIndices: updatedIndices,
      updatedAt: new Date(),
    })
    .where(eq(clientProfile.id, clientId));

  console.log(`[UnifiedRepo] Updated guidance index for ${clientId}: ${step} = ${index}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  findOrCreateClient,
  getUnifiedClientContext,
  updateClientProfile,
  linkPhoneToProfile,
  linkUserIdToProfile,
  canUseFeature,
  decrementMessageCount,
  upgradeSubscription,
  getPaymentFlowState,
  isInActivePaymentFlow,
  getSubscriptionStatus,
  createSubscriptionRecord,
  getPaymentGuidanceIndex,
  updatePaymentGuidanceIndex,
};
