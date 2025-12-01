
# Quick Fix: Email 403 Error

## The Problem
```
Error sending verification email: FunctionsHttpError: 
Edge Function returned a non-2xx status code (403)
```

## The Cause
Domain `barlive.app` is not verified in Resend.

## The Fix (5 Steps)

### 1. Go to Resend
https://resend.com/domains

### 2. Add Domain
Add `barlive.app` if not already added

### 3. Get DNS Records
Resend will show you 2-3 DNS records to add:
- SPF (TXT record)
- DKIM (TXT record)
- DMARC (TXT record - optional)

### 4. Add to DNS Provider
Go to your domain registrar and add these records

### 5. Wait & Verify
- Wait 15-30 minutes for DNS propagation
- Check Resend Dashboard for "Verified" status

## Current Status
✅ **App is working** - Users see the code in an alert if email fails
⏳ **Waiting for** - Domain verification in Resend

## What Users See Now
When email fails, they see:
```
Servicio de correo en configuración

El servicio de correo está siendo configurado.

📋 Tu código de verificación es:

123456

⏱️ Este código expirará en 10 minutos.
```

## What Users Will See After Fix
```
Código enviado

Hemos enviado un código de verificación 
a tu correo electrónico.
```

## Test After Fix
1. Try to create password for Google user
2. Check email inbox
3. Verify code works
4. Confirm no 403 error in logs

## Need Help?
- Resend Docs: https://resend.com/docs/dashboard/domains/introduction
- DNS Checker: https://dnschecker.org/
- Resend Support: support@resend.com
