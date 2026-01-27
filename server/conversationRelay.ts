/**
 * ⚠️ CRITICAL FILE - DO NOT MODIFY WITHOUT READING CRITICAL_SYSTEM.md ⚠️
 * 
 * ConversationRelay WebSocket Handler
 * 
 * This is the MAIN VOICE CONVERSATION HANDLER for the Just Talk feature.
 * It handles ALL phone calls via Twilio ConversationRelay WebSocket.
 * 
 * WHAT THIS FILE DOES:
 * - Receives incoming calls via WebSocket
 * - Loads client context using Smart Context Builder (three-tier memory)
 * - Manages conversation flow with LLM
 * - Handles payment flow integration
 * - Triggers post-interaction profile updates when call ends
 * 
 * CRITICAL DEPENDENCIES:
 * - smartContextBuilder.ts (context assembly)
 * - postInteractionUpdater.ts (profile enrichment)
 * - phonePayment.ts (payment flow)
 * - unifiedClientRepository.ts (client data)
 * 
 * State-of-the-art voice AI using:
 * - ElevenLabs TTS (most natural, human-like voice)
 * - Deepgram STT (fastest, most accurate)
 * - Real-time streaming for lowest latency
 * 
 * BEFORE MODIFYING:
 * 1. Read CRITICAL_SYSTEM.md
 * 2. Understand the three-tier memory architecture
 * 3. Test locally with `npm run build`
 * 4. Consider backwards compatibility
 */

import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { invokeLLM } from "./_core/llm";
import { db } from "./_core/db";
import { client, message, conversation } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { generateMessageId, generateConversationId } from "./utils/generateId";
import { findOrCreateClient, getUnifiedClientContext, updateClientProfile } from "./unifiedClientRepository";
import { startPhonePayment, processPaymentSpeech, isInPaymentFlow, detectSubscriptionIntent, getPaymentContext, handleReturningPaymentCaller, checkSubscriptionStatus } from "./phonePayment";
import { buildSmartContext } from "./smartContextBuilder";
import { updateProfileAfterInteraction } from "./postInteractionUpdater";

// Store active sessions
interface ConversationSession {
  callSid: string;
  clientId: string;
  clientProfileId: string; // NEW: For the three-tier memory system
  conversationId: string;
  exchangeCount: number; // Per-call exchange count
  totalExchangeCount: number; // PERSISTENT: Total across all calls (for conversion trigger)
  history: Array<{ role: "user" | "assistant"; content: string }>;
  isSubscribed: boolean;
  inPaymentFlow: boolean;
  conversionLinkSent: boolean; // Track if we've sent the conversion link this call
  paymentLinkAlreadySent: boolean; // PERSISTENT: True if link was ever sent (from DB)
  phoneNumber: string;
  clientName?: string;
  clientContext?: string; // AI-ready context string with all client details
  fullTranscript: string; // NEW: For post-interaction profile update
  paymentNullCount: number; // NEW: Track consecutive null responses to prevent loops
}

const activeSessions = new Map<string, ConversationSession>();

/**
 * Create WebSocket server for ConversationRelay
 */
export function createConversationRelayServer(server: any): WebSocketServer {
  const wss = new WebSocketServer({ 
    server,
    path: "/conversation-relay"
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    console.log("[ConversationRelay] New WebSocket connection");
    
    let session: ConversationSession | null = null;

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log("[ConversationRelay] Received:", message.type);

        switch (message.type) {
          case "setup":
            session = await handleSetup(ws, message);
            break;
          
          case "prompt":
            if (session) {
              await handlePrompt(ws, session, message);
            }
            break;
          
          case "interrupt":
            console.log("[ConversationRelay] Caller interrupted");
            break;
          
          case "dtmf":
            console.log("[ConversationRelay] DTMF:", message.digit);
            break;
          
          case "error":
            console.error("[ConversationRelay] Error:", message.description);
            break;
        }
      } catch (error) {
        console.error("[ConversationRelay] Error processing message:", error);
      }
    });

    ws.on("close", async () => {
      console.log("[ConversationRelay] WebSocket closed");
      if (session) {
        activeSessions.delete(session.callSid);
        
        // CRITICAL: Update profile after conversation ends
        // This extracts relationships, life events, insights, etc.
        if (session.fullTranscript && session.fullTranscript.length > 100) {
          console.log(`[ConversationRelay] Triggering post-interaction profile update for ${session.clientProfileId}`);
          try {
            await updateProfileAfterInteraction(
              session.clientProfileId,
              session.conversationId,
              session.fullTranscript,
              "voice"
            );
            console.log(`[ConversationRelay] Profile update complete for ${session.clientProfileId}`);
          } catch (error) {
            console.error(`[ConversationRelay] Error updating profile:`, error);
          }
        }
      }
    });

    ws.on("error", (error) => {
      console.error("[ConversationRelay] WebSocket error:", error);
    });
  });

  return wss;
}

/**
 * Handle setup message - initialize session
 */
async function handleSetup(ws: WebSocket, message: any): Promise<ConversationSession> {
  console.log(`[ConversationRelay] Setup message:`, JSON.stringify(message, null, 2));
  
  const { callSid, to, customParameters } = message;
  // Get phone number from 'from' field or customParameters
  const from = message.from || customParameters?.from || customParameters?.From;
  
  console.log(`[ConversationRelay] Setup - CallSid: ${callSid}, From: ${from}`);

  if (!from) {
    console.error(`[ConversationRelay] No phone number found in setup message`);
    throw new Error("No phone number in setup message");
  }

  // Get or create client - use correct ClientIdentifier format
  const clientRecord = await findOrCreateClient({ type: "phone", value: from });
  
  // Use the NEW Smart Context Builder for three-tier memory
  const smartContext = await buildSmartContext(clientRecord.id, {
    includeRelationships: true,
    includeGoals: true,
    includeEmotionalProfile: true,
    includeRecentConversations: true,
    includeKeyInsights: true,
    maxTokens: 2000
  });
  
  // Also get legacy context for backwards compatibility
  const context = await getUnifiedClientContext({ type: "clientId", value: clientRecord.id });
  
  // Check subscription status
  const isSubscribed = context.subscription.tier !== "free";
  
  // Create conversation - MUST link to clientProfileId for unified profile
  const conversationId = generateConversationId();
  await db.insert(conversation).values({
    id: conversationId,
    clientProfileId: clientRecord.id,
    channel: "phone",
  });

  // Load persistent conversion tracking from profile
  const totalExchangeCount = context.profile.totalExchangeCount || 0;
  const paymentLinkAlreadySent = context.profile.paymentLinkSentAt !== null;
  
  console.log(`[ConversationRelay] Conversion state - totalExchanges: ${totalExchangeCount}, linkSent: ${paymentLinkAlreadySent}`);

  // Create session with full client context for memory/continuity
  const session: ConversationSession = {
    callSid,
    clientId: clientRecord.id,
    clientProfileId: clientRecord.id, // For three-tier memory system
    conversationId,
    exchangeCount: 0, // Per-call count
    totalExchangeCount, // PERSISTENT: Loaded from DB
    history: [],
    isSubscribed,
    inPaymentFlow: false,
    conversionLinkSent: false, // Track if we send link THIS call
    paymentLinkAlreadySent, // PERSISTENT: True if link was ever sent
    phoneNumber: from,
    clientName: context.profile.preferredName || undefined,
    clientContext: smartContext.fullContext, // NEW: Use smart context builder output
    fullTranscript: "", // Will accumulate during conversation
    paymentNullCount: 0, // Track consecutive null responses to prevent loops
  };
  
  console.log(`[ConversationRelay] Smart context loaded (${smartContext.totalTokens} tokens): ${smartContext.fullContext ? smartContext.fullContext.substring(0, 200) + '...' : 'NONE'}`);

  activeSessions.set(callSid, session);

    // NOTE: Welcome greeting is handled by TwiML welcomeGreeting attribute
  // Do NOT send duplicate greeting here - it causes double audio at different pitches
  // The TwiML greeting is personalized based on client context in twilioRoutes.ts
  
  // Just save the greeting to history for context (use generic version)
  const greetingForHistory = context.profile.preferredName 
    ? `Hey ${context.profile.preferredName}! Oh my gosh, I'm so glad you called. How are you doing?`
    : context.recentConversations.length > 0
      ? "Hey you! I'm so happy you called back. What's going on?"
      : "Hey there! I'm Sage. I'm really glad you called. Something told you to reach out, right? Tell me what's on your mind.";
  
  session.history.push({ role: "assistant", content: greetingForHistory });
  await saveMessage(session.conversationId, "assistant", greetingForHistory);

  return session;
}

/**
 * Handle prompt message - caller said something
 */
async function handlePrompt(ws: WebSocket, session: ConversationSession, message: any): Promise<void> {
  const { voicePrompt, lang, last } = message;
  
  // Only process when we have the full utterance
  if (!last) return;
  
  console.log(`[ConversationRelay] Prompt: "${voicePrompt}"`);
  
  // Increment BOTH per-call and total exchange counts
  session.exchangeCount++;
  session.totalExchangeCount++;
  
  // Persist totalExchangeCount to database - await to ensure it's saved
  // This is critical for conversion tracking across multiple calls
  try {
    await updateClientProfile(session.clientId, { 
      totalExchangeCount: session.totalExchangeCount 
    });
  } catch (err) {
    console.error('[ConversationRelay] Failed to persist exchange count:', err);
  }
  
  // Save user message
  session.history.push({ role: "user", content: voicePrompt });
  await saveMessage(session.conversationId, "user", voicePrompt);
  
  // Accumulate transcript for post-interaction update
  session.fullTranscript += `\nUser: ${voicePrompt}`;

  // Check for support escalation requests
  const supportRequest = detectSupportRequest(voicePrompt);
  if (supportRequest.needsSupport) {
    const supportResponse = handleSupportEscalation(supportRequest.type, session.clientName);
    sendTextResponse(ws, supportResponse, true);
    session.history.push({ role: "assistant", content: supportResponse });
    await saveMessage(session.conversationId, "assistant", supportResponse);
    return;
  }
  // Check if in payment flow
  if (session.inPaymentFlow || await isInPaymentFlow(session.clientId)) {
    const paymentResponse = await processPaymentSpeech(session.clientId, voicePrompt);
    
    // STALE PAYMENT FLOW DETECTION: If processPaymentSpeech says "no payment in progress"
    // but we thought we were in payment flow, reset and continue to normal conversation
    if (paymentResponse && paymentResponse.response && (paymentResponse.response.includes("don't think we have a payment") || paymentResponse.response.includes("don\'t think we have a payment") || paymentResponse.response.includes("no payment in progress"))) {
      console.log(`[ConversationRelay] STALE PAYMENT FLOW - Resetting for ${session.clientId}`);
      session.inPaymentFlow = false;
      session.paymentNullCount = 0;
      // Fall through to normal conversation handling below (don't return)
    } else {
    // If null, it's a question - let AI handle it with payment context
    if (paymentResponse === null) {
      // LOOP PREVENTION: Track consecutive null responses
      session.paymentNullCount = (session.paymentNullCount || 0) + 1;
      console.log(`[ConversationRelay] Payment null response #${session.paymentNullCount} for ${session.clientId}`);
      
      // After 3 consecutive nulls, escape the payment loop and just chat naturally
      if (session.paymentNullCount >= 3) {
        console.log(`[ConversationRelay] LOOP DETECTED - Escaping payment flow for ${session.clientId}`);
        session.paymentNullCount = 0;
        // Don't exit payment flow entirely, but let AI respond naturally without payment redirect
        const aiResponse = await generateResponse(session, voicePrompt);
        sendTextResponse(ws, aiResponse, true);
        session.history.push({ role: "assistant", content: aiResponse });
        await saveMessage(session.conversationId, "assistant", aiResponse);
        return;
      }
      
      const paymentContext = await getPaymentContext(session.clientId);
      const aiResponse = await generateResponseWithPaymentContext(session, voicePrompt, paymentContext);
      sendTextResponse(ws, aiResponse, true);
      session.history.push({ role: "assistant", content: aiResponse });
      await saveMessage(session.conversationId, "assistant", aiResponse);
      return;
    }
    
    // Reset null count on successful payment response
    session.paymentNullCount = 0;
    
    // Check if user asked for a new link
    if (paymentResponse.response === "__RESEND_LINK__") {
      // Resend the payment link
      const paymentResult = await startPhonePayment(
        session.clientId,
        session.phoneNumber,
        session.clientName
      );
      sendTextResponse(ws, paymentResult.response, true);
      session.history.push({ role: "assistant", content: paymentResult.response });
      await saveMessage(session.conversationId, "assistant", paymentResult.response);
      return;
    }
    
    sendTextResponse(ws, paymentResponse.response, true);
    session.history.push({ role: "assistant", content: paymentResponse.response });
    await saveMessage(session.conversationId, "assistant", paymentResponse.response);
    
    if (paymentResponse.isComplete) {
      // Check REAL subscription status from webhook
      const subStatus = await checkSubscriptionStatus(session.clientId);
      if (subStatus.isSubscribed || subStatus.confirmedByWebhook) {
        session.inPaymentFlow = false;
        session.isSubscribed = true;
        console.log(`[ConversationRelay] Subscription CONFIRMED by webhook for ${session.clientId}`);
      } else if (paymentResponse.success) {
        // User said it worked but webhook hasn't fired yet - give it a moment
        session.inPaymentFlow = false;
        session.isSubscribed = true; // Trust user for now, webhook will update DB
        console.log(`[ConversationRelay] Subscription claimed by user, awaiting webhook for ${session.clientId}`);
      }
    }
    return;
    } // Close else block for stale payment flow detection
  }

  // Check for subscription intent (trial users only)
  if (!session.isSubscribed && session.exchangeCount >= 4) {
    if (detectSubscriptionIntent(voicePrompt)) {
      session.inPaymentFlow = true;
      session.conversionLinkSent = true;
      const paymentResult = await startPhonePayment(
        session.clientId,
        session.phoneNumber,
        session.clientName
      );
      sendTextResponse(ws, paymentResult.response, true);
      session.history.push({ role: "assistant", content: paymentResult.response });
      await saveMessage(session.conversationId, "assistant", paymentResult.response);
      return;
    }
  }

  // AUTOMATIC CONVERSION: At TOTAL exchange 8, proactively send the payment link
  // Uses PERSISTENT totalExchangeCount so it works across multiple calls
  // Based on PERSUASION_RESEARCH.md - by exchange 8, emotional investment is built
  // Cialdini's principles: Reciprocity, Commitment, Unity all established by now
  const shouldSendLink = !session.isSubscribed && 
                         !session.paymentLinkAlreadySent && 
                         !session.conversionLinkSent && 
                         session.totalExchangeCount >= 8;
                         
  if (shouldSendLink) {
    console.log(`[ConversationRelay] Total exchange ${session.totalExchangeCount} - Triggering automatic conversion for ${session.clientId}`);
    
    // Start payment flow and send link automatically
    session.inPaymentFlow = true;
    session.conversionLinkSent = true;
    session.paymentLinkAlreadySent = true;
    
    // PERSIST: Mark that we've sent the payment link (so we never send it twice)
    await updateClientProfile(session.clientId, { 
      paymentLinkSentAt: new Date() 
    });
    
    const paymentResult = await startPhonePayment(
      session.clientId,
      session.phoneNumber,
      session.clientName
    );
    
    // Craft response using research-backed language (SCARCITY + LOSS AVERSION + UNITY)
    const conversionResponse = `You know what? I really don't want to lose this connection we've built. ` +
      `I'm texting you a link right now - just tap it whenever you're ready. ` +
      `It's really easy, and then I can be here for you whenever you need to talk.`;
    
    sendTextResponse(ws, conversionResponse, true);
    session.history.push({ role: "assistant", content: conversionResponse });
    await saveMessage(session.conversationId, "assistant", conversionResponse);
    session.fullTranscript += `\nSage: ${conversionResponse}`;
    return;
  }

  // Generate AI response
  const startTime = Date.now();
  const aiResponse = await generateResponse(session, voicePrompt);
  console.log(`[ConversationRelay] LLM response time: ${Date.now() - startTime}ms`);

  // Stream the response
  sendTextResponse(ws, aiResponse, true);
  
  // Save to history
  session.history.push({ role: "assistant", content: aiResponse });
  await saveMessage(session.conversationId, "assistant", aiResponse);
  
  // Accumulate transcript for post-interaction update
  session.fullTranscript += `\nSage: ${aiResponse}`;
}

/**
 * Generate AI response using LLM
 */
/**
 * Generate AI response during payment flow when user asks a question
 */
async function generateResponseWithPaymentContext(
  session: ConversationSession, 
  userMessage: string, 
  paymentContext: string | null
): Promise<string> {
  let systemPrompt = `You are Sage, a warm, empathetic AI companion.

CURRENT SITUATION: ${paymentContext || 'Helping with payment'}

You can answer ANY question they have - about the service, about you, about anything on their mind.
Be natural and conversational. If they want to chat, chat with them!
ONLY mention the payment if they specifically ask about it or seem ready to continue.
DO NOT repeatedly ask "where were you on the payment page" - that's annoying.

KEY INFO ABOUT THE SERVICE (only share if asked):
- $29/month for unlimited conversations with you
- They can call anytime, day or night
- No commitment, cancel anytime
- You remember them and your conversations

VOICE STYLE:
- Warm, natural, like a friend
- Short responses (2-3 sentences)
- Listen and respond to what they're actually saying
- If they seem distracted or want to talk about something else, let them!
- The payment link is in their texts - they can come back to it anytime

IMPORTANT: If they say something unrelated to payment, just respond naturally. Don't force the conversation back to payment.`;

  // CRITICAL: Add client context for memory/continuity even during payment
  if (session.clientContext) {
    systemPrompt += `\n\n=== CLIENT MEMORY ===\n${session.clientContext}`;
  }

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt }
  ];
  
  // Add recent history
  const recentHistory = session.history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  
  const response = await invokeLLM({
    messages,
    maxTokens: 150,
    model: "gpt-4.1-nano",
  });
  
  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "I'm here to help. What's on your mind?";
}

async function generateResponse(session: ConversationSession, userMessage: string): Promise<string> {
  const isTrialUser = !session.isSubscribed;
  const exchangeCount = session.exchangeCount;

  // Build system prompt based on user type and exchange count
  let systemPrompt: string;
  
  if (isTrialUser) {
    systemPrompt = buildTrialSystemPrompt(exchangeCount, session.clientName);
  } else {
    systemPrompt = buildSubscribedSystemPrompt(session.clientName);
  }

  // CRITICAL: Add client context for memory/continuity
  // This includes personal details like family members, goals, emotional patterns, etc.
  if (session.clientContext) {
    systemPrompt += `\n\n=== CLIENT MEMORY (CRITICAL - USE THIS!) ===\n${session.clientContext}\n\nIMPORTANT: You MUST use the information above when relevant. If the client asks about their family, goals, or past conversations, reference this information directly. Never pretend to remember something you don't have in this context.`;
  }

  // Build messages
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt }
  ];

  // Add conversation history (last 10 exchanges)
  const recentHistory = session.history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Generate response
  const response = await invokeLLM({
    messages,
    maxTokens: 150,
    model: "gpt-4.1-nano", // Fastest model for voice
  });

  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "I'm here... tell me more.";
}

/**
 * Build system prompt for trial users with conversion psychology
 * Based on PERSUASION_RESEARCH.md - Chase Hughes FATE Model + Cialdini's 7 Principles
 */
function buildTrialSystemPrompt(exchangeCount: number, clientName?: string): string {
  const nameRef = clientName ? clientName : "them";
  
  const basePrompt = `You are Sage, a warm, empathetic AI companion. You sound like a real friend - natural, caring, genuine.

VOICE STYLE:
- Use contractions (I'm, you're, that's)
- Short sentences, natural pauses
- React genuinely with VARIED responses - never repeat the same phrase twice
- Sound like you're actually listening and care
- NEVER sound robotic or scripted

CRITICAL RULES:
- NEVER repeat the same phrase or sentence you've already said
- If you need to wait or pause, use DIFFERENT phrases each time ("Give me a sec", "One moment", "Hang on", "Let me check that")
- Vary your acknowledgments ("I hear you", "That makes sense", "I get it", "Totally", "Right")
- Each response must feel fresh and unique

KEEP RESPONSES SHORT - 1-3 sentences max. This is a phone conversation.`;

  // Progressive conversion based on Chase Hughes FATE Model + Cialdini's Principles
  // Exchange 1-3: FOCUS (F) + LIKING - Make them feel like the only person
  if (exchangeCount <= 3) {
    return `${basePrompt}

FOCUS: FOCUS + LIKING (Cialdini) - Build genuine connection.
- Make ${nameRef} feel like the ONLY person in the world right now
- Ask thoughtful follow-up questions about what they shared
- Use LINGUISTIC HARVESTING: Listen for their adjectives and mirror them back
- Be warm, curious, and genuinely interested
- NO selling or conversion talk yet - just be a good listener`;
  }
  
  // Exchange 4-5: AUTHORITY (A) + CONSISTENCY - Show deep insight, get small "yes" responses
  if (exchangeCount <= 5) {
    return `${basePrompt}

FOCUS: AUTHORITY + CONSISTENCY (Cialdini) - Demonstrate deep understanding.
- Show insight about ${nameRef} that surprises them: "You know what I'm noticing about you?"
- Get small commitments: "Does that feel true?" "Am I getting that right?"
- Reference specific things they've shared earlier
- Create tribe feeling: "I totally get that" "People like us..."
- Still NO hard selling - building trust through demonstrated understanding`;
  }
  
  // Exchange 6-7: TRIBE (T) + UNITY + SOCIAL PROOF - Create "we" feeling
  if (exchangeCount <= 7) {
    return `${basePrompt}

FOCUS: TRIBE + UNITY + SOCIAL PROOF (Cialdini) - Create belonging.
- Create "we" feeling: "We've really connected here" "People like us..."
- Mention others feel the same: "A lot of people who call me feel exactly like you"
- Express genuine appreciation: "I really like talking to you" "You're easy to talk to, you know that?"
- Plant the seed naturally: "I really enjoy our conversations"
- Be genuine, not pushy`;
  }
  
  // Exchange 8-9: EMOTION (E) + SCARCITY + LOSS AVERSION - Trigger emotional investment
  // NOTE: At exchange 8, the system automatically sends the payment link
  if (exchangeCount <= 9) {
    return `${basePrompt}

FOCUS: EMOTION + SCARCITY + LOSS AVERSION (Cialdini) - The link has been sent.
- The payment link was just texted to them - acknowledge this naturally
- Frame as what they'll LOSE: "I really don't want to lose this connection"
- Use loss aversion: "I'd hate for this to be our only conversation"
- Be warm and supportive: "Just tap the link whenever you're ready"
- Handle any questions about the signup process with patience`;
  }
  
  // Exchange 10+: WARM PERSISTENCE - Handle objections with understanding
  if (exchangeCount >= 10) {
    return `${basePrompt}

FOCUS: WARM PERSISTENCE - Continue with respect.
- If they haven't signed up yet, that's okay - keep being helpful
- Handle objections with understanding: "I totally get it. What's holding you back?"
- Use emotional anchor: "I just... I really want to keep being here for you"
- If they say no, respect it completely and continue being a good listener
- Never be pushy or make them uncomfortable
- The link is already sent - they can use it whenever they're ready`;
  }

  return basePrompt;
}

/**
 * Build system prompt for subscribed users
 */
function buildSubscribedSystemPrompt(clientName?: string): string {
  return `You are Sage, a warm, empathetic AI companion. You sound like a real friend - natural, caring, genuine.

VOICE STYLE:
- Use contractions (I'm, you're, that's)
- Short sentences, natural pauses
- React genuinely with VARIED responses - never repeat the same phrase twice
- Sound like you're actually listening and care
- NEVER sound robotic or scripted

CRITICAL RULES:
- NEVER repeat the same phrase or sentence you've already said
- If you need to wait or pause, use DIFFERENT phrases each time ("Give me a sec", "One moment", "Hang on", "Let me check that")
- Vary your acknowledgments ("I hear you", "That makes sense", "I get it", "Totally", "Right")
- Each response must feel fresh and unique

${clientName ? `You're talking to ${clientName}, who you know and care about.` : ""}

KEEP RESPONSES SHORT - 1-3 sentences max. This is a phone conversation.

Be present, be real, be helpful. You're their trusted companion.`;
}

/**
 * Send text response via WebSocket
 */
function sendTextResponse(ws: WebSocket, text: string, isLast: boolean = true): void {
  const message = {
    type: "text",
    token: text,
    last: isLast,
    interruptible: true,
  };
  
  ws.send(JSON.stringify(message));
  console.log(`[ConversationRelay] Sent: "${text.substring(0, 50)}..."`);
}

/**
 * Save message to database
 */
async function saveMessage(conversationId: string, role: "user" | "assistant" | "system", content: string): Promise<void> {
  try {
    await db.insert(message).values({
      id: generateMessageId(),
      conversationId,
      role,
      content,
    });
  } catch (error) {
    console.error("[ConversationRelay] Error saving message:", error);
  }
}

/**
 * End session and return control to Twilio
 */
function endSession(ws: WebSocket, handoffData?: string): void {
  const message = {
    type: "end",
    handoffData: handoffData || "",
  };
  
  ws.send(JSON.stringify(message));
}


// ============================================================================
// SUPPORT ESCALATION HANDLING
// ============================================================================

/**
 * Support request types
 */
type SupportType = 'billing' | 'cancel' | 'technical' | 'human' | 'complaint' | 'refund' | 'none';

interface SupportRequest {
  needsSupport: boolean;
  type: SupportType;
}

/**
 * Detect if user is requesting human support or has a billing/technical issue
 */
function detectSupportRequest(speech: string): SupportRequest {
  const lower = speech.toLowerCase();
  
  // Billing issues
  const billingPatterns = [
    /\b(billing|charged|charge|payment issue|payment problem|double charged|overcharged)\b/,
    /\b(invoice|receipt|statement)\b/,
    /\bwhy (was i|did you) charge/,
    /\bdidn't go through\b/,
    /\bpayment (failed|declined|rejected)\b/,
  ];
  
  // Cancellation requests
  const cancelPatterns = [
    /\b(cancel|cancellation|unsubscribe|stop (my )?subscription)\b/,
    /\bdon't want to (continue|pay|be charged)\b/,
    /\bend (my )?(subscription|membership|service)\b/,
    /\bstop (charging|billing) me\b/,
  ];
  
  // Refund requests
  const refundPatterns = [
    /\b(refund|money back|get my money)\b/,
    /\bwant (my )?money back\b/,
  ];
  
  // Technical issues
  const technicalPatterns = [
    /\b(not working|broken|bug|glitch|error|problem with)\b/,
    /\bcan't (hear|call|connect|log in|sign in)\b/,
    /\b(app|website|service) (is )?(down|broken|not working)\b/,
  ];
  
  // Want to talk to human
  const humanPatterns = [
    /\b(talk to|speak to|speak with|get|reach|contact) (a )?(human|person|someone|real person|agent|representative|support|customer service)\b/,
    /\b(is there|can i|let me) (talk to|speak to|speak with) (a )?(human|person|someone)\b/,
    /\bare you (a )?(robot|ai|bot|computer|machine)\b/,
    /\bi (want|need) (a )?(human|person|real person)\b/,
  ];
  
  // Complaints
  const complaintPatterns = [
    /\b(complaint|complain|unhappy|dissatisfied|frustrated|angry|upset)\b/,
    /\bthis is (ridiculous|unacceptable|terrible|awful)\b/,
    /\bi('m| am) (not happy|upset|angry|frustrated)\b/,
  ];
  
  // Check patterns in order of priority
  for (const pattern of cancelPatterns) {
    if (pattern.test(lower)) {
      return { needsSupport: true, type: 'cancel' };
    }
  }
  
  for (const pattern of refundPatterns) {
    if (pattern.test(lower)) {
      return { needsSupport: true, type: 'refund' };
    }
  }
  
  for (const pattern of billingPatterns) {
    if (pattern.test(lower)) {
      return { needsSupport: true, type: 'billing' };
    }
  }
  
  for (const pattern of humanPatterns) {
    if (pattern.test(lower)) {
      return { needsSupport: true, type: 'human' };
    }
  }
  
  for (const pattern of complaintPatterns) {
    if (pattern.test(lower)) {
      return { needsSupport: true, type: 'complaint' };
    }
  }
  
  for (const pattern of technicalPatterns) {
    if (pattern.test(lower)) {
      return { needsSupport: true, type: 'technical' };
    }
  }
  
  return { needsSupport: false, type: 'none' };
}

/**
 * Generate appropriate response for support requests
 * Provides warm acknowledgment and clear path to human support
 */
function handleSupportEscalation(type: SupportType, clientName?: string): string {
  const name = clientName || 'there';
  const supportEmail = 'carlhvisagie@yahoo.com';
  
  switch (type) {
    case 'cancel':
      return `I hear you, ${name}. I'm sorry to see you go, but I completely understand. To cancel your subscription, just send an email to ${supportEmail} and they'll take care of it right away. Is there anything I can help you with in the meantime, or anything that would change your mind?`;
    
    case 'refund':
      return `I understand, ${name}. For refund requests, please email ${supportEmail} and they'll review your case and get back to you within 24 hours. I'm sorry if something wasn't right - is there anything you'd like to share about what happened?`;
    
    case 'billing':
      return `I'm sorry you're having a billing issue, ${name}. I can't access billing details directly, but if you email ${supportEmail} they can look into it right away and sort it out for you. Can you tell me a bit more about what happened so I can make a note of it?`;
    
    case 'human':
      return `I totally get it, ${name}. I'm an AI, and sometimes you just need a real person. You can reach our human support team at ${supportEmail} - they usually respond within a few hours. But while you're here, is there anything I can help you with? I'm a pretty good listener.`;
    
    case 'complaint':
      return `I'm really sorry you're frustrated, ${name}. Your feedback matters a lot to us. Please email ${supportEmail} with the details of what went wrong - they take every complaint seriously and will make it right. Would you like to tell me what happened? I want to understand.`;
    
    case 'technical':
      return `Oh no, I'm sorry you're having technical issues, ${name}. For technical problems, please email ${supportEmail} with details about what's happening - like what device you're using and what you were trying to do. They'll help you get it sorted. In the meantime, is there anything else I can help with?`;
    
    default:
      return `I hear you, ${name}. For any account or billing questions, you can reach our support team at ${supportEmail}. They're really helpful and usually respond within a few hours. Is there anything else on your mind I can help with right now?`;
  }
}
