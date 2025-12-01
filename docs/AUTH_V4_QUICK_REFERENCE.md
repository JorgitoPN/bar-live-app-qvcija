
# Authentication System v4.0 - Quick Reference

## Quick Start

### For New Projects

1. Copy authentication files to your project
2. Configure Supabase email templates
3. Add redirect URLs
4. Test email delivery
5. Deploy!

### For Existing Projects

1. Follow migration guide
2. Update code
3. Configure Supabase
4. Test thoroughly
5. Deploy!

## Key Files

```
app/auth/
├── login.tsx                    # Login page
├── registro-email.tsx           # Registration
├── recuperar-password.tsx       # Password reset
├── verificar-email.tsx          # Verification instructions
└── email-confirmed.tsx          # Success page

supabase/functions/
└── send-verification-email/     # Email sender
    └── index.ts
```

## Common Tasks

### Register New User

```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed',
    data: {
      nombre: 'User Name',
      provider: 'barlive',
    },
  },
});
```

### Login User

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
});
```

### Reset Password

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'https://natively.dev/email-confirmed',
  }
);
```

### Resend Verification

```typescript
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://natively.dev/email-confirmed',
  },
});
```

## Configuration

### Supabase Dashboard

1. **Email Templates**: Authentication → Email Templates
2. **Redirect URLs**: Authentication → URL Configuration
3. **Email Settings**: Authentication → Email

### Environment Variables

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| Email not confirmed | User hasn't verified email | Resend verification email |
| Invalid credentials | Wrong email/password | Check credentials or reset password |
| Email already exists | User already registered | Login or reset password |
| User not found | Email doesn't exist | Register new account |

## Testing

### Test Scenarios

1. ✅ Register new user
2. ✅ Verify email
3. ✅ Login
4. ✅ Reset password
5. ✅ Resend verification
6. ✅ Error cases

### Test Emails

Use these for testing:
- `test@example.com`
- `user@test.com`
- `demo@barlive.com`

## Troubleshooting

### Email Not Received

1. Check spam folder
2. Verify SMTP settings
3. Check Supabase logs
4. Test with different email provider

### Login Failed

1. Verify email is confirmed
2. Check password is correct
3. Try password reset
4. Check Supabase Auth logs

### Verification Link Not Working

1. Check link hasn't expired
2. Verify redirect URLs
3. Try resending email
4. Check Supabase logs

## Best Practices

1. ✅ Always validate input
2. ✅ Use HTTPS in production
3. ✅ Configure email templates
4. ✅ Test email delivery
5. ✅ Monitor logs
6. ✅ Provide clear feedback
7. ✅ Handle errors gracefully
8. ✅ Use environment variables
9. ✅ Implement rate limiting
10. ✅ Keep Supabase updated

## Support

- 📚 Documentation: See AUTH_V4_IMPLEMENTATION.md
- 🔧 Migration: See AUTH_V4_MIGRATION_GUIDE.md
- 🐛 Issues: Check Supabase logs
- 💬 Questions: Contact support

## Version

**Current Version**: 4.0
**Release Date**: 2025
**Status**: Production Ready

## Quick Links

- [Supabase Dashboard](https://app.supabase.com)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Error Codes](https://supabase.com/docs/guides/auth/auth-errors)

## Changelog

### v4.0 (Current)
- ✅ Email/password only
- ✅ Supabase native emails
- ✅ Simplified flow
- ✅ Better UX
- ❌ Removed Google Sign-In
- ❌ Removed Resend

### v3.0
- Email/password + Google
- Resend emails
- Verification codes

### v2.0
- Google Sign-In only

### v1.0
- Basic authentication

## Next Steps

1. Read full documentation
2. Configure Supabase
3. Test in development
4. Deploy to production
5. Monitor and support users

---

**Remember**: Always test thoroughly before deploying to production!
