# Just Talk - Template Replication Guide

This document explains how to replicate the Just Talk template for other PurposefulLive modules.

---

## Overview

Just Talk serves as the bulletproof template for deploying 34+ wellness modules as standalone landing pages. Each module will eventually connect to the unified PurposefulLive platform, but starts as a standalone service.

**Time to replicate:** 2-4 hours per module (vs 20-40 hours without template)

---

## Core Architecture

### 1. Database Schema Pattern

**File:** `drizzle/schema.ts`

Every module needs these core tables:

```typescript
// 1. CLIENT PROFILE - The single source of truth
export const clientProfile = mysqlTable("client_profile", {
  id: varchar("id", { length: 255 }).primaryKey(),
  preferredName: varchar("preferred_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phoneNumber: varchar("phone_number", { length: 50 }),
  
  // Behavioral data
  totalInteractions: int("total_interactions").default(0),
  totalTimeSpent: int("total_time_spent").default(0), // seconds
  lastActiveAt: timestamp("last_active_at"),
  
  // Crisis tracking
  crisisRiskLevel: varchar("crisis_risk_level", { length: 50 }),
  lastCrisisDate: timestamp("last_crisis_date"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 2. VOICE SIGNATURE - For user recognition
export const voiceSignature = mysqlTable("voice_signature", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 }).notNull(),
  sessionId: varchar("session_id", { length: 255 }),
  browserFingerprint: text("browser_fingerprint"),
  // Add voice biometrics data here when implementing
});

// 3. INTERACTION LOG - Track everything
export const interactionLog = mysqlTable("interaction_log", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 }).notNull(),
  interactionType: varchar("interaction_type", { length: 50 }).notNull(),
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// 4. CRISIS LOG - Track crisis events
export const crisisLog = mysqlTable("crisis_log", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 }).notNull(),
  conversationId: varchar("conversation_id", { length: 255 }),
  level: varchar("level", { length: 50 }).notNull(), // medium, high, critical
  triggerKeywords: json("trigger_keywords"),
  triggerMessage: text("trigger_message"),
  confidence: float("confidence"),
  escalated: boolean("escalated").default(false),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

**Module-specific tables:** Add tables specific to your module's functionality (e.g., `conversation` and `message` for Just Talk).

---

### 2. ProfileGuard Pattern

**File:** `server/profileGuard.ts`

ProfileGuard ensures perfect continuity by maintaining a unified client profile.

**Key functions:**

```typescript
// Get complete client context
export async function getClientContext(clientId: string): Promise<string>

// Update client context after interaction
export async function updateClientContext(clientId: string, data: any): Promise<void>

// Create new client profile
export async function createClientProfile(data: any): Promise<string>
```

**Integration pattern:**

```typescript
// In your tRPC router
myProcedure: publicProcedure
  .input(z.object({
    clientId: z.string().optional(),
    // ... other inputs
  }))
  .mutation(async ({ input }) => {
    // Get or create client
    let clientId = input.clientId;
    if (!clientId) {
      clientId = await createClientProfile({
        preferredName: input.name,
      });
    }
    
    // Get context
    const context = await getClientContext(clientId);
    
    // Use context in your logic
    // ...
    
    // Update context after interaction
    await updateClientContext(clientId, {
      lastInteraction: new Date(),
      // ... other updates
    });
    
    return { clientId, /* ... other data */ };
  }),
```

---

### 3. Voice Recognition Pattern

**File:** `server/voiceRecognition.ts`

Recognize returning users without requiring login.

**Implementation:**

```typescript
export async function identifyClient(
  sessionId?: string,
  browserFingerprint?: string,
  phoneNumber?: string
): Promise<string | null>

export async function storeVoiceSignature(
  clientId: string,
  sessionId?: string,
  browserFingerprint?: string
): Promise<void>
```

**Usage:**

```typescript
// Try to identify returning user
const existingClientId = await identifyClient(
  sessionId,
  browserFingerprint,
  phoneNumber
);

if (existingClientId) {
  // Welcome back!
  clientId = existingClientId;
} else {
  // New user - create profile
  clientId = await createClientProfile({});
  await storeVoiceSignature(clientId, sessionId, browserFingerprint);
}
```

---

### 4. Crisis Detection Pattern

**File:** `server/crisisDetection.ts`

Detect crisis situations and escalate appropriately.

**Key functions:**

```typescript
export function detectCrisis(message: string): CrisisDetectionResult

export async function logCrisisEvent(
  clientId: string,
  conversationId: string,
  detection: CrisisDetectionResult,
  message: string
): Promise<void>

export async function sendCrisisAlert(
  clientId: string,
  detection: CrisisDetectionResult,
  message: string
): Promise<void>

export function getCrisisResponseGuidance(
  level: "none" | "low" | "medium" | "high" | "critical"
): string
```

**Integration:**

```typescript
// In your message handler
const crisisDetection = detectCrisis(userMessage);

if (crisisDetection.isCrisis) {
  await logCrisisEvent(clientId, conversationId, crisisDetection, userMessage);
  
  if (crisisDetection.level === "critical" || crisisDetection.level === "high") {
    await sendCrisisAlert(clientId, crisisDetection, userMessage);
  }
}

// Add crisis guidance to AI prompt
const crisisGuidance = crisisDetection.isCrisis 
  ? getCrisisResponseGuidance(crisisDetection.level)
  : "";
```

**Customize keywords:** Update `CRISIS_KEYWORDS` in `crisisDetection.ts` for module-specific crisis indicators.

---

### 5. Twilio Integration Pattern

**Files:** `server/twilioIntegration.ts`, `server/twilioRoutes.ts`

Enable phone and SMS access to your module.

**Setup:**

1. Add Twilio routes to `server/_core/index.ts`:
```typescript
import { setupTwilioRoutes } from "../twilioRoutes";
setupTwilioRoutes(app);
```

2. Configure Twilio webhooks to point to:
   - `/api/twilio/incoming-call` - For phone calls
   - `/api/twilio/voice-response` - For speech transcription
   - `/api/twilio/incoming-sms` - For SMS messages

3. Customize TwiML responses in `twilioIntegration.ts` for your module's greeting and flow.

**Key pattern:** Recognize users by phone number:

```typescript
const existingClient = await identifyClient(undefined, undefined, phoneNumber);
```

---

### 6. UI/UX Pattern

**Landing Page:** `client/src/pages/Home.tsx`

**Structure:**
1. Hero section with compelling value proposition
2. Features section (6 cards highlighting benefits)
3. Pricing section (3 tiers: Free, Voice $9, Phone $29)
4. Emergency disclaimer (988/911 resources)
5. Footer with legal links

**Design principles:**
- Gradient backgrounds (purple/pink/blue)
- White cards with backdrop blur
- Smooth transitions and hover states
- Mobile-first responsive design
- Accessibility (WCAG 2.1 AA)

**Chat Interface:** `client/src/pages/Chat.tsx`

**Features:**
- Mood selection buttons
- Voice input (browser speech recognition)
- Text-to-speech responses
- Smooth scrolling
- Loading states
- Empty states

---

## Replication Checklist

### Phase 1: Database Setup
- [ ] Copy `drizzle/schema.ts` template
- [ ] Add module-specific tables
- [ ] Run `pnpm db:push` to create tables

### Phase 2: ProfileGuard
- [ ] Copy `server/profileGuard.ts`
- [ ] Customize context building for your module
- [ ] Integrate into your tRPC routers

### Phase 3: Voice Recognition
- [ ] Copy `server/voiceRecognition.ts`
- [ ] Add module-specific recognition logic
- [ ] Test returning user identification

### Phase 4: Crisis Detection
- [ ] Copy `server/crisisDetection.ts`
- [ ] Customize keywords for your module
- [ ] Integrate into message handlers
- [ ] Test escalation flow

### Phase 5: Twilio Integration
- [ ] Copy `server/twilioIntegration.ts` and `server/twilioRoutes.ts`
- [ ] Customize greetings and TwiML responses
- [ ] Configure Twilio webhooks
- [ ] Test phone/SMS access

### Phase 6: UI/UX
- [ ] Copy `client/src/pages/Home.tsx` template
- [ ] Customize copy for your module
- [ ] Update features section
- [ ] Adjust pricing if needed
- [ ] Copy `client/src/pages/Chat.tsx` (or create module-specific UI)
- [ ] Test mobile responsiveness

### Phase 7: Testing
- [ ] Test new user flow
- [ ] Test returning user recognition
- [ ] Test crisis detection
- [ ] Test phone/SMS integration
- [ ] Test mobile experience
- [ ] Test accessibility

### Phase 8: Deployment
- [ ] Build production bundle
- [ ] Deploy to hosting
- [ ] Configure domain
- [ ] Set up monitoring
- [ ] Create checkpoint

---

## Module-Specific Customization

### Sleep Module Example

**Database additions:**
```typescript
export const sleepLog = mysqlTable("sleep_log", {
  id: varchar("id", { length: 255 }).primaryKey(),
  clientProfileId: varchar("client_profile_id", { length: 255 }).notNull(),
  sleepQuality: int("sleep_quality"), // 1-10
  hoursSlept: float("hours_slept"),
  notes: text("notes"),
  date: date("date").notNull(),
});
```

**Crisis keywords:**
Add sleep-specific crisis indicators:
```typescript
"can't sleep for days",
"hallucinating from lack of sleep",
"sleep deprivation",
```

**UI customization:**
- Change hero copy to focus on sleep
- Update features to highlight sleep benefits
- Add sleep tracking visualizations

---

## Common Pitfalls

### 1. Forgetting to Update Client Context
Always call `updateClientContext()` after interactions to maintain continuity.

### 2. Not Handling New vs Returning Users
Always check for existing client ID before creating new profile.

### 3. Skipping Crisis Detection
Even non-crisis modules should detect and escalate serious situations.

### 4. Ignoring Mobile Experience
Test on actual mobile devices, not just browser dev tools.

### 5. Not Customizing Keywords
Generic crisis keywords may miss module-specific indicators.

---

## Performance Optimization

### Database Queries
- Index `clientProfileId` on all tables
- Index `createdAt` for time-based queries
- Limit conversation history to last 10-20 messages

### Frontend
- Lazy load components
- Optimize images
- Use production build
- Enable gzip compression

### API
- Cache client context (5-minute TTL)
- Rate limit endpoints
- Use connection pooling

---

## Security Considerations

### Data Privacy
- Never log sensitive user messages
- Encrypt crisis logs
- Implement data retention policy (30-90 days)

### Authentication
- Use session-based recognition (no passwords)
- Implement rate limiting
- Validate all inputs

### Crisis Handling
- Log all crisis events
- Alert owner immediately for critical events
- Provide 988/911 resources prominently

---

## Monitoring & Maintenance

### Key Metrics
- Active users (daily/weekly/monthly)
- Conversation length (messages per session)
- Crisis detection rate
- User retention (returning users)
- Response time (API latency)

### Alerts
- Crisis events (high/critical)
- API errors (>5% error rate)
- Database connection issues
- High latency (>2s response time)

### Regular Tasks
- Review crisis logs weekly
- Update crisis keywords monthly
- Optimize database queries quarterly
- Security audit annually

---

## Support & Resources

**Template Repository:** `/home/ubuntu/just-talk-standalone`

**Documentation:**
- `MASTER_GUIDE.md` - Platform overview
- `TEMPLATE_GUIDE.md` - This document
- `AUTONOMOUS_BUILD_STATUS.md` - Build progress

**Key Files:**
- `drizzle/schema.ts` - Database schema
- `server/profileGuard.ts` - ProfileGuard implementation
- `server/crisisDetection.ts` - Crisis detection
- `server/twilioIntegration.ts` - Phone/SMS integration
- `client/src/pages/Home.tsx` - Landing page template
- `client/src/pages/Chat.tsx` - Chat interface template

**Contact:**
- Owner: carlhvisagie@yahoo.com
- Emergency: +18507252089

---

## Version History

**v1.0 (Current)** - Just Talk template
- ProfileGuard system
- Voice recognition (MVP)
- Crisis detection
- Twilio integration
- World-class UI/UX

**Future Enhancements:**
- Real voice biometrics
- Advanced behavioral analysis
- Multi-language support
- Video call integration

---

**Last Updated:** 2025-01-01
**Template Status:** Production-ready
**Replication Count:** 0 (Just Talk is first)
