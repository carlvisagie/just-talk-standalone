import { pgTable, varchar, text, integer, timestamp, json, real, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================================================
// CORE USER & AUTH
// ============================================================================

export const user = pgTable("user", {
  id: varchar("id", { length: 255 }).primaryKey(),
  openId: varchar("open_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  avatar: text("avatar"),
  role: varchar("role", { length: 50 })
    .notNull()
    .default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// PROFILEGUARD - UNIFIED CLIENT PROFILE (THE SINGLE SOURCE OF TRUTH)
// ============================================================================

/**
 * CLIENT PROFILES - The heart of ProfileGuard
 * 
 * This is the UNIFIED CLIENT PROFILE - the single source of truth for everything
 * we know about a client. EVERY interaction, EVERY conversation, EVERY click,
 * EVERY pattern goes here or links to here.
 * 
 * THREE-TIER MEMORY ARCHITECTURE:
 * - Tier 1 (Core Identity): Always loaded (~500 tokens) - name, relationships, crisis info
 * - Tier 2 (Active Context): Relevance-based (~1000 tokens) - goals, patterns, recent interactions
 * - Tier 3 (Historical Archive): On-demand (~500 tokens) - full transcripts, semantic search
 * 
 * "They forgot about me" - This table makes that IMPOSSIBLE.
 */
export const clientProfile = pgTable("client_profile", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .references(() => user.id, { onDelete: "cascade" }),
  
  // ============================================================================
  // TIER 1: CORE IDENTITY (Always loaded - ~500 tokens)
  // ============================================================================
  
  // Basic Identity
  preferredName: varchar("preferred_name", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  email: varchar("email", { length: 255 }),
  pronouns: varchar("pronouns", { length: 50 }),
  age: integer("age"),
  timezone: varchar("timezone", { length: 100 }),
  language: varchar("language", { length: 50 }).default("en"),
  
  // Life Context (Tier 1 - always relevant)
  occupation: varchar("occupation", { length: 255 }),
  location: varchar("location", { length: 255 }),
  lifeStage: varchar("life_stage", { length: 100 }), // "new parent", "career transition", "retirement", etc.
  
  // Significant Life Events (JSON array for flexibility)
  significantEvents: json("significant_events").$type<Array<{
    event: string;
    date?: string;
    notes?: string;
    emotional_impact?: string;
  }>>(),
  
  // Upcoming Events (for proactive check-ins)
  upcomingEvents: json("upcoming_events").$type<Array<{
    event: string;
    date: string;
    notes?: string;
    reminder_sent?: boolean;
  }>>(),
  
  // Crisis/Safety (Tier 1 - ALWAYS loaded for safety)
  crisisRiskLevel: varchar("crisis_risk_level", { length: 50 }).default("none"),
  lastCrisisDate: timestamp("last_crisis_date"),
  crisisNotes: text("crisis_notes"),
  emergencyContact: json("emergency_contact").$type<{
    name?: string;
    phone?: string;
    relationship?: string;
  }>(),
  safetyPlanNotes: text("safety_plan_notes"),
  
  // ============================================================================
  // TIER 2: ACTIVE CONTEXT (Relevance-based - ~1000 tokens)
  // ============================================================================
  
  // Communication Preferences
  communicationStyle: text("communication_style"), // "direct", "gentle", "humorous", etc.
  preferredChannel: varchar("preferred_channel", { length: 50 }), // "text", "voice", "phone"
  bestTimeToReach: varchar("best_time_to_reach", { length: 100 }),
  
  // Emotional Profile
  emotionalPatterns: text("emotional_patterns"), // Free-form AI observations
  commonTriggers: json("common_triggers").$type<string[]>(),
  copingStrategies: json("coping_strategies").$type<string[]>(),
  strengthsAndResources: json("strengths_and_resources").$type<string[]>(),
  
  // Goals & Progress
  currentGoals: json("current_goals").$type<Array<{
    goal: string;
    progress: number;
    milestones?: string[];
    lastUpdated?: string;
  }>>(),
  pastWins: json("past_wins").$type<Array<{
    win: string;
    date?: string;
    significance?: string;
  }>>(),
  ongoingChallenges: json("ongoing_challenges").$type<string[]>(),
  
  // Recent Interaction Summary (updated after each significant interaction)
  recentTopics: json("recent_topics").$type<Array<{
    topic: string;
    date: string;
    sentiment?: string;
    resolved?: boolean;
  }>>(),
  lastInteractionSummary: text("last_interaction_summary"),
  lastInteractionDate: timestamp("last_interaction_date"),
  lastInteractionChannel: varchar("last_interaction_channel", { length: 50 }),
  
  // ============================================================================
  // ENGAGEMENT TRACKING (All Touchpoints)
  // ============================================================================
  
  // Engagement Stats
  firstContactDate: timestamp("first_contact_date").notNull().defaultNow(),
  lastContactDate: timestamp("last_contact_date").notNull().defaultNow(),
  totalConversations: integer("total_conversations").notNull().default(0),
  totalMessages: integer("total_messages").notNull().default(0),
  totalPhoneCalls: integer("total_phone_calls").notNull().default(0),
  totalSMS: integer("total_sms").notNull().default(0),
  totalVideoSessions: integer("total_video_sessions").notNull().default(0),
  
  // Platform Engagement Summary (aggregated, not raw data)
  platformEngagement: json("platform_engagement").$type<{
    lastVisit?: string;
    totalVisits?: number;
    favoriteFeatures?: string[];
    completedModules?: string[];
    communityParticipation?: string; // "active", "lurker", "none"
    contentConsumed?: { type: string; count: number }[];
  }>(),
  
  // Video Session Summary
  videoSessionsSummary: json("video_sessions_summary").$type<{
    totalSessions?: number;
    lastSessionDate?: string;
    keyThemes?: string[];
    homeworkAssigned?: string[];
    homeworkCompleted?: string[];
  }>(),
  
  // Community Engagement Summary
  communityEngagement: json("community_engagement").$type<{
    postsCount?: number;
    commentsCount?: number;
    connectionsCount?: number;
    supportGiven?: number;
    supportReceived?: number;
    lastActivity?: string;
  }>(),
  
  // ============================================================================
  // SUBSCRIPTION & BILLING
  // ============================================================================
  
  subscriptionTier: varchar("subscription_tier", { length: 50 }).default("free"),
  subscriptionStatus: varchar("subscription_status", { length: 50 }).default("active"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  
  // Trial System - Daily Reset (1 message per day for free users)
  dailyMessagesUsed: integer("daily_messages_used").notNull().default(0),
  dailyMessageResetDate: timestamp("daily_message_reset_date").notNull().defaultNow(),
  dailyMessageLimit: integer("daily_message_limit").notNull().default(1), // 1 for free, unlimited (999999) for paid
  trialMessagesRemaining: integer("trial_messages_remaining").notNull().default(100), // Legacy, kept for migration
  trialStartDate: timestamp("trial_start_date").notNull().defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  
  // ============================================================================
  // AI SYNTHESIS LAYER (~300 tokens)
  // ============================================================================
  
  // Living AI Summary (updated after each significant interaction)
  aiSummary: text("ai_summary"),
  
  // Key Insights (most important things to remember, ranked by importance)
  keyInsights: json("key_insights").$type<Array<{
    insight: string;
    importance: number; // 1-10
    category: string; // "relationship", "goal", "challenge", "preference", etc.
    source: string; // "conversation", "behavior", "explicit"
    createdAt: string;
    lastRelevant: string;
  }>>(),
  
  // Next Best Actions (what Sage should focus on)
  nextBestActions: json("next_best_actions").$type<Array<{
    action: string;
    priority: number;
    reason: string;
    dueDate?: string;
  }>>(),
  
  // Conversation Style Preferences (learned over time)
  conversationPreferences: json("conversation_preferences").$type<{
    prefersDeepDives?: boolean;
    prefersQuickCheckins?: boolean;
    likesHumor?: boolean;
    needsMoreValidation?: boolean;
    respondsToDirectAdvice?: boolean;
    prefersOpenQuestions?: boolean;
  }>(),
  
  // ============================================================================
  // CONVERSION TRACKING (Critical for conversion flow)
  // ============================================================================
  
  // Total exchanges across ALL calls (persists for conversion trigger)
  totalExchangeCount: integer("total_exchange_count").notNull().default(0),
  
  // When the payment link was sent (null = not sent yet)
  paymentLinkSentAt: timestamp("payment_link_sent_at"),
  
  // Last greeting variation used (to avoid repetition)
  lastGreetingVariation: integer("last_greeting_variation").default(0),
  
  // ============================================================================
  // PAYMENT FLOW STATE (Part of unified profile)
  // ============================================================================
  
  paymentFlowStep: varchar("payment_flow_step", { length: 50 }),
  paymentFlowCheckoutUrl: text("payment_flow_checkout_url"),
  paymentFlowStartedAt: timestamp("payment_flow_started_at"),
  paymentFlowLastPromptAt: timestamp("payment_flow_last_prompt_at"),
  paymentFlowLoopCount: integer("payment_flow_loop_count").default(0),
  paymentFlowCompletedAt: timestamp("payment_flow_completed_at"),
  paymentFlowAttempts: integer("payment_flow_attempts").default(0),
  paymentFlowLastFailureReason: text("payment_flow_last_failure_reason"),
  
  // Per-step guidance indices (for varied phrases - PERFECT CONTINUITY)
  // Stores which guidance variation was last used for each payment step
  paymentGuidanceIndices: json("payment_guidance_indices").$type<Record<string, number>>(),
  
  // ============================================================================
  // METADATA
  // ============================================================================
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// RELATIONSHIPS - Explicit storage for people in client's life
// ============================================================================

/**
 * CLIENT RELATIONSHIPS - Family, friends, colleagues, etc.
 * 
 * This is CRITICAL for continuity. Wife's name, son's interests, boss's behavior -
 * all stored explicitly so they're NEVER forgotten.
 * 
 * "She didn't remember my wife" - This table makes that IMPOSSIBLE.
 */
export const clientRelationship = pgTable("client_relationship", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  // Person Details
  name: varchar("name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }).notNull(), // "wife", "son", "boss", "friend", "therapist", etc.
  nickname: varchar("nickname", { length: 100 }), // How client refers to them
  
  // Context
  age: integer("age"),
  occupation: varchar("occupation", { length: 255 }),
  notes: text("notes"), // "Works in marketing, stressed about promotion"
  
  // Emotional Context
  emotionalContext: text("emotional_context"), // "Source of support", "Causes stress", "Mixed feelings"
  recentMentions: json("recent_mentions").$type<Array<{
    date: string;
    context: string;
    sentiment: string;
  }>>(),
  
  // Tracking
  firstMentioned: timestamp("first_mentioned").notNull().defaultNow(),
  lastMentioned: timestamp("last_mentioned").notNull().defaultNow(),
  mentionCount: integer("mention_count").notNull().default(1),
  importance: integer("importance").notNull().default(5), // 1-10 scale
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// KEY INSIGHTS - AI-extracted important facts
// ============================================================================

/**
 * KEY INSIGHTS - Important facts extracted by AI
 * 
 * After each conversation, AI extracts key insights and stores them here.
 * These are ranked by importance and used to build context for future interactions.
 */
export const keyInsight = pgTable("key_insight", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  // Insight Content
  insight: text("insight").notNull(), // "Client's wife Sarah is pregnant with their second child"
  category: varchar("category", { length: 50 }).notNull(), // "relationship", "goal", "challenge", "preference", "life_event"
  
  // Importance & Relevance
  importance: integer("importance").notNull().default(5), // 1-10
  relevanceScore: real("relevance_score").notNull().default(1.0), // Decays over time unless reinforced
  
  // Source Tracking
  source: varchar("source", { length: 50 }).notNull(), // "conversation", "explicit", "inferred"
  sourceConversationId: varchar("source_conversation_id", { length: 255 }),
  
  // Temporal
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastRelevantAt: timestamp("last_relevant_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Some insights expire (e.g., "has a meeting tomorrow")
});

// ============================================================================
// VOICE SIGNATURES - For recognizing returning users
// ============================================================================

export const voiceSignature = pgTable("voice_signature", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  voiceprint: json("voiceprint").$type<{
    pitch: number;
    tempo: number;
    accent: string;
  }>(),
  
  confidenceThreshold: real("confidence_threshold").notNull().default(0.8),
  lastRecognized: timestamp("last_recognized"),
  recognitionCount: integer("recognition_count").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// BEHAVIORAL PATTERNS - For crisis detection and personalization
// ============================================================================

export const behavioralPattern = pgTable("behavioral_pattern", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  patternType: varchar("pattern_type", { length: 50 }).notNull(),
  patternData: json("pattern_data").$type<{
    timestamps: string[];
    values: number[];
    notes: string[];
  }>(),
  
  trend: varchar("trend", { length: 50 }),
  significance: varchar("significance", { length: 50 }),
  aiAnalysis: text("ai_analysis"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// INTERACTION LOGS - Track ALL touchpoints
// ============================================================================

export const interactionLog = pgTable("interaction_log", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  // Interaction Type
  interactionType: varchar("interaction_type", { length: 50 }).notNull(),
  // Types: "page_view", "button_click", "module_complete", "video_watch", 
  //        "community_post", "community_comment", "chat_message", "phone_call", etc.
  
  // Details
  target: varchar("target", { length: 255 }),
  duration: integer("duration"),
  metadata: json("metadata").$type<Record<string, any>>(),
  
  // For AI context building
  summary: text("summary"), // AI-generated summary of this interaction
  significance: varchar("significance", { length: 50 }), // "high", "medium", "low"
  
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// ============================================================================
// CONVERSATIONS & MESSAGES
// ============================================================================

export const conversation = pgTable("conversation", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 })
    .references(() => user.id, { onDelete: "cascade" }),
  
  channel: varchar("channel", { length: 50 }).notNull().default("web"),
  
  // Conversation Analysis
  mood: varchar("mood", { length: 50 }),
  topic: varchar("topic", { length: 255 }),
  sentiment: varchar("sentiment", { length: 50 }),
  
  // AI Summary (generated at end of conversation)
  aiSummary: text("ai_summary"),
  keyPoints: json("key_points").$type<string[]>(),
  actionItems: json("action_items").$type<string[]>(),
  followUpNeeded: boolean("follow_up_needed").default(false),
  followUpReason: text("follow_up_reason"),
  
  // Crisis Detection
  crisisDetected: boolean("crisis_detected").notNull().default(false),
  crisisLevel: varchar("crisis_level", { length: 50 }).default("none"),
  
  // Metadata
  messageCount: integer("message_count").notNull().default(0),
  duration: integer("duration"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
});

export const message = pgTable("message", {
  id: varchar("id", { length: 255 }).primaryKey(),
  conversationId: varchar("conversation_id", { length: 255 })
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  
  role: varchar("role", { length: 50 }).notNull(),
  content: text("content").notNull(),
  
  mood: varchar("mood", { length: 50 }),
  sentiment: varchar("sentiment", { length: 50 }),
  crisisKeywords: json("crisis_keywords").$type<string[]>(),
  
  // Extracted Information (for profile updates)
  extractedInfo: json("extracted_info").$type<{
    relationships?: { name: string; relationship: string; context: string }[];
    goals?: string[];
    challenges?: string[];
    events?: { event: string; date?: string }[];
    insights?: string[];
  }>(),
  
  audioUrl: text("audio_url"),
  transcriptionConfidence: real("transcription_confidence"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// CRISIS MANAGEMENT
// ============================================================================

export const crisisLog = pgTable("crisis_log", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  conversationId: varchar("conversation_id", { length: 255 })
    .references(() => conversation.id, { onDelete: "set null" }),
  
  crisisLevel: varchar("crisis_level", { length: 50 }).notNull(),
  indicators: json("indicators").$type<string[]>(),
  transcript: text("transcript"),
  
  escalated: boolean("escalated").notNull().default(false),
  escalatedTo: varchar("escalated_to", { length: 255 }),
  escalationTime: timestamp("escalation_time"),
  
  resolved: boolean("resolved").notNull().default(false),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export const subscription = pgTable("subscription", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull(),
  
  tier: varchar("tier", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// LEGACY TABLES (Kept for backward compatibility during migration)
// ============================================================================

export const paymentFlow = pgTable("payment_flow", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 })
    .notNull()
    .references(() => clientProfile.id, { onDelete: "cascade" }),
  
  step: varchar("step", { length: 50 }).notNull().default("sent_link"),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull(),
  checkoutUrl: text("checkout_url"),
  attempts: integer("attempts").notNull().default(0),
  loopCount: integer("loop_count").notNull().default(0),
  failureReason: text("failure_reason"),
  
  startedAt: timestamp("started_at").notNull().defaultNow(),
  linkSentAt: timestamp("link_sent_at"),
  lastPromptTime: timestamp("last_prompt_time").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const systemSetting = pgTable("system_setting", {
  key: varchar("key", { length: 255 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof user.$inferSelect;
export type ClientProfile = typeof clientProfile.$inferSelect;
export type ClientRelationship = typeof clientRelationship.$inferSelect;
export type KeyInsight = typeof keyInsight.$inferSelect;
export type VoiceSignature = typeof voiceSignature.$inferSelect;
export type BehavioralPattern = typeof behavioralPattern.$inferSelect;
export type InteractionLog = typeof interactionLog.$inferSelect;
export type Conversation = typeof conversation.$inferSelect;
export type Message = typeof message.$inferSelect;
export type CrisisLog = typeof crisisLog.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
export type PaymentFlow = typeof paymentFlow.$inferSelect;
export type SystemSetting = typeof systemSetting.$inferSelect;
