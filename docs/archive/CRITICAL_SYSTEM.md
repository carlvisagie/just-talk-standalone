# ⚠️ CRITICAL SYSTEM DOCUMENTATION ⚠️

## FOR ALL AGENTS: READ THIS BEFORE MAKING ANY CHANGES

This is a **PRODUCTION SYSTEM** serving real users. Changes made here directly affect paying customers.

---

## 🚨 CRITICAL FILES - DO NOT MODIFY WITHOUT FULL UNDERSTANDING

### Core Voice System
- `server/conversationRelay.ts` - Main voice conversation handler (Twilio WebSocket)
- `server/phonePayment.ts` - Payment flow during voice calls
- `server/smartContextBuilder.ts` - Three-tier memory system for client context
- `server/postInteractionUpdater.ts` - Automatic profile enrichment after calls
- `server/unifiedClientRepository.ts` - Client profile management

### Database Schema
- `drizzle/schema.ts` - Database schema (changes require migrations!)
- `drizzle/*.sql` - Migration files (DO NOT DELETE OR MODIFY existing migrations)

### External Integrations
- `server/webhooks/stripeWebhook.ts` - Stripe payment webhooks
- `server/twilioIntegration.ts` - Twilio voice integration
- `server/_core/db.ts` - Database connection

---

## 🔒 PROTECTION RULES

### Before Making ANY Changes:
1. **READ** this entire document
2. **UNDERSTAND** the three-tier memory architecture (see CLIENT_PROFILE_ARCHITECTURE.md)
3. **CHECK** that your changes don't break existing functionality
4. **BUILD LOCALLY** before pushing (`npm run build`)
5. **TEST** critical paths if possible

### NEVER Do These Without Explicit User Permission:
- Delete or rename database tables
- Remove columns from schema (data loss!)
- Change the payment flow logic
- Modify Stripe webhook handling
- Change the client profile structure
- Remove or modify existing migrations

### When Adding New Features:
- Add new tables/columns via NEW migrations (never modify existing)
- Ensure backwards compatibility
- Update the Smart Context Builder if adding new profile fields
- Update the Post-Interaction Updater if adding extractable data

---

## 📊 ARCHITECTURE OVERVIEW

### Three-Tier Memory System
```
Tier 1: Core Identity (Always loaded)
├── Name, timezone, subscription
├── Relationships (family, friends)
├── Crisis/safety info
└── ~500 tokens

Tier 2: Active Context (Relevance-based)
├── Emotional patterns
├── Current goals
├── Recent conversations
└── ~1000 tokens

Tier 3: Historical Archive (On-demand)
├── Full conversation history
├── Vector embeddings (future)
└── ~500 tokens when retrieved
```

### Data Flow
```
Call Comes In
    ↓
findOrCreateClient() → Get/create client record
    ↓
buildSmartContext() → Assemble relevant context for LLM
    ↓
generateResponse() → LLM generates response with full context
    ↓
Call Ends
    ↓
updateProfileAfterInteraction() → Extract & save new information
```

---

## 🔄 ROLLBACK PROCEDURE

If something breaks in production:

### Quick Rollback (Render Dashboard)
1. Go to https://dashboard.render.com
2. Navigate to just-talk service
3. Click "Events" → Find last working deploy
4. Click "Rollback to this deploy"

### Git Rollback
```bash
# Find the last working commit
git log --oneline

# Revert to that commit
git revert HEAD
git push origin main
```

### Emergency: Disable Voice Feature
If voice is completely broken, you can temporarily disable it:
1. In Render Environment, set `DISABLE_VOICE=true`
2. This will return a "temporarily unavailable" message to callers

---

## 📝 CHANGE LOG

### 2026-01-18: Three-Tier Memory Architecture
- Added `clientRelationship` table for explicit relationship storage
- Added `clientKeyInsight` table for AI-extracted insights
- Added `clientEngagement` table for cross-platform activity tracking
- Added `smartContextBuilder.ts` for intelligent context assembly
- Added `postInteractionUpdater.ts` for automatic profile enrichment
- Updated `conversationRelay.ts` to use new memory system

### Previous Critical Changes
- Payment flow moved to client profile (single source of truth)
- Adaptive payment walkthrough (listens to user input)
- Webhook-based subscription verification

---

## 🆘 EMERGENCY CONTACTS

If you break something and can't fix it:
1. Document exactly what you changed
2. Attempt rollback using procedures above
3. Leave detailed notes for the next agent
4. Alert the user immediately

---

## ✅ CHECKLIST FOR AGENTS

Before pushing ANY code:
- [ ] I have read CRITICAL_SYSTEM.md
- [ ] I understand the three-tier memory architecture
- [ ] My changes don't modify existing migrations
- [ ] My changes don't remove database columns
- [ ] I have built locally and it passes
- [ ] I have considered backwards compatibility
- [ ] I have updated documentation if needed

**If you cannot check ALL boxes, DO NOT PUSH.**
