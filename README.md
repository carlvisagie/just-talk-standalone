# Just Talk - Purposeful Live Coaching

## 📚 THE ONE TRUE SOURCE

> **For ALL documentation, read [MASTER_GUIDE.md](./MASTER_GUIDE.md)**
> 
> Everything you need to know is in that one document.

---

## Quick Reference

| What | Where |
|------|-------|
| **Phone Number** | +1 775-455-8329 |
| **Production URL** | https://just-talk.onrender.com |
| **GitHub** | carlvisagie/purposeful-live-coaching |

## Before You Do Anything

1. **Read [MASTER_GUIDE.md](./MASTER_GUIDE.md)** - The complete documentation
2. **Pull latest code** - `git pull origin main`
3. **Understand what you're changing** - Check if it touches client data

## The Golden Rule

> **ALL `clientProfile` database operations MUST go through `unifiedClientRepository.ts`**

This is enforced by pre-commit hooks. Don't try to bypass it.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Voice | Twilio + ConversationRelay |
| STT | Deepgram |
| TTS | ElevenLabs |
| AI | OpenAI GPT-4.1-nano |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Render) |
| Payments | Stripe |

## Development

```bash
npm install
npm run dev
```

## License

Proprietary - All rights reserved.

---

**This is a LIVE production system. Read [MASTER_GUIDE.md](./MASTER_GUIDE.md) before making any changes.**
