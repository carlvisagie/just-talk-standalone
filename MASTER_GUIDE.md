# MASTER GUIDE - JUST TALK / PURPOSEFUL LIVE COACHING

> **THIS IS THE ONE TRUE SOURCE. ALL OTHER DOCUMENTATION IS ARCHIVED.**
> 
> If you're an AI agent or developer, READ THIS ENTIRE DOCUMENT before touching anything.

---

## TABLE OF CONTENTS

1. [What This Is](#1-what-this-is)
2. [The Vision](#2-the-vision)
3. [System Architecture](#3-system-architecture)
4. [The Foundation: Perfect Continuity](#4-the-foundation-perfect-continuity)
5. [Conversion Flow](#5-conversion-flow)
6. [Critical Files](#6-critical-files)
7. [Protection Layers](#7-protection-layers)
8. [Infrastructure](#8-infrastructure)
9. [Database Schema](#9-database-schema)
10. [API & Webhooks](#10-api--webhooks)
11. [Rollback Procedures](#11-rollback-procedures)
12. [Rules for AI Agents](#12-rules-for-ai-agents)

---

## 1. WHAT THIS IS

**Just Talk** is an AI-powered voice coaching platform. Users call a phone number and talk to **Sage**, an AI companion who:
- Listens without judgment
- Remembers everything about them
- Provides emotional support 24/7
- Costs $29/month after a free trial

**Phone Number:** +1 775-455-8329

**This is the frictionless onboarding module** for the larger Purposeful Live Coaching wellness ecosystem.

---

## 2. THE VISION

> **Our moral obligation is to help as many people as possible.**

Sage is not a chatbot. She's a lifeline for people who need someone to talk to at 3am when no one else is available. The technology must serve this mission.

**What makes Sage different:**
- **Perfect Continuity** - She remembers your wife's name, your son's birthday, your struggles
- **Always Available** - 24/7, no appointments, no waiting
- **No Judgment** - Just listening and support
- **Natural Conversation** - Feels like talking to a friend, not a robot

---

## 3. SYSTEM ARCHITECTURE

### Tech Stack
| Component | Technology |
|-----------|------------|
| Voice | Twilio + ConversationRelay WebSocket |
| Speech-to-Text | Deepgram |
| Text-to-Speech | ElevenLabs |
| AI Brain | OpenAI GPT-4.1-nano |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Render) |
| ORM | Drizzle |
| Hosting | Render |
| Payments | Stripe |

### Call Flow
```
User Calls +1 775-455-8329
        ↓
Twilio receives call → twilioRoutes.ts
        ↓
TwiML connects to ConversationRelay WebSocket
        ↓
conversationRelay.ts handles the session:
  1. findOrCreateClient() → Gets/creates unified profile
  2. getUnifiedClientContext() → Loads full context
  3. buildSmartContext() → Assembles 3-tier memory
  4. generateGreeting() → Personalized greeting
        ↓
CONVERSATION LOOP:
  - Deepgram transcribes user speech
  - AI generates response with full context
  - ElevenLabs speaks the response
  - Exchange count increments
  - Profile updates persist
        ↓
CALL ENDS:
  - updateProfileAfterInteraction() extracts insights
  - Relationships, events, patterns saved to profile
```

---

## 4. THE FOUNDATION: PERFECT CONTINUITY

> **Without perfect continuity, we have nothing. Just another useless toy.**

### The Golden Rule

**ALL `clientProfile` database operations MUST go through `unifiedClientRepository.ts`**

No exceptions. No shortcuts. No "just this once."

### Three-Tier Memory System

| Tier | Content | Tokens | When Loaded |
|------|---------|--------|-------------|
| **Tier 1: Core Identity** | Name, relationships, crisis info, subscription | ~500 | Always |
| **Tier 2: Active Context** | Goals, emotional patterns, recent events | ~1000 | Relevance-based |
| **Tier 3: Historical** | Full history, long-term patterns | ~500 | On-demand |

### Data Flow

```
CALL STARTS
    ↓
findOrCreateClient() → Gets/creates unified profile
    ↓
getUnifiedClientContext() → Loads full context
    ↓
buildSmartContext() → Assembles 3-tier memory for AI
    ↓
CONVERSATION (each exchange)
    ↓
updateClientProfile() → Persists exchange count, insights
    ↓
CALL ENDS
    ↓
updateProfileAfterInteraction() → Extracts relationships, events, patterns
```

### What Gets Remembered

- **Relationships**: Wife, husband, kids, friends, colleagues (stored in `client_relationship` table)
- **Life Events**: Job changes, losses, celebrations
- **Emotional Patterns**: Mood trends, triggers, coping mechanisms
- **Goals**: What they're working on, progress made
- **Preferences**: How they like to be addressed, topics to avoid

---

## 5. CONVERSION FLOW

### The Science (Cialdini + Chase Hughes FATE Model)

| Exchange | Technique | What Sage Does |
|----------|-----------|----------------|
| 1-3 | **FOCUS + LIKING** | Build genuine connection, make them feel heard |
| 4-5 | **AUTHORITY + CONSISTENCY** | Show deep insight, get small "yes" responses |
| 6-7 | **UNITY + SOCIAL PROOF** | Create "we" feeling, mention others feel same |
| **8** | **EMOTION + SCARCITY** | **AUTOMATIC: Send payment link via SMS** |
| 9+ | **WARM PERSISTENCE** | Handle objections with understanding |

### How It Works

1. **Exchange count persists across ALL calls** - stored in `totalExchangeCount` on profile
2. **At exchange 8**, Sage automatically:
   - Sends payment link via SMS
   - Says: "I'm texting you a link right now - just tap it whenever you're ready"
3. **Payment link tracking** - `paymentLinkSentAt` prevents duplicate sends
4. **After payment**, webhook updates profile → Sage says "Welcome to the family!"

### Payment Flow

```
Exchange 8 reached (across any number of calls)
        ↓
startPhonePayment() sends SMS with Stripe link
        ↓
User clicks link → Stripe Checkout
        ↓
Payment succeeds → Stripe webhook fires
        ↓
stripeWebhook.ts updates profile:
  - subscriptionTier = 'phone'
  - markPaymentFlowCompleted()
        ↓
Next time user speaks → Sage detects subscription
        ↓
"Welcome to the family!"
```

---

## 6. CRITICAL FILES

### DO NOT MODIFY WITHOUT UNDERSTANDING

| File | Purpose | Risk Level |
|------|---------|------------|
| `server/unifiedClientRepository.ts` | **THE SINGLE SOURCE OF TRUTH** for all client data | 🔴 CRITICAL |
| `server/conversationRelay.ts` | Main voice handler - WebSocket session management | 🔴 CRITICAL |
| `server/smartContextBuilder.ts` | Builds 3-tier memory context for AI | 🔴 CRITICAL |
| `server/postInteractionUpdater.ts` | Extracts and saves insights after calls | 🔴 CRITICAL |
| `server/phonePayment.ts` | Payment flow state machine | 🟡 HIGH |
| `server/twilioRoutes.ts` | Call routing and greeting generation | 🟡 HIGH |
| `server/webhooks/stripeWebhook.ts` | Payment webhook handler | 🟡 HIGH |
| `drizzle/schema.ts` | Database schema - changes require migration | 🔴 CRITICAL |

### File Relationships

```
twilioRoutes.ts (receives call)
        ↓
conversationRelay.ts (handles session)
        ↓ uses
unifiedClientRepository.ts (all client data)
        ↓ uses
smartContextBuilder.ts (builds AI context)
        ↓
postInteractionUpdater.ts (saves after call)
```

---

## 7. PROTECTION LAYERS

### Layer 1: Pre-commit Hook
`.husky/pre-commit` automatically blocks commits with direct `clientProfile` operations outside `unifiedClientRepository.ts`.

### Layer 2: CODEOWNERS
`.github/CODEOWNERS` requires owner review for changes to critical files.

### Layer 3: Branch Protection
- Requires 1 approving review for PRs
- Enforce admins (even owner can't bypass)
- No force pushes
- No deletions

### Layer 4: Database Constraint
`UNIQUE` constraint on `phone_number` prevents duplicate profiles.

### Layer 5: Tagged Releases
- `v1.0-stable` - Initial stable release
- `v1.1-continuity-locked` - Verified continuity state

---

## 8. INFRASTRUCTURE

### Render
- **Service:** `just-talk`
- **URL:** https://just-talk.onrender.com
- **Auto-deploy:** From `main` branch
- **Database:** PostgreSQL on Render

### Twilio
- **Phone:** +1 775-455-8329
- **Webhook:** https://just-talk.onrender.com/twilio/voice
- **ConversationRelay:** WebSocket connection for real-time voice

### Stripe
- **Product:** $29/month phone coaching
- **Webhook:** https://just-talk.onrender.com/webhooks/stripe

### GitHub
- **Repo:** `carlvisagie/purposeful-live-coaching`
- **Branch:** `main` (production)

---

## 9. DATABASE SCHEMA

### Core Tables

```
clientProfile (THE HUB)
├── id (primary key)
├── phoneNumber (unique)
├── email
├── firstName, lastName, preferredName
├── subscriptionTier ('free' | 'phone')
├── totalExchangeCount (persists across calls)
├── paymentLinkSentAt (tracks if link sent)
├── aiSummary (AI-generated insights)
├── crisisProtocol
└── timestamps

client_relationship
├── id
├── clientProfileId (FK → clientProfile)
├── name
├── relationship (wife, son, friend, etc.)
└── notes

conversation
├── id
├── clientProfileId (FK → clientProfile)
├── startedAt, endedAt
└── messageCount

message
├── id
├── conversationId (FK → conversation)
├── role (user | assistant)
├── content
└── timestamp
```

---

## 10. API & WEBHOOKS

### Twilio Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/twilio/voice` | POST | Incoming call handler |
| `/twilio/status` | POST | Call status updates |

### Stripe Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhooks/stripe` | POST | Payment events |

### Internal Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |

---

## 11. ROLLBACK PROCEDURES

### If Something Breaks

```bash
# Check current state
git log --oneline -5

# Restore to continuity-locked state
git checkout v1.1-continuity-locked

# Or restore to initial stable
git checkout v1.0-stable

# Force deploy (if needed)
git push -f origin main
```

### Database Rollback
Contact Render support or restore from backup.

---

## 12. RULES FOR AI AGENTS

### Before You Do Anything

1. **READ THIS ENTIRE DOCUMENT**
2. **Pull the latest code from GitHub**
3. **Understand what you're changing and why**
4. **Check if it touches client data**

### The Non-Negotiable Rules

1. **ALL `clientProfile` operations go through `unifiedClientRepository.ts`**
2. **Never bypass the pre-commit hook**
3. **Never force push to main**
4. **Never modify schema without migration**
5. **Never change Twilio/Stripe webhooks without testing**

### If You're Asked to Add a Feature

1. Check if it affects client data
2. If yes, add functions to `unifiedClientRepository.ts` first
3. Use those functions in your feature code
4. Test thoroughly
5. Create a PR (don't push directly to main)

### If You Break Something

1. **Don't panic**
2. Check the error logs on Render
3. If it's a client data issue, check `unifiedClientRepository.ts`
4. If needed, rollback to a tagged release
5. Document what went wrong

### What Success Looks Like

- Sage remembers everything about every user
- Conversion happens naturally at exchange 8
- No duplicate profiles
- No lost data
- Users feel heard and supported

---

## REMEMBER

> **Continuity is not a feature. It's the foundation.**
> 
> Without it, Sage is just another useless toy.
> With it, Sage is a lifeline for people who need someone to talk to.

**This is our moral obligation. Don't break it.**

---

*Last updated: January 19, 2026*
*Version: 1.1-continuity-locked*
