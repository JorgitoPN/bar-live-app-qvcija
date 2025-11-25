
# Email System Troubleshooting Guide

## Error: "FunctionsHttpError: Edge Function returned a non-2xx status code"

This error occurs when the `send-verification-email` Edge Function fails to send emails through Resend. Here's how to diagnose and fix it:

### Step 1: Check Edge Function Logs

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions** → **send-verification-email**
3. Click on **Logs** tab
4. Look for detailed error messages

The updated Edge Function now provides detailed logging including:
- Whether RESEND_API_KEY is configured
- The exact Resend API response
- Detailed error messages

### Step 2: Verify RESEND_API_KEY

The most common cause is a missing or invalid Resend API key.

**To check/set the API key:**

1. Go to Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**
2. Look for `RESEND_API_KEY`
3. If missing, add it:
   - Go to [Resend Dashboard](https://resend.com/api-keys)
   - Create a new API key
   - Copy the key (starts with `re_`)
   - Add it to Supabase Secrets as `RESEND_API_KEY`

### Step 3: Verify Domain Configuration in Resend

Your domain `barlive.app` must be fully verified in Resend before you can send emails.

**Check domain status:**

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Find `barlive.app`
3. Check that all DNS records are verified (green checkmarks):
   - SPF record
   - DKIM records (3 records)
   - DMARC record (optional but recommended)

**If records are not verified:**

1. Click on the domain to see the required DNS records
2. Add these records to your DNS provider (where you manage barlive.app)
3. Wait for DNS propagation (can take 5 minutes to 48 hours)
4. Click "Verify" in Resend dashboard

### Step 4: Test with Resend API Directly

You can test if Resend is working by making a direct API call:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "BarLive <noreply@barlive.app>",
    "to": ["your-email@example.com"],
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

**Expected responses:**

- **Success (200)**: `{"id":"some-message-id"}`
- **Domain not verified (403)**: `{"message":"Domain not verified"}`
- **Invalid API key (401)**: `{"message":"Invalid API key"}`
- **Missing from domain (400)**: `{"message":"Validation error"}`

### Step 5: Common Error Messages and Solutions

#### "RESEND_API_KEY is missing"
- **Cause**: API key not set in Supabase Secrets
- **Solution**: Add the key in Supabase Dashboard → Edge Functions → Secrets

#### "Domain not verified"
- **Cause**: DNS records not properly configured or not propagated
- **Solution**: 
  1. Verify all DNS records are added correctly
  2. Wait for DNS propagation
  3. Use [DNS Checker](https://dnschecker.org/) to verify propagation

#### "validation_error"
- **Cause**: Usually means domain verification is pending
- **Solution**: Check Resend dashboard for domain status

#### "Invalid API key"
- **Cause**: Wrong API key or key was regenerated
- **Solution**: Generate a new API key in Resend and update Supabase Secrets

### Step 6: Temporary Workaround

While waiting for domain verification, you can:

1. Use Resend's test domain (only works in development):
   - Change `from: 'BarLive <noreply@barlive.app>'` 
   - To `from: 'onboarding@resend.dev'`
   - This only works for sending to your own email

2. Display the verification code in the app:
   - The app already shows the code in an alert if email fails
   - Users can manually enter the code

### Step 7: Monitor Email Delivery

Once emails are sending:

1. Check Resend Dashboard → **Emails** to see delivery status
2. Look for bounces or spam reports
3. Monitor Edge Function logs for any errors

### DNS Records Reference

Here are the DNS records you need to add for `barlive.app`:

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: CNAME
Name: resend._domainkey
Value: [provided by Resend]

Type: CNAME
Name: resend2._domainkey
Value: [provided by Resend]

Type: CNAME
Name: resend3._domainkey
Value: [provided by Resend]

Type: TXT (optional but recommended)
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
```

### Testing Checklist

- [ ] RESEND_API_KEY is set in Supabase Secrets
- [ ] Domain `barlive.app` is added in Resend
- [ ] All DNS records are added to DNS provider
- [ ] DNS records are verified in Resend (green checkmarks)
- [ ] Edge Function logs show successful API calls
- [ ] Test email received successfully

### Need More Help?

1. Check Edge Function logs for detailed error messages
2. Check Resend Dashboard → Emails for delivery status
3. Verify DNS propagation with [DNS Checker](https://dnschecker.org/)
4. Contact Resend support if domain verification issues persist

## Updated Features

The Edge Function now includes:

- ✅ Detailed error logging
- ✅ API key validation
- ✅ Better error messages
- ✅ Domain verification status detection
- ✅ Full response logging for debugging

The client app now includes:

- ✅ Detailed error messages with troubleshooting info
- ✅ Fallback to showing code in alert if email fails
- ✅ Better error handling and user feedback
- ✅ Logging for debugging
