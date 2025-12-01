
# Migration Guide: v3.0 → v4.0

## Overview

This guide helps you migrate from Authentication System v3.0 to v4.0.

## What's Changing

### Removed Features
- ❌ Google Sign-In
- ❌ Resend email service
- ❌ Verification codes
- ❌ Google migration flow

### New Features
- ✅ Simplified email/password authentication
- ✅ Supabase native emails (free)
- ✅ Password visibility toggle
- ✅ Better error messages

## For Developers

### 1. Update Code

Replace old authentication files with new v4.0 files:

```bash
# Files to update
app/auth/login.tsx
app/auth/registro-email.tsx
app/auth/recuperar-password.tsx
app/auth/verificar-email.tsx
app/auth/email-confirmed.tsx
supabase/functions/send-verification-email/index.ts
```

### 2. Remove Old Files

Delete these files (no longer needed):

```bash
# Google-related files
app/auth/crear-password-google.tsx
app/auth/verificar-codigo-google.tsx
app/auth/configurar-password-google.tsx

# Old documentation
docs/AUTH_V3_*.md
```

### 3. Update Database

No database changes required! The v4.0 system uses the same `usuarios` table.

Optional cleanup:
```sql
-- Remove unused fields (optional)
ALTER TABLE usuarios DROP COLUMN IF EXISTS verification_code;
ALTER TABLE usuarios DROP COLUMN IF EXISTS verification_code_expires_at;
```

### 4. Configure Supabase

#### Email Templates

1. Go to: Supabase Dashboard → Authentication → Email Templates
2. Update templates to Spanish (see AUTH_V4_IMPLEMENTATION.md)
3. Test email delivery

#### Redirect URLs

1. Go to: Supabase Dashboard → Authentication → URL Configuration
2. Add: `https://natively.dev/email-confirmed`
3. Add: `exp://localhost:8081/email-confirmed` (development)

#### Email Settings

1. Go to: Supabase Dashboard → Authentication → Email
2. Enable: Email confirmations
3. Enable: Secure email change
4. Enable: Double confirm email changes

### 5. Remove Resend

If you were using Resend:

1. Remove Resend API key from environment variables
2. Remove Resend from Edge Functions
3. Cancel Resend subscription (if applicable)

### 6. Test Everything

Run through the testing checklist:

- [ ] New user registration
- [ ] Email verification
- [ ] Login
- [ ] Password reset
- [ ] Error cases

## For Users

### Existing Email Users

**No action required!** Continue using your email and password.

### Existing Google Users

**Action required**: You need to set a password.

1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Check your email for reset link
5. Set a new password
6. Login with email + password

## Common Issues

### Issue: "Email not confirmed"

**Solution**: Check your email for verification link. Click "Resend" if needed.

### Issue: "Invalid credentials"

**Solution**: 
1. Verify email is correct
2. Verify password is correct
3. Try password reset if needed

### Issue: "Email already exists"

**Solution**: Use "Forgot Password" to reset your password.

### Issue: "Email not received"

**Solution**:
1. Check spam folder
2. Wait a few minutes
3. Click "Resend verification email"
4. Contact support if still not received

## Rollback Plan

If you need to rollback to v3.0:

1. Restore old authentication files from git
2. Restore Resend configuration
3. Restore Google Sign-In configuration
4. Test thoroughly

## Timeline

Recommended migration timeline:

1. **Week 1**: Update code and test in development
2. **Week 2**: Configure Supabase and test emails
3. **Week 3**: Deploy to staging and test
4. **Week 4**: Deploy to production
5. **Week 5**: Monitor and support users

## Support

For migration support:
1. Check documentation
2. Review error logs
3. Test in development first
4. Contact support if needed

## Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Test in development
- [ ] Update documentation
- [ ] Notify users

### Migration
- [ ] Update code
- [ ] Configure Supabase
- [ ] Test email delivery
- [ ] Deploy to staging
- [ ] Test thoroughly
- [ ] Deploy to production

### Post-Migration
- [ ] Monitor logs
- [ ] Support users
- [ ] Gather feedback
- [ ] Document issues
- [ ] Update documentation

## Success Criteria

Migration is successful when:
- ✅ New users can register
- ✅ Emails are delivered
- ✅ Users can verify email
- ✅ Users can login
- ✅ Password reset works
- ✅ No critical errors
- ✅ User feedback is positive

## Conclusion

The migration to v4.0 simplifies the authentication system and reduces costs by using Supabase's native features. Follow this guide carefully and test thoroughly before deploying to production.
