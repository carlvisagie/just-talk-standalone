# Emergency Rollback Procedures

## Quick Reference

| Severity | Action | Time to Fix |
|----------|--------|-------------|
| 🔴 Critical (System Down) | Render Rollback | 2-3 minutes |
| 🟠 Major (Feature Broken) | Git Revert | 5-10 minutes |
| 🟡 Minor (Bug) | Hotfix Branch | 15-30 minutes |

---

## 🔴 CRITICAL: System Completely Down

### Symptoms
- No calls connecting
- 500 errors on all endpoints
- Database connection failures

### Immediate Actions

#### Option 1: Render Dashboard Rollback (Fastest)
1. Go to https://dashboard.render.com
2. Click on "just-talk" service
3. Click "Events" tab
4. Find the last successful deploy (green checkmark)
5. Click the three dots → "Rollback to this deploy"
6. Wait 2-3 minutes for rollback to complete
7. Verify system is working

#### Option 2: Git Revert
```bash
# Clone if needed
gh repo clone just-walk/purposeful-live-coaching
cd purposeful-live-coaching

# Find last working commit
git log --oneline -20

# Revert the bad commit(s)
git revert HEAD
# or for multiple commits:
git revert HEAD~3..HEAD

# Push to trigger redeploy
git push origin main
```

#### Option 3: Emergency Disable
If you can't fix it, disable the broken feature:
```bash
# In Render Dashboard → Environment
DISABLE_VOICE=true
# This returns "temporarily unavailable" to callers
```

---

## 🟠 MAJOR: Specific Feature Broken

### Voice Calls Not Working

#### Check Points
1. Twilio webhook URL correct?
2. WebSocket endpoint responding?
3. OpenAI API key valid?
4. ElevenLabs API key valid?

#### Quick Fixes
```bash
# Check Twilio webhook
curl -X POST https://your-domain.com/api/voice/incoming \
  -d "From=+1234567890" \
  -d "CallSid=test123"

# Check WebSocket
wscat -c wss://your-domain.com/conversation-relay
```

### Payment Flow Broken

#### Check Points
1. Stripe API key valid?
2. Webhook secret correct?
3. Price ID exists?

#### Quick Fixes
```bash
# Verify Stripe webhook
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Check price exists
stripe prices list --limit 5
```

### Memory/Context Not Working

#### Check Points
1. Database connection working?
2. Client profile exists?
3. Smart Context Builder returning data?

#### Quick Fixes
```sql
-- Check client exists
SELECT * FROM client_profile WHERE phone = '+1234567890';

-- Check relationships exist
SELECT * FROM client_relationship WHERE client_profile_id = 'xxx';

-- Check recent insights
SELECT * FROM client_key_insight WHERE client_profile_id = 'xxx' ORDER BY extracted_at DESC LIMIT 10;
```

---

## 🟡 MINOR: Bug or Regression

### Process
1. Create hotfix branch
2. Fix the issue
3. Test locally
4. Push to main

```bash
# Create hotfix branch
git checkout -b hotfix/description

# Make fixes
# ... edit files ...

# Test locally
npm run build
npm run dev

# Merge and push
git checkout main
git merge hotfix/description
git push origin main
```

---

## Database Recovery

### If Data Was Accidentally Deleted

#### Check Render Backups
1. Go to Render Dashboard
2. Click on your PostgreSQL database
3. Click "Backups" tab
4. Download most recent backup before the incident

#### Restore Specific Table
```sql
-- If you have a backup, restore to a temp table first
CREATE TABLE client_profile_backup AS SELECT * FROM client_profile;

-- Then selectively restore
INSERT INTO client_profile 
SELECT * FROM client_profile_backup 
WHERE id NOT IN (SELECT id FROM client_profile);
```

### If Schema Was Broken

#### Never Modify Existing Migrations!
Instead:
1. Create a new migration to fix the issue
2. Run the new migration

```bash
# Create fix migration
npx drizzle-kit generate:pg --name fix_schema_issue

# Edit the migration file
# Then push
npx drizzle-kit push:pg
```

---

## Post-Incident Checklist

After any rollback or emergency fix:

- [ ] Document what happened
- [ ] Document what caused it
- [ ] Document how it was fixed
- [ ] Update CRITICAL_SYSTEM.md if needed
- [ ] Add tests to prevent recurrence
- [ ] Notify user of the incident

---

## Contact Information

### Render Support
- Dashboard: https://dashboard.render.com
- Status: https://status.render.com
- Support: support@render.com

### Twilio Support
- Console: https://console.twilio.com
- Status: https://status.twilio.com

### Stripe Support
- Dashboard: https://dashboard.stripe.com
- Status: https://status.stripe.com

---

## Prevention

### Before Deploying
1. Build locally: `npm run build`
2. Test critical paths
3. Review changes against CRITICAL_SYSTEM.md
4. Check for breaking changes

### Monitoring
- Set up Render alerts for errors
- Monitor Stripe webhook failures
- Check Twilio error logs regularly

### Backups
- Render PostgreSQL has automatic daily backups
- Consider additional backup strategy for critical data
