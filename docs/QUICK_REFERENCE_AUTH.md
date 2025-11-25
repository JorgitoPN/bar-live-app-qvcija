
# Quick Reference: Authentication & Email System

## 🚨 ERRORS FIXED

### "Invalid login credentials" Error
**Location**: `utils/auth.ts` line 227
**Status**: ✅ FIXED

**What was wrong**:
```typescript
// Before
email: email,  // Not normalized
```

**What's fixed**:
```typescript
// After
const normalizedEmail = email.toLowerCase().trim();
email: normalizedEmail,  // Normalized
```

**Error messages improved**:
- ✅ "Email o contraseña incorrectos" (clear)
- ✅ "Verifica tu correo electrónico" (actionable)
- ✅ "No existe una cuenta" (specific)

---

## 🔐 FACE ID SETUP

### Quick Enable (2 minutes)

```
1. Login with email/password
2. Tap "Habilitar" when prompted
3. Confirm with Face ID
4. Done! ✅
```

### Quick Test

```
1. Logout
2. See "Login with Face ID" button
3. Tap button
4. Face ID prompt appears
5. Instant login ✅
```

### Files Changed
- `utils/biometricAuth.ts` (NEW)
- `app/auth/login-popup.tsx` (UPDATED)
- `app.json` (CONFIGURED)

---

## 📧 EMAIL SETUP

### Quick Setup (5 minutes)

```bash
# 1. Get API key from https://resend.com
# 2. Set secret
supabase secrets set RESEND_API_KEY=re_xxx

# 3. Deploy function
supabase functions deploy send-verification-email

# 4. Test
# Register → Check email → Done! ✅
```

### Email Types
- ✅ Verification (OTP)
- ✅ Welcome
- ✅ Password Reset
- ✅ Event Reminders
- ✅ Social Notifications

### Files Changed
- `utils/email.ts` (NEW)
- `supabase/functions/send-verification-email/index.ts` (NEW)

---

## 🧪 TESTING CHECKLIST

### Authentication
- [x] Login with correct credentials
- [x] Login with wrong password
- [x] Login with unverified email
- [x] Email normalization
- [x] Profile creation fallback

### Face ID
- [ ] Enable Face ID
- [ ] Login with Face ID
- [ ] Disable Face ID
- [ ] Fallback to password

### Email
- [ ] Receive verification OTP
- [ ] Verify OTP
- [ ] Receive welcome email
- [ ] Password reset email

---

## 🔧 TROUBLESHOOTING

### Login Issues

**"Invalid credentials"**
```
✅ FIXED
- Email normalized
- Better error messages
- Check email is verified
```

**"Email not confirmed"**
```
- Check spam folder
- Resend verification email
- Configure Resend API key
```

### Face ID Issues

**Button not showing**
```
- Check Face ID is enabled in Settings
- Check app has permission
- Build development build (not Expo Go)
```

**Authentication fails**
```
- Try again
- Use "Usar contraseña"
- Check Face ID is not locked
```

### Email Issues

**Emails not arriving**
```
- Set Resend API key
- Deploy Edge Function
- Check spam folder
- Check function logs
```

**OTP not working**
```
- Check expiration (10 min)
- Check email matches
- Check database
```

---

## 📊 STATUS SUMMARY

| Feature | Status | Action Required |
|---------|--------|-----------------|
| Login Error | ✅ Fixed | None |
| Face ID | ✅ Ready | Test on device |
| Email System | ⚠️ Ready | Configure API key |
| Documentation | ✅ Complete | None |

---

## 🚀 DEPLOYMENT COMMANDS

```bash
# Email System
supabase secrets set RESEND_API_KEY=your_key
supabase functions deploy send-verification-email
supabase functions logs send-verification-email --tail

# Build for Testing
eas build --profile development --platform ios
eas build --profile development --platform android

# Check Status
supabase secrets list
supabase functions list
```

---

## 📞 QUICK LINKS

- **Resend Dashboard**: https://resend.com
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Full Documentation**: `docs/FACE_ID_AND_EMAIL_SETUP.md`
- **Email Setup**: `docs/EMAIL_SETUP_QUICK_START.md`
- **User Guide**: `docs/USER_GUIDE_FACE_ID.md`

---

## ✅ NEXT STEPS

1. **Configure Email** (5 min)
   ```bash
   supabase secrets set RESEND_API_KEY=your_key
   supabase functions deploy send-verification-email
   ```

2. **Test Face ID** (10 min)
   ```bash
   eas build --profile development --platform ios
   # Install on device → Test Face ID
   ```

3. **Monitor** (ongoing)
   ```bash
   supabase functions logs send-verification-email --tail
   # Check Resend dashboard
   ```

---

**Last Updated**: January 2025
**Quick Reference Version**: 1.0
