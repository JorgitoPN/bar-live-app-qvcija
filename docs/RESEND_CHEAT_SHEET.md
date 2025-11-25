
# 📋 Resend Cheat Sheet - BarLive

Referencia rápida para configuración y troubleshooting de Resend.

---

## ⚡ Configuración Rápida

### 1. Obtener API Key

```
URL: https://resend.com
→ Sign Up / Login
→ API Keys
→ Create API Key
→ Copiar key (re_...)
```

### 2. Configurar en Supabase

**Dashboard:**
```
URL: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions
→ Secrets
→ Add new secret
   Name: RESEND_API_KEY
   Value: [tu key]
→ Save
```

**CLI:**
```bash
supabase secrets set RESEND_API_KEY=re_tu_key --project-ref embntaqwlwmgazvrglaf
```

### 3. Verificar

```bash
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

---

## 🔧 Comandos Útiles

### Supabase CLI

```bash
# Ver secrets
supabase secrets list --project-ref embntaqwlwmgazvrglaf

# Configurar secret
supabase secrets set NOMBRE=valor --project-ref embntaqwlwmgazvrglaf

# Eliminar secret
supabase secrets unset NOMBRE --project-ref embntaqwlwmgazvrglaf

# Ver logs
supabase functions logs send-verification-email --tail --project-ref embntaqwlwmgazvrglaf

# Desplegar función
supabase functions deploy send-verification-email --project-ref embntaqwlwmgazvrglaf
```

### cURL Testing

```bash
# Probar Edge Function
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer [ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "verification"
  }'
```

---

## 🌐 URLs Importantes

### Supabase

```
Dashboard:
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf

Settings:
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/general

Edge Functions:
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions

Secrets:
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions

API Keys:
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/api
```

### Resend

```
Dashboard:
https://resend.com/emails

API Keys:
https://resend.com/api-keys

Domains:
https://resend.com/domains

Analytics:
https://resend.com/analytics

Status:
https://status.resend.com
```

---

## 🔍 Diagnóstico Rápido

### No llegan correos

```
1. ✅ Verificar API Key en Supabase
   → Dashboard → Settings → Edge Functions → Secrets

2. ✅ Revisar logs
   → supabase functions logs send-verification-email --tail

3. ✅ Verificar límites
   → https://resend.com/emails
   → Plan gratuito: 100/día, 3,000/mes

4. ✅ Revisar spam
   → Carpeta de spam en email
```

### Error "Failed to send email"

```
1. ✅ Revisar logs detallados
   → Dashboard → Edge Functions → Logs

2. ✅ Verificar API Key válida
   → https://resend.com/api-keys

3. ✅ Verificar estado de Resend
   → https://status.resend.com
```

### Código no funciona

```
1. ✅ Verificar expiración (10 min)
2. ✅ Verificar formato (6 dígitos)
3. ✅ Consultar base de datos:

SELECT 
  email,
  verification_code,
  verification_code_expires_at
FROM usuarios
WHERE email = 'usuario@ejemplo.com';
```

---

## 📊 Límites y Planes

### Plan Gratuito

```
✅ 3,000 correos/mes
✅ 100 correos/día
✅ Dominio personalizado incluido
✅ Perfecto para desarrollo
```

### Planes de Pago

```
💵 $20/mes: 50,000 correos
💵 $80/mes: 250,000 correos
💵 Custom: Contactar ventas
```

---

## 🌐 Configuración DNS

### Registros Requeridos

**SPF:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: 3600
```

**DKIM:**
```
Type: TXT
Name: resend._domainkey
Value: [Valor de Resend]
TTL: 3600
```

**DMARC (Opcional):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
TTL: 3600
```

### Verificar DNS

```bash
# SPF
dig TXT barlive.app +short

# DKIM
dig TXT resend._domainkey.barlive.app +short

# DMARC
dig TXT _dmarc.barlive.app +short
```

**Online:**
- https://mxtoolbox.com/SuperTool.aspx
- https://dnschecker.org/
- https://www.whatsmydns.net/

---

## 🛠️ Herramientas de Debug

### Verificar Email

```
Mail Tester:
https://www.mail-tester.com/

MXToolbox:
https://mxtoolbox.com/

DNS Checker:
https://dnschecker.org/
```

### Logs y Monitoreo

```bash
# Logs en tiempo real
supabase functions logs send-verification-email --tail

# Últimos 100 logs
supabase functions logs send-verification-email --limit 100

# Logs con filtro
supabase functions logs send-verification-email --tail | grep ERROR
```

---

## 📝 SQL Útil

### Ver Usuarios Pendientes

```sql
SELECT 
  email,
  email_verified,
  verification_code,
  verification_code_expires_at,
  created_at
FROM usuarios
WHERE email_verified = false
ORDER BY created_at DESC
LIMIT 10;
```

### Ver Códigos Expirados

```sql
SELECT 
  email,
  verification_code,
  verification_code_expires_at
FROM usuarios
WHERE 
  email_verified = false
  AND verification_code_expires_at < NOW();
```

### Regenerar Código

```sql
UPDATE usuarios
SET 
  verification_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  verification_code_expires_at = NOW() + INTERVAL '10 minutes'
WHERE email = 'usuario@ejemplo.com';
```

### Verificar Manualmente

```sql
UPDATE usuarios
SET 
  email_verified = true,
  verification_code = NULL,
  verification_code_expires_at = NULL
WHERE email = 'usuario@ejemplo.com';
```

---

## 🔐 Seguridad

### Mejores Prácticas

```
✅ Nunca expongas la API Key en código
✅ Usa siempre variables de entorno
✅ Configura rate limiting
✅ Monitorea el uso regularmente
✅ Rota las API Keys periódicamente
✅ Usa HTTPS siempre
✅ Valida emails antes de enviar
```

### Rate Limiting

```javascript
// Ejemplo de rate limiting
const RATE_LIMIT = {
  perUser: 5,  // 5 correos/hora por usuario
  perIP: 10,   // 10 correos/hora por IP
};
```

---

## 📞 Soporte

### Resend

```
Email: support@resend.com
Docs: https://resend.com/docs
Status: https://status.resend.com
```

### Supabase

```
Dashboard: https://supabase.com/dashboard/support
Docs: https://supabase.com/docs
Discord: https://discord.supabase.com
```

---

## ✅ Checklist Rápido

### Configuración Inicial

- [ ] Cuenta de Resend creada
- [ ] API Key obtenida
- [ ] API Key configurada en Supabase
- [ ] Email de prueba enviado
- [ ] Email recibido

### Producción

- [ ] Dominio agregado en Resend
- [ ] DNS configurado (SPF, DKIM, DMARC)
- [ ] Dominio verificado
- [ ] Email desde dominio personalizado probado
- [ ] Monitoreo configurado
- [ ] Plan de pago evaluado

---

## 🎯 Respuestas Rápidas

**P: ¿Cuánto tarda en llegar un email?**
R: Menos de 30 segundos normalmente.

**P: ¿Puedo usar Gmail SMTP?**
R: Sí, pero Resend es más fácil y confiable.

**P: ¿Necesito dominio personalizado?**
R: No es obligatorio, pero mejora la entregabilidad.

**P: ¿Cuánto cuesta Resend?**
R: Plan gratuito: 3,000 correos/mes. Planes desde $20/mes.

**P: ¿Cómo evito que vayan a spam?**
R: Configura dominio personalizado con SPF, DKIM y DMARC.

**P: ¿Puedo cambiar el remitente?**
R: Sí, pero necesitas verificar el dominio primero.

**P: ¿Qué pasa si excedo el límite?**
R: Los correos fallarán. Actualiza al plan de pago.

**P: ¿Cómo monitoreo el uso?**
R: Dashboard de Resend → Analytics.

---

**Última actualización**: Enero 2025  
**Versión**: 1.0  
**Imprime esta página para referencia rápida** 📄
