import { generateVoiceId } from './utils/generateId';
/**
 * Voice Recognition System for Just Talk
 * 
 * Simplified implementation for MVP that uses session-based recognition.
 * In production, would use actual voice biometrics.
 */

import { db } from "./_core/db.js";
import { voiceSignature, clientProfile } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

interface VoiceRecognitionResult {
  clientId: string | null;
  confidence: number;
  isNewUser: boolean;
}

/**
 * Recognize user from session data (browser fingerprint, etc.)
 * This is the MVP implementation - actual voice recognition would be Phase 2 enhancement
 */
export async function recognizeUserFromSession(
  sessionData: {
    browserFingerprint?: string;
    lastClientId?: string;
    conversationStyle?: string;
  }
): Promise<VoiceRecognitionResult> {
  // Check if we have a recent client ID in session
  if (sessionData.lastClientId) {
    const profile = await db
      .select()
      .from(clientProfile)
      .where(eq(clientProfile.id, sessionData.lastClientId))
      .limit(1);

    if (profile.length > 0) {
      console.log(`[VoiceRecognition] Recognized from session: ${sessionData.lastClientId}`);
      return {
        clientId: sessionData.lastClientId,
        confidence: 0.95, // High confidence from session
        isNewUser: false,
      };
    }
  }

  // Check browser fingerprint (stored in aiSummary for MVP)
  if (sessionData.browserFingerprint) {
    const profiles = await db
      .select()
      .from(clientProfile)
      .limit(100); // Get recent profiles

    // Simple matching - in production would use proper indexing
    for (const profile of profiles) {
      if (profile.aiSummary?.includes(sessionData.browserFingerprint)) {
        console.log(`[VoiceRecognition] Recognized from fingerprint: ${profile.id}`);
        return {
          clientId: profile.id,
          confidence: 0.85, // Good confidence from fingerprint
          isNewUser: false,
        };
      }
    }
  }

  console.log(`[VoiceRecognition] New user detected`);
  return {
    clientId: null,
    confidence: 0,
    isNewUser: true,
  };
}

/**
 * Create voice signature for a client (placeholder for future enhancement)
 */
export async function createVoiceSignature(
  clientId: string,
  voiceData?: any
): Promise<void> {
  await db.insert(voiceSignature).values({
    id: generateVoiceId(),
    clientProfileId: clientId,
    voiceprint: {
      pitch: 0,
      tempo: 0,
      accent: "unknown",
    },
    confidenceThreshold: 0.7,
    lastRecognized: new Date(),
    recognitionCount: 1,
  });
}
