
# Stripe Payment System Implementation - Complete Guide

## Overview

This document describes the complete implementation of the Stripe payment system for Barlive, including database schema, Edge Functions, admin panel, and payment flow.

## Database Schema

### Tables Created

1. **stripe_customers**
   - Stores Stripe customer information
   - Links users/locals to Stripe customer IDs
   - Enables payment tracking

2. **payment_transactions**
   - Records all payment transactions
   - Tracks payment status (pending, succeeded, failed, refunded)
   - Links to locals and subscription plans

3. **invoices**
   - Stores invoice details
   - Includes customer and company fiscal data
   - Calculates Spanish IVA (21%)
   - Generates unique invoice numbers

4. **company_fiscal_data**
   - Stores Barlive's fiscal information
   - Used for invoice generation
   - Configurable via admin panel

5. **stripe_configuration**
   - Stores Stripe API keys
   - Test/Production mode toggle
   - Webhook secret configuration

## Edge Functions

### 1. create-payment-intent
**Purpose:** Creates a Stripe payment intent for processing payments

**Endpoint:** `/functions/v1/create-payment-intent`

**Input:**
```json
{
  "localId": "uuid",
  "planId": "uuid",
  "amount": 29.99
}
```

**Output:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx"
}
```

**Features:**
- Creates or retrieves Stripe customer
- Generates payment intent
- Records payment session in database
- Supports automatic payment methods

### 2. stripe-webhook
**Purpose:** Handles Stripe webhook events

**Endpoint:** `/functions/v1/stripe-webhook`

**Webhook URL:** `https://[your-project].supabase.co/functions/v1/stripe-webhook`

**Supported Events:**
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription cancelled

**Actions:**
- Updates payment status
- Creates/updates subscriptions
- Generates invoices automatically
- Sends notifications to users

### 3. send-invoice-email
**Purpose:** Sends invoice emails to customers and accounting

**Endpoint:** `/functions/v1/send-invoice-email`

**Input:**
```json
{
  "invoiceId": "uuid",
  "recipientEmail": "optional@email.com"
}
```

**Features:**
- Generates HTML invoice email
- Sends to customer or custom recipient
- Includes invoice details and PDF link
- Professional email template

## Admin Panel Features

### Gestionar Pagos Stripe (`app/admin/gestionar-pagos-stripe.tsx`)

#### Tabs:

1. **Transacciones**
   - View all payment transactions
   - Filter by status
   - Statistics dashboard (total revenue, monthly revenue, pending invoices)
   - Transaction details with status badges

2. **Facturas**
   - View all invoices
   - Download invoices (PDF)
   - Send invoices to accounting email
   - Invoice status tracking

3. **Stripe**
   - Configure Stripe API keys
   - Test/Production mode toggle
   - Test connection button
   - Webhook URL display
   - Security warnings

4. **Ajustes**
   - Configure Barlive fiscal data
   - Set accounting email
   - Toggle automatic invoice sending
   - Update company information

## Payment Flow

### 1. User Selects Plan
```typescript
// User adds plan to shopping cart
await supabase.from('shopping_cart').insert({
  user_id: userId,
  local_id: localId,
  plan_id: planId,
  quantity: 1
});
```

### 2. Checkout Process
```typescript
// Create payment intent
const { data } = await supabase.functions.invoke('create-payment-intent', {
  body: { localId, planId, amount }
});

// Use Stripe SDK to complete payment
const { error } = await stripe.confirmPayment({
  clientSecret: data.clientSecret,
  // ... payment details
});
```

### 3. Webhook Processing
- Stripe sends webhook event
- Edge Function processes event
- Updates subscription status
- Generates invoice
- Sends notifications

### 4. Invoice Generation
- Automatic invoice creation
- Spanish IVA calculation (21%)
- Unique invoice numbering (BL-YYYY-XXXXXX)
- PDF generation (future feature)
- Email delivery

## Configuration Steps

### 1. Stripe Dashboard Setup

1. Create Stripe account at https://stripe.com
2. Get API keys from Dashboard > Developers > API keys
3. Create webhook endpoint:
   - URL: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.*`, `customer.subscription.*`
4. Copy webhook secret

### 2. Admin Panel Configuration

1. Navigate to Admin > Gestionar Pagos Stripe
2. Go to "Stripe" tab
3. Click "Editar Configuración"
4. Enter:
   - Publishable Key (pk_test_... or pk_live_...)
   - Secret Key (sk_test_... or sk_live_...)
   - Webhook Secret (whsec_...)
   - Toggle Test Mode as needed
5. Click "Probar Conexión" to verify
6. Save configuration

### 3. Company Fiscal Data

1. Go to "Ajustes" tab
2. Click "Editar Datos Fiscales"
3. Enter:
   - Company Name (Barlive)
   - CIF (Tax ID)
   - Address, City, Postal Code
   - Phone, Email
   - Accounting Email (for invoice forwarding)
4. Toggle automatic invoice sending
5. Save changes

## Invoice System

### Automatic Invoice Generation

When a payment succeeds:
1. Transaction record created
2. Invoice generated with:
   - Unique invoice number
   - Customer details
   - Company details
   - Subtotal, IVA (21%), Total
   - Payment method
3. Invoice stored in database
4. Email sent to customer
5. Optional: Email sent to accounting

### Invoice Numbering

Format: `BL-YYYY-XXXXXX`
- BL: Barlive prefix
- YYYY: Current year
- XXXXXX: Sequential number (padded to 6 digits)

Example: `BL-2025-000001`

### Spanish Tax Compliance

- IVA rate: 21% (standard rate in Spain)
- Automatic tax calculation
- Proper invoice formatting
- Company fiscal data included
- Customer tax ID (NIF/CIF) support

## Notifications

### User Notifications

Users receive notifications for:
- Payment successful
- Payment failed
- Subscription activated
- Subscription renewed
- Subscription cancelled

### Email Notifications

Emails sent for:
- Invoice issued (to customer)
- Invoice forwarded (to accounting)
- Payment confirmation
- Subscription updates

## Security Features

1. **RLS Policies**
   - Users can only view their own data
   - Admins have full access
   - Secure data isolation

2. **API Key Protection**
   - Keys stored securely in database
   - Never exposed to client
   - Masked in admin panel

3. **Webhook Verification**
   - Signature verification
   - Prevents unauthorized requests
   - Secure event processing

4. **Test Mode**
   - Separate test/production keys
   - Safe testing environment
   - No real charges in test mode

## Testing

### Test Mode Setup

1. Use Stripe test keys (pk_test_..., sk_test_...)
2. Enable test mode in admin panel
3. Use test card numbers:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
   - 3D Secure: 4000 0027 6000 3184

### Testing Webhooks

1. Use Stripe CLI for local testing:
   ```bash
   stripe listen --forward-to https://[your-project].supabase.co/functions/v1/stripe-webhook
   ```

2. Trigger test events:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## Troubleshooting

### Common Issues

1. **"Stripe configuration not found"**
   - Solution: Configure Stripe keys in admin panel

2. **"Webhook signature verification failed"**
   - Solution: Update webhook secret in admin panel

3. **"Payment intent creation failed"**
   - Solution: Check Stripe API key validity

4. **"Invoice generation failed"**
   - Solution: Ensure company fiscal data is configured

### Debug Logs

Check Edge Function logs:
```bash
supabase functions logs create-payment-intent
supabase functions logs stripe-webhook
supabase functions logs send-invoice-email
```

## Future Enhancements

1. **PDF Invoice Generation**
   - Generate PDF invoices
   - Store in Supabase Storage
   - Download functionality

2. **Subscription Management**
   - Upgrade/downgrade plans
   - Proration handling
   - Cancellation flow

3. **Payment Methods**
   - Save payment methods
   - Multiple payment methods
   - Default payment method

4. **Analytics Dashboard**
   - Revenue charts
   - Subscription metrics
   - Customer lifetime value

5. **Refund System**
   - Process refunds
   - Partial refunds
   - Refund notifications

## Support

For issues or questions:
- Check Stripe Dashboard for payment details
- Review Edge Function logs
- Verify webhook configuration
- Contact Stripe support for payment issues

## Compliance

This implementation complies with:
- Spanish tax regulations (IVA)
- GDPR data protection
- PCI DSS (via Stripe)
- Stripe's terms of service

---

**Last Updated:** January 2025
**Version:** 1.0.0
