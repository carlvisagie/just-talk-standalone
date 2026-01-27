# Client Profile Architecture

## Overview

The client profile system is the **single source of truth** for all client information in the Purposeful Live Coaching platform. This document explains the architecture, data flow, and best practices for working with client profiles.

## Design Principles

1. **Single Source of Truth**: All client information lives in or links to the `clientProfile` table
2. **Perfect Continuity**: Sage must remember everything about clients across all interactions
3. **Scalability**: System must handle viral growth without data loss or performance issues
4. **Protection**: Architecture must be robust against accidental damage by future agents

## Three-Tier Memory Architecture

### Tier 1: Core Identity (~500 tokens)
Always loaded for every interaction. Contains:
- **Basic Info**: Name, preferred name, timezone, language
- **Relationships**: Family members, friends, colleagues (explicit table)
- **Safety Info**: Crisis protocols, emergency contacts, triggers
- **Subscription**: Current tier, payment status

### Tier 2: Active Context (~1000 tokens)
Loaded based on relevance to current interaction:
- **Emotional Patterns**: Recent emotional state, patterns over time
- **Current Goals**: Active goals and progress
- **Recent Conversations**: Last 3-5 conversation summaries
- **Life Events**: Recent significant events (job change, loss, celebration)

### Tier 3: Historical Archive (On-demand, ~500 tokens when retrieved)
Retrieved when specifically relevant:
- **Full Conversation History**: Searchable via vector embeddings (future)
- **Long-term Patterns**: Trends over months/years
- **Milestone History**: Major achievements and setbacks

## Database Schema

### Core Tables

```typescript
// Main client profile - the hub
clientProfile {
  id: string (primary key)
  phone: string (unique)
  email: string (nullable)
  
  // Identity
  fullName: string
  preferredName: string
  timezone: string
  language: string
  
  // Subscription
  subscriptionTier: 'free' | 'web' | 'phone' | 'premium'
  stripeCustomerId: string
  subscriptionStatus: string
  
  // AI Context (legacy - being replaced by structured data)
  aiSummary: text
  
  // Life Context (structured)
  lifeContext: jsonb {
    occupation: string
    location: string
    significantEvents: array
    currentChallenges: array
  }
  
  // Emotional Baseline
  emotionalBaseline: jsonb {
    typicalMood: string
    stressors: array
    copingMechanisms: array
    triggers: array
  }
  
  // Safety
  crisisProtocol: jsonb {
    emergencyContact: string
    warningSignals: array
    preferredIntervention: string
  }
}

// Explicit relationships - never buried in text
clientRelationship {
  id: string
  clientProfileId: string (foreign key)
  name: string
  relationship: string (wife, husband, son, daughter, friend, etc.)
  notes: text
  lastMentioned: timestamp
  mentionCount: number
  createdAt: timestamp
  updatedAt: timestamp
}

// AI-extracted insights
clientKeyInsight {
  id: string
  clientProfileId: string (foreign key)
  category: string (goal, fear, value, pattern, breakthrough)
  content: text
  confidence: number (0-1)
  source: string (conversation ID)
  extractedAt: timestamp
  validUntil: timestamp (nullable)
}

// Cross-platform engagement
clientEngagement {
  id: string
  clientProfileId: string (foreign key)
  channel: string (voice, web_chat, video, platform)
  activityType: string
  details: jsonb
  timestamp: timestamp
}
```

## Smart Context Builder

The `smartContextBuilder.ts` module assembles relevant context for each interaction:

```typescript
async function buildSmartContext(clientId: string, options: {
  channel: 'voice' | 'web_chat' | 'video';
  includeRelationships: boolean;
  includeGoals: boolean;
  includeRecentConversations: boolean;
  maxTokens: number;
}): Promise<{
  contextString: string;
  tokenEstimate: number;
  includedSections: string[];
}>
```

### Context Assembly Logic

1. **Always Include** (Tier 1):
   - Client name and preferred name
   - Subscription status
   - All relationships
   - Crisis/safety info if present

2. **Include if Relevant** (Tier 2):
   - Recent emotional state (last 7 days)
   - Active goals
   - Recent conversation summaries

3. **Include on Demand** (Tier 3):
   - Historical patterns (if discussing progress)
   - Old conversations (if user references them)

## Post-Interaction Updater

The `postInteractionUpdater.ts` module extracts and saves information after each interaction:

```typescript
async function updateProfileAfterInteraction(
  clientId: string,
  conversationId: string,
  transcript: string,
  channel: 'voice' | 'web_chat' | 'video'
): Promise<void>
```

### Extraction Categories

1. **Relationships**: New people mentioned, updates about known people
2. **Life Events**: Job changes, moves, health updates, celebrations, losses
3. **Emotional State**: Current mood, stress level, concerns
4. **Goals**: New goals, progress on existing goals, abandoned goals
5. **Insights**: Breakthroughs, patterns, values expressed

### Extraction Process

1. Send transcript to LLM with extraction prompt
2. Parse structured response
3. Merge with existing profile data (don't overwrite, augment)
4. Update relationship records
5. Add new insights
6. Log engagement

## Data Flow Diagrams

### Incoming Call
```
Phone Call → Twilio → ConversationRelay
                           ↓
                    findOrCreateClient()
                           ↓
                    buildSmartContext()
                           ↓
                    [Context String ~2000 tokens]
                           ↓
                    System Prompt + Context
                           ↓
                    LLM generates response
```

### Call Ends
```
WebSocket closes → ConversationRelay
                          ↓
                   updateProfileAfterInteraction()
                          ↓
                   [LLM extracts information]
                          ↓
                   Update clientProfile
                   Insert clientRelationship (new)
                   Insert clientKeyInsight (new)
                   Insert clientEngagement
```

## Best Practices

### For Adding New Profile Fields

1. Add column to schema with nullable default
2. Create migration file
3. Update Smart Context Builder to include new field
4. Update Post-Interaction Updater to extract new field
5. Test with existing clients (should not break)

### For Modifying Existing Fields

1. **NEVER** remove columns (data loss!)
2. Add new column alongside old
3. Migrate data in background
4. Update code to use new column
5. Mark old column as deprecated

### For Querying Client Data

```typescript
// GOOD: Use the repository
const context = await getUnifiedClientContext({ type: "phone", value: phoneNumber });

// BAD: Direct database queries
const client = await db.select().from(clientProfile).where(...);
```

### For Updating Client Data

```typescript
// GOOD: Use the repository
await updateClientProfile(clientId, { preferredName: "John" });

// BAD: Direct updates
await db.update(clientProfile).set({ preferredName: "John" }).where(...);
```

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2026-01-18 | 0001_add_relationships | Added clientRelationship table |
| 2026-01-18 | 0002_add_key_insights | Added clientKeyInsight table |
| 2026-01-18 | 0003_add_engagement | Added clientEngagement table |
| 2026-01-18 | 0004_add_life_context | Added lifeContext JSONB to clientProfile |

## Troubleshooting

### "Sage forgot my wife's name"
1. Check `clientRelationship` table for the client
2. If missing, the Post-Interaction Updater may have failed
3. Check logs for extraction errors
4. Manually add relationship if needed

### "Context is too long"
1. Smart Context Builder should limit to ~2000 tokens
2. Check `maxTokens` parameter
3. Review which sections are being included

### "New information not being saved"
1. Check that call ended properly (WebSocket close event)
2. Check logs for Post-Interaction Updater errors
3. Verify LLM extraction is working
4. Check database write permissions

## Future Enhancements

1. **Vector Embeddings**: Store conversation embeddings for semantic search
2. **Predictive Context**: Pre-load context based on time of day, recent patterns
3. **Cross-Client Insights**: Anonymized patterns across all clients
4. **Voice Biometrics**: Additional identity verification
5. **Sentiment Tracking**: Real-time emotional state during calls
