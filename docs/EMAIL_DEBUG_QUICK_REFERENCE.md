
# Email System Debug Quick Reference

## 🚨 Error: "Edge Function returned a non-2xx status code"

### Quick Diagnosis Steps

1. **Check Edge Function Logs** (2 minutes)
   - Supabase Dashboard → Edge Functions → send-verification-email → Logs
   - Look for the exact error message

2. **Verify RESEND_API_KEY** (1 minute)
   - Supabase Dashboard → Project Settings → Edge Functions → Secrets
   - Ensure `RESEND_API_KEY` exists and is correct

3. **Check Domain Status** (1 minute)
   - Go to https://resend.com/domains
   - Verify `barlive.app` shows "Verified" status

---

## 📋 Common Error Messages

### "RESEND_API_KEY is not configured"
**Fix:** Add API key to Supabase Secrets
```
1. Get API key from https://resend.com/api-keys
2. Add to Supabase: Project Settings → Edge Functions → Secrets
3. Name: RESEND_API_KEY
4. Value: re_xxxxxxxxxxxxx
```

### "Domain not verified"
**Fix:** Complete DNS setup in Resend
```
1. Go to https://resend.com/domains
2. Click on barlive.app
3. Add all DNS records to your domain provider
4. Wait for DNS propagation (5 min - 48 hours)
5. Verify with https://dnschecker.org
```

### "Invalid API key"
**Fix:** Generate new API key
```
1. Go to https://resend.com/api-keys
2. Delete old key
3. Create new key
4. Update in Supabase Secrets
```

---

## 🔍 Where to Look

### Supabase Dashboard
```
Project → Edge Functions → send-verification-email → Logs
```
Look for:
- HTTP status codes (200 = success, 500 = error)
- Error messages from Resend API
- Request/response details

### Resend Dashboard
```
https://resend.com/emails
```
Look for:
- Recent email sends
- Failed sends with error details
- Delivery status

### DNS Checker
```
https://dnschecker.org
```
Check:
- TXT record for SPF
- CNAME records for DKIM
- Propagation status worldwide

---

## ✅ Success Indicators

- [ ] Edge Function logs show status 200
- [ ] Resend dashboard shows email as "Delivered"
- [ ] User receives email in inbox
- [ ] No error alerts in the app

---

## 🛠️ Testing Commands

### Test Edge Function Directly
```bash
# Via Supabase Dashboard
# Go to: Edge Functions → send-verification-email → Test
# Body:
{
  "email": "your-email@example.com",
  "code": "123456",
  "type": "verification"
}
```

### Check DNS Records
```bash
# SPF Record
nslookup -type=TXT barlive.app

# DKIM Records
nslookup -type=CNAME resend._domainkey.barlive.app
nslookup -type=CNAME resend2._domainkey.barlive.app
nslookup -type=CNAME resend3._domainkey.barlive.app
```

---

## 📞 Support Contacts

- **Resend Support:** https://resend.com/support
- **Supabase Support:** https://supabase.com/support
- **DNS Provider:** Check your domain registrar's support

---

## 🎯 Most Likely Issues (in order)

1. **RESEND_API_KEY not set** (80% of cases)
   - Fix: Add to Supabase Secrets

2. **Domain not verified** (15% of cases)
   - Fix: Complete DNS setup and wait for propagation

3. **Wrong API key** (4% of cases)
   - Fix: Generate new key and update

4. **Rate limiting** (1% of cases)
   - Fix: Wait a few minutes or upgrade Resend plan

---

## 💡 Pro Tips

- DNS propagation can take up to 48 hours, but usually completes in 5-30 minutes
- Use https://dnschecker.org to verify DNS records globally
- Check spam folder if emails aren't arriving
- Resend free tier allows 100 emails/day, 3,000/month
- Keep your API key secret and never commit it to git
- The app will show the verification code in an alert if email fails (fallback behavior)

---

## 🔄 Current Status Check

Run through this checklist:

1. **API Key Status:**
   - [ ] Exists in Supabase Secrets
   - [ ] Starts with `re_`
   - [ ] Is active in Resend dashboard

2. **Domain Status:**
   - [ ] Added to Resend
   - [ ] DNS records configured
   - [ ] Shows "Verified" in Resend
   - [ ] Can send emails

3. **Edge Function Status:**
   - [ ] Deployed successfully
   - [ ] Logs show no errors
   - [ ] Returns 200 status code
   - [ ] Emails are being sent

4. **App Status:**
   - [ ] Registration flow works
   - [ ] Users receive verification codes
   - [ ] No error alerts shown
   - [ ] Email verification completes

---

## 📱 User Experience

**What users see when email fails:**
```
Alert: "Advertencia"
Message: "Cuenta creada pero hubo un problema al enviar el correo:

[Error details]

Tu código de verificación es: 123456

Por favor, anótalo y continúa con la verificación."

Button: "Continuar"
```

This ensures users can still complete registration even if email delivery fails temporarily.
