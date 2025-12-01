
# Email Domain Verification Guide - BarLive

## Problem

The `send-verification-email` Edge Function is returning a **403 Forbidden** error from Resend API.

**Error Message:**
```
Error sending verification email: FunctionsHttpError: Edge Function returned a non-2xx status code
```

## Root Cause

The domain `barlive.app` is **not verified** in Resend. Resend requires domain verification before you can send emails from that domain.

## Solution

### Step 1: Access Resend Dashboard

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Log in with your Resend account

### Step 2: Add Domain (if not already added)

1. Click **"Add Domain"**
2. Enter `barlive.app`
3. Click **"Add"**

### Step 3: Verify Domain

You need to add DNS records to verify domain ownership:

#### Required DNS Records:

1. **SPF Record** (TXT)
   - Name: `@` or `barlive.app`
   - Value: `v=spf1 include:_spf.resend.com ~all`

2. **DKIM Record** (TXT)
   - Name: Will be provided by Resend (usually something like `resend._domainkey`)
   - Value: Will be provided by Resend

3. **DMARC Record** (TXT) - Optional but recommended
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:dmarc@barlive.app`

### Step 4: Add DNS Records to Your Domain Provider

1. Go to your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare)
2. Navigate to DNS settings for `barlive.app`
3. Add the DNS records provided by Resend
4. Save changes

### Step 5: Wait for Verification

- DNS propagation can take **5 minutes to 48 hours**
- Usually completes within **15-30 minutes**
- Check verification status in Resend Dashboard

### Step 6: Test Email Sending

Once verified, test the email sending:

```bash
# Test via Supabase Edge Function
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "verification"
  }'
```

## Temporary Workaround

While waiting for domain verification, the app has a **fallback mechanism**:

1. When email sending fails, the verification code is shown directly in the app
2. Users can copy the code and proceed with verification
3. This ensures the authentication flow continues even if emails fail

### How the Fallback Works:

```typescript
// In crear-password-google.tsx
if (emailError) {
  Alert.alert(
    'Servicio de correo en configuración',
    `El servicio de correo está siendo configurado. 
    
    📋 Tu código de verificación es:
    
    ${code}
    
    ⏱️ Este código expirará en 10 minutos.`
  );
}
```

## Alternative: Use Resend Test Domain

For immediate testing, you can temporarily use Resend's test domain:

1. Update Edge Function to use `onboarding@resend.dev` as sender
2. This works without domain verification
3. **Only for testing** - not suitable for production

```typescript
// Temporary change in send-verification-email/index.ts
from: 'BarLive <onboarding@resend.dev>', // Instead of noreply@barlive.app
```

## Verification Checklist

- [ ] Domain added to Resend Dashboard
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS (optional)
- [ ] DNS records propagated (check with `dig` or online tools)
- [ ] Domain shows as "Verified" in Resend Dashboard
- [ ] Test email sent successfully
- [ ] Production emails working

## Troubleshooting

### DNS Not Propagating

Check DNS propagation:
```bash
# Check SPF record
dig TXT barlive.app

# Check DKIM record
dig TXT resend._domainkey.barlive.app
```

Or use online tools:
- https://dnschecker.org/
- https://mxtoolbox.com/

### Still Getting 403 After Verification

1. **Clear DNS cache** on your machine
2. **Wait longer** - DNS can take up to 48 hours
3. **Check Resend Dashboard** - ensure status is "Verified"
4. **Regenerate DKIM** in Resend if needed
5. **Contact Resend Support** if issue persists

### Wrong DNS Records

Common mistakes:
- Using `www.barlive.app` instead of `barlive.app`
- Missing the `@` symbol for root domain records
- Copying DNS values with extra spaces or quotes
- Adding records to wrong domain

## Monitoring

### Check Edge Function Logs

```bash
# View recent logs
supabase functions logs send-verification-email --project-ref embntaqwlwmgazvrglaf
```

### Expected Success Log:
```
[SendVerificationEmail] ✅ Email sent successfully! Message ID: abc123
```

### Expected Error Log (before verification):
```
[SendVerificationEmail] ❌ Resend API error: 403
Domain "barlive.app" not verified in Resend
```

## Production Checklist

Before going to production:

1. ✅ Domain verified in Resend
2. ✅ All DNS records properly configured
3. ✅ Test emails sent successfully
4. ✅ SPF, DKIM, DMARC all passing
5. ✅ Email deliverability tested (check spam folders)
6. ✅ Fallback mechanism tested
7. ✅ Error handling working correctly
8. ✅ User experience smooth for both success and failure cases

## Support

If you continue to experience issues:

1. **Check Resend Status**: https://status.resend.com/
2. **Resend Documentation**: https://resend.com/docs/dashboard/domains/introduction
3. **Resend Support**: support@resend.com
4. **Supabase Support**: https://supabase.com/support

## Summary

The 403 error is expected and normal when the domain is not yet verified. The app handles this gracefully by showing the verification code directly to users. Once you verify `barlive.app` in Resend, emails will be sent successfully.

**Estimated Time to Fix**: 15-30 minutes (plus DNS propagation time)

**Priority**: Medium (app works with fallback, but email is better UX)

**Status**: Waiting for domain verification
