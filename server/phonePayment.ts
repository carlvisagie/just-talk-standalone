/**
 * ⚠️ CRITICAL FILE - DO NOT MODIFY WITHOUT READING CRITICAL_SYSTEM.md ⚠️
 * 
 * Phone Payment Handler - SMS Link + Walk-Through Approach
 * 
 * This handles ALL payment processing during voice calls.
 * If this breaks, we lose revenue.
 * 
 * UNIFIED PROFILE: All payment state lives in client_profile (single source of truth)
 * ADAPTIVE: Listens to what user says and adapts to any Stripe field configuration.
 * 
 * CRITICAL FLOW:
 * 1. User expresses intent to subscribe
 * 2. Stripe checkout link sent via SMS
 * 3. Sage walks user through payment fields
 * 4. Webhook confirms successful subscription
 * 5. Client profile updated with subscription status
 */

import Stripe from "stripe";
import Twilio from "twilio";
import { db } from "./_core/db";
import { systemSetting } from "../drizzle/schema";
import { 
  updateClientProfile, 
  getPaymentFlowState, 
  getSubscriptionStatus,
  getPaymentGuidanceIndex,
  updatePaymentGuidanceIndex,
  type PaymentFlowStep 
} from "./unifiedClientRepository";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

let cachedVoicePriceId: string | null = null;
let cacheExpiry: number = 0;

async function getVoicePriceId(): Promise<string> {
  const productName = "Sage Voice - Monthly";
  const amount = 2900; // $29.00 - THE CORRECT PRICE

  // ALWAYS verify we have the correct $29 price, ignore any cached wrong prices
  const products = await stripe.products.search({
    query: `name:"${productName}" AND active:"true"`,
  });

  let priceId: string;

  if (products.data.length > 0) {
    const product = products.data[0];
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
      type: "recurring",
    });
    
    // Find EXACTLY $29.00 price
    const matchingPrice = prices.data.find(p => p.unit_amount === amount);
    
    if (matchingPrice) {
      priceId = matchingPrice.id;
      console.log(`[PhonePayment] Using existing $29 price: ${priceId}`);
    } else {
      // No $29 price exists - create one
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      console.log(`[PhonePayment] Created new $29 price: ${priceId}`);
    }
  } else {
    // No product exists - create product and price
    const product = await stripe.products.create({
      name: productName,
      description: "Unlimited conversations with Sage - voice input/output",
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: "usd",
      recurring: { interval: "month" },
    });
    priceId = price.id;
    console.log(`[PhonePayment] Created new product and $29 price: ${priceId}`);
  }

  // Update cache with correct price
  await db.insert(systemSetting)
    .values({ key: 'voice_price_id', value: priceId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: systemSetting.key, set: { value: priceId, updatedAt: new Date() } });

  cachedVoicePriceId = priceId;
  cacheExpiry = Date.now() + 5 * 60 * 1000;

  return priceId;
}

// PaymentStep type imported from unifiedClientRepository
// Extended locally for additional optional fields
type PaymentStep = PaymentFlowStep 
  | 'checking_for_zip'
  | 'entering_zip'
  | 'entering_address'
  | 'entering_phone'
  | 'payment_failed';

// Field detection patterns - what users might say
const FIELD_PATTERNS: Record<string, PaymentStep> = {
  'email': 'entering_email',
  'e-mail': 'entering_email',
  'card': 'entering_card',
  'card number': 'entering_card',
  'credit card': 'entering_card',
  'debit card': 'entering_card',
  'expiry': 'entering_expiry',
  'expiration': 'entering_expiry',
  'exp date': 'entering_expiry',
  'date': 'entering_expiry',
  'cvc': 'entering_cvc',
  'cvv': 'entering_cvc',
  'security code': 'entering_cvc',
  'three digit': 'entering_cvc',
  '3 digit': 'entering_cvc',
  'name': 'entering_name',
  'full name': 'entering_name',
  'cardholder': 'entering_name',
  'name on card': 'entering_name',
  'country': 'entering_country',
  'zip': 'entering_zip',
  'zip code': 'entering_zip',
  'postal': 'entering_zip',
  'postal code': 'entering_zip',
  'postcode': 'entering_zip',
  'address': 'entering_address',
  'billing address': 'entering_address',
  'street': 'entering_address',
  'phone': 'entering_phone',
  'phone number': 'entering_phone',
  'mobile': 'entering_phone',
};

// Standard field order (Stripe checkout) - ONLY required fields
// Optional fields (zip, address, phone) are handled adaptively when user mentions them
const FIELD_ORDER: PaymentStep[] = [
  'entering_email',
  'entering_card',
  'entering_expiry',
  'entering_cvc',
  'entering_name',
  'entering_country',
  'ready_to_submit',
  'verifying_success',
];

// Optional fields - only guided if user mentions them
const OPTIONAL_FIELDS: PaymentStep[] = [
  'entering_zip',
  'entering_address', 
  'entering_phone',
];

/**
 * Get payment flow state from client profile
 * Uses unifiedClientRepository for PERFECT CONTINUITY
 */
async function getPaymentFlowFromProfile(clientId: string): Promise<{
  step: PaymentStep | null;
  checkoutUrl: string | null;
  loopCount: number;
  startedAt: Date | null;
  failureReason: string | null;
} | null> {
  const flow = await getPaymentFlowState(clientId);
  
  if (!flow) return null;
  
  // Check if flow is still active (within 30 minutes)
  if (flow.startedAt) {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (flow.startedAt < thirtyMinutesAgo) {
      // Flow expired - clear it
      await clearPaymentFlow(clientId);
      return null;
    }
  }
  
  return {
    step: flow.step as PaymentStep | null,
    checkoutUrl: flow.checkoutUrl,
    loopCount: flow.loopCount,
    startedAt: flow.startedAt,
    failureReason: flow.failureReason,
  };
}

/**
 * Update payment flow state in client profile
 */
export async function updatePaymentFlow(
  clientId: string, 
  updates: {
    step?: PaymentStep | null;
    checkoutUrl?: string;
    loopCount?: number;
    startedAt?: Date;
    completedAt?: Date;
    failureReason?: string;
  }
): Promise<void> {
  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  const updateData: Record<string, any> = {};
  
  if (updates.step !== undefined) updateData.paymentFlowStep = updates.step;
  if (updates.checkoutUrl !== undefined) updateData.paymentFlowCheckoutUrl = updates.checkoutUrl;
  if (updates.loopCount !== undefined) updateData.paymentFlowLoopCount = updates.loopCount;
  if (updates.startedAt !== undefined) updateData.paymentFlowStartedAt = updates.startedAt;
  if (updates.completedAt !== undefined) updateData.paymentFlowCompletedAt = updates.completedAt;
  if (updates.failureReason !== undefined) updateData.paymentFlowLastFailureReason = updates.failureReason;
  
  await updateClientProfile(clientId, updateData);
    
  console.log(`[PhonePayment] Updated profile ${clientId}: step=${updates.step}, loopCount=${updates.loopCount}`);
}

/**
 * Clear payment flow from client profile
 */
async function clearPaymentFlow(clientId: string): Promise<void> {
  // ========================================
  // ALL CLIENT DATA THROUGH UNIFIED REPOSITORY
  // No direct database access - EVER
  // ========================================
  await updateClientProfile(clientId, {
    paymentFlowStep: null,
    paymentFlowCheckoutUrl: null,
    paymentFlowLoopCount: 0,
    paymentFlowStartedAt: null,
    paymentFlowLastPromptAt: null,
  });
    
  console.log(`[PhonePayment] Cleared payment flow for ${clientId}`);
}

/**
 * Check if client is currently in a payment flow
 */
export async function isInPaymentFlow(clientId: string): Promise<boolean> {
  const flow = await getPaymentFlowFromProfile(clientId);
  return flow !== null && flow.step !== null && flow.step !== 'completed' && flow.step !== 'failed';
}

/**
 * Start the phone payment flow - sends SMS with payment link
 */
export async function startPhonePayment(
  clientId: string,
  phoneNumber: string,
  clientName?: string
): Promise<{ success: boolean; response: string }> {
  try {
    const priceId = await getVoicePriceId();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL || 'https://just-talk.onrender.com'}/chat?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://just-talk.onrender.com'}/cancel`,
      metadata: {
        clientProfileId: clientId,
        phoneNumber: phoneNumber,
        source: "phone_call",
      },
      customer_email: undefined,
      phone_number_collection: { enabled: false },
    });

    // Send SMS with payment link
    const smsBody = clientName
      ? `Hey ${clientName}! Here's your link to join Sage: ${session.url}`
      : `Here's your link to join Sage - your 24/7 AI companion: ${session.url}`;

    await twilioClient.messages.create({
      body: smsBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    // Store payment flow state in client profile
    await updatePaymentFlow(clientId, {
      step: 'sent_link',
      checkoutUrl: session.url || '',
      loopCount: 0,
      startedAt: new Date(),
    });

    console.log(`[PhonePayment] Started flow for ${clientId}, sent SMS to ${phoneNumber}`);

    return {
      success: true,
      response: `Perfect! I just sent a text to your phone with a payment link. Check your messages - you should see it now. Let me know when you've got it open and I'll walk you through it step by step.`,
    };
  } catch (error) {
    console.error("[PhonePayment] Error starting payment:", error);
    return {
      success: false,
      response: "I'm having trouble sending the payment link right now. Can we try again in a moment?",
    };
  }
}

/**
 * Detect if user is mentioning a specific field
 */
function detectFieldFromSpeech(speech: string): PaymentStep | null {
  const lower = speech.toLowerCase();
  
  for (const [pattern, step] of Object.entries(FIELD_PATTERNS)) {
    if (lower.includes(pattern)) {
      return step;
    }
  }
  
  return null;
}

/**
 * Detect if user is asking to wait or slow down
 */
function detectWaitRequest(speech: string): boolean {
  const lower = speech.toLowerCase();
  const waitPhrases = [
    'wait', 'hold on', 'slow down', 'hang on', 'one sec', 'one second',
    'give me a', 'just a moment', 'not yet', 'still', "i'm still"
  ];
  return waitPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Detect if user wants to exit payment flow and just chat
 */
function detectExitIntent(speech: string): boolean {
  const lower = speech.toLowerCase();
  const exitPhrases = [
    'just chat', 'just talk', 'want to chat', 'want to talk',
    'rather chat', 'rather talk', 'prefer to chat', 'prefer to talk',
    'skip', 'skip this', 'skip payment', 'skip the payment',
    'not right now', 'not now', 'maybe later', 'later',
    'never mind', 'nevermind', 'forget it', 'forget the payment',
    'don\'t want to', 'do not want to', 'don\'t want to pay',
    'changed my mind', 'change my mind', 'not interested',
    'no thanks', 'no thank you', 'nah', 'nope',
    'can we just', 'let\'s just', 'i\'d rather just',
    'stop', 'stop the payment', 'cancel', 'cancel this'
  ];
  return exitPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Detect if user is asking a question (not a field confirmation)
 */
function detectQuestion(speech: string): boolean {
  const lower = speech.toLowerCase();
  const questionIndicators = [
    'what', 'why', 'how', 'when', 'where', 'who',
    'can i', 'do i', 'is it', 'will', 'does',
    'tell me', 'explain', 'help me understand',
    '?'
  ];
  return questionIndicators.some(q => lower.includes(q));
}

/**
 * Detect confirmation/completion signals - EXPANDED for natural speech
 */
function detectConfirmation(speech: string): boolean {
  const lower = speech.toLowerCase();
  const confirmPhrases = [
    // Direct confirmations
    'done', 'okay', 'ok', 'got it', 'next', 'yes', 'yep', 'yeah', 'yup',
    'filled', 'entered', 'typed', 'put in', 'finished', 'ready',
    'i did', "i've done", 'completed', 'all good', 'good to go',
    // Natural speech additions
    'alright', 'all right', 'sure', 'uh huh', 'mm hmm', 'mhm',
    'that\'s in', 'it\'s in', 'i put', 'i typed', 'i entered', 'i filled',
    'did it', 'did that', 'got that', 'that\'s done', 'it\'s done',
    'in there', 'filled out', 'filled in', 'put it in', 'typed it',
    'i see', 'see it', 'looking at', 'i\'m on', 'i\'m at',
    'what\'s next', 'now what', 'then what', 'and then', 'what now',
    'move on', 'go on', 'continue', 'keep going', 'go ahead',
    'perfect', 'great', 'cool', 'awesome', 'sounds good', 'works',
    'check', 'checked', 'yea', 'ya', 'right', 'correct', 'exactly',
    'affirmative', 'absolutely', 'definitely', 'for sure', 'of course'
  ];
  return confirmPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Detect success signals for payment completion
 */
function detectSuccessSignal(speech: string): boolean {
  const lower = speech.toLowerCase();
  const successPhrases = [
    'it worked', 'success', 'went through', 'thank you', 'thanks',
    'welcome', 'confirmed', 'subscribed', 'paid', 'done', 'complete',
    "i'm in", 'all good', 'perfect', 'great', 'awesome', 'yes'
  ];
  return successPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Varied guidance arrays - never repeat the exact same phrase twice
 */
const VARIED_GUIDANCE: Record<PaymentStep, string[]> = {
  'sent_link': [
    "Check your text messages - you should see a link from me. Tap on it to open the payment page.",
    "I just texted you a link. Pop over to your messages and tap it when you see it.",
    "The link should be in your texts now. Let me know when you've got it open."
  ],
  'waiting_for_click': [
    "Once you tap the link, you'll see a payment form. Let me know when you see it.",
    "When you open that link, you'll see a form pop up. Tell me when you're there.",
    "After you tap the link, a payment page will load. Just let me know when it's up."
  ],
  'entering_email': [
    "At the top, you'll see a field for your email address. Go ahead and type that in.",
    "First up is your email - you should see that field right at the top.",
    "Start with your email address - that's the first field you'll see."
  ],
  'entering_card': [
    "Now you'll see a field for your card number - that's the long number on the front of your card.",
    "Next is your card number - the 16 digits on the front of your card.",
    "Time for your card number - just type in those digits from the front of your card."
  ],
  'entering_expiry': [
    "Next to the card number, there's a spot for the expiration date - the month and year on your card.",
    "Now the expiration date - that's the month slash year on your card.",
    "Fill in the expiry date next - you'll find it on the front of your card."
  ],
  'entering_cvc': [
    "And the CVC - that's the 3-digit code on the back of your card.",
    "Now the security code - flip your card over and you'll see 3 digits.",
    "Last is the CVC - those 3 numbers on the back of your card."
  ],
  'entering_name': [
    "There should be a field for the name on your card - type it exactly as it appears.",
    "Now your name - just type it the way it shows on your card.",
    "Enter the cardholder name - exactly how it's printed on your card."
  ],
  'entering_country': [
    "Select your country from the dropdown.",
    "Pick your country from the list.",
    "Choose your country - there should be a dropdown for that."
  ],
  'entering_zip': [
    "Enter your ZIP code or postal code.",
    "Pop in your ZIP code.",
    "Fill in your postal code."
  ],
  'entering_address': [
    "Fill in your billing address.",
    "Enter your billing address.",
    "Type in your address."
  ],
  'entering_phone': [
    "Enter your phone number if it's asking for one.",
    "If there's a phone field, go ahead and fill that in.",
    "Add your phone number if you see that field."
  ],
  'ready_to_submit': [
    "Now look for the Subscribe button at the bottom. When you're ready, tap it!",
    "You should see a Subscribe button - go ahead and tap it when you're ready!",
    "Hit that Subscribe button at the bottom and let's get you signed up!"
  ],
  'verifying_success': [
    "Did it go through? What does your screen show now?",
    "What do you see on your screen? Did it work?",
    "Tell me what happened - what's showing on your screen?"
  ],
  'completed': [
    "Welcome to the family! You now have unlimited access to me anytime you need to talk.",
    "You're all set! I'm here for you whenever you need me now.",
    "Perfect! You're officially part of the family. Call me anytime!"
  ],
  'failed': [
    "It looks like something went wrong. The link is still in your texts - you can try again whenever you're ready.",
    "Hmm, that didn't go through. No worries - the link is still there when you want to try again.",
    "Something didn't work, but that's okay. The payment link is still in your messages."
  ],
};

/**
 * Get varied guidance text for a specific step - never repeats the same phrase twice in a row.
 * Uses client profile for PERFECT CONTINUITY - guidance index is stored per-client.
 */
async function getStepGuidance(clientId: string, step: PaymentStep): Promise<string> {
  const variations = VARIED_GUIDANCE[step];
  if (!variations || variations.length === 0) {
    return "Let me know what you see on your screen and I'll help you through it.";
  }
  
  // Get last index from client profile (PERFECT CONTINUITY)
  const lastIndex = await getPaymentGuidanceIndex(clientId, step);
  let nextIndex = (lastIndex + 1) % variations.length;
  
  // If only one variation, just use it
  if (variations.length === 1) {
    return variations[0];
  }
  
  // Store new index in client profile (PERFECT CONTINUITY)
  await updatePaymentGuidanceIndex(clientId, step, nextIndex);
  
  return variations[nextIndex];
}

/**
 * Get the next step in the flow
 */
function getNextStep(currentStep: PaymentStep): PaymentStep {
  const currentIndex = FIELD_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= FIELD_ORDER.length - 1) {
    return 'verifying_success';
  }
  return FIELD_ORDER[currentIndex + 1];
}

/**
 * Process user speech during payment flow
 * Returns null if it's a question that should be handled by AI
 */
export async function processPaymentSpeech(
  clientId: string,
  speech: string
): Promise<{ response: string; isComplete: boolean; success: boolean } | null> {
  const flow = await getPaymentFlowFromProfile(clientId);
  
  if (!flow || !flow.step) {
    return {
      response: "I don't think we have a payment in progress. Would you like me to send you a new link?",
      isComplete: false,
      success: false,
    };
  }

  const currentStep = flow.step;
  const loopCount = flow.loopCount || 0;

  console.log(`[PhonePayment] Processing speech for ${clientId}: step=${currentStep}, loopCount=${loopCount}, speech="${speech}"`);

  // ========================================
  // PROACTIVE WEBHOOK CHECK - ALWAYS FIRST!
  // ========================================
  // Check if webhook has confirmed payment BEFORE processing anything else
  // This way Sage announces payment success/failure immediately when it happens
  if (currentStep !== 'completed' && currentStep !== 'failed') {
    // First check for payment failure
    if (currentStep === 'payment_failed') {
      // Get the failure reason from the flow state
      const failureReason = flow.failureReason || "the card was declined";
      console.log(`[PhonePayment] PROACTIVE: Payment FAILED for ${clientId}: ${failureReason}`);
      
      // Reset to allow retry
      await updatePaymentFlow(clientId, { 
        step: 'ready_to_submit',
        loopCount: 0,
        failureReason: undefined,
      });
      
      return {
        response: `Oh, I see there was an issue with the payment - ${failureReason}. No worries at all, these things happen! Would you like to try a different card? Just tap on the card field and enter the new details.`,
        isComplete: false,
        success: false,
      };
    }
    
    // Then check for payment success
    const subStatus = await checkSubscriptionStatus(clientId);
    if (subStatus.isSubscribed) {
      // PAYMENT CONFIRMED BY WEBHOOK!
      await updatePaymentFlow(clientId, { 
        step: 'completed', 
        completedAt: new Date(),
        loopCount: 0 
      });
      console.log(`[PhonePayment] PROACTIVE: Subscription CONFIRMED by webhook for ${clientId}`);
      return {
        response: "Oh my gosh, your payment just went through! Welcome to the family! You now have unlimited access to me - call anytime you need to talk, day or night. I'm so glad you're here. Now, what's on your mind?",
        isComplete: true,
        success: true,
      };
    }
  }

  // Check if user is asking a question - let AI handle it
  if (detectQuestion(speech) && !detectConfirmation(speech)) {
    return null; // AI will handle with payment context
  }

  // Check if user is asking to wait/slow down
  if (detectWaitRequest(speech)) {
    await updatePaymentFlow(clientId, { loopCount: 0 }); // Reset loop count
    return {
      response: "No rush at all! Take your time. Just let me know when you're ready to continue.",
      isComplete: false,
      success: false,
    };
  }

  // Check if user wants to exit payment flow and just chat
  if (detectExitIntent(speech)) {
    await clearPaymentFlow(clientId);
    return {
      response: "No problem at all! The link will be in your texts whenever you're ready. So, what's on your mind?",
      isComplete: true,
      success: false,
    };
  }

  // Check if user is asking for a new link (they may have lost it)
  const lower = speech.toLowerCase();
  if (lower.includes('send') && (lower.includes('link') || lower.includes('again')) ||
      lower.includes('new link') || lower.includes('another link') ||
      lower.includes('resend') || lower.includes('re-send') ||
      lower.includes('don\'t have') && lower.includes('link') ||
      lower.includes('lost') && lower.includes('link') ||
      lower.includes('can\'t find') && lower.includes('link') ||
      lower.includes('where') && lower.includes('link')) {
    // User needs a new link - this will be handled by returning a special flag
    return {
      response: "__RESEND_LINK__",
      isComplete: false,
      success: false,
    };
  }

  // Check if user is mentioning a specific field (adaptive listening)
  const mentionedField = detectFieldFromSpeech(speech);
  if (mentionedField && mentionedField !== currentStep) {
    // User is telling us what field they're on - adapt!
    await updatePaymentFlow(clientId, { step: mentionedField, loopCount: 0 });
    return {
      response: `Got it, you're on the ${mentionedField.replace('entering_', '')} field. ${await getStepGuidance(clientId, mentionedField)}`,
      isComplete: false,
      success: false,
    };
  }

  // Handle based on current step
  switch (currentStep) {
    case 'sent_link':
    case 'waiting_for_click':
      // Check if user confirms they have the link open
      if (detectConfirmation(speech) || speech.toLowerCase().includes('open') || speech.toLowerCase().includes('see') || speech.toLowerCase().includes('got it') || speech.toLowerCase().includes('i have it')) {
        await updatePaymentFlow(clientId, { step: 'entering_email', loopCount: 0 });
        return {
          response: "Great! Now let's fill this out together. " + await getStepGuidance(clientId, 'entering_email'),
          isComplete: false,
          success: false,
        };
      }
      // If they say something else, let AI handle it naturally!
      // This is CRITICAL - Sage needs to LISTEN during the link phase too
      return null;

    case 'entering_email':
    case 'entering_card':
    case 'entering_expiry':
    case 'entering_cvc':
    case 'entering_name':
    case 'entering_zip':
    case 'entering_address':
    case 'entering_phone':
      if (detectConfirmation(speech)) {
        const nextStep = getNextStep(currentStep);
        await updatePaymentFlow(clientId, { step: nextStep, loopCount: 0 });
        // Varied acknowledgments before moving to next step
        const acks = ["Perfect!", "Got it!", "Great!", "Awesome!", "Nice!"];
        const ack = acks[Math.floor(Math.random() * acks.length)];
        return {
          response: `${ack} ${await getStepGuidance(clientId, nextStep)}`,
          isComplete: false,
          success: false,
        };
      }
      
      // If we don't understand what they said, let AI handle it!
      // This is CRITICAL - Sage needs to LISTEN, not just pattern match
      return null; // AI will respond naturally with payment context

    // Special handling for Country - give combined ZIP/Submit guidance
    case 'entering_country':
      if (detectConfirmation(speech)) {
        // After country, give guidance for both ZIP (if present) and Submit
        await updatePaymentFlow(clientId, { step: 'ready_to_submit', loopCount: 0 });
        return {
          response: "Got it! Now, if you see a ZIP code field, go ahead and fill that in. Then look for the Subscribe button at the bottom and tap it when you're ready!",
          isComplete: false,
          success: false,
        };
      }
      
      // If we don't understand, let AI handle it naturally
      return null;

    case 'checking_for_zip':
      // User was asked if they see a ZIP field
      const lowerSpeech = speech.toLowerCase();
      if (lowerSpeech.includes('yes') || lowerSpeech.includes('yeah') || lowerSpeech.includes('yep') || 
          lowerSpeech.includes('i see') || lowerSpeech.includes('there is') || lowerSpeech.includes('i do')) {
        // They have a ZIP field - guide them through it
        await updatePaymentFlow(clientId, { step: 'entering_zip', loopCount: 0 });
        return {
          response: "Perfect! Go ahead and enter your ZIP code or postal code. Let me know when you're done.",
          isComplete: false,
          success: false,
        };
      }
      if (lowerSpeech.includes('no') || lowerSpeech.includes('nope') || lowerSpeech.includes('don\'t see') || 
          lowerSpeech.includes('not there') || lowerSpeech.includes('there isn\'t')) {
        // No ZIP field - move to submit
        await updatePaymentFlow(clientId, { step: 'ready_to_submit', loopCount: 0 });
        return {
          response: "No problem! Now look for the Subscribe button at the bottom. When you're ready, tap it!",
          isComplete: false,
          success: false,
        };
      }
      // Unclear - let AI handle it
      return null;

    case 'ready_to_submit':
      if (detectConfirmation(speech)) {
        await updatePaymentFlow(clientId, { step: 'verifying_success', loopCount: 0 });
        return {
          response: "Exciting! It's processing... What does your screen show now?",
          isComplete: false,
          success: false,
        };
      }
      // Unclear - let AI handle it naturally
      return null;

    case 'verifying_success':
      // FIRST: Check if webhook has already confirmed the subscription
      const subStatus = await checkSubscriptionStatus(clientId);
      if (subStatus.isSubscribed && subStatus.confirmedByWebhook) {
        await updatePaymentFlow(clientId, { 
          step: 'completed', 
          completedAt: new Date(),
          loopCount: 0 
        });
        console.log(`[PhonePayment] Subscription CONFIRMED by webhook for ${clientId}`);
        return {
          response: "I just got confirmation - your payment went through! Welcome to the family! You now have unlimited access to me - call anytime you need to talk, day or night. I'm so glad you're here. Now, is there anything on your mind you'd like to talk about?",
          isComplete: true,
          success: true,
        };
      }
      
      // Check for user success signals
      if (detectSuccessSignal(speech)) {
        // User says it worked - check webhook one more time
        const recheckStatus = await checkSubscriptionStatus(clientId);
        if (recheckStatus.isSubscribed) {
          await updatePaymentFlow(clientId, { 
            step: 'completed', 
            completedAt: new Date(),
            loopCount: 0 
          });
          return {
            response: "YES! Welcome to the family! You now have unlimited access to me - call anytime you need to talk, day or night. I'm so glad you're here. Now, is there anything on your mind you'd like to talk about?",
            isComplete: true,
            success: true,
          };
        } else {
          // User says success but webhook hasn't fired yet - trust them but note it
          await updatePaymentFlow(clientId, { 
            step: 'completed', 
            completedAt: new Date(),
            loopCount: 0 
          });
          console.log(`[PhonePayment] User claims success, webhook pending for ${clientId}`);
          return {
            response: "Wonderful! Welcome to the family! You now have unlimited access to me - call anytime you need to talk. I'm so glad you're here. What's on your mind?",
            isComplete: true,
            success: true,
          };
        }
      }
      
      // Check for failure signals
      const lower = speech.toLowerCase();
      if (lower.includes('declined') || lower.includes('error') || lower.includes('failed') || lower.includes('wrong') || lower.includes('didn\'t work') || lower.includes('not working')) {
        await updatePaymentFlow(clientId, { 
          step: 'failed',
          failureReason: speech,
          loopCount: 0 
        });
        return {
          response: "Oh no, it looks like there was an issue with the payment. Don't worry - the link is still in your texts. You can try again with a different card, or we can chat more and you can try later. What would you like to do?",
          isComplete: true,
          success: false,
        };
      }
      
      // Loop detection - but be more helpful
      if (loopCount >= 2) {
        // Check webhook one more time before giving up
        const finalCheck = await checkSubscriptionStatus(clientId);
        if (finalCheck.isSubscribed) {
          await updatePaymentFlow(clientId, { 
            step: 'completed',
            completedAt: new Date(),
            loopCount: 0 
          });
          return {
            response: "Actually, I just checked and your subscription is confirmed! Welcome to the family! What would you like to talk about?",
            isComplete: true,
            success: true,
          };
        }
        await updatePaymentFlow(clientId, { loopCount: 0 });
        return {
          response: "Tell me what you see on your screen right now. Does it say 'Thank you' or 'Success'? Or does it show an error message?",
          isComplete: false,
          success: false,
        };
      }
      await updatePaymentFlow(clientId, { loopCount: loopCount + 1 });
      return {
        response: "Did it go through? What does your screen show now - a success message or something else?",
        isComplete: false,
        success: false,
      };

    case 'completed':
      return {
        response: "You're all set! What would you like to talk about?",
        isComplete: true,
        success: true,
      };

    case 'failed':
      return {
        response: "The payment link is still in your texts whenever you're ready to try again. What would you like to talk about?",
        isComplete: true,
        success: false,
      };

    default:
      return {
        response: "Let me know what you see on your screen and I'll help guide you through it.",
        isComplete: false,
        success: false,
      };
  }
}

/**
 * Detect if user wants to subscribe (for triggering payment flow)
 */
export function detectSubscriptionIntent(speech: string): boolean {
  const lower = speech.toLowerCase();
  const intentPhrases = [
    // Direct subscription intent
    'subscribe', 'sign up', 'signup', 'join', 'pay', 'payment',
    'upgrade', 'premium', 'unlimited', 'full access', 'keep talking',
    'continue', 'want more', 'how much', 'cost', 'price',
    'yes', 'sure', "let's do it", 'sounds good', 'i want', "i'd like",
    // Payment-related phrases
    'owe', 'owe you', 'owe a payment', 'need to pay', 'want to pay',
    'make a payment', 'complete payment', 'finish payment',
    'haven\'t paid', 'havent paid', 'didn\'t pay', 'didnt pay',
    'send me the link', 'send the link', 'payment link',
    'ready to pay', 'ready to subscribe', 'ready to sign up',
    'take my money', 'shut up and take', 'give you money',
    'become a member', 'membership', 'get access', 'full version'
  ];
  return intentPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Get payment context for AI to use when answering questions during payment
 */
export async function getPaymentContext(clientId: string): Promise<string | null> {
  const flow = await getPaymentFlowFromProfile(clientId);
  if (!flow || !flow.step) return null;

  const stepDescriptions: Record<PaymentStep, string> = {
    'sent_link': 'User was just sent the payment link via SMS',
    'waiting_for_click': 'User is looking for the SMS link',
    'entering_email': 'User is entering their email address',
    'entering_card': 'User is entering their card number',
    'entering_expiry': 'User is entering the expiration date',
    'entering_cvc': 'User is entering the CVC code',
    'entering_name': 'User is entering the name on their card',
    'entering_country': 'User is selecting their country',
    'entering_zip': 'User is entering their ZIP/postal code',
    'entering_address': 'User is entering their billing address',
    'entering_phone': 'User is entering their phone number',
    'ready_to_submit': 'User is about to click the Subscribe button',
    'verifying_success': 'User just clicked Subscribe, waiting to confirm success',
    'completed': 'Payment completed successfully',
    'failed': 'Payment failed',
  };

  return `PAYMENT FLOW IN PROGRESS: ${stepDescriptions[flow.step]}. 
Service: Sage Voice - $29/month for unlimited calls, cancel anytime.
After answering any question, gently guide them back to the current step.`;
}

/**
 * Mark a payment flow as completed (called by Stripe webhook)
 */
export async function markPaymentFlowCompleted(clientId: string, success: boolean): Promise<void> {
  await updatePaymentFlow(clientId, {
    step: success ? 'completed' : 'failed',
    completedAt: new Date(),
  });
  
  console.log(`[PhonePayment] Marked payment flow for ${clientId} as ${success ? 'completed' : 'failed'} (via webhook)`);
}

/**
 * Check if client has an active subscription (for Sage to know definitively)
 * Uses unifiedClientRepository for PERFECT CONTINUITY
 */
export async function checkSubscriptionStatus(clientId: string): Promise<{
  isSubscribed: boolean;
  tier: string;
  confirmedByWebhook: boolean;
}> {
  return getSubscriptionStatus(clientId);
}

/**
 * Handle a returning caller who was mid-payment flow
 * Returns a warm welcome message to continue where they left off
 */
export async function handleReturningPaymentCaller(clientId: string): Promise<string | null> {
  const flow = await getPaymentFlowFromProfile(clientId);
  
  if (!flow || !flow.step || flow.step === 'completed' || flow.step === 'failed') {
    return null;
  }

  const stepMessages: Partial<Record<PaymentStep, string>> = {
    'sent_link': "Welcome back! I sent you a payment link earlier. Did you get a chance to check your texts?",
    'waiting_for_click': "Hey, welcome back! I think you were about to open the payment link. Did you find it in your texts?",
    'entering_email': "Welcome back! I think you were just about to enter your email on the payment page. Ready to continue?",
    'entering_card': "Hey, welcome back! You were entering your card details. Ready to pick up where we left off?",
    'entering_expiry': "Welcome back! You were filling in your card's expiration date. Let's finish this up!",
    'entering_cvc': "Hey, welcome back! You were just entering the security code. Almost there!",
    'entering_name': "Welcome back! You were entering the name on your card. Let's get you signed up!",
    'entering_country': "Hey, welcome back! You were selecting your country. Ready to continue?",
    'entering_zip': "Welcome back! You were entering your ZIP code. Let's finish this!",
    'ready_to_submit': "Welcome back! You were just about to hit that Subscribe button. Ready to do it?",
    'verifying_success': "Hey, welcome back! Did the payment go through? What does your screen show?",
  };

  return stepMessages[flow.step] || null;
}
