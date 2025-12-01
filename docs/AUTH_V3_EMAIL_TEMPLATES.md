
# Auth V3.0 - Email Templates

## Overview

The authentication system sends three types of emails:

1. **Verification Email** - For new user registration
2. **Password Reset Email** - For password recovery
3. **Password Confirmation Email** - For Google user migration ✨ NEW

## Email Templates

### 1. Verification Email

**Type**: `verification`

**Subject**: Verifica tu correo electrónico - BarLive

**When Sent**: After new user registration

**Content**:
```
┌─────────────────────────────────────┐
│   Verifica tu correo electrónico    │
│         (Gradient Header)           │
└─────────────────────────────────────┘

Tu código de verificación es:

┌─────────────────────────────────────┐
│           1 2 3 4 5 6               │
│        (Large, Bold Code)           │
└─────────────────────────────────────┘

Este código expirará en 10 minutos.

Si no solicitaste este código, puedes 
ignorar este correo.

© 2025 BarLive. Todos los derechos reservados.
```

**Usage**:
```typescript
await supabase.functions.invoke('send-verification-email', {
  body: {
    email: 'user@example.com',
    code: '123456',
    type: 'verification',
  },
});
```

---

### 2. Password Reset Email

**Type**: `password_reset`

**Subject**: Restablece tu contraseña - BarLive

**When Sent**: When user requests password reset

**Content**:
```
┌─────────────────────────────────────┐
│     Restablece tu contraseña        │
│         (Gradient Header)           │
└─────────────────────────────────────┘

Tu código de restablecimiento es:

┌─────────────────────────────────────┐
│           1 2 3 4 5 6               │
│        (Large, Bold Code)           │
└─────────────────────────────────────┘

Este código expirará en 10 minutos.

Si no solicitaste este código, puedes 
ignorar este correo.

© 2025 BarLive. Todos los derechos reservados.
```

**Usage**:
```typescript
await supabase.functions.invoke('send-verification-email', {
  body: {
    email: 'user@example.com',
    code: '123456',
    type: 'password_reset',
  },
});
```

---

### 3. Password Confirmation Email ✨ NEW

**Type**: `password_confirmation`

**Subject**: ¡Contraseña configurada exitosamente! - BarLive

**When Sent**: After Google user successfully sets a password

**Content**:
```
┌─────────────────────────────────────┐
│      ¡Contraseña configurada!       │
│         (Gradient Header)           │
└─────────────────────────────────────┘

        ┌─────────┐
        │    ✓    │
        │ (Green) │
        └─────────┘

Tu contraseña ha sido configurada 
exitosamente

Hola,

Tu cuenta de BarLive ha sido migrada 
exitosamente al nuevo sistema de 
autenticación (Auth 3.0).

Ahora puedes iniciar sesión con:

┌─────────────────────────────────────┐
│ Correo: user@example.com            │
│ Contraseña: La que acabas de        │
│             configurar              │
└─────────────────────────────────────┘

Todos tus datos, roles y configuraciones 
se han mantenido intactos.

Si no realizaste este cambio, por favor 
contacta con nuestro soporte inmediatamente.

© 2025 BarLive. Todos los derechos reservados.
```

**Usage**:
```typescript
await supabase.functions.invoke('send-verification-email', {
  body: {
    email: 'user@example.com',
    code: 'CONFIRMADO', // Not used for this type
    type: 'password_confirmation',
  },
});
```

---

## Email Design

### Color Scheme
- **Primary Gradient**: `#14B8A6` → `#06B6D4` (Teal to Cyan)
- **Success Green**: `#10B981`
- **Text Dark**: `#333333`
- **Text Light**: `#666666`
- **Background**: `#f9f9f9`
- **Card Background**: `#ffffff`

### Typography
- **Font Family**: Arial, sans-serif
- **Header Title**: 28px, bold, white
- **Code Display**: 32px, bold, letter-spacing: 4px
- **Body Text**: 16px, regular
- **Small Text**: 14px, regular
- **Footer**: 12px, light

### Layout
- **Max Width**: 600px
- **Padding**: 20px
- **Border Radius**: 10px (header), 8px (cards)
- **Spacing**: Consistent 20px margins

---

## Implementation Details

### Edge Function

**Location**: `supabase/functions/send-verification-email/index.ts`

**Environment Variables**:
- `RESEND_API_KEY` - Required for sending emails

**Request Format**:
```typescript
interface EmailRequest {
  email: string;
  code: string;
  type: 'verification' | 'password_reset' | 'password_confirmation';
}
```

**Response Format**:
```typescript
// Success
{
  success: true,
  messageId: "abc123..."
}

// Error
{
  error: "Error message",
  details: "Detailed error info",
  status: 500
}
```

### Error Handling

The function handles:
- ✅ Missing API key
- ✅ Missing required fields
- ✅ Resend API errors
- ✅ Network errors
- ✅ Invalid email addresses

### Logging

All operations are logged:
```
[SendVerificationEmail] Sending email to: user@example.com Type: password_confirmation
[SendVerificationEmail] Calling Resend API...
[SendVerificationEmail] Resend API response status: 200
[SendVerificationEmail] Email sent successfully: {...}
```

---

## Testing

### Test Verification Email
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-verification-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "verification"
  }'
```

### Test Password Reset Email
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-verification-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "654321",
    "type": "password_reset"
  }'
```

### Test Password Confirmation Email
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-verification-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "CONFIRMADO",
    "type": "password_confirmation"
  }'
```

---

## Resend Configuration

### Domain Setup
1. Add domain in Resend dashboard
2. Add DNS records (SPF, DKIM, DMARC)
3. Verify domain
4. Set as default sending domain

### From Address
```
BarLive <noreply@barlive.app>
```

### Rate Limits
- Free tier: 100 emails/day
- Paid tier: Based on plan

---

## Best Practices

### Email Deliverability
- ✅ Use verified domain
- ✅ Include unsubscribe link (for marketing emails)
- ✅ Keep HTML simple and clean
- ✅ Include plain text version
- ✅ Test on multiple email clients

### Security
- ✅ Never include passwords in emails
- ✅ Use secure tokens for links
- ✅ Set token expiration times
- ✅ Log all email sends
- ✅ Monitor for abuse

### User Experience
- ✅ Clear, concise subject lines
- ✅ Branded design
- ✅ Mobile-responsive layout
- ✅ Clear call-to-action
- ✅ Helpful error messages

---

## Troubleshooting

### Email Not Received
1. Check spam folder
2. Verify email address is correct
3. Check Resend dashboard for delivery status
4. Verify domain is verified
5. Check rate limits

### Email Looks Broken
1. Test in multiple email clients
2. Validate HTML
3. Check inline styles
4. Test on mobile devices
5. Use email testing tools

### API Errors
1. Check RESEND_API_KEY is set
2. Verify API key is valid
3. Check rate limits
4. Review Resend logs
5. Check Edge Function logs

---

## Future Enhancements

### Planned Features
- [ ] Email templates in multiple languages
- [ ] Customizable email templates
- [ ] Email preview before sending
- [ ] A/B testing for email content
- [ ] Email analytics dashboard
- [ ] Scheduled email sending
- [ ] Email queue system

### Template Ideas
- Welcome email with onboarding tips
- Event reminder emails
- New follower notifications
- Comment notifications
- Weekly digest emails
- Re-engagement emails

---

## Conclusion

The email system is now complete with three professional templates:
- ✅ Verification emails for new users
- ✅ Password reset emails for recovery
- ✅ Password confirmation emails for migration

All emails are:
- 📱 Mobile-responsive
- 🎨 Beautifully designed
- 🔒 Secure
- 📊 Logged and monitored
- ✉️ Deliverable

Ready for production! 🚀
