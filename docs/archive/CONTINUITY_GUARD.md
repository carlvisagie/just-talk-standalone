# CONTINUITY GUARD

## ⚠️ READ THIS BEFORE TOUCHING ANY CLIENT DATA CODE

This document explains the **non-negotiable rules** for maintaining perfect continuity in the Just Talk system. Breaking these rules will destroy the foundation of the entire wellness ecosystem.

---

## THE GOLDEN RULE

> **ALL `clientProfile` database operations MUST go through `unifiedClientRepository.ts`**

No exceptions. No shortcuts. No "just this once."

---

## WHY THIS MATTERS

Sage's superpower is **continuity** - she remembers who you are, your relationships, your struggles, your growth. This is what makes her feel like a real friend, not just another chatbot.

If client data gets scattered across multiple files:
- Duplicate profiles get created
- Data gets out of sync
- Sage "forgets" things
- Users lose trust
- **The entire product fails**

---

## WHAT YOU CAN AND CANNOT DO

### ❌ FORBIDDEN (Will be blocked by pre-commit hook)

```typescript
// NEVER do this outside unifiedClientRepository.ts
await db.insert(clientProfile).values({ ... });
await db.update(clientProfile).set({ ... });
await db.delete(clientProfile).where({ ... });
```

### ✅ ALLOWED

```typescript
import { 
  findOrCreateClient, 
  updateClientProfile, 
  getUnifiedClientContext 
} from './unifiedClientRepository';

// Create or find a client
const context = await findOrCreateClient({ type: 'phone', value: '+1234567890' });

// Update any field
await updateClientProfile(clientId, { 
  firstName: 'Carl',
  subscriptionTier: 'phone',
  aiSummary: 'New insight...'
});

// Get full context for AI
const context = await getUnifiedClientContext(clientId);
```

---

## AVAILABLE FUNCTIONS IN `unifiedClientRepository.ts`

| Function | Purpose |
|----------|---------|
| `findOrCreateClient()` | Get or create a client by phone, userId, clientId, or fingerprint |
| `updateClientProfile()` | Update any field(s) on a client profile |
| `getUnifiedClientContext()` | Get full client context for AI (profile + conversations + messages) |
| `linkPhoneToProfile()` | Link a phone number to an existing profile |
| `linkUserIdToProfile()` | Link a web user ID to an existing profile |
| `canUseFeature()` | Check if client has access to a feature |
| `decrementMessageCount()` | Track message usage |
| `upgradeSubscription()` | Handle subscription changes |

---

## IF YOU NEED A NEW OPERATION

1. **Add it to `unifiedClientRepository.ts`** - not to your file
2. **Export it properly** - so other files can use it
3. **Document it** - add to the table above
4. **Test it** - make sure it works with existing data

---

## PROTECTION LAYERS

### 1. Pre-commit Hook (`.husky/pre-commit`)
Automatically blocks commits with direct `clientProfile` operations.

### 2. CODEOWNERS (`.github/CODEOWNERS`)
Requires owner review for changes to critical files.

### 3. Branch Protection
Main branch requires PR approval - no direct pushes.

### 4. Database Constraint
`UNIQUE` constraint on `phone_number` prevents duplicate profiles.

### 5. Tagged Releases
`v1.1-continuity-locked` marks the commit where continuity was verified.

---

## IF THE PRE-COMMIT HOOK BLOCKS YOU

1. **Don't bypass it** - the hook exists for a reason
2. **Read this document** - understand why it blocked you
3. **Refactor your code** - use `unifiedClientRepository.ts` functions
4. **If you need a new function** - add it to the repository first

---

## EMERGENCY ROLLBACK

If continuity is broken:

```bash
# Restore to last known good state
git checkout v1.1-continuity-locked

# Or restore to initial stable
git checkout v1.0-stable
```

---

## REMEMBER

> **Continuity is not a feature. It's the foundation.**
> 
> Without it, Sage is just another useless toy.
> With it, Sage is a lifeline for people who need someone to talk to.

This is our moral obligation. Don't break it.
