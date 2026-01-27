# Just Talk TODO

## 🚨 URGENT: Payment System
- [x] Add Stripe integration for Voice plan ($12/month)
- [x] Add Stripe integration for Phone plan ($29/month)
- [x] Wire up payment buttons to Stripe checkout
- [x] Create Stripe products and prices
- [x] Fix payment buttons - convert from protectedProcedure to publicProcedure
- [x] Allow anonymous users to checkout (no login required)
- [ ] Create user account after successful payment (webhook needed)
- [ ] Test checkout flow end-to-end on production

## ✅ COMPLETED
- [x] Remove ALL Manus code and dependencies
- [x] Build successful with 0 errors
- [x] 100% standalone platform
- [x] Deploy to Render
- [x] Test production site

## 🎯 PRIORITY: Fix Robotic AI Voice
- [x] Update AI system prompt to sound natural and conversational
- [x] Remove formal/clinical language
- [x] Add warmth, empathy, and genuine human connection
- [ ] Test conversation flow until it feels authentic (needs deployment)
- [ ] Deploy improved personality

## 🔥 CRITICAL: Stripe Key Not Loading on Render
- [x] Fix Stripe initialization - make it lazy instead of module-load
- [x] Add better error message if STRIPE_SECRET_KEY is missing
- [x] Verify environment variable is actually set on Render (typo: TRIPE_SECRET_KEY)
- [x] Auto-create Stripe products on first checkout (no manual dashboard work)
- [x] Cache product/price IDs in memory for reuse

## 🏢 ENTERPRISE: Connection Reliability & Monitoring
- [x] Add health check endpoint (/api/health) for monitoring
- [x] Configure timeouts for OpenAI API calls (30s max)
- [x] Configure timeouts for Stripe API calls (15s max)
- [ ] Configure timeouts for Twilio API calls (10s max)
- [ ] Add automatic retry logic for failed database queries
- [x] Add automatic retry logic for failed API calls (OpenAI, Stripe)
- [x] Improve error logging with request context
- [ ] Add connection pool monitoring

## ⚖️ LEGAL: Compliance for Peer Support Chat Platform
- [x] Review homepage - ensure "peer support companion, NOT therapy" is clear
- [x] Review AI system prompt - remove any therapy/medical language
- [x] Verify crisis responses include 988 hotline and emergency numbers
- [x] Add disclaimer: "Not a substitute for professional mental health care"
- [x] Add disclaimer: "If emergency, call 911 immediately"
- [x] Create Terms of Service (liability, no medical advice, user responsibilities)
- [x] Create Privacy Policy (data collection, HIPAA not applicable)
- [x] Add age restriction (13+ with parental consent, under 13 prohibited)
- [x] Remove any claims about "treatment", "therapy", "diagnosis", "cure"
- [x] Ensure crisis alerts go to owner, NOT emergency services (we're not 911)
- [x] Add footer links to Terms and Privacy pages
- [ ] Update contact email in Terms/Privacy pages
- [ ] Update business address in Privacy page
- [ ] Deploy legal compliance updates

## 🐛 DEBUG: Stripe Payment Button 500 Error
- [ ] Add detailed console logging to Stripe checkout
- [ ] Deploy and capture error details from logs
- [ ] Fix the actual Stripe API error

## 🔌 PHASE 1: Stripe Webhook + ProfileGuard Integration
- [x] Create /api/webhooks/stripe endpoint
- [x] Verify Stripe webhook signature
- [x] Handle checkout.session.completed event
- [x] Extract customer email, subscription ID, plan tier from webhook
- [x] Create or update client profile in ProfileGuard with subscription data
- [x] Link subscription to client profile
- [x] Store Stripe customer ID and subscription ID in database
- [ ] Test webhook with Stripe CLI

## 📱 PHASE 2: Twilio Welcome Automation
- [x] Build sendWelcomeSMS function in twilioIntegration.ts
- [x] Trigger welcome SMS after successful payment
- [x] Customize message based on tier (Voice vs Phone)
- [x] Store phone number in client profile (via aiSummary)
- [ ] Test SMS delivery (needs Twilio credentials)

## 🚪 PHASE 3: Feature Gating System
- [ ] Add daily conversation counter to client profile
- [ ] Check subscription tier before allowing conversation
- [ ] Implement free tier limit (5 conversations/day)
- [ ] Reset counter daily
- [ ] Show upgrade prompt when limit reached
- [ ] Test free tier limits
- [ ] Test paid tier unlimited access

## 💬 PHASE 4: Conversion System (Moral Obligation)
- [ ] Add conversion prompt after conversation #3 (free users)
- [ ] Add limit reached prompt after conversation #5 (free users)
- [ ] Handle "can't afford it" responses with compassion
- [ ] Track conversion attempts in ProfileGuard
- [ ] Test conversion flow

## 💳 PHASE 5: Subscription Management UI
- [ ] Add subscription status to user dashboard
- [ ] Show current tier and next billing date
- [ ] Add upgrade/downgrade buttons
- [ ] Add cancel button with retention prompt
- [ ] Handle Stripe portal redirect
- [ ] Test subscription management

## 🤖 PHASE 6: Autonomous Communication (Advanced)
- [ ] Build daily check-in system for paid users
- [ ] Build inactivity check-in system (3+ days)
- [ ] Build crisis follow-up system
- [ ] Build habit reminder system
- [ ] Test autonomous communication

## 🚨 CRITICAL: Database Tables Missing on Render
- [x] Fix database migration not running on Render
- [x] Ensure all tables are created (client_profile, conversation, message, etc.)
- [x] Verify schema matches code
- [ ] Test AI chat after database is fixed

## 🎤 CRITICAL: Fix Extreme Robot Voice (TTS)
- [x] Replace browser speechSynthesis with natural-sounding TTS
- [x] Implement OpenAI TTS API for human-like voice
- [x] Added fallback to browser TTS if API fails
- [x] Test voice quality and naturalness
- [x] Deploy and verify on production
- [x] Update AI personality to acknowledge voice capabilities

## 🚨 FIXED: AI Personality Didn't Know About Voice
- [x] Voice was working but AI said it couldn't speak
- [x] Updated system prompt to tell Sage it has voice capabilities
- [x] AI now knows it can communicate through text AND voice

## 🚨 CRITICAL: NO PERFECT CONTINUITY - Memory Not Working Across Sessions
- [ ] AI not remembering user between sessions
- [ ] Check if client_profile is being loaded correctly
- [ ] Check if conversation history is being retrieved
- [ ] Verify localStorage client ID is persisting
- [ ] Test cross-session memory

## ✅ TESTED AND WORKING
- [x] Chat functionality - AI responds properly
- [x] Admin dashboard - Shows metrics correctly
- [x] Name collection - Works as expected

## 🔥 AUTONOMOUS FIX MODE - Broken Features Found in Production
- [ ] Fix trial banner not showing (BLOCKER: API not returning trial count, needs deeper debugging)
- [x] Fix admin dashboard 404 error (route not in production build)
- [ ] Verify database migration ran (trial fields may not exist)
- [ ] Fix trial counter decrement logic
- [x] Test admin dashboard loads and shows real data
- [ ] Test trial banner appears after sending messages (BLOCKED by API issue)
- [ ] Verify ProfileGuard enhancements working in production


## 📊 P0: Admin Dashboard for Monitoring
- [ ] Create `/admin` route (password protected)
- [ ] Show total users count
- [ ] Show active conversations count
- [ ] Show subscription metrics (total subscriptions, MRR)
- [ ] Show crisis alerts with timestamps
- [ ] Real-time updates
- [ ] Export data functionality
- [ ] API webhooks for main platform integration (future)

## 🔧 P0: Fix Perfect Continuity (CRITICAL)
- [x] Fix AI personality - tell it that it HAS memory and CAN remember
- [x] Verify ProfileGuard context is being injected into AI prompts
- [x] Add recent message highlights to context string for better memory
- [x] Strengthen system prompt with explicit voice+memory capabilities
- [ ] Test that conversation history loads correctly (needs deployment)
- [ ] Verify client ID persists across browser sessions
- [ ] Test returning user experience (should be greeted by name)

## 🚪 P0: Implement Frictionless Onboarding
- [ ] Remove authentication requirement for chat
- [ ] Implement anonymous session tracking (localStorage + fingerprint)
- [ ] Auto-create client profile on first message
- [ ] Sage populates profile through natural conversation
- [ ] No signup forms, no barriers

## 🎭 P1: Voice/Face Recognition for Instant Client ID
- [ ] Implement voice fingerprinting
- [ ] Link voice signature to client profile
- [ ] Sage recognizes and greets returning clients by name instantly
- [ ] Test recognition accuracy

## 🔄 DATABASE MIGRATION (User Request)
- [x] Remove all MySQL dependencies (already PostgreSQL)
- [x] Install PostgreSQL driver (pg)
- [x] Update Drizzle config for PostgreSQL (added SSL support)
- [x] Update schema for PostgreSQL types (already using pgTable)
- [ ] Test connection to Render PostgreSQL
- [ ] Deploy and verify
