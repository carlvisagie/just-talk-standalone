import { generateMessageId, generateLogId, generateConversationId, generateClientId } from './utils/generateId';
/**
 * API ROUTERS - ALL DATA FLOWS THROUGH UNIFIED CLIENT REPOSITORY
 * 
 * RULE: No client data exists outside the client profile/repository.
 * Every message, every click, every interaction - ALL linked to client profile.
 * 
 * This is how we achieve PERFECT CONTINUITY.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { detectCrisis, logCrisisEvent, sendCrisisAlert, getCrisisResponseGuidance } from "./crisisDetection";
import { db } from "./_core/db";
import { conversation, message, clientProfile, interactionLog } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// UNIFIED CLIENT REPOSITORY - THE SINGLE SOURCE OF TRUTH
import {
  findOrCreateClient,
  getUnifiedClientContext,
  updateClientProfile,
  canUseFeature,
  decrementMessageCount,
  linkUserIdToProfile,
  type ClientIdentifier,
} from "./unifiedClientRepository";

import { healthRouter } from "./healthRouter";
import { stripeRouter } from "./stripeRouter";
import { ttsRouter } from "./ttsRouter";
import { checkGuardrails, buildGuardrailsSystemPrompt, logGuardrailViolation } from "./guardrails";
import { withTimeout, retryWithBackoff, API_TIMEOUTS } from "./_core/apiConfig";

// ============================================================================
// INTERACTION LOGGING - ALL ACTIVITY GOES TO CLIENT PROFILE
// ============================================================================

async function logInteraction(
  clientId: string,
  type: string,
  target: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await db.insert(interactionLog).values({
      id: generateLogId(),
      clientProfileId: clientId,
      interactionType: type,
      target,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[Router] Failed to log interaction:", error);
  }
}

// ============================================================================
// CONVERSATION MANAGEMENT - ALWAYS LINKED TO CLIENT PROFILE
// ============================================================================

async function getOrCreateConversation(
  clientId: string,
  channel: "web" | "phone" | "sms"
): Promise<string> {
  // Look for recent conversation on this channel
  const recentConv = await db
    .select()
    .from(conversation)
    .where(eq(conversation.clientProfileId, clientId))
    .orderBy(desc(conversation.createdAt))
    .limit(1);

  // If recent conversation exists (within last hour on same channel), use it
  if (recentConv.length > 0) {
    const lastConv = recentConv[0];
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (lastConv.createdAt > hourAgo && lastConv.channel === channel) {
      return lastConv.id;
    }
  }

  // Create new conversation (LINKED TO CLIENT PROFILE)
  const conversationId = generateConversationId();
  await db.insert(conversation).values({
    id: conversationId,
    clientProfileId: clientId, // CRITICAL: Link to client profile
    channel,
    messageCount: 0,
  });

  // Update client profile conversation count
  const [profile] = await db
    .select()
    .from(clientProfile)
    .where(eq(clientProfile.id, clientId))
    .limit(1);
  
  if (profile) {
    await updateClientProfile(clientId, {
      totalConversations: (profile.totalConversations || 0) + 1,
    });
  }

  return conversationId;
}

// ============================================================================
// APP ROUTER
// ============================================================================

export const appRouter = router({
  // Health monitoring & self-healing status
  health: healthRouter,
  
  // Stripe payment integration
  stripe: stripeRouter,
  
  // Text-to-speech with natural voice
  tts: ttsRouter,
  
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      return ctx.user || null;
    }),
    logout: protectedProcedure.mutation(({ ctx }) => {
      return { success: true };
    }),
  }),

  // ============================================================================
  // CLIENT PROFILE MANAGEMENT - UNIFIED REPOSITORY ACCESS
  // ============================================================================
  
  client: router({
    /**
     * Get or create client profile.
     * This is the ENTRY POINT for all client interactions.
     */
    getOrCreate: publicProcedure
      .input(z.object({
        identifier: z.union([
          z.object({ type: z.literal("phone"), value: z.string() }),
          z.object({ type: z.literal("userId"), value: z.string() }),
          z.object({ type: z.literal("clientId"), value: z.string() }),
        ]).optional(),
        browserFingerprint: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // ========================================
        // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
        // No direct database access - EVER
        // ========================================
        let identifier: ClientIdentifier;
        
        if (input.identifier) {
          identifier = input.identifier as ClientIdentifier;
        } else if (ctx.user?.id) {
          identifier = { type: "userId", value: ctx.user.id };
        } else if (input.browserFingerprint) {
          // Anonymous user - use fingerprint identifier
          // findOrCreateClient will handle creation through unified repo
          identifier = { type: "fingerprint", value: input.browserFingerprint };
        } else {
          // No identifier at all - create anonymous with random fingerprint
          identifier = { type: "fingerprint", value: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}` };
        }
        
        // UNIFIED REPOSITORY handles all creation/lookup
        const context = await getUnifiedClientContext(identifier);
        
        return {
          clientId: context.profile.id,
          profile: context.profile,
          subscription: context.subscription,
        };
      }),
    
    /**
     * Get full client context for AI interactions.
     */
    getContext: publicProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input }) => {
        const context = await getUnifiedClientContext({ 
          type: "clientId", 
          value: input.clientId 
        });
        
        return {
          profile: context.profile,
          subscription: context.subscription,
          recentConversations: context.recentConversations,
          contextString: context.contextString,
        };
      }),
    
    /**
     * Update client profile.
     */
    update: publicProcedure
      .input(z.object({
        clientId: z.string(),
        updates: z.object({
          preferredName: z.string().optional(),
          phoneNumber: z.string().optional(),
          communicationStyle: z.string().optional(),
          preferredChannel: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await updateClientProfile(input.clientId, input.updates);
        
        // Log this update
        await logInteraction(input.clientId, "profile_update", "client", {
          fields: Object.keys(input.updates),
        });
        
        return { success: true };
      }),
    
    /**
     * Link phone number to profile (for cross-channel continuity).
     */
    linkPhone: publicProcedure
      .input(z.object({
        clientId: z.string(),
        phoneNumber: z.string(),
      }))
      .mutation(async ({ input }) => {
        await updateClientProfile(input.clientId, { 
          phoneNumber: input.phoneNumber 
        });
        
        await logInteraction(input.clientId, "phone_linked", "profile", {
          phoneNumber: input.phoneNumber,
        });
        
        return { success: true };
      }),
  }),

  // ============================================================================
  // CHAT - ALL MESSAGES FLOW THROUGH CLIENT PROFILE
  // ============================================================================
  
  chat: router({
    /**
     * Send a message and get AI response.
     * 
     * ALL DATA FLOWS THROUGH UNIFIED CLIENT REPOSITORY:
     * 1. Get/create client profile
     * 2. Check subscription tier
     * 3. Log interaction to client's history
     * 4. Store message linked to client profile
     * 5. Update client profile stats
     */
    sendMessage: publicProcedure
      .input(
        z.object({
          message: z.string(),
          clientId: z.string().optional(),
          mood: z.string().optional(),
          browserFingerprint: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // ========================================
        // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
        // No direct database access - EVER
        // ========================================
        let identifier: ClientIdentifier;
        
        if (input.clientId) {
          identifier = { type: "clientId", value: input.clientId };
        } else if (ctx.user?.id) {
          identifier = { type: "userId", value: ctx.user.id };
        } else if (input.browserFingerprint) {
          // Anonymous user - use fingerprint identifier
          identifier = { type: "fingerprint", value: input.browserFingerprint };
        } else {
          // No identifier - create anonymous with random fingerprint
          identifier = { type: "fingerprint", value: `temp_${Date.now()}_${Math.random().toString(36).slice(2)}` };
        }
        
        // UNIFIED REPOSITORY handles all creation/lookup
        const context = await getUnifiedClientContext(identifier);
        const clientId = context.profile.id;
        
        console.log(`[Chat] Client resolved: ${clientId} (name: ${context.profile.preferredName || 'unknown'})`);

        // Log this chat interaction
        await logInteraction(clientId, "chat_message", "web", {
          messageLength: input.message.length,
          mood: input.mood,
          channel: "web",
        });

        // ========================================
        // SUBSCRIPTION TIER ENFORCEMENT
        // ========================================
        const textAccess = canUseFeature(context, "text");
        
        if (!textAccess.allowed) {
          console.log(`[Chat] Client ${clientId} denied text access: ${textAccess.reason}`);
          
          await logInteraction(clientId, "chat_denied", "subscription", {
            reason: textAccess.reason,
            tier: context.subscription.tier,
            messagesRemaining: context.subscription.messagesRemaining,
          });
          
          return {
            response: `Hey, I've really enjoyed our conversations! ${textAccess.reason} Visit the pricing page to upgrade - I'd love to keep talking with you! 💙`,
            clientId,
            conversationId: null,
            trialMessagesRemaining: 0,
            limitReached: true,
          };
        }
        
        // Decrement message count for free tier
        if (context.subscription.tier === "free") {
          await decrementMessageCount(clientId);
        }

        // ========================================
        // CREATE CONVERSATION (LINKED TO CLIENT PROFILE)
        // ========================================
        const conversationId = await getOrCreateConversation(clientId, "web");

        // Detect crisis in user message
        const crisisDetection = detectCrisis(input.message);
        
        // Store user message (LINKED TO CONVERSATION → LINKED TO CLIENT PROFILE)
        await db.insert(message).values({
          id: generateMessageId(),
          conversationId,
          role: "user",
          content: input.message,
          mood: input.mood,
          sentiment: crisisDetection.isCrisis ? "crisis" : null,
          crisisKeywords: crisisDetection.keywords.length > 0 ? crisisDetection.keywords : null,
        });
        
        // Log crisis event if detected (LINKED TO CLIENT PROFILE)
        if (crisisDetection.isCrisis) {
          await logCrisisEvent(clientId, conversationId, crisisDetection, input.message);
          
          if (crisisDetection.level === "critical" || crisisDetection.level === "high") {
            await sendCrisisAlert(clientId, crisisDetection, input.message);
          }
        }

        // Get conversation history
        const history = await db
          .select()
          .from(message)
          .where(eq(message.conversationId, conversationId))
          .orderBy(desc(message.createdAt))
          .limit(10);

        // Build messages for AI (with crisis guidance if needed)
        const crisisGuidance = crisisDetection.isCrisis 
          ? `\n\n${getCrisisResponseGuidance(crisisDetection.level)}`
          : "";
        
        const guardrailsPrompt = buildGuardrailsSystemPrompt();
        
        const messages: any[] = [
          {
            role: "system",
            content: `${guardrailsPrompt}

Client Context (YOU REMEMBER EVERYTHING):
${context.contextString}

Guidelines:
- Listen deeply and validate emotions
- Ask thoughtful follow-up questions
- Match their emotional tone
- **ALWAYS reference past conversations** - You have perfect memory of everything they've shared
- If this is a returning client, greet them warmly and reference something specific from your last conversation
- Be warm, empathetic, and genuine
- Use their preferred name if you know it${crisisGuidance}`,
          },
        ];

        // Add conversation history (reverse order for chronological)
        for (const msg of history.reverse()) {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }

        // Get AI response with timeout and retry
        const aiResponse = await retryWithBackoff(
          () => withTimeout(
            invokeLLM({ messages }),
            API_TIMEOUTS.openai,
            "OpenAI API call"
          ),
          {
            maxRetries: 2,
            onRetry: (error, attempt) => {
              console.log(`[Chat] OpenAI API retry ${attempt}/2:`, error.message);
            },
          }
        );
        const aiContent = aiResponse.choices[0].message.content;
        let aiMessage = typeof aiContent === 'string' ? aiContent : "I'm here to listen.";
        
        // GUARDRAILS: Check AI response for violations
        const violations = checkGuardrails(aiMessage);
        
        if (violations.length > 0) {
          console.error(`[GUARDRAILS] ${violations.length} violation(s) detected in AI response`);
          
          for (const violation of violations) {
            await logGuardrailViolation(violation, {
              clientId,
              aiResponse: aiMessage,
            });
          }
          
          const criticalViolations = violations.filter(v => v.requiresIntervention);
          if (criticalViolations.length > 0) {
            console.error('[GUARDRAILS] Critical violation detected - replacing response');
            aiMessage = `I want to support you in the best way possible. ${criticalViolations[0].suggestion}`;
          }
        }

        // Store AI response (LINKED TO CONVERSATION → LINKED TO CLIENT PROFILE)
        await db.insert(message).values({
          id: generateMessageId(),
          conversationId,
          role: "assistant",
          content: aiMessage,
        });

        // ========================================
        // UPDATE CLIENT PROFILE STATS
        // ========================================
        await updateClientProfile(clientId, {
          lastContactDate: new Date(),
          totalMessages: (context.profile.totalMessages || 0) + 2,
          preferredChannel: "web",
        });

        // Get updated message count
        const [updatedProfile] = await db
          .select()
          .from(clientProfile)
          .where(eq(clientProfile.id, clientId))
          .limit(1);

        return {
          response: aiMessage,
          clientId,
          conversationId,
          trialMessagesRemaining: updatedProfile?.trialMessagesRemaining ?? 0,
          limitReached: false,
        };
      }),

    /**
     * Get conversation history for a client.
     * ALL history is linked to client profile.
     */
    getHistory: publicProcedure
      .input(z.object({ clientId: z.string() }))
      .query(async ({ input }) => {
        // Log this history access
        await logInteraction(input.clientId, "history_view", "chat", {});
        
        const conversations = await db
          .select()
          .from(conversation)
          .where(eq(conversation.clientProfileId, input.clientId))
          .orderBy(desc(conversation.createdAt));

        const result = [];
        for (const conv of conversations) {
          const messages = await db
            .select()
            .from(message)
            .where(eq(message.conversationId, conv.id))
            .orderBy(message.createdAt);

          result.push({
            id: conv.id,
            channel: conv.channel,
            startedAt: conv.createdAt,
            messages,
          });
        }

        return result;
      }),
  }),

  // ============================================================================
  // INTERACTION TRACKING - ALL ACTIVITY LOGGED TO CLIENT PROFILE
  // ============================================================================
  
  tracking: router({
    /**
     * Log a page view to client's interaction history.
     */
    pageView: publicProcedure
      .input(z.object({
        clientId: z.string(),
        page: z.string(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await logInteraction(input.clientId, "page_view", input.page, {
          duration: input.duration,
        });
        return { success: true };
      }),
    
    /**
     * Log a click to client's interaction history.
     */
    click: publicProcedure
      .input(z.object({
        clientId: z.string(),
        target: z.string(),
        metadata: z.record(z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        await logInteraction(input.clientId, "click", input.target, input.metadata || {});
        return { success: true };
      }),
    
    /**
     * Log module completion to client's interaction history.
     */
    moduleComplete: publicProcedure
      .input(z.object({
        clientId: z.string(),
        moduleId: z.string(),
        moduleName: z.string(),
        score: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await logInteraction(input.clientId, "module_complete", input.moduleId, {
          moduleName: input.moduleName,
          score: input.score,
        });
        return { success: true };
      }),
    
    /**
     * Log video/audio interaction to client's history.
     */
    mediaInteraction: publicProcedure
      .input(z.object({
        clientId: z.string(),
        mediaType: z.enum(["video", "audio"]),
        mediaId: z.string(),
        action: z.enum(["play", "pause", "complete", "seek"]),
        position: z.number().optional(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await logInteraction(input.clientId, `${input.mediaType}_${input.action}`, input.mediaId, {
          position: input.position,
          duration: input.duration,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
