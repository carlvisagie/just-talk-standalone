# Stripe Webhook Deployment Guide

## 🎯 Overview

This guide walks you through deploying the enterprise-grade Stripe webhook system that connects payments to ProfileGuard and Twilio automation.

## ✅ What's Built

### 1. **Stripe Webhook Handler** (`server/webhooks/stripeWebhook.ts`)
- ✅ Signature verification (security)
- ✅ Idempotency handling (prevents duplicates)
- ✅ Comprehensive logging (observability)
- ✅ Database transactions (data integrity)
- ✅ Graceful degradation (SMS failures don't break payments)
- ✅ Error handling with Stripe retry support

### 2. **Events Handled**
- ✅ `checkout.session.completed` - Customer pays → Create profile → Send SMS
- ✅ `customer.subscription.updated` - Subscription changes (upgrade/downgrade)
- ✅ `customer.subscription.deleted` - Subscription cancelled → Downgrade to free

### 3. **Twilio Welcome Automation** (`server/twilioIntegration.ts`)
- ✅ `sendWelcomeSMS()` function
- ✅ Personalized messages based on tier (voice vs phone)
- ✅ Graceful error handling
- ✅ Integration with webhook handler

### 4. **Database Schema**
- ✅ `subscription` table tracks Stripe subscriptions
- ✅ Links to `clientProfile` (ProfileGuard)
- ✅ Stores tier, status, billing period

## 🚀 Deployment Steps

### Step 1: Deploy to Render

1. **Push code to GitHub**:
   ```bash
   cd /home/ubuntu/just-talk-standalone
   git add .
   git commit -m "Add enterprise-grade Stripe webhook system"
   git push origin main
   ```

2. **Render will auto-deploy** (connected to GitHub)

3. **Wait for deployment** to complete (~3-5 minutes)

### Step 2: Configure Stripe Webhook

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/webhooks

2. **Click "Add endpoint"**

3. **Enter webhook URL**:
   ```
   https://just-talk.onrender.com/api/webhooks/stripe
   ```

4. **Select events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. **Click "Add endpoint"**

6. **Copy the webhook signing secret** (starts with `whsec_...`)

### Step 3: Add Webhook Secret to Render

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Select your "just-talk-standalone" service**

3. **Go to "Environment" tab**

4. **Add new environment variable**:
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (paste the secret from Stripe)

5. **Click "Save Changes"**

6. **Render will redeploy** automatically

### Step 4: Configure Twilio (Optional - for SMS)

1. **Go to Twilio Console**: https://console.twilio.com

2. **Get your credentials**:
   - Account SID
   - Auth Token
   - Phone Number (purchase one if needed)

3. **Add to Render environment variables**:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER` (format: +1234567890)

4. **Save and redeploy**

## 🧪 Testing

### Test Webhook with Stripe CLI (Local)

1. **Install Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   # or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**:
   ```bash
   stripe login
   ```

3. **Forward webhooks to local server**:
   ```bash
   stripe listen --forward-to localhost:3004/api/webhooks/stripe
   ```

4. **Trigger test event**:
   ```bash
   stripe trigger checkout.session.completed
   ```

5. **Check logs** for webhook processing

### Test End-to-End Payment Flow (Production)

1. **Go to**: https://just-talk.onrender.com

2. **Click "Get Started" on Voice Plan ($12/month)**

3. **Use Stripe test card**:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

4. **Enter email and phone number**

5. **Complete checkout**

6. **Verify**:
   - ✅ Payment succeeds in Stripe dashboard
   - ✅ Webhook event appears in Stripe dashboard
   - ✅ Client profile created in database
   - ✅ Subscription record created
   - ✅ Welcome SMS sent (if Twilio configured)

## 🔍 Monitoring

### Check Webhook Logs in Render

1. **Go to Render Dashboard**
2. **Select "just-talk-standalone" service**
3. **Click "Logs" tab**
4. **Search for**: `[Webhook]`

### Check Webhook Events in Stripe

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/webhooks
2. **Click on your webhook endpoint**
3. **View "Recent deliveries"**
4. **Check for**:
   - ✅ 200 responses (success)
   - ❌ 400/500 responses (errors)

### Check Database Records

1. **Go to Render Dashboard**
2. **Select "just-talk-standalone" service**
3. **Go to "Shell" tab**
4. **Run SQL query**:
   ```sql
   SELECT * FROM subscription ORDER BY created_at DESC LIMIT 10;
   SELECT * FROM client_profile ORDER BY created_at DESC LIMIT 10;
   ```

## 🐛 Troubleshooting

### Webhook Returns 400 (Bad Request)
- **Cause**: Invalid signature
- **Fix**: Verify `STRIPE_WEBHOOK_SECRET` is correct in Render

### Webhook Returns 500 (Internal Server Error)
- **Cause**: Database error or code bug
- **Fix**: Check Render logs for error details

### SMS Not Sending
- **Cause**: Twilio credentials not configured or invalid
- **Fix**: Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in Render
- **Note**: SMS failure doesn't break payment processing (graceful degradation)

### Profile Not Created
- **Cause**: Database connection issue
- **Fix**: Check `DATABASE_URL` in Render, verify database is accessible

### Webhook Not Receiving Events
- **Cause**: Wrong URL or webhook not enabled
- **Fix**: Verify webhook URL in Stripe dashboard matches deployed URL

## 📊 What Happens When Customer Pays

```
1. Customer clicks "Subscribe" button
   ↓
2. Stripe Checkout opens
   ↓
3. Customer enters payment info
   ↓
4. Stripe processes payment
   ↓
5. Stripe sends webhook to /api/webhooks/stripe
   ↓
6. Webhook handler verifies signature
   ↓
7. Webhook handler creates client profile in ProfileGuard
   ↓
8. Webhook handler creates subscription record
   ↓
9. Webhook handler sends welcome SMS (if phone provided)
   ↓
10. Customer receives confirmation email from Stripe
    ↓
11. Customer receives welcome SMS from Twilio (if configured)
    ↓
12. Customer can now use paid features
```

## 🎯 Next Steps

After webhook is working:

1. **Build tier-based feature gating** (Phase 3)
   - Implement free tier limits (5 conversations/day)
   - Unlock features based on subscription tier

2. **Add conversion prompts** (Phase 4)
   - Show upgrade prompts when free users hit limits
   - Handle "can't afford it" with compassion

3. **Build subscription management UI** (Phase 5)
   - Show subscription status in dashboard
   - Add upgrade/downgrade/cancel buttons

4. **Production hardening** (Phase 6)
   - Add webhook retry queue
   - Implement email fallback if SMS fails
   - Add monitoring/alerting for failed webhooks

## 📝 Environment Variables Checklist

- [x] `STRIPE_SECRET_KEY` (already configured)
- [ ] `STRIPE_WEBHOOK_SECRET` (needs to be set after creating webhook)
- [ ] `TWILIO_ACCOUNT_SID` (optional, for SMS)
- [ ] `TWILIO_AUTH_TOKEN` (optional, for SMS)
- [ ] `TWILIO_PHONE_NUMBER` (optional, for SMS)
- [x] `DATABASE_URL` (already configured)
- [x] `OPENAI_API_KEY` (already configured)

## 🎉 Success Criteria

You'll know the system is working when:

1. ✅ Test payment completes successfully
2. ✅ Webhook shows 200 response in Stripe dashboard
3. ✅ New record appears in `subscription` table
4. ✅ New record appears in `client_profile` table
5. ✅ Welcome SMS delivered (if Twilio configured)
6. ✅ No errors in Render logs

## 🚨 Important Notes

- **Test mode**: Use Stripe test keys and test cards for testing
- **Production mode**: Switch to live keys only after thorough testing
- **Security**: Never commit webhook secrets to Git
- **Monitoring**: Check webhook logs daily for first week
- **Graceful degradation**: SMS failures won't break payment processing
- **Idempotency**: Duplicate webhooks are automatically handled
- **Retries**: Stripe will retry failed webhooks automatically

---

**Built with enterprise-grade reliability, security, and observability.** 🚀
