/**
 * ⚠️ CRITICAL FILE - DO NOT MODIFY WITHOUT READING CRITICAL_SYSTEM.md ⚠️
 * 
 * POST-INTERACTION UPDATER
 * 
 * Automatically extracts and saves new information after each significant interaction.
 * This is what makes Sage's memory grow over time - if this breaks, Sage stops learning.
 * 
 * After each conversation, this module:
 * 1. Extracts new relationships mentioned (wife, son, boss, etc.)
 * 2. Extracts life events and updates
 * 3. Identifies emotional patterns
 * 4. Updates goals and progress
 * 5. Generates AI synthesis (summary, key insights, next actions)
 */

import { db } from "./_core/db";
import { 
  clientProfile, 
  clientRelationship, 
  keyInsight, 
  conversation,
  message
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { updateClientProfile } from "./unifiedClientRepository";

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedRelationship {
  name: string;
  relationship: string;
  notes?: string;
  emotionalContext?: string;
}

interface ExtractedLifeEvent {
  event: string;
  date?: string;
  emotionalImpact?: string;
  isUpcoming?: boolean;
}

interface ExtractedInsight {
  insight: string;
  category: "emotional" | "behavioral" | "relational" | "goal" | "challenge" | "strength";
  importance: number;
}

interface ExtractionResult {
  relationships: ExtractedRelationship[];
  lifeEvents: ExtractedLifeEvent[];
  upcomingEvents: ExtractedLifeEvent[];
  insights: ExtractedInsight[];
  emotionalState?: string;
  goalProgress?: { goal: string; progress: number; notes?: string }[];
  newChallenges?: string[];
  conversationSummary: string;
  keyPoints: string[];
  nextBestActions: { action: string; reason: string }[];
  followUpNeeded: boolean;
  followUpReason?: string;
}

// ============================================================================
// MAIN UPDATER FUNCTION
// ============================================================================

/**
 * Update client profile after a significant interaction
 * Call this after each voice call or meaningful chat session
 */
export async function updateProfileAfterInteraction(
  clientProfileId: string,
  conversationId: string,
  conversationTranscript: string,
  channel: "voice" | "chat" | "sms" | "video" = "voice"
): Promise<void> {
  console.log(`[PostInteractionUpdater] Processing conversation ${conversationId} for client ${clientProfileId}`);
  
  try {
    // 1. Get current profile for context
    const profile = await getClientProfile(clientProfileId);
    if (!profile) {
      console.error(`[PostInteractionUpdater] Client profile not found: ${clientProfileId}`);
      return;
    }
    
    // 2. Get existing relationships for deduplication
    const existingRelationships = await getExistingRelationships(clientProfileId);
    
    // 3. Extract new information using AI
    const extraction = await extractInformationFromConversation(
      conversationTranscript,
      profile,
      existingRelationships
    );
    
    // 4. Update relationships
    await updateRelationships(clientProfileId, extraction.relationships, existingRelationships);
    
    // 5. Update life events
    await updateLifeEvents(clientProfileId, extraction.lifeEvents, extraction.upcomingEvents);
    
    // 6. Add new insights
    await addInsights(clientProfileId, conversationId, extraction.insights);
    
    // 7. Update AI synthesis
    await updateAISynthesis(clientProfileId, extraction, channel);
    
    // 8. Update conversation record
    await updateConversationRecord(conversationId, extraction);
    
    console.log(`[PostInteractionUpdater] Successfully updated profile for client ${clientProfileId}`);
    console.log(`  - New relationships: ${extraction.relationships.length}`);
    console.log(`  - Life events: ${extraction.lifeEvents.length}`);
    console.log(`  - Insights: ${extraction.insights.length}`);
    console.log(`  - Follow-up needed: ${extraction.followUpNeeded}`);
    
  } catch (error) {
    console.error(`[PostInteractionUpdater] Error updating profile:`, error);
    // Don't throw - we don't want to break the main flow
  }
}

// ============================================================================
// AI EXTRACTION
// ============================================================================

async function extractInformationFromConversation(
  transcript: string,
  profile: any,
  existingRelationships: any[]
): Promise<ExtractionResult> {
  const existingNames = existingRelationships.map(r => r.name.toLowerCase());
  
  const prompt = `You are an expert at extracting meaningful information from coaching conversations.

EXISTING CLIENT INFORMATION:
- Name: ${profile.preferredName || "Unknown"}
- Known relationships: ${existingRelationships.map(r => `${r.name} (${r.relationship})`).join(", ") || "None"}
- Current goals: ${JSON.stringify(profile.currentGoals) || "None"}
- Ongoing challenges: ${JSON.stringify(profile.ongoingChallenges) || "None"}

CONVERSATION TRANSCRIPT:
${transcript}

Extract the following information from this conversation. Be thorough but accurate - only extract what is explicitly mentioned or strongly implied.

Return a JSON object with:

1. "relationships": Array of NEW people mentioned (not already in known relationships)
   - name: string (the person's name or identifier like "mom", "boss")
   - relationship: string (wife, son, mother, friend, coworker, boss, etc.)
   - notes: string (any details mentioned about them)
   - emotionalContext: string (how the client feels about this person)

2. "lifeEvents": Array of significant past events mentioned
   - event: string (what happened)
   - date: string (when, if mentioned)
   - emotionalImpact: string (how it affected the client)

3. "upcomingEvents": Array of future events mentioned
   - event: string (what's coming up)
   - date: string (when, if mentioned)

4. "insights": Array of key insights about the client
   - insight: string (the insight)
   - category: "emotional" | "behavioral" | "relational" | "goal" | "challenge" | "strength"
   - importance: number (1-10, how important is this insight)

5. "emotionalState": string (how the client seemed during this conversation)

6. "goalProgress": Array of updates on existing goals
   - goal: string (which goal)
   - progress: number (0-100 estimated progress)
   - notes: string (any updates)

7. "newChallenges": Array of new challenges mentioned (strings)

8. "conversationSummary": string (2-3 sentence summary of the conversation)

9. "keyPoints": Array of strings (3-5 key points from the conversation)

10. "nextBestActions": Array of suggested follow-up actions
    - action: string (what Sage should do/ask next time)
    - reason: string (why this is important)

11. "followUpNeeded": boolean (does this client need a follow-up soon?)

12. "followUpReason": string (if followUpNeeded is true, why?)

Return ONLY valid JSON, no explanation.`;

  try {
    const response = await invokeLLM({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You extract structured information from conversations. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      responseFormat: { type: "json_object" }
    });
    
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent);
    if (!content) {
      throw new Error("No response from AI");
    }
    
    const result = JSON.parse(content) as ExtractionResult;
    
    // Filter out relationships that already exist
    result.relationships = result.relationships.filter(
      r => !existingNames.includes(r.name.toLowerCase())
    );
    
    return result;
    
  } catch (error) {
    console.error("[PostInteractionUpdater] AI extraction failed:", error);
    // Return empty result
    return {
      relationships: [],
      lifeEvents: [],
      upcomingEvents: [],
      insights: [],
      conversationSummary: "Unable to generate summary",
      keyPoints: [],
      nextBestActions: [],
      followUpNeeded: false
    };
  }
}

// ============================================================================
// DATABASE UPDATES
// ============================================================================

async function getClientProfile(clientProfileId: string) {
  const results = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientProfileId))
    .limit(1);
  return results[0] || null;
}

async function getExistingRelationships(clientProfileId: string) {
  return await db
    .select()
    .from(clientRelationship)
    .where(eq(clientRelationship.clientProfileId, clientProfileId));
}

async function updateRelationships(
  clientProfileId: string,
  newRelationships: ExtractedRelationship[],
  existingRelationships: any[]
): Promise<void> {
  for (const rel of newRelationships) {
    // Check if this person already exists (case-insensitive)
    const existing = existingRelationships.find(
      e => e.name.toLowerCase() === rel.name.toLowerCase()
    );
    
    if (existing) {
      // Update existing relationship
      await db
        .update(clientRelationship)
        .set({
          notes: rel.notes || existing.notes,
          emotionalContext: rel.emotionalContext || existing.emotionalContext,
          lastMentioned: new Date(),
          mentionCount: existing.mentionCount + 1,
          updatedAt: new Date()
        })
        .where(eq(clientRelationship.id, existing.id));
    } else {
      // Create new relationship
      const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(clientRelationship).values({
        id,
        clientProfileId,
        name: rel.name,
        relationship: rel.relationship,
        notes: rel.notes,
        emotionalContext: rel.emotionalContext,
        importance: getRelationshipImportance(rel.relationship),
        firstMentioned: new Date(),
        lastMentioned: new Date(),
        mentionCount: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }
}

function getRelationshipImportance(relationship: string): number {
  const importanceMap: Record<string, number> = {
    "wife": 10,
    "husband": 10,
    "partner": 10,
    "spouse": 10,
    "son": 9,
    "daughter": 9,
    "child": 9,
    "mother": 8,
    "father": 8,
    "mom": 8,
    "dad": 8,
    "parent": 8,
    "sibling": 7,
    "brother": 7,
    "sister": 7,
    "best friend": 7,
    "close friend": 6,
    "friend": 5,
    "boss": 6,
    "coworker": 4,
    "colleague": 4,
    "therapist": 7,
    "doctor": 6,
    "ex": 5
  };
  
  return importanceMap[relationship.toLowerCase()] || 5;
}

async function updateLifeEvents(
  clientProfileId: string,
  lifeEvents: ExtractedLifeEvent[],
  upcomingEvents: ExtractedLifeEvent[]
): Promise<void> {
  if (lifeEvents.length === 0 && upcomingEvents.length === 0) return;
  
  const profile = await getClientProfile(clientProfileId);
  if (!profile) return;
  
  // Update significant events
  if (lifeEvents.length > 0) {
    const existingEvents = profile.significantEvents || [];
    const newEvents = lifeEvents.map(e => ({
      event: e.event,
      date: e.date,
      emotional_impact: e.emotionalImpact,
      added_at: new Date().toISOString()
    }));
    
    // Merge and deduplicate
    const allEvents = [...existingEvents, ...newEvents];
    const uniqueEvents = allEvents.filter((event, index, self) =>
      index === self.findIndex(e => e.event.toLowerCase() === event.event.toLowerCase())
    );
    
    // ========================================
    // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
    // ========================================
    await updateClientProfile(clientProfileId, { significantEvents: uniqueEvents });
  }
  
  // Update upcoming events
  if (upcomingEvents.length > 0) {
    const existingUpcoming = profile.upcomingEvents || [];
    const newUpcoming = upcomingEvents.map(e => ({
      event: e.event,
      date: e.date,
      added_at: new Date().toISOString()
    }));
    
    // Merge and deduplicate
    const allUpcoming = [...existingUpcoming, ...newUpcoming];
    const uniqueUpcoming = allUpcoming.filter((event, index, self) =>
      index === self.findIndex(e => e.event.toLowerCase() === event.event.toLowerCase())
    );
    
    // ========================================
    // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
    // ========================================
    await updateClientProfile(clientProfileId, { upcomingEvents: uniqueUpcoming });
  }
}

async function addInsights(
  clientProfileId: string,
  conversationId: string,
  insights: ExtractedInsight[]
): Promise<void> {
  for (const insight of insights) {
    if (insight.importance < 5) continue; // Only save important insights
    
    const id = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(keyInsight).values({
      id,
      clientProfileId,
      insight: insight.insight,
      category: insight.category,
      importance: insight.importance,
      relevanceScore: 1.0,
      source: "voice",
      sourceConversationId: conversationId,
      createdAt: new Date(),
      lastRelevantAt: new Date()
    });
  }
}

async function updateAISynthesis(
  clientProfileId: string,
  extraction: ExtractionResult,
  channel: string
): Promise<void> {
  const profile = await getClientProfile(clientProfileId);
  if (!profile) return;
  
  // Update recent topics
  const recentTopics = profile.recentTopics || [];
  const newTopics = extraction.keyPoints.map(point => ({
    topic: point,
    date: new Date().toISOString(),
    channel
  }));
  const updatedTopics = [...newTopics, ...recentTopics].slice(0, 10); // Keep last 10
  
  // Update challenges
  const existingChallenges = profile.ongoingChallenges || [];
  const updatedChallenges = [...new Set([...existingChallenges, ...(extraction.newChallenges || [])])];
  
  // Build key insights JSON
  const keyInsightsJson = extraction.insights
    .filter(i => i.importance >= 7)
    .map(i => ({
      insight: i.insight,
      category: i.category,
      importance: i.importance
    }));
  
  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  await updateClientProfile(clientProfileId, {
    recentTopics: updatedTopics,
    ongoingChallenges: updatedChallenges,
    lastInteractionSummary: extraction.conversationSummary,
    lastInteractionDate: new Date(),
    lastInteractionChannel: channel,
    keyInsights: keyInsightsJson,
    nextBestActions: extraction.nextBestActions,
  });
}

async function updateConversationRecord(
  conversationId: string,
  extraction: ExtractionResult
): Promise<void> {
  await db
    .update(conversation)
    .set({
      aiSummary: extraction.conversationSummary,
      keyPoints: extraction.keyPoints,
      followUpNeeded: extraction.followUpNeeded,
      followUpReason: extraction.followUpReason,
      updatedAt: new Date()
    })
    .where(eq(conversation.id, conversationId));
}

// ============================================================================
// QUICK UPDATE (For real-time updates during conversation)
// ============================================================================

/**
 * Quick update for real-time relationship extraction
 * Call this when a new person is mentioned during a conversation
 */
export async function quickAddRelationship(
  clientProfileId: string,
  name: string,
  relationship: string,
  notes?: string
): Promise<void> {
  const existing = await db
    .select()
    .from(clientRelationship)
    .where(
      and(
        eq(clientRelationship.clientProfileId, clientProfileId),
        eq(clientRelationship.name, name)
      )
    )
    .limit(1);
  
  if (existing.length > 0) {
    // Update existing
    await db
      .update(clientRelationship)
      .set({
        notes: notes || existing[0].notes,
        lastMentioned: new Date(),
        mentionCount: existing[0].mentionCount + 1,
        updatedAt: new Date()
      })
      .where(eq(clientRelationship.id, existing[0].id));
  } else {
    // Create new
    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.insert(clientRelationship).values({
      id,
      clientProfileId,
      name,
      relationship,
      notes,
      importance: getRelationshipImportance(relationship),
      firstMentioned: new Date(),
      lastMentioned: new Date(),
      mentionCount: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  updateProfileAfterInteraction,
  quickAddRelationship
};
