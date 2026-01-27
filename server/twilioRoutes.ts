/**
 * Twilio webhook routes
 * 
 * These routes handle incoming calls and SMS from Twilio.
 * 
 * NEW: Uses ConversationRelay for state-of-the-art voice AI:
 * - Amazon Polly TTS (Joanna-Generative voice)
 * - Deepgram STT (fastest, most accurate)
 * - WebSocket for real-time, low-latency conversation
 */

import { Express, Request, Response } from "express";
import {
  handleIncomingCall,
  handleVoiceResponse,
  handleTrialVoiceResponse,
  handleIncomingSMS,
  getOrCreateConversation,
} from "./twilioIntegration";
import { getUnifiedClientContext, canUseFeature, findOrCreateClient } from "./unifiedClientRepository";
import { generateGreeting, getGreetingContext, updateLastGreetingVariation } from "./greetingGenerator";
import { generateMessageId } from "./utils/generateId";

/**
 * Extract Twilio parameters from request
 */
function extractTwilioParams(req: Request): { 
  From?: string; 
  To?: string; 
  CallSid?: string; 
  Body?: string; 
  SpeechResult?: string; 
  Confidence?: string;
} {
  if (req.body && typeof req.body === 'object') {
    if (req.body.From || req.body.Called || req.body.SpeechResult) {
      return {
        From: req.body.From || req.body.Caller,
        To: req.body.To || req.body.Called,
        CallSid: req.body.CallSid,
        Body: req.body.Body,
        SpeechResult: req.body.SpeechResult,
        Confidence: req.body.Confidence
      };
    }
    
    if (req.body.Payload) {
      try {
        const payload = typeof req.body.Payload === 'string' ? JSON.parse(req.body.Payload) : req.body.Payload;
        return {
          From: payload.From || payload.Caller,
          To: payload.To || payload.Called,
          CallSid: payload.CallSid,
          Body: payload.Body,
          SpeechResult: payload.SpeechResult,
          Confidence: payload.Confidence
        };
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  return {
    From: req.query.From as string,
    To: req.query.To as string,
    CallSid: req.query.CallSid as string,
    Body: req.query.Body as string,
    SpeechResult: req.query.SpeechResult as string,
    Confidence: req.query.Confidence as string
  };
}

/**
 * Get the WebSocket URL for ConversationRelay
 */
function getWebSocketUrl(req: Request): string {
  // Get the host from the request
  const host = req.get('host') || process.env.RENDER_EXTERNAL_URL?.replace('https://', '') || 'localhost:3000';
  
  // Use wss:// for production, ws:// for local development
  const protocol = host.includes('localhost') ? 'ws' : 'wss';
  
  return `${protocol}://${host}/conversation-relay`;
}

/**
 * Generate TwiML for ConversationRelay
 * This uses ElevenLabs TTS + Deepgram STT for state-of-the-art voice quality
 * 
 * NOTE: Greeting is now generated dynamically by greetingGenerator.ts
 * to provide varied, context-aware greetings that never repeat exactly
 */
function generateConversationRelayTwiML(wsUrl: string, from: string, welcomeGreeting: string): string {
  // ConversationRelay TwiML with ElevenLabs (default) and Deepgram (default)
  // Using a warm, female ElevenLabs voice
  // Pass phone number as custom parameter for session setup
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay 
      url="${wsUrl}"
      welcomeGreeting="${escapeXml(welcomeGreeting)}"
      welcomeGreetingInterruptible="any"
      language="en-US"
      ttsProvider="Amazon"
      voice="Joanna-Generative"
      transcriptionProvider="Deepgram"
      speechModel="nova-3-general"
      interruptible="any"
      interruptSensitivity="medium"
    >
      <Parameter name="from" value="${from}" />
    </ConversationRelay>
  </Connect>
</Response>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function setupTwilioRoutes(app: Express) {
  /**
   * Webhook for incoming phone calls
   * 
   * NEW: Uses ConversationRelay for state-of-the-art voice AI
   */
  app.post("/api/twilio/incoming-call", async (req: Request, res: Response) => {
    try {
      console.log("[Twilio] Incoming call webhook received");
      console.log("[Twilio] Body keys:", req.body ? Object.keys(req.body) : 'null');
      
      const params = extractTwilioParams(req);
      const From = params.From;
      const To = params.To;
      const CallSid = params.CallSid;
      const SpeechResult = params.SpeechResult;
      const Confidence = params.Confidence;
      
      console.log("[Twilio] Extracted - From:", From, "To:", To, "SpeechResult:", SpeechResult ? 'yes' : 'no');
      
      // ========================================
      // SPEECH RESULT - Legacy fallback (shouldn't happen with ConversationRelay)
      // ========================================
      if (SpeechResult && From) {
        console.log("[Twilio] SpeechResult detected - using legacy handler");
        
        const context = await getUnifiedClientContext({ type: "phone", value: From });
        const clientId = context.profile.id;
        const conversationId = await getOrCreateConversation(clientId, "phone");
        const phoneAccess = canUseFeature(context, "phone");
        
        if (phoneAccess.allowed) {
          const twiml = await handleVoiceResponse(clientId, conversationId, SpeechResult, parseFloat(Confidence || "0"));
          res.type("text/xml");
          res.send(twiml);
          return;
        } else {
          const twiml = await handleTrialVoiceResponse(clientId, conversationId, SpeechResult, parseFloat(Confidence || "0"));
          res.type("text/xml");
          res.send(twiml);
          return;
        }
      }
      
      // ========================================
      // NEW INCOMING CALL - Use ConversationRelay
      // ========================================
      
      // Check for debug/status callbacks
      if (req.body && (req.body.ParentAccountSid || req.body.Payload || req.body.Level)) {
        console.log("[Twilio] Ignoring debug/status callback");
        res.type("text/xml");
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }
      
      // Get client context and generate dynamic greeting
      let welcomeGreeting = "Hey there! I'm Sage. I'm really glad you called. Something told you to reach out, right? Tell me what's on your mind.";
      
      if (From) {
        try {
          const context = await getUnifiedClientContext({ type: "phone", value: From });
          const clientId = context.profile.id;
          
          // Build greeting context from unified profile
          const greetingContext = {
            clientProfileId: clientId,
            preferredName: context.profile.preferredName || undefined,
            isReturning: context.recentConversations.length > 0,
            lastInteractionDate: context.profile.lastContactDate || undefined,
            lastGreetingVariation: context.profile.lastGreetingVariation || 0,
            totalExchangeCount: context.profile.totalExchangeCount || 0,
            recentTopic: context.recentConversations[0]?.topic || undefined,
          };
          
          // Generate varied, context-aware greeting
          const { greeting, variationIndex } = generateGreeting(greetingContext);
          welcomeGreeting = greeting;
          
          // Save which variation we used (so we don't repeat it)
          updateLastGreetingVariation(clientId, variationIndex).catch(err => 
            console.error("[Twilio] Failed to save greeting variation:", err)
          );
          
          console.log("[Twilio] Generated greeting for", context.profile.preferredName || "unknown", "- variation", variationIndex);
        } catch (error) {
          console.log("[Twilio] Could not get client context, using default greeting");
        }
      }
      
      // Generate ConversationRelay TwiML
      const wsUrl = getWebSocketUrl(req);
      console.log("[Twilio] WebSocket URL:", wsUrl);
      
      const twiml = generateConversationRelayTwiML(wsUrl, From || '', welcomeGreeting);
      console.log("[Twilio] Sending ConversationRelay TwiML");
      
      res.type("text/xml");
      res.send(twiml);
    } catch (error) {
      console.error("[Twilio] Error handling incoming call:", error);
      
      // Fallback to legacy approach if ConversationRelay fails
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hey, I'm Sage. I'm having a little technical hiccup, but I'm still here. What's going on?</Say>
  <Gather input="speech" action="/api/twilio/incoming-call" method="POST" speechTimeout="auto">
    <Pause length="1"/>
  </Gather>
</Response>`);
    }
  });

  /**
   * Webhook for incoming SMS
   */
  app.post("/api/twilio/incoming-sms", async (req: Request, res: Response) => {
    try {
      const params = extractTwilioParams(req);
      const From = params.From;
      const To = params.To;
      const Body = params.Body;

      console.log("[Twilio] Incoming SMS from:", From);

      if (!From || !Body) {
        console.error("[Twilio] Missing From or Body in SMS");
        res.type("text/xml");
        res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Message>Hey! Something went wrong. Try again?</Message></Response>');
        return;
      }

      const response = await handleIncomingSMS(From, To || "", Body);
      
      res.type("text/xml");
      res.send('<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>' + response + '</Message>\n</Response>');
    } catch (error) {
      console.error("[Twilio] Error handling incoming SMS:", error);
      res.type("text/xml");
      res.send('<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n  <Message>Hey, I\'m having a moment. Try again in a sec?</Message>\n</Response>');
    }
  });

  /**
   * Legacy endpoints - redirect to main handler
   */
  app.post("/api/twilio/voice-trial", async (req: Request, res: Response) => {
    console.log("[Twilio] Legacy voice-trial endpoint hit - redirecting to incoming-call");
    req.url = "/api/twilio/incoming-call";
    app._router.handle(req, res, () => {});
  });

  app.post("/api/twilio/voice-response", async (req: Request, res: Response) => {
    console.log("[Twilio] Legacy voice-response endpoint hit - redirecting to incoming-call");
    req.url = "/api/twilio/incoming-call";
    app._router.handle(req, res, () => {});
  });

  app.post("/api/twilio/voice-response-anonymous", async (req: Request, res: Response) => {
    console.log("[Twilio] Anonymous voice response");
    const params = extractTwilioParams(req);
    const SpeechResult = params.SpeechResult;
    const From = params.From;

    if (From) {
      try {
        const context = await getUnifiedClientContext({ type: "phone", value: From });
        const clientId = context.profile.id;
        const conversationId = await getOrCreateConversation(clientId, "phone");
        const phoneAccess = canUseFeature(context, "phone");
        
        if (phoneAccess.allowed) {
          const twiml = await handleVoiceResponse(clientId, conversationId, SpeechResult || "Hello", 0);
          res.type("text/xml");
          res.send(twiml);
          return;
        } else {
          const twiml = await handleTrialVoiceResponse(clientId, conversationId, SpeechResult || "Hello", 0);
          res.type("text/xml");
          res.send(twiml);
          return;
        }
      } catch (error) {
        console.error("[Twilio] Error in anonymous handler:", error);
      }
    }

    // Fallback
    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">I hear you. Tell me more about what's going on.</Say>
  <Gather input="speech" action="/api/twilio/incoming-call" method="POST" speechTimeout="auto">
    <Pause length="1"/>
  </Gather>
</Response>`);
  });

  console.log("[Twilio] Routes initialized with ConversationRelay support");
}
