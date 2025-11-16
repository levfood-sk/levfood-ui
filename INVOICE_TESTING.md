# Invoice Generation Testing Guide

## Quick Debug Steps

### 1. Test with Debug Endpoint (Recommended First)

This will test the complete flow without needing a real Stripe payment:

```bash
# Replace ORDER_ID with a real order ID from your Firestore
curl -X POST http://localhost:3000/api/test/invoice-debug \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123456", "testEmail": "your-email@example.com"}'
```

**What this tests:**
- ✅ Firestore connection
- ✅ Order and client data retrieval
- ✅ Superfaktura API connection
- ✅ Invoice creation
- ✅ PDF download
- ✅ Email sending with attachment

**Expected output:** JSON with detailed logs showing each step

### 2. Check Server Logs

When testing a real order, watch your dev server console for these log messages:

```
✅ Found order for invoice generation: {...}
✅ Client found: {...}
📋 Superfaktura configuration: {...}
📤 Creating invoice in Superfaktura...
✅ Superfaktura invoice created: {...}
📥 Downloading invoice PDF...
✅ Invoice PDF downloaded successfully: {...}
📧 Sending client confirmation email to: ...
✅ Client order confirmation email sent: {...}
```

**If you see:**
- `⚠️  Order not found yet, retrying...` → Normal, webhook fired before order was saved
- `❌ Failed to create Superfaktura invoice:` → Check Superfaktura credentials
- `❌ Failed to download invoice PDF` → Check Superfaktura API access
- `❌ Failed to send client confirmation email:` → Check SMTP settings

### 3. Common Issues & Fixes

#### Issue: "No order found for payment intent"
**Cause:** Webhook fires before `/api/orders/create` completes (race condition)
**Solution:** Already implemented retry logic with 3 attempts × 2 second delays

#### Issue: "Superfaktura invoice creation failed"
**Possible causes:**
1. **Wrong credentials** - Check `.env`:
   - `SUPERFAKTURA_EMAIL` = your Superfaktura account email
   - `SUPERFAKTURA_API_KEY` = from Superfaktura dashboard
   - `SUPERFAKTURA_COMPANY_ID` = optional, but recommended

2. **Sandbox vs Production mismatch**
   - `.env` has `SUPERFAKTURA_IS_SANDBOX=false` (production mode)
   - Make sure you're logged into the correct Superfaktura account
   - For testing, set to `=true` to use sandbox: https://sandbox.superfaktura.sk

3. **API Key permissions** - Ensure API key has invoice creation rights

#### Issue: "Failed to download invoice PDF"
**Possible causes:**
1. Invoice was created but PDF endpoint failed
2. Check Superfaktura API status
3. Verify invoice ID is correct in logs

#### Issue: "Client confirmation email not sent"
**Possible causes:**
1. **SMTP configuration issue** - Your `.env` has:
   ```
   SMTP_SECURE=true
   ```
   But the code expects `'true'` (string). Change to:
   ```
   SMTP_SECURE='true'
   ```

2. **Port 465 requires SSL** - You're using port 465 which is correct for `secure: true`

3. **Zoho SMTP specifics**:
   - Host: `smtppro.zoho.eu` ✅ (correct for EU)
   - Port: `465` ✅ (SSL/TLS)
   - Make sure the password is an app-specific password, not your main Zoho password

#### Issue: "Admin email sent but not client email"
**Cause:** Admin email is sent from `/api/orders/create` but client email is sent from webhook
**Check:** Look for webhook logs in server console

### 4. Verify Webhook is Working

#### Check if webhook is receiving events:

Look for this log when payment succeeds:
```
Stripe webhook received: {
  type: 'payment_intent.succeeded',
  id: 'evt_...',
  timestamp: '...'
}
```

If you DON'T see this:
1. **Local development:** You need Stripe CLI
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. **Production:** Check Stripe Dashboard:
   - Go to Developers > Webhooks
   - Verify endpoint is active: `https://yourdomain.com/api/stripe/webhook`
   - Check event delivery attempts (click on webhook to see logs)
   - Make sure `payment_intent.succeeded` is selected

### 5. Manual Test Checklist

- [ ] Environment variables are correct (especially SMTP_SECURE as string)
- [ ] Superfaktura credentials are valid
- [ ] Stripe webhook is configured and firing
- [ ] Server logs show the complete flow
- [ ] Invoice appears in Superfaktura dashboard
- [ ] Client receives email with PDF attachment
- [ ] Order document in Firestore has `superfakturaInvoiceId` and `superfakturaInvoiceNumber`

### 6. Test Email Configuration

Create a test file to verify SMTP works:

```typescript
// server/api/test/email-test.post.ts
import { sendClientOrderConfirmation } from '~~/server/utils/email'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const result = await sendClientOrderConfirmation(body.email, {
    clientName: 'Test User',
    orderId: '123456',
  })

  return result
})
```

Test it:
```bash
curl -X POST http://localhost:3000/api/test/email-test \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

## Environment Variable Checklist

```bash
# Superfaktura (Production mode - sandbox=false)
SUPERFAKTURA_EMAIL=filip.dvoracek1@gmail.com
SUPERFAKTURA_API_KEY=lwtotACU3480nbXtvkb8IALpkBl9knc7
SUPERFAKTURA_COMPANY_ID=146162
SUPERFAKTURA_IS_SANDBOX=false  # Change to 'true' for testing

# SMTP - FIX THIS LINE:
SMTP_SECURE='true'  # ← Add quotes! Was: true

# Other SMTP settings look correct:
SMTP_HOST=smtppro.zoho.eu
SMTP_PORT=465
SMTP_USER=filip.dvoracek1@gmail.com
SMTP_PASSWORD=LevFOOD30
SMTP_FROM_EMAIL=info@levfood.sk
SMTP_FROM_NAME=LevFood
```

## Next Steps

1. **Fix `.env`**: Change `SMTP_SECURE=true` to `SMTP_SECURE='true'`
2. **Restart dev server**: `pnpm dev`
3. **Test with debug endpoint** first (see step 1 above)
4. **Make a test order** and watch server logs
5. **Check Superfaktura dashboard** for the invoice
6. **Check email inbox** for confirmation with PDF

## Getting Help

If still not working, share:
1. Complete server console logs from the moment payment succeeds
2. Any error messages from the debug endpoint
3. Screenshot of Stripe webhook delivery attempts
