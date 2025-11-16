# Stripe Webhook Setup for Local Development

## The Problem

Your invoice generation works perfectly (as proven by the debug endpoint), but the Stripe webhook is not firing in local development. This is why you only receive the admin email but not the client email with invoice.

## Solution: Use Stripe CLI

### Step 1: Install Stripe CLI

**macOS (using Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Or download from:** https://github.com/stripe/stripe-cli/releases

### Step 2: Login to Stripe

```bash
stripe login
```

This will open your browser to authenticate.

### Step 3: Forward Webhooks to Local Server

**Start your Nuxt dev server first:**
```bash
pnpm dev
```

**In a new terminal, run:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

You'll see output like:
```
> Ready! You are using Stripe API Version [2024-xx-xx]. Your webhook signing secret is whsec_xxxxx (^C to quit)
```

### Step 4: Update Your .env (Temporary, for testing only)

Copy the webhook signing secret from the output above and **temporarily** update your `.env`:

```bash
# Replace with the secret from stripe listen command
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

**IMPORTANT:** This is only for local testing! Don't commit this to git.

### Step 5: Restart Your Dev Server

```bash
# Stop the dev server (Ctrl+C) and restart
pnpm dev
```

### Step 6: Test an Order

Now make a test order. You should see in the Stripe CLI terminal:
```
  --> payment_intent.created [evt_xxx]
  --> charge.succeeded [evt_xxx]
  --> payment_intent.succeeded [evt_xxx]
<-- [200] POST http://localhost:3000/api/stripe/webhook [evt_xxx]
```

And in your Nuxt console, you'll see all the invoice generation logs:
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

## For Production Deployment

When you deploy to production, you need to:

1. **Go to Stripe Dashboard:**
   - https://dashboard.stripe.com/webhooks

2. **Add endpoint:**
   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to send: Select `payment_intent.succeeded` and `payment_intent.payment_failed`

3. **Copy the webhook signing secret** and add to your production environment variables:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
   ```

## Quick Test Without Webhook (Alternative)

If you don't want to set up Stripe CLI right now, you can **manually trigger** the invoice generation for existing orders:

```bash
# Find an order ID from your recent test
# Then call the debug endpoint:
curl -X POST http://localhost:3000/api/test/invoice-debug \
  -H "Content-Type: application/json" \
  -d '{"orderId": "660861", "testEmail": "kocisek.martin@gmail.com"}'
```

This will generate the invoice and send the email for that specific order.

## Troubleshooting

### "Connection refused" when webhook fires
- Make sure Nuxt dev server is running on port 3000
- Check if another process is using port 3000: `lsof -i :3000`

### "Webhook signature verification failed"
- Make sure you updated `.env` with the new secret from `stripe listen`
- Restart the dev server after changing `.env`

### Events not showing in Stripe CLI
- Check that Stripe CLI is still running
- Try restarting: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Invoice created but email not sent
- Check the Nuxt console for email errors
- Verify SMTP settings in `.env`
- Try the email test endpoint: `/api/test/email-test`
