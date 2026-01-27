# 🔒 PRODUCTION PROTECTION GUIDE

## ⚠️ CRITICAL WARNING FOR ALL AGENTS ⚠️

**This is a LIVE PRODUCTION SYSTEM generating revenue.**

**DO NOT:**
- Delete, overwrite, or significantly modify production files without explicit owner approval
- Push directly to `main` branch without testing
- Modify environment variables on Render
- Change Twilio webhook URLs
- Alter Stripe configurations
- Drop or modify database tables

---

## 1. PROTECTED INFRASTRUCTURE

### GitHub Repository
- **Repository:** `carlvisagie/purposeful-live-coaching`
- **Branch:** `main` (production)
- **Protection Level:** CRITICAL

**NEVER:**
- Force push to main
- Delete branches without owner approval
- Modify GitHub Actions/workflows without testing
- Change repository visibility settings

### Render Deployment
- **Service:** `just-talk`
- **URL:** https://just-talk.onrender.com
- **Auto-deploy:** Enabled from `main` branch
- **Protection Level:** CRITICAL

**NEVER:**
- Manually deploy untested code
- Change environment variables without documentation
- Modify scaling settings without owner approval
- Delete or recreate the service

### Twilio Voice
- **Phone Number:** Connected to production
- **Webhooks:** Point to https://just-talk.onrender.com
- **Protection Level:** CRITICAL

**NEVER:**
- Change webhook URLs without testing
- Modify phone number settings
- Delete or recreate the phone number

### Stripe Payments
- **Mode:** LIVE (real money)
- **Webhooks:** Connected to production
- **Protection Level:** CRITICAL

**NEVER:**
- Modify webhook endpoints without testing
- Change product/price configurations
- Alter payout settings

### TiDB Database
- **Contains:** All client data, conversations, subscriptions
- **Protection Level:** CRITICAL

**NEVER:**
- Drop tables
- Delete client data
- Modify schema without migrations
- Run destructive queries

---

## 2. SAFE MODIFICATION PROCEDURES

### Before ANY Code Change:
1. **Read CRITICAL_SYSTEM.md** - Understand what files are critical
2. **Read this document** - Understand protection requirements
3. **Create a backup plan** - Know how to rollback (see ROLLBACK_PROCEDURES.md)
4. **Test locally** - Run `npm run build` before pushing
5. **Commit with clear messages** - Describe exactly what changed and why

### Safe Development Workflow:
```bash
# 1. Pull latest changes
git pull origin main

# 2. Make changes to non-critical files
# (If changing critical files, get owner approval first)

# 3. Test locally
npm run build

# 4. Commit with descriptive message
git add -A
git commit -m "type: description of change"

# 5. Push to trigger auto-deploy
git push origin main

# 6. Monitor deployment on Render dashboard
# 7. Verify functionality after deployment
```

### Commit Message Format:
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructuring
- `docs:` - Documentation only
- `CRITICAL:` - Changes to critical files (requires extra caution)

---

## 3. ENVIRONMENT VARIABLES (DO NOT MODIFY)

The following environment variables are configured on Render and MUST NOT be changed:

| Variable | Purpose | Modification Risk |
|----------|---------|-------------------|
| `DATABASE_URL` | TiDB connection | CRITICAL - breaks all data |
| `OPENAI_API_KEY` | AI responses | CRITICAL - breaks AI |
| `TWILIO_ACCOUNT_SID` | Voice calls | CRITICAL - breaks phone |
| `TWILIO_AUTH_TOKEN` | Voice calls | CRITICAL - breaks phone |
| `TWILIO_PHONE_NUMBER` | Incoming calls | CRITICAL - breaks phone |
| `STRIPE_SECRET_KEY` | Payments | CRITICAL - breaks payments |
| `STRIPE_WEBHOOK_SECRET` | Payment webhooks | CRITICAL - breaks payments |
| `ELEVENLABS_API_KEY` | Voice synthesis | HIGH - breaks TTS |
| `DEEPGRAM_API_KEY` | Speech recognition | HIGH - breaks STT |

---

## 4. CRITICAL FILES (DO NOT MODIFY WITHOUT APPROVAL)

These files have warning headers and are essential for system operation:

| File | Function | Risk Level |
|------|----------|------------|
| `server/conversationRelay.ts` | Main voice handler | CRITICAL |
| `server/smartContextBuilder.ts` | Memory system | CRITICAL |
| `server/postInteractionUpdater.ts` | Profile learning | CRITICAL |
| `server/phonePayment.ts` | Payment flow | CRITICAL |
| `server/crisisDetection.ts` | Safety system | CRITICAL |
| `server/guardrails.ts` | Compliance | CRITICAL |
| `server/webhooks/stripeWebhook.ts` | Payment processing | CRITICAL |
| `drizzle/schema.ts` | Database schema | CRITICAL |

---

## 5. EMERGENCY CONTACTS

If something breaks in production:
1. **Check ROLLBACK_PROCEDURES.md** for recovery steps
2. **Check Render logs** for error details
3. **DO NOT make random changes** - diagnose first
4. **Document what happened** for the owner

---

## 6. AGENT AUTHORIZATION LEVELS

### Level 1: READ ONLY (Default for new agents)
- Can read code and documentation
- Can suggest improvements
- Cannot push to repository
- Cannot modify infrastructure

### Level 2: DEVELOPMENT (With owner approval)
- Can modify non-critical files
- Must test before pushing
- Must document all changes
- Cannot modify critical files without explicit approval

### Level 3: FULL ACCESS (Owner only)
- Can modify all files
- Can change infrastructure settings
- Can access all service dashboards

**Current session authorization:** Level 2 (Development)

---

## 7. WHAT TO DO IF YOU'RE UNSURE

1. **STOP** - Don't make changes you're uncertain about
2. **ASK** - Request clarification from the owner
3. **DOCUMENT** - Write down what you're unsure about
4. **WAIT** - Better to delay than to break production

---

## 8. AUDIT LOG

All significant changes should be logged here:

| Date | Agent | Change | Commit |
|------|-------|--------|--------|
| 2026-01-18 | Manus | Fixed smart context property name | 8b64672 |
| 2026-01-18 | Manus | Added three-tier memory architecture | 0b9eaab |
| 2026-01-18 | Manus | Created protection documentation | (this commit) |

---

**Remember: This system is LIVE and serving REAL USERS. Treat it with the respect a production system deserves.**
