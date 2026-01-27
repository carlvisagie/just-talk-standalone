/**
 * ⚠️ CRITICAL FILE - DO NOT MODIFY WITHOUT READING CRITICAL_SYSTEM.md ⚠️
 * 
 * SMART CONTEXT BUILDER
 * 
 * The brain that assembles the right information for each interaction.
 * This is the CORE of Sage's memory system - if this breaks, Sage forgets everything.
 * 
 * Implements the Three-Tier Memory Architecture:
 * 
 * Tier 1 (Core Identity): Always loaded (~500 tokens)
 * - Name, relationships, crisis info, life context
 * 
 * Tier 2 (Active Context): Relevance-based (~1000 tokens)
 * - Goals, emotional patterns, recent interactions
 * 
 * Tier 3 (Historical Archive): On-demand (~500 tokens)
 * - Retrieved based on current conversation topic
 * 
 * AI Synthesis Layer (~300 tokens)
 * - Living summary, key insights, next best actions
 */

import { db } from "./_core/db";
import { 
  clientProfile, 
  clientRelationship, 
  keyInsight, 
  conversation, 
  message 
} from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// ============================================================================
// TYPES
// ============================================================================

export interface SmartContext {
  // Token budget tracking
  totalTokens: number;
  
  // Tier 1: Core Identity (always included)
  coreIdentity: string;
  
  // Tier 2: Active Context (relevance-based)
  activeContext: string;
  
  // Tier 3: Historical (on-demand)
  historicalContext: string;
  
  // AI Synthesis
  aiSynthesis: string;
  
  // Full context string for LLM
  fullContext: string;
}

export interface ContextOptions {
  // Current conversation topic (for relevance scoring)
  currentTopic?: string;
  
  // Include specific sections
  includeRelationships?: boolean;
  includeGoals?: boolean;
  includeEmotionalProfile?: boolean;
  includeRecentConversations?: boolean;
  includeKeyInsights?: boolean;
  
  // Token budget (default: 2300)
  maxTokens?: number;
}

// ============================================================================
// MAIN CONTEXT BUILDER
// ============================================================================

/**
 * Build smart context for a client
 * This is the main function that assembles all relevant information
 */
export async function buildSmartContext(
  clientProfileId: string,
  options: ContextOptions = {}
): Promise<SmartContext> {
  const {
    currentTopic,
    includeRelationships = true,
    includeGoals = true,
    includeEmotionalProfile = true,
    includeRecentConversations = true,
    includeKeyInsights = true,
    maxTokens = 2300
  } = options;
  
  // Fetch all data in parallel for efficiency
  const [
    profile,
    relationships,
    insights,
    recentConversations
  ] = await Promise.all([
    getClientProfile(clientProfileId),
    includeRelationships ? getRelationships(clientProfileId) : Promise.resolve([]),
    includeKeyInsights ? getKeyInsights(clientProfileId) : Promise.resolve([]),
    includeRecentConversations ? getRecentConversations(clientProfileId, 5) : Promise.resolve([])
  ]);
  
  if (!profile) {
    return {
      totalTokens: 0,
      coreIdentity: "",
      activeContext: "",
      historicalContext: "",
      aiSynthesis: "",
      fullContext: "No client profile found."
    };
  }
  
  // Build each tier
  const coreIdentity = buildTier1CoreIdentity(profile, relationships);
  const activeContext = buildTier2ActiveContext(profile, includeGoals, includeEmotionalProfile);
  const historicalContext = buildTier3Historical(recentConversations, currentTopic);
  const aiSynthesis = buildAISynthesis(profile, insights);
  
  // Combine all tiers
  const fullContext = [
    "=== CLIENT MEMORY (CRITICAL - USE THIS!) ===",
    "",
    coreIdentity,
    "",
    activeContext,
    "",
    historicalContext,
    "",
    aiSynthesis,
    "",
    "=== END CLIENT MEMORY ===",
    "",
    "IMPORTANT: You MUST use the information above when relevant.",
    "If the client asks about their family, goals, or past conversations, reference this information directly.",
    "NEVER pretend to remember something that isn't in the client memory above."
  ].filter(Boolean).join("\n");
  
  // Estimate tokens (rough: 4 chars = 1 token)
  const totalTokens = Math.ceil(fullContext.length / 4);
  
  return {
    totalTokens,
    coreIdentity,
    activeContext,
    historicalContext,
    aiSynthesis,
    fullContext
  };
}

// ============================================================================
// TIER 1: CORE IDENTITY (Always loaded - ~500 tokens)
// ============================================================================

function buildTier1CoreIdentity(
  profile: any,
  relationships: any[]
): string {
  const sections: string[] = [];
  
  // Basic Identity
  const identity: string[] = [];
  if (profile.preferredName) identity.push(`Name: ${profile.preferredName}`);
  if (profile.pronouns) identity.push(`Pronouns: ${profile.pronouns}`);
  if (profile.age) identity.push(`Age: ${profile.age}`);
  if (profile.occupation) identity.push(`Occupation: ${profile.occupation}`);
  if (profile.location) identity.push(`Location: ${profile.location}`);
  if (profile.lifeStage) identity.push(`Life Stage: ${profile.lifeStage}`);
  
  if (identity.length > 0) {
    sections.push("--- IDENTITY ---");
    sections.push(identity.join(" | "));
  }
  
  // Relationships (CRITICAL - wife, son, etc.)
  if (relationships.length > 0) {
    sections.push("");
    sections.push("--- IMPORTANT PEOPLE IN THEIR LIFE ---");
    
    // Sort by importance
    const sortedRelationships = relationships.sort((a, b) => b.importance - a.importance);
    
    for (const rel of sortedRelationships.slice(0, 10)) { // Top 10 relationships
      let relStr = `• ${rel.name} (${rel.relationship})`;
      if (rel.notes) relStr += `: ${rel.notes}`;
      if (rel.emotionalContext) relStr += ` [${rel.emotionalContext}]`;
      sections.push(relStr);
    }
  }
  
  // Significant Life Events
  if (profile.significantEvents && profile.significantEvents.length > 0) {
    sections.push("");
    sections.push("--- SIGNIFICANT LIFE EVENTS ---");
    for (const event of profile.significantEvents.slice(0, 5)) {
      let eventStr = `• ${event.event}`;
      if (event.date) eventStr += ` (${event.date})`;
      if (event.emotional_impact) eventStr += ` - ${event.emotional_impact}`;
      sections.push(eventStr);
    }
  }
  
  // Upcoming Events (for proactive check-ins)
  if (profile.upcomingEvents && profile.upcomingEvents.length > 0) {
    sections.push("");
    sections.push("--- UPCOMING EVENTS ---");
    for (const event of profile.upcomingEvents.slice(0, 3)) {
      sections.push(`• ${event.event} (${event.date})`);
    }
  }
  
  // Crisis/Safety Info (ALWAYS include if present)
  if (profile.crisisRiskLevel && profile.crisisRiskLevel !== "none") {
    sections.push("");
    sections.push("--- ⚠️ SAFETY INFORMATION ---");
    sections.push(`Crisis Risk Level: ${profile.crisisRiskLevel}`);
    if (profile.crisisNotes) sections.push(`Notes: ${profile.crisisNotes}`);
    if (profile.safetyPlanNotes) sections.push(`Safety Plan: ${profile.safetyPlanNotes}`);
  }
  
  return sections.join("\n");
}

// ============================================================================
// TIER 2: ACTIVE CONTEXT (Relevance-based - ~1000 tokens)
// ============================================================================

function buildTier2ActiveContext(
  profile: any,
  includeGoals: boolean,
  includeEmotionalProfile: boolean
): string {
  const sections: string[] = [];
  
  // Emotional Profile
  if (includeEmotionalProfile) {
    const emotional: string[] = [];
    
    if (profile.emotionalPatterns) {
      emotional.push(`Patterns: ${profile.emotionalPatterns}`);
    }
    
    if (profile.commonTriggers && profile.commonTriggers.length > 0) {
      emotional.push(`Common Triggers: ${profile.commonTriggers.join(", ")}`);
    }
    
    if (profile.copingStrategies && profile.copingStrategies.length > 0) {
      emotional.push(`Coping Strategies: ${profile.copingStrategies.join(", ")}`);
    }
    
    if (profile.strengthsAndResources && profile.strengthsAndResources.length > 0) {
      emotional.push(`Strengths: ${profile.strengthsAndResources.join(", ")}`);
    }
    
    if (emotional.length > 0) {
      sections.push("--- EMOTIONAL PROFILE ---");
      sections.push(emotional.join("\n"));
    }
  }
  
  // Goals & Progress
  if (includeGoals && profile.currentGoals && profile.currentGoals.length > 0) {
    sections.push("");
    sections.push("--- CURRENT GOALS ---");
    for (const goal of profile.currentGoals) {
      let goalStr = `• ${goal.goal}`;
      if (goal.progress !== undefined) goalStr += ` (${goal.progress}% progress)`;
      sections.push(goalStr);
    }
  }
  
  // Ongoing Challenges
  if (profile.ongoingChallenges && profile.ongoingChallenges.length > 0) {
    sections.push("");
    sections.push("--- ONGOING CHALLENGES ---");
    for (const challenge of profile.ongoingChallenges) {
      sections.push(`• ${challenge}`);
    }
  }
  
  // Past Wins (for encouragement)
  if (profile.pastWins && profile.pastWins.length > 0) {
    sections.push("");
    sections.push("--- PAST WINS (Use for encouragement) ---");
    for (const win of profile.pastWins.slice(0, 3)) {
      if (typeof win === "string") {
        sections.push(`• ${win}`);
      } else {
        sections.push(`• ${win.win}${win.date ? ` (${win.date})` : ""}`);
      }
    }
  }
  
  // Recent Topics
  if (profile.recentTopics && profile.recentTopics.length > 0) {
    sections.push("");
    sections.push("--- RECENT CONVERSATION TOPICS ---");
    for (const topic of profile.recentTopics.slice(0, 5)) {
      let topicStr = `• ${topic.topic}`;
      if (topic.date) topicStr += ` (${topic.date})`;
      if (topic.resolved === false) topicStr += " [UNRESOLVED]";
      sections.push(topicStr);
    }
  }
  
  // Communication Preferences
  if (profile.communicationStyle || profile.conversationPreferences) {
    sections.push("");
    sections.push("--- COMMUNICATION PREFERENCES ---");
    if (profile.communicationStyle) {
      sections.push(`Style: ${profile.communicationStyle}`);
    }
    if (profile.conversationPreferences) {
      const prefs = profile.conversationPreferences;
      const prefList: string[] = [];
      if (prefs.prefersDeepDives) prefList.push("prefers deep conversations");
      if (prefs.prefersQuickCheckins) prefList.push("likes quick check-ins");
      if (prefs.likesHumor) prefList.push("responds well to humor");
      if (prefs.needsMoreValidation) prefList.push("needs extra validation");
      if (prefs.respondsToDirectAdvice) prefList.push("appreciates direct advice");
      if (prefs.prefersOpenQuestions) prefList.push("prefers open-ended questions");
      if (prefList.length > 0) {
        sections.push(`Preferences: ${prefList.join(", ")}`);
      }
    }
  }
  
  return sections.join("\n");
}

// ============================================================================
// TIER 3: HISTORICAL (On-demand - ~500 tokens)
// ============================================================================

function buildTier3Historical(
  recentConversations: any[],
  currentTopic?: string
): string {
  if (recentConversations.length === 0) {
    return "";
  }
  
  const sections: string[] = [];
  sections.push("--- RECENT CONVERSATION HISTORY ---");
  
  for (const conv of recentConversations) {
    const date = new Date(conv.createdAt).toLocaleDateString();
    let convStr = `• ${date}`;
    if (conv.topic) convStr += ` - Topic: ${conv.topic}`;
    if (conv.aiSummary) convStr += `\n  Summary: ${conv.aiSummary}`;
    if (conv.keyPoints && conv.keyPoints.length > 0) {
      convStr += `\n  Key Points: ${conv.keyPoints.join("; ")}`;
    }
    sections.push(convStr);
  }
  
  return sections.join("\n");
}

// ============================================================================
// AI SYNTHESIS LAYER (~300 tokens)
// ============================================================================

function buildAISynthesis(
  profile: any,
  insights: any[]
): string {
  const sections: string[] = [];
  
  // AI Summary
  if (profile.aiSummary) {
    sections.push("--- AI SUMMARY ---");
    sections.push(profile.aiSummary);
  }
  
  // Key Insights (top 5 by importance)
  if (insights.length > 0) {
    sections.push("");
    sections.push("--- KEY INSIGHTS ---");
    const topInsights = insights
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
    for (const insight of topInsights) {
      sections.push(`• [${insight.category}] ${insight.insight}`);
    }
  }
  
  // Next Best Actions
  if (profile.nextBestActions && profile.nextBestActions.length > 0) {
    sections.push("");
    sections.push("--- SUGGESTED FOCUS FOR THIS CONVERSATION ---");
    for (const action of profile.nextBestActions.slice(0, 3)) {
      sections.push(`• ${action.action} (${action.reason})`);
    }
  }
  
  return sections.join("\n");
}

// ============================================================================
// DATABASE QUERIES
// ============================================================================

async function getClientProfile(clientProfileId: string) {
  const results = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientProfileId))
    .limit(1);
  return results[0] || null;
}

async function getRelationships(clientProfileId: string) {
  return await db
    .select()
    .from(clientRelationship)
    .where(eq(clientRelationship.clientProfileId, clientProfileId))
    .orderBy(desc(clientRelationship.importance));
}

async function getKeyInsights(clientProfileId: string) {
  return await db
    .select()
    .from(keyInsight)
    .where(eq(keyInsight.clientProfileId, clientProfileId))
    .orderBy(desc(keyInsight.importance));
}

async function getRecentConversations(clientProfileId: string, limit: number = 5) {
  return await db
    .select()
    .from(conversation)
    .where(eq(conversation.clientProfileId, clientProfileId))
    .orderBy(desc(conversation.createdAt))
    .limit(limit);
}

// ============================================================================
// QUICK CONTEXT (For fast lookups)
// ============================================================================

/**
 * Get a quick context string for simple interactions
 * Much lighter than full context - just the essentials
 */
export async function getQuickContext(clientProfileId: string): Promise<string> {
  const [profile, relationships] = await Promise.all([
    getClientProfile(clientProfileId),
    getRelationships(clientProfileId)
  ]);
  
  if (!profile) {
    return "No client profile found.";
  }
  
  const parts: string[] = [];
  
  // Name
  if (profile.preferredName) {
    parts.push(`Client: ${profile.preferredName}`);
  }
  
  // Top 3 relationships
  if (relationships.length > 0) {
    const topRels = relationships.slice(0, 3).map(r => `${r.name} (${r.relationship})`);
    parts.push(`Key People: ${topRels.join(", ")}`);
  }
  
  // Current goal
  if (profile.currentGoals && profile.currentGoals.length > 0) {
    parts.push(`Current Focus: ${profile.currentGoals[0].goal}`);
  }
  
  // AI Summary (truncated)
  if (profile.aiSummary) {
    const truncated = profile.aiSummary.substring(0, 200);
    parts.push(`Summary: ${truncated}...`);
  }
  
  return parts.join("\n");
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  buildSmartContext,
  getQuickContext
};
