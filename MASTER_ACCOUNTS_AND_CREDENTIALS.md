# MASTER ACCOUNTS AND CREDENTIALS

## ⚠️ CONFIDENTIAL - DO NOT COMMIT TO PUBLIC REPOSITORIES

**Last Updated:** January 18, 2026

---

## OWNER INFORMATION

| Field | Value |
|-------|-------|
| **Name** | Carl Visagie |
| **Email (Primary)** | carlhvisagie@gmail.com |
| **Email (Yahoo)** | carlhvisagie@yahoo.com |
| **Phone (Germany)** | +49 15229973237 |
| **US Address** | 9273 Nerone Avenue, Las Vegas NV 89148, US |
| **LLC** | Jet Fighter Clothing LLC |

---

## DOMAIN REGISTRARS

### GoDaddy
| Field | Value |
|-------|-------|
| **Domains** | purposefullivecoaching.com, purposefullivecoaching.info, purposefullivecoaching.store, purposefullife-coaching.com, purposefullivecoaching.life |
| **Login URL** | https://www.godaddy.com |

### Namecheap
| Field | Value |
|-------|-------|
| **Domains** | keepyourcontracts.com |
| **Login URL** | https://www.namecheap.com |

### Cloudflare
| Field | Value |
|-------|-------|
| **Domains** | keepyourcontracts.com (DNS), purposefullivecoaching.app (possibly) |
| **Login URL** | https://dash.cloudflare.com |

---

## TWILIO (Voice & SMS)

| Field | Value |
|-------|-------|
| **Login URL** | https://console.twilio.com |
| **Account** | Purposefullivecoaching |
| **Phone Number** | +1 775-455-8329 |
| **Friendly Name** | Purposefullive |
| **Payment Method** | Visa ending in 1758 (Exp. 7/2029) |
| **Auto-Recharge Trigger** | $10.00 |
| **Auto-Recharge Amount** | $20.00 |
| **A2P 10DLC Status** | Pending Approval (Sole Proprietor Campaign) |
| **Domain Verified** | purposefullivecoaching.com ✅ |

### Twilio Environment Variables
```
TWILIO_ACCOUNT_SID=AC95c36a850f3eb4a72cc587d6384c038f
TWILIO_AUTH_TOKEN=[stored in Render env vars]
TWILIO_PHONE_NUMBER=+17754558329
```

---

## RENDER (Hosting)

| Field | Value |
|-------|-------|
| **Login URL** | https://dashboard.render.com |
| **Workspace** | My Workspace |
| **Plan** | Organization ($29/month) |
| **Payment Method** | Visa ending in 8060 |
| **Billing Email** | carlhvisagie@gmail.com |

### Active Services
| Service | Type | Monthly Cost |
|---------|------|--------------|
| **just-talk** | Web Service | $4.45 |
| **purposeful-live-coaching-production** | Web Service | $4.00 |
| **hp-omen-command-center** | Web Service | $1.26 |
| **predator-helios-brain** | Web Service | $1.26 |
| **purposeful-db** | PostgreSQL Database | $63.19 |

### Live URLs
| Service | URL |
|---------|-----|
| **Just Talk** | https://just-talk.onrender.com |

### Monthly Costs
| Period | Amount |
|--------|--------|
| **October 2025** | $26.00 |
| **November 2025** | $37.54 |
| **December 2025** | $182.36 |
| **January 2026 (projected)** | $195.29 |

---

## GITHUB

| Field | Value |
|-------|-------|
| **Repository** | purposeful-live-coaching |
| **Branch** | main |
| **Auto-Deploy** | Connected to Render |

### Critical Files (DO NOT MODIFY WITHOUT REVIEW)
- `server/conversationRelay.ts` - Main voice conversation handler
- `server/smartContextBuilder.ts` - Client context assembly
- `server/postInteractionUpdater.ts` - Post-call learning
- `server/phonePayment.ts` - Payment flow
- `server/crisisDetection.ts` - Crisis detection

---

## STRIPE (Payments)

| Field | Value |
|-------|-------|
| **Login URL** | https://dashboard.stripe.com |
| **Mode** | Live |
| **Webhook Endpoint** | https://just-talk.onrender.com/webhooks/stripe |

### Environment Variables
```
STRIPE_SECRET_KEY=[stored in Render env vars]
STRIPE_WEBHOOK_SECRET=[stored in Render env vars]
STRIPE_PRICE_ID=[stored in Render env vars]
```

---

## TIDB (Database)

| Field | Value |
|-------|-------|
| **Login URL** | https://tidbcloud.com |
| **Type** | Serverless |
| **Region** | US |

### Database Tables
- `client_profile` - Core client identity
- `client_relationship` - People in client's life
- `key_insight` - Important observations
- `client_engagement` - Interaction tracking
- `subscription` - Payment subscriptions

### Environment Variables
```
DATABASE_URL=[stored in Render env vars]
```

---

## ELEVENLABS (Voice Synthesis)

| Field | Value |
|-------|-------|
| **Login URL** | https://elevenlabs.io |
| **Voice ID** | Sage voice |

### Environment Variables
```
ELEVENLABS_API_KEY=[stored in Render env vars]
```

---

## DEEPGRAM (Speech-to-Text)

| Field | Value |
|-------|-------|
| **Login URL** | https://console.deepgram.com |

### Environment Variables
```
DEEPGRAM_API_KEY=[stored in Render env vars]
```

---

## OPENAI

| Field | Value |
|-------|-------|
| **Login URL** | https://platform.openai.com |

### Environment Variables
```
OPENAI_API_KEY=[stored in Render env vars]
```

---

## TELLO MOBILE (US Number for Verification)

| Field | Value |
|-------|-------|
| **Login URL** | https://tello.com |
| **Purpose** | US mobile number for A2P 10DLC verification |
| **Monthly Cost** | $10/month |
| **Network** | T-Mobile |

---

## MONTHLY COST SUMMARY

| Service | Monthly Cost |
|---------|--------------|
| **Render (Hosting + DB)** | ~$100-195 |
| **Twilio (Voice + SMS)** | Pay-per-use (~$20-50 estimated) |
| **Twilio A2P** | $2 |
| **Tello (US Number)** | $10 |
| **Stripe** | 2.9% + $0.30 per transaction |
| **TiDB** | Free tier |
| **ElevenLabs** | Pay-per-use |
| **Deepgram** | Pay-per-use |
| **OpenAI** | Pay-per-use |
| **ESTIMATED TOTAL** | **~$150-300/month** (before scaling) |

---

## IMPORTANT DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `CRITICAL_SYSTEM.md` | Instructions for agents - what not to break |
| `CLIENT_PROFILE_ARCHITECTURE.md` | Three-tier memory system documentation |
| `ROLLBACK_PROCEDURES.md` | Emergency recovery steps |
| `PRODUCTION_PROTECTION.md` | Repository and deployment protection |
| `README.md` | Project overview with production warnings |

---

## EMERGENCY CONTACTS

| Issue | Action |
|-------|--------|
| **Service Down** | Check Render dashboard, check logs |
| **Payments Not Working** | Check Stripe dashboard, verify webhook |
| **Calls Not Connecting** | Check Twilio console, verify phone number |
| **Database Issues** | Check TiDB console |

---

## NOTES

- All API keys and secrets are stored in Render environment variables
- Never commit secrets to GitHub
- Always test in development before deploying to production
- Keep this document updated when accounts change
