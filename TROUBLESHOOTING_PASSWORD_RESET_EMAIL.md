
# 🔧 Troubleshooting: Password Reset Email Not Arriving

## Problem
When clicking "Enviar código de recuperación" (Send recovery code), the email is not arriving to the user's inbox.

## Current Status
✅ **Token Generation**: Working correctly - tokens are being created in the `password_tokens` table
✅ **Edge Function Deployment**: Updated with enhanced logging
❌ **Email Delivery**: Failing at the Resend API call

## Root Cause Analysis

The Edge Function is returning a **500 error** when trying to send the email via Resend API. This indicates one of the following issues:

### 1. Missing RESEND_API_KEY Environment Variable
**Most Likely Cause**

The `RESEND_API_KEY` environment variable may not be configured in your Supabase project.

**How to Fix:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (starts with `re_`)
4. Click **Save**

**Where to get your Resend API Key:**
1. Go to https://resend.com/api-keys
2. Create a new API key if you don't have one
3. Copy the key (it starts with `re_`)

### 2. Domain Not Verified in Resend
**Second Most Likely Cause**

The domain `barliveapp.es` must be verified in Resend before you can send emails from `noreply@barliveapp.es`.

**How to Fix:**
1. Go to https://resend.com/domains
2. Click **Add Domain**
3. Enter `barliveapp.es`
4. Follow the instructions to add DNS records to your domain registrar
5. Wait for verification (usually takes a few minutes to a few hours)

**DNS Records to Add:**
You'll need to add these records to your domain's DNS settings (at your domain registrar, e.g., GoDaddy, Namecheap, etc.):

- **SPF Record** (TXT): `v=spf1 include:_spf.resend.com ~all`
- **DKIM Record** (TXT): Provided by Resend (unique to your domain)
- **DMARC Record** (TXT): `v=DMARC1; p=none;`

### 3. Resend Account Issues

**Possible Issues:**
- Free tier limits exceeded
- Account suspended
- Payment issues

**How to Check:**
1. Go to https://resend.com/overview
2. Check your account status
3. Check your sending limits and usage

## Testing the Fix

After configuring the `RESEND_API_KEY` and verifying your domain:

### 1. Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** → **request-password-token**
3. Click on **Logs**
4. Try sending a recovery code again
5. Look for these log messages:

**Success Indicators:**
```
✅ RESEND_API_KEY is configured
✅ Token stored in database
📧 Sending email via Resend...
📧 Resend API Response Status: 200
✅ Email sent successfully via Resend
```

**Error Indicators:**
```
❌ RESEND_API_KEY not configured
❌ Resend API Error
❌ Status: 403 (Domain not verified)
❌ Status: 401 (Invalid API key)
❌ Status: 429 (Rate limit exceeded)
```

### 2. Test Email Delivery

1. Open the BarLive app
2. Go to **Recuperar Contraseña** (Recover Password)
3. Enter your email: `jorgepereznoyagh@gmail.com`
4. Click **Enviar código de recuperación**
5. Check your email inbox (and spam folder)

### 3. Verify Token in Database

You can verify that tokens are being created:

```sql
SELECT * FROM password_tokens 
WHERE email = 'jorgepereznoyagh@gmail.com' 
ORDER BY created_at DESC 
LIMIT 5;
```

## Alternative Solution: Use Supabase Native Email

If you continue having issues with Resend, you can use Supabase's native email service:

### Option A: Supabase SMTP (Recommended for Production)

1. Go to **Settings** → **Auth** → **SMTP Settings**
2. Configure your own SMTP server (e.g., SendGrid, Mailgun, AWS SES)
3. Update the Edge Function to use Supabase's email service

### Option B: Temporary Testing with Supabase Default

For testing purposes only, you can use Supabase's default email service:

1. Go to **Settings** → **Auth** → **Email Templates**
2. Enable the "Reset Password" template
3. Modify the Edge Function to use `supabase.auth.resetPasswordForEmail()`

## Quick Diagnostic Checklist

- [ ] `RESEND_API_KEY` is configured in Supabase Edge Function secrets
- [ ] Domain `barliveapp.es` is verified in Resend
- [ ] DNS records (SPF, DKIM, DMARC) are correctly configured
- [ ] Resend account is active and within sending limits
- [ ] Edge Function logs show successful email sending
- [ ] Email is not in spam folder
- [ ] Email address is correct and exists in the system

## Next Steps

1. **Configure RESEND_API_KEY** in Supabase Dashboard
2. **Verify domain** in Resend
3. **Test again** and check Edge Function logs
4. **Check spam folder** if email still doesn't arrive
5. **Contact support** if issue persists:
   - Resend Support: https://resend.com/support
   - Supabase Support: https://supabase.com/support

## Additional Resources

- **Resend Documentation**: https://resend.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **DNS Configuration Guide**: https://resend.com/docs/send-with-resend/verify-domain

## Contact Information

If you need further assistance:
- **Email**: soporte@barliveapp.es
- **Supabase Project ID**: embntaqwlwmgazvrglaf
- **Edge Function**: request-password-token

---

**Last Updated**: December 10, 2024
**Status**: Awaiting RESEND_API_KEY configuration
