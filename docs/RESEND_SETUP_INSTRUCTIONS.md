
# Resend Email Setup - Step by Step Instructions

## Overview

You need to configure Resend to send verification emails from your app. This involves:
1. Getting your Resend API key
2. Adding it to Supabase
3. Verifying your domain (barlive.app)

**Estimated Time:** 15-30 minutes (plus DNS propagation time)

---

## Step 1: Get Your Resend API Key (2 minutes)

1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Give it a name (e.g., "BarLive Production")
4. Select permissions: "Full Access" or "Sending Access"
5. Click "Create"
6. **IMPORTANT:** Copy the API key immediately (it starts with `re_`)
   - You won't be able to see it again!
   - Save it somewhere safe temporarily

---

## Step 2: Add API Key to Supabase (2 minutes)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `embntaqwlwmgazvrglaf`
3. Navigate to: **Project Settings** (gear icon in sidebar)
4. Click on: **Edge Functions** in the left menu
5. Scroll down to: **Secrets** section
6. Click: **Add Secret**
7. Enter:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Your API key from Step 1 (starts with `re_`)
8. Click: **Save**

**Verification:**
- You should see `RESEND_API_KEY` listed in the Secrets section
- The value will be hidden (shown as `••••••••`)

---

## Step 3: Add Domain to Resend (2 minutes)

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter your domain: `barlive.app`
4. Click "Add"
5. You'll see a list of DNS records to configure

---

## Step 4: Configure DNS Records (5-10 minutes)

You need to add several DNS records to your domain. Go to your domain provider (where you registered barlive.app).

### Records to Add:

#### 1. SPF Record (for email authentication)
```
Type: TXT
Name: @ (or leave blank)
Value: v=spf1 include:amazonses.com ~all
TTL: 3600 (or default)
```

#### 2. DKIM Records (for email signing - usually 3 records)
Resend will provide you with 3 CNAME records. They look like:

**Record 1:**
```
Type: CNAME
Name: resend._domainkey
Value: [provided by Resend, looks like: xxx.resend.com]
TTL: 3600
```

**Record 2:**
```
Type: CNAME
Name: resend2._domainkey
Value: [provided by Resend]
TTL: 3600
```

**Record 3:**
```
Type: CNAME
Name: resend3._domainkey
Value: [provided by Resend]
TTL: 3600
```

#### 3. DMARC Record (optional but recommended)
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
TTL: 3600
```

### Where to Add DNS Records:

**Common Domain Providers:**

- **GoDaddy:** DNS Management → Add Record
- **Namecheap:** Advanced DNS → Add New Record
- **Cloudflare:** DNS → Add Record
- **Google Domains:** DNS → Custom Records → Manage Custom Records
- **AWS Route 53:** Hosted Zones → Create Record

**Important Notes:**
- Some providers use `@` for the root domain, others leave it blank
- Some providers automatically add the domain to the Name field
- If you see "barlive.app.barlive.app" in the preview, remove "barlive.app" from the Name field

---

## Step 5: Wait for DNS Propagation (5 minutes - 48 hours)

After adding the DNS records:

1. **Check Propagation Status:**
   - Go to https://dnschecker.org
   - Enter: `barlive.app`
   - Select: TXT record
   - Look for the SPF record
   - Check if it shows up globally (green checkmarks)

2. **Verify in Resend:**
   - Go back to https://resend.com/domains
   - Click on `barlive.app`
   - You should see the verification status for each record
   - Wait until all records show "Verified" (green checkmark)

**Typical Propagation Times:**
- Fast providers (Cloudflare): 5-15 minutes
- Average providers: 30 minutes - 2 hours
- Slow providers: 4-48 hours

**What you'll see:**
- ⏳ **Pending:** DNS records not yet propagated
- ✅ **Verified:** DNS records detected and working
- ❌ **Failed:** DNS records incorrect or missing

---

## Step 6: Test Email Sending (2 minutes)

Once your domain is verified:

1. **Test via Supabase:**
   - Go to Supabase Dashboard → Edge Functions
   - Click on `send-verification-email`
   - Click "Test" or "Invoke"
   - Use this test payload:
     ```json
     {
       "email": "your-email@example.com",
       "code": "123456",
       "type": "verification"
     }
     ```
   - Click "Run"
   - Check your email inbox

2. **Test via App:**
   - Open your app
   - Try to register with your email
   - Check if you receive the verification code
   - Check spam folder if not in inbox

---

## Troubleshooting

### Issue: "Domain not verified" error

**Solution:**
1. Check DNS records are correctly configured
2. Wait longer for DNS propagation
3. Use https://dnschecker.org to verify records
4. Ensure no typos in DNS records
5. Check with your DNS provider's support

### Issue: "Invalid API key" error

**Solution:**
1. Verify API key is correctly copied (no extra spaces)
2. Check API key is active in Resend dashboard
3. Generate a new API key if needed
4. Update the key in Supabase Secrets

### Issue: Emails not arriving

**Solution:**
1. Check spam/junk folder
2. Verify domain is fully verified in Resend
3. Check Resend dashboard for failed sends
4. Look at Edge Function logs for errors
5. Try sending to a different email address

### Issue: "RESEND_API_KEY is not configured"

**Solution:**
1. Verify you added the secret to Supabase
2. Check the secret name is exactly: `RESEND_API_KEY`
3. Wait a few minutes for the secret to propagate
4. Redeploy the Edge Function if needed

---

## Verification Checklist

Before considering setup complete, verify:

- [ ] API key is added to Supabase Secrets
- [ ] Domain is added to Resend
- [ ] All DNS records are configured
- [ ] DNS records have propagated (check with dnschecker.org)
- [ ] Domain shows "Verified" in Resend dashboard
- [ ] Test email was sent successfully
- [ ] Test email was received in inbox
- [ ] App registration flow works end-to-end
- [ ] No error messages in Edge Function logs

---

## Current Status

Based on your screenshot, you're seeing:
```
Error sending verification email: FunctionsHttpError: 
Edge Function returned a non-2xx status code
```

This means either:
1. ❌ RESEND_API_KEY is not set in Supabase Secrets
2. ❌ Domain is not yet verified in Resend
3. ❌ DNS records are still propagating

**Next Steps:**
1. Complete Steps 1-2 above (add API key to Supabase)
2. Complete Steps 3-5 above (configure DNS and wait for propagation)
3. Test again once domain shows "Verified" in Resend

---

## Support Resources

- **Resend Documentation:** https://resend.com/docs
- **Resend Support:** https://resend.com/support
- **Supabase Documentation:** https://supabase.com/docs/guides/functions
- **DNS Checker:** https://dnschecker.org
- **MX Toolbox:** https://mxtoolbox.com

---

## Expected Timeline

| Task | Time Required |
|------|---------------|
| Get API key | 2 minutes |
| Add to Supabase | 2 minutes |
| Add domain to Resend | 2 minutes |
| Configure DNS records | 5-10 minutes |
| DNS propagation | 5 min - 48 hours |
| Testing | 2 minutes |
| **Total** | **15-30 minutes + propagation time** |

---

## Notes

- You mentioned DNS records are configured but Resend hasn't detected them yet
- This is normal and expected during DNS propagation
- The status will change from "Pending" to "Verified" automatically
- You don't need to do anything except wait
- You can check propagation status at https://dnschecker.org
- Once verified, emails will start working immediately
- The app has a fallback that shows the code in an alert if email fails

---

## What Happens Next

Once everything is configured:

1. **User Registration:**
   - User enters email
   - App generates 6-digit code
   - Edge Function sends email via Resend
   - User receives email with code
   - User enters code to verify

2. **Email Content:**
   - Subject: "Verifica tu correo electrónico - BarLive"
   - Beautiful HTML template with gradient header
   - Large, easy-to-read verification code
   - 10-minute expiration notice
   - Professional branding

3. **User Experience:**
   - Fast email delivery (usually < 5 seconds)
   - Professional appearance
   - High deliverability (won't go to spam)
   - Reliable and secure

---

## Questions?

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the Edge Function logs in Supabase
3. Check the Resend dashboard for error details
4. Refer to the EMAIL_TROUBLESHOOTING_GUIDE.md document
5. Contact Resend or Supabase support if needed

Good luck! 🚀
