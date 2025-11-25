
# Email System - Quick Start Guide

## 🚀 5-Minute Setup

Follow these steps to get emails working in BarLive:

### Step 1: Get Resend API Key (2 minutes)

1. Go to https://resend.com
2. Click "Sign Up" (free account)
3. Verify your email
4. Go to "API Keys" in dashboard
5. Click "Create API Key"
6. Copy the key (starts with `re_`)

### Step 2: Configure Supabase (1 minute)

```bash
# Set the API key as a Supabase secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Step 3: Deploy Edge Function (1 minute)

```bash
# Deploy the email function
supabase functions deploy send-verification-email
```

### Step 4: Test It (1 minute)

1. Open BarLive app
2. Register a new account
3. Check your email for verification code
4. Enter the code
5. ✅ Done!

---

## 📧 Email Types

Once configured, these emails will be sent automatically:

1. **Verification Email** - When user registers
   - Contains 6-digit OTP code
   - Expires in 10 minutes

2. **Welcome Email** - After successful registration
   - Welcome message
   - App features overview

3. **Password Reset** - When user forgets password
   - Secure reset link
   - Expires in 1 hour

4. **Event Reminders** - Before events
   - Event details
   - Location and time

5. **Social Notifications** - For social interactions
   - New followers
   - New comments
   - Mentions

---

## 🔍 Troubleshooting

### Emails Not Arriving?

**Check 1: Is the API key set?**
```bash
supabase secrets list
```
You should see `RESEND_API_KEY` in the list.

**Check 2: Is the function deployed?**
```bash
supabase functions list
```
You should see `send-verification-email` in the list.

**Check 3: Check function logs**
```bash
supabase functions logs send-verification-email --tail
```
Look for errors in the output.

**Check 4: Check spam folder**
Sometimes emails go to spam on first send.

**Check 5: Test the API key**
```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your@email.com",
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

### OTP Not Working?

**Check 1: Is the code expired?**
OTP codes expire after 10 minutes.

**Check 2: Is the email correct?**
Email must match exactly (case-insensitive).

**Check 3: Check database**
```sql
SELECT email, verification_code, verification_code_expires_at 
FROM usuarios 
WHERE email = 'user@example.com';
```

---

## 🎨 Customizing Email Templates

Email templates are in `utils/email.ts`. You can customize:

- **Colors**: Change gradient colors
- **Logo**: Add your logo URL
- **Content**: Modify text and layout
- **From Address**: Change sender name/email

Example:
```typescript
// In utils/email.ts
const emailTemplates = {
  verification: (data) => ({
    subject: 'Verify your BarLive account', // Change subject
    html: `
      <div style="background: linear-gradient(to right, #YOUR_COLOR_1, #YOUR_COLOR_2);">
        <!-- Your custom HTML -->
      </div>
    `,
  }),
};
```

---

## 📊 Monitoring

### Resend Dashboard

View email delivery stats at https://resend.com/emails:
- Emails sent
- Delivery rate
- Bounce rate
- Open rate (if tracking enabled)

### Supabase Logs

Monitor Edge Function logs:
```bash
# Real-time logs
supabase functions logs send-verification-email --tail

# Last 100 logs
supabase functions logs send-verification-email --limit 100
```

---

## 🔐 Production Setup

For production, you should:

### 1. Configure Custom Domain

```
1. Add domain in Resend dashboard
2. Add DNS records:
   - SPF: v=spf1 include:resend.com ~all
   - DKIM: (provided by Resend)
   - DMARC: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
3. Verify domain
4. Update 'from' field in Edge Function:
   from: 'BarLive <noreply@yourdomain.com>'
```

### 2. Enable Email Tracking (Optional)

```typescript
// In Edge Function
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: 'BarLive <noreply@yourdomain.com>',
    to: [email],
    subject: 'Verify your account',
    html: emailHtml,
    tags: [
      { name: 'category', value: 'verification' },
      { name: 'environment', value: 'production' },
    ],
  }),
});
```

### 3. Set Up Webhooks (Optional)

Receive notifications for email events:

```
1. Go to Resend dashboard > Webhooks
2. Add webhook URL: https://your-project.supabase.co/functions/v1/email-webhook
3. Select events: delivered, bounced, complained
4. Save webhook
```

---

## 💰 Pricing

### Resend Free Tier
- 3,000 emails/month
- 100 emails/day
- Perfect for development and small apps

### Resend Paid Plans
- $20/month: 50,000 emails
- $80/month: 250,000 emails
- Custom: Contact sales

### When to Upgrade
- You're sending > 3,000 emails/month
- You need custom domain
- You need dedicated IP
- You need priority support

---

## ✅ Checklist

Before going to production:

- [ ] Resend API key configured
- [ ] Edge Function deployed
- [ ] Test emails received successfully
- [ ] Custom domain configured (optional)
- [ ] Email templates customized
- [ ] Monitoring set up
- [ ] Spam testing done
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Backup email provider configured (optional)

---

## 🆘 Need Help?

### Common Questions

**Q: Can I use Gmail SMTP instead of Resend?**
A: Yes, but Resend is recommended for better deliverability and easier setup.

**Q: How do I test emails without sending real emails?**
A: Use a service like Mailtrap or check console logs for OTP codes.

**Q: Can I send emails from my own domain?**
A: Yes, configure a custom domain in Resend dashboard.

**Q: What if Resend is down?**
A: Implement a fallback email provider or queue emails for retry.

**Q: How do I prevent email abuse?**
A: Implement rate limiting in the Edge Function.

### Support Resources

- Resend Docs: https://resend.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- This Documentation: `docs/FACE_ID_AND_EMAIL_SETUP.md`

---

**Last Updated**: January 2025
**Estimated Setup Time**: 5 minutes
**Difficulty**: Easy ⭐
