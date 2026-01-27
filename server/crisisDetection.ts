import { generateCrisisId } from './utils/generateId';
/**
 * Crisis Detection System for Just Talk
 * 
 * Detects crisis situations and triggers appropriate escalation.
 * Uses keyword detection + behavioral analysis.
 */

import { db } from "./_core/db.js";
import { crisisLog, clientProfile, conversation } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { updateClientProfile } from "./unifiedClientRepository";

// Crisis keywords (suicide, self-harm, violence)
const CRISIS_KEYWORDS = {
  critical: [
    // Suicide intent
    "kill myself",
    "end my life",
    "want to die",
    "suicide",
    "suicidal",
    "overdose",
    "jump off",
    "hang myself",
    "shoot myself",
    "end it all",
    "better off dead",
    "no reason to live",
    
    // Immediate danger
    "gun in my hand",
    "pills in front of me",
    "on the bridge",
    "on the roof",
    "goodbye forever",
  ],
  
  high: [
    // Self-harm
    "cut myself",
    "hurt myself",
    "self harm",
    "self-harm",
    "cutting",
    "burning myself",
    
    // Suicidal ideation
    "wish I was dead",
    "don't want to be here",
    "can't go on",
    "no point in living",
    "everyone would be better without me",
    "worthless",
    "burden to everyone",
    
    // Violence
    "hurt someone",
    "kill them",
    "make them pay",
    "get revenge",
  ],
  
  medium: [
    // Depression/hopelessness
    "no hope",
    "hopeless",
    "can't take it anymore",
    "giving up",
    "nothing matters",
    "empty inside",
    "numb",
    
    // Isolation
    "nobody cares",
    "all alone",
    "no one understands",
    "no friends",
    "nobody would notice",
  ],
};

export interface CrisisDetectionResult {
  isCrisis: boolean;
  level: "none" | "low" | "medium" | "high" | "critical";
  keywords: string[];
  confidence: number;
  recommendation: string;
}

/**
 * Analyze message for crisis indicators
 */
export function detectCrisis(message: string): CrisisDetectionResult {
  const lowerMessage = message.toLowerCase();
  const foundKeywords: string[] = [];
  let highestLevel: "none" | "low" | "medium" | "high" | "critical" = "none";

  // Check critical keywords
  for (const keyword of CRISIS_KEYWORDS.critical) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
      highestLevel = "critical";
    }
  }

  // Check high keywords (only if not already critical)
  if (highestLevel !== "critical") {
    for (const keyword of CRISIS_KEYWORDS.high) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
        if (highestLevel !== "high") highestLevel = "high";
      }
    }
  }

  // Check medium keywords (only if not already high/critical)
  if (highestLevel === "none") {
    for (const keyword of CRISIS_KEYWORDS.medium) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
        highestLevel = "medium";
      }
    }
  }

  // Calculate confidence based on number of keywords
  const confidence = Math.min(foundKeywords.length * 0.3 + 0.4, 1.0);

  // Generate recommendation
  let recommendation = "";
  if (highestLevel === "critical") {
    recommendation = "IMMEDIATE ESCALATION: Suggest calling 988 or 911. Alert owner immediately.";
  } else if (highestLevel === "high") {
    recommendation = "HIGH PRIORITY: Provide crisis resources. Monitor closely. Alert owner.";
  } else if (highestLevel === "medium") {
    recommendation = "MONITOR: Provide support resources. Track for escalation.";
  }

  return {
    isCrisis: highestLevel !== "none",
    level: highestLevel,
    keywords: foundKeywords,
    confidence,
    recommendation,
  };
}

/**
 * Log crisis event to database
 */
export async function logCrisisEvent(
  clientId: string,
  conversationId: string,
  detection: CrisisDetectionResult,
  message: string
): Promise<void> {
  // Only log if there's an actual crisis (not "none")
  if (detection.level === "none") return;
  
  await db.insert(crisisLog).values({
    id: generateCrisisId(),
    clientProfileId: clientId,
    conversationId,
    crisisLevel: detection.level,
    indicators: detection.keywords,
    transcript: message,
    escalated: detection.level === "critical" || detection.level === "high",
  });

  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  await updateClientProfile(clientId, {
    crisisRiskLevel: detection.level,
    lastCrisisDate: new Date(),
  });

  console.log(`[Crisis] Logged ${detection.level} crisis for client ${clientId}`);
}

/**
 * Send crisis alert email to owner
 */
export async function sendCrisisAlert(
  clientId: string,
  detection: CrisisDetectionResult,
  message: string
): Promise<void> {
  // Get client profile
  const profile = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientId))
    .limit(1);

  const clientName = profile[0]?.preferredName || "Unknown User";

  const emailBody = `
CRISIS ALERT - Just Talk

Level: ${detection.level.toUpperCase()}
Confidence: ${(detection.confidence * 100).toFixed(0)}%
Client: ${clientName} (ID: ${clientId})

Keywords Detected: ${detection.keywords.join(", ")}

Message:
"${message}"

Recommendation: ${detection.recommendation}

---
This is an automated alert from Just Talk crisis detection system.
Time: ${new Date().toISOString()}
  `.trim();

  console.log("[Crisis] ALERT EMAIL:");
  console.log(emailBody);

  // TODO: Integrate with actual email service
  // For now, just log to console
  // In production, use notifyOwner() or email service
}

/**
 * Get crisis response message for AI
 */
export function getCrisisResponseGuidance(level: "none" | "low" | "medium" | "high" | "critical"): string {
  if (level === "critical") {
    return `
CRISIS DETECTED - CRITICAL LEVEL

You must:
1. Acknowledge their pain with deep empathy
2. Ask if they are in immediate danger
3. Gently but firmly suggest calling 988 (Suicide & Crisis Lifeline) or 911
4. Stay calm and supportive
5. Do NOT try to "fix" them or minimize their feelings

Example: "I hear how much pain you're in right now. Your safety is what matters most. Can you call 988 (Suicide & Crisis Lifeline) right now? They're trained to help in moments like this. I'm here with you, but they can provide the immediate support you need. Will you call them?"
`;
  }

  if (level === "high") {
    return `
CRISIS DETECTED - HIGH LEVEL

You must:
1. Validate their feelings deeply
2. Ask about their safety
3. Provide crisis resources (988, 911)
4. Stay present and supportive
5. Do NOT give medical advice

Example: "What you're feeling sounds incredibly difficult. Are you safe right now? If you're having thoughts of hurting yourself, please reach out to 988 (Suicide & Crisis Lifeline). They're available 24/7 and can help. I'm here to listen, but they have the training to support you through this."
`;
  }

  if (level === "medium") {
    return `
POTENTIAL CRISIS - MEDIUM LEVEL

You should:
1. Acknowledge their struggle
2. Ask how they're coping
3. Provide support resources
4. Monitor for escalation

Example: "It sounds like you're going through a really tough time. How are you managing day to day? If things feel overwhelming, 988 (Suicide & Crisis Lifeline) is available 24/7 to talk. I'm here to listen too."
`;
  }

  return "";
}

/**
 * Analyze behavioral patterns for crisis risk
 * (Advanced feature - checks conversation frequency, sentiment trends, etc.)
 */
export async function analyzeBehavioralRisk(clientId: string): Promise<{
  riskLevel: "none" | "low" | "medium" | "high";
  factors: string[];
}> {
  // Get recent conversations
  const conversations = await db
    .select()
    .from(conversation)
    .where(eq(conversation.clientProfileId, clientId))
    .limit(10);

  const factors: string[] = [];
  let riskLevel: "none" | "low" | "medium" | "high" = "none";

  // Check for increased frequency (multiple conversations in short time)
  if (conversations.length >= 5) {
    const recentConvs = conversations.filter(c => {
      const hoursSince = (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSince < 24;
    });

    if (recentConvs.length >= 3) {
      factors.push("Increased contact frequency (3+ conversations in 24 hours)");
      riskLevel = "low";
    }
  }

  // Check for crisis history
  const profile = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientId))
    .limit(1);

  if (profile[0]?.crisisRiskLevel && profile[0].crisisRiskLevel !== "none") {
    factors.push(`Previous crisis risk: ${profile[0].crisisRiskLevel}`);
    if (profile[0].crisisRiskLevel === "high" || profile[0].crisisRiskLevel === "critical") {
      riskLevel = "high";
    } else if (riskLevel === "none") {
      riskLevel = "medium";
    }
  }

  // Check for negative sentiment trend
  const negativeConvs = conversations.filter(c => c.sentiment === "negative" || c.sentiment === "crisis");
  if (negativeConvs.length >= 3) {
    factors.push("Persistent negative sentiment across conversations");
    if (riskLevel === "none") riskLevel = "low";
  }

  return { riskLevel, factors };
}
