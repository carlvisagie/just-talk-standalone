/**
 * DYNAMIC GREETING GENERATOR
 * 
 * Generates varied, context-aware greetings for Sage.
 * No two greetings should ever be exactly the same.
 * 
 * Uses:
 * - Client name (if known)
 * - Time of day
 * - Days since last call
 * - Last conversation topic
 * - Relationship mentions
 * - Total exchange count (for conversion stage awareness)
 */

import { db } from "./_core/db";
import { clientProfile, clientRelationship, conversation } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { updateClientProfile, getUnifiedClientContext } from "./unifiedClientRepository";

// ============================================================================
// GREETING VARIATIONS
// ============================================================================

// First-time caller greetings (no name yet)
const FIRST_TIME_GREETINGS = [
  "Hey there! I'm Sage. I'm really glad you called... something told you to reach out, right? I wanna hear about it.",
  "Hi! I'm Sage. You know, it takes courage to make this call. I'm here, and I'm listening.",
  "Hey! I'm Sage. I've been waiting for someone like you to call. What's going on?",
  "Hi there, I'm Sage. Something brought you here today, and I'm glad it did. Talk to me.",
  "Hey, I'm Sage! I'm so glad you called. Whatever's on your mind, I want to hear it.",
  "Hi! I'm Sage. You made the right call reaching out. What's happening in your world?",
  "Hey there! Sage here. I can tell you've got something on your mind. Let's talk about it.",
  "Hi, I'm Sage! I'm here to listen, no judgment, no rush. What's going on with you?",
];

// Returning caller greetings (no name known)
const RETURNING_NO_NAME_GREETINGS = [
  "Hey you! I'm so happy you called back. What's going on?",
  "Oh hey! I was hoping you'd call again. How are you doing?",
  "Hey! Good to hear from you again. What's on your mind today?",
  "Oh, hey! I'm glad you called back. How have things been?",
  "Hey there! I've been thinking about you. What's happening?",
  "Hey! Back again, I love it. What's going on in your world?",
  "Oh hey you! I was wondering how you were doing. Tell me everything.",
  "Hey! So glad you called back. How are you feeling today?",
];

// Known name greetings - casual/warm
const KNOWN_NAME_GREETINGS = [
  "Hey {name}! Oh my gosh, I'm so glad you called. How are you doing?",
  "Hey {name}! I was hoping to hear from you. What's going on?",
  "{name}! Hey! So good to hear your voice. How are things?",
  "Oh hey {name}! I'm so happy you called. What's on your mind?",
  "Hey {name}! I've been thinking about you. How are you doing?",
  "{name}! There you are! I'm glad you called. What's happening?",
  "Hey {name}! It's so good to hear from you. How's everything going?",
  "Oh {name}! Hey! I'm really glad you called. Talk to me, what's up?",
];

// Time-based greetings (morning)
const MORNING_GREETINGS = [
  "Good morning, {name}! Early riser, huh? I love it. What's on your mind?",
  "Hey {name}! Morning! Starting the day with a call to me? I'm honored. What's up?",
  "Good morning! Hey {name}! How are you feeling this morning?",
  "Morning, {name}! I hope you slept okay. What's going on?",
];

// Time-based greetings (late night)
const LATE_NIGHT_GREETINGS = [
  "Hey {name}... calling late, huh? I'm here. What's keeping you up?",
  "{name}! Hey, can't sleep? I'm always here. What's on your mind?",
  "Hey {name}... late night thoughts? I get it. Talk to me.",
  "Oh {name}, hey. Night owl tonight? I'm listening, what's going on?",
];

// Long time no see greetings (7+ days)
const LONG_TIME_GREETINGS = [
  "Hey {name}! It's been a little while! I've been thinking about you. How are things?",
  "{name}! Oh my gosh, hey! I missed hearing from you. How have you been?",
  "Hey {name}! It's so good to hear from you again. What's been happening?",
  "{name}! There you are! I was wondering how you were doing. Fill me in!",
];

// Quick return greetings (same day or next day)
const QUICK_RETURN_GREETINGS = [
  "Hey {name}! Back so soon? I love it. What's going on?",
  "{name}! Hey! Couldn't stay away, huh? I'm glad. What's up?",
  "Oh hey {name}! Good to hear from you again. What's on your mind now?",
  "{name}! Back again! I'm here for it. What's happening?",
];

// Context-aware greetings (referencing last topic)
const CONTEXT_GREETINGS = [
  "Hey {name}! I've been thinking about what you shared last time. How's that going?",
  "{name}! Hey! How did that thing we talked about turn out?",
  "Hey {name}! I was wondering how you were doing after our last chat. What's new?",
];

// Relationship-aware greetings
const RELATIONSHIP_GREETINGS = [
  "Hey {name}! How's {relationship_name} doing? And how are YOU doing?",
  "{name}! Hey! I was thinking about you and {relationship_name}. How's everything?",
  "Hey {name}! Hope things are good with you and {relationship_name}. What's on your mind?",
];

// ============================================================================
// MAIN GENERATOR FUNCTION
// ============================================================================

export interface GreetingContext {
  clientProfileId?: string;
  preferredName?: string;
  isReturning: boolean;
  lastInteractionDate?: Date;
  lastGreetingVariation?: number;
  totalExchangeCount?: number;
  recentTopic?: string;
  primaryRelationship?: { name: string; relationship: string };
}

export interface GeneratedGreeting {
  greeting: string;
  variationIndex: number;
}

/**
 * Generate a dynamic, context-aware greeting
 */
export function generateGreeting(context: GreetingContext): GeneratedGreeting {
  const now = new Date();
  const hour = now.getHours();
  
  // Determine time of day
  const isMorning = hour >= 5 && hour < 10;
  const isLateNight = hour >= 23 || hour < 5;
  
  // Calculate days since last interaction
  let daysSinceLastCall = 0;
  if (context.lastInteractionDate) {
    const diffMs = now.getTime() - context.lastInteractionDate.getTime();
    daysSinceLastCall = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
  
  // Select greeting pool based on context
  let greetingPool: string[];
  let poolName: string;
  
  if (!context.isReturning && !context.preferredName) {
    // First-time caller, no name
    greetingPool = FIRST_TIME_GREETINGS;
    poolName = "first_time";
  } else if (context.isReturning && !context.preferredName) {
    // Returning caller, no name known
    greetingPool = RETURNING_NO_NAME_GREETINGS;
    poolName = "returning_no_name";
  } else if (context.preferredName) {
    // We know their name - pick the best contextual greeting
    
    // Priority 1: Late night (emotional moment)
    if (isLateNight) {
      greetingPool = LATE_NIGHT_GREETINGS;
      poolName = "late_night";
    }
    // Priority 2: Long time no see (7+ days)
    else if (daysSinceLastCall >= 7) {
      greetingPool = LONG_TIME_GREETINGS;
      poolName = "long_time";
    }
    // Priority 3: Quick return (same/next day)
    else if (daysSinceLastCall <= 1 && context.isReturning) {
      greetingPool = QUICK_RETURN_GREETINGS;
      poolName = "quick_return";
    }
    // Priority 4: Morning greeting
    else if (isMorning) {
      greetingPool = MORNING_GREETINGS;
      poolName = "morning";
    }
    // Priority 5: Relationship reference (if we have one and it's been a few days)
    else if (context.primaryRelationship && daysSinceLastCall >= 2 && Math.random() > 0.5) {
      greetingPool = RELATIONSHIP_GREETINGS;
      poolName = "relationship";
    }
    // Priority 6: Context reference (if we have recent topic)
    else if (context.recentTopic && daysSinceLastCall >= 1 && Math.random() > 0.6) {
      greetingPool = CONTEXT_GREETINGS;
      poolName = "context";
    }
    // Default: Standard known name greeting
    else {
      greetingPool = KNOWN_NAME_GREETINGS;
      poolName = "known_name";
    }
  } else {
    // Fallback
    greetingPool = FIRST_TIME_GREETINGS;
    poolName = "fallback";
  }
  
  // Select a variation, avoiding the last one used
  let variationIndex = Math.floor(Math.random() * greetingPool.length);
  
  // If we have a last variation and it's the same pool, try to pick a different one
  if (context.lastGreetingVariation !== undefined && 
      variationIndex === context.lastGreetingVariation && 
      greetingPool.length > 1) {
    variationIndex = (variationIndex + 1) % greetingPool.length;
  }
  
  let greeting = greetingPool[variationIndex];
  
  // Replace placeholders
  if (context.preferredName) {
    greeting = greeting.replace(/{name}/g, context.preferredName);
  }
  
  if (context.primaryRelationship) {
    greeting = greeting.replace(/{relationship_name}/g, context.primaryRelationship.name);
  }
  
  console.log(`[GreetingGenerator] Selected ${poolName} greeting #${variationIndex}: "${greeting.substring(0, 50)}..."`);
  
  return {
    greeting,
    variationIndex
  };
}

/**
 * Get full greeting context from database
 */
export async function getGreetingContext(clientProfileId: string): Promise<GreetingContext> {
  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  try {
    // Get unified context - this has EVERYTHING we need
    const context = await getUnifiedClientContext({ type: "clientId", value: clientProfileId });
    const profile = context.profile;
    
    // Get primary relationship from context's recent conversations/relationships
    // The unified context includes relationship data
    const relationships = await db
      .select()
      .from(clientRelationship)
      .where(eq(clientRelationship.clientProfileId, clientProfileId))
      .orderBy(desc(clientRelationship.importance))
      .limit(1);
    
    const primaryRel = relationships[0];
    const recentConv = context.recentConversations[0];
    
    return {
      clientProfileId,
      preferredName: profile.preferredName || undefined,
      isReturning: (profile.totalConversations || 0) > 0,
      lastInteractionDate: profile.lastContactDate || undefined,
      lastGreetingVariation: profile.lastGreetingVariation || undefined,
      totalExchangeCount: profile.totalExchangeCount || 0,
      recentTopic: recentConv?.topic || undefined,
      primaryRelationship: primaryRel ? {
        name: primaryRel.name,
        relationship: primaryRel.relationship
      } : undefined
    };
  } catch (error) {
    console.error("[GreetingGenerator] Error getting context:", error);
    return { isReturning: false };
  }
}

/**
 * Update the last greeting variation used
 */
export async function updateLastGreetingVariation(
  clientProfileId: string, 
  variationIndex: number
): Promise<void> {
  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  try {
    await updateClientProfile(clientProfileId, {
      lastGreetingVariation: variationIndex
    });
  } catch (error) {
    console.error("[GreetingGenerator] Error updating variation:", error);
  }
}

export default {
  generateGreeting,
  getGreetingContext,
  updateLastGreetingVariation
};
