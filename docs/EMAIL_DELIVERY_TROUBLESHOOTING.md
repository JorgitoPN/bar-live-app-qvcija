
# 🔍 Guía de Diagnóstico: Problemas con Entrega de Emails

## 📊 Estado Actual del Sistema

### Sistema de Emails Activo
- **Proveedor**: Supabase Native Email System (GRATIS)
- **Dominio de envío**: `noreply@mail.app.supabase.io`
- **Estado**: ✅ Operativo

### Problema Reportado
- **Usuario afectado**: jorgepereznoyagh@gmail.com
- **Tipo de cuenta**: Usuario de Google (migración pendiente)
- **Síntoma**: No recibe correos de verificación

---

## 🔎 Diagnóstico Paso a Paso

### 1. Verificar Estado del Usuario en la Base de Datos

```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.email_verified,
  u.provider,
  u.created_at,
  au.email_confirmed_at,
  au.confirmation_sent_at,
  au.last_sign_in_at
FROM usuarios u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'jorgepereznoyagh@gmail.com';
```

**Resultado esperado para usuarios de Google:**
- `provider`: 'google'
- `email_verified`: false (en tabla usuarios)
- `email_confirmed_at`: NOT NULL (en auth.users)
- `confirmation_sent_at`: NULL (nunca se envió email porque usó Google)

### 2. Verificar Logs de Supabase Auth

**Ubicación**: Supabase Dashboard → Logs → Auth Logs

**Buscar**:
- Eventos de tipo `mail.send`
- Email destino: `jorgepereznoyagh@gmail.com`
- Errores relacionados con envío de emails

**Ejemplo de log exitoso**:
```json
{
  "event": "mail.send",
  "mail_from": "noreply@mail.app.supabase.io",
  "mail_to": "jorgepereznoyagh@gmail.com",
  "mail_type": "confirmation"
}
```

### 3. Verificar Configuración de Email en Supabase

**Ubicación**: Supabase Dashboard → Authentication → Email Templates

**Verificar**:
- ✅ Template "Confirm Signup" está configurado
- ✅ Template "Reset Password" está configurado
- ✅ Contienen `{{ .ConfirmationURL }}` o `{{ .Token }}`

**Ubicación**: Supabase Dashboard → Project Settings → Auth

**Verificar**:
- ✅ "Enable email confirmations" está activado
- ✅ "Secure email change" está activado
- ✅ Site URL: `https://natively.dev`
- ✅ Redirect URLs incluyen: `https://natively.dev/email-confirmed`

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Emails van a Spam

**Síntomas**:
- Los logs muestran que el email se envió
- El usuario no ve el email en su bandeja de entrada

**Solución**:
1. Pedir al usuario que revise la carpeta de spam
2. Marcar el email como "No es spam"
3. Agregar `noreply@mail.app.supabase.io` a contactos

**Prevención a largo plazo**:
- Configurar dominio personalizado con DKIM/SPF/DMARC
- Usar servicio SMTP propio (Gmail, SendGrid, etc.)

### Problema 2: Usuario de Google sin Email de Verificación

**Síntomas**:
- Usuario se registró con Google
- `provider` = 'google'
- `email_verified` = false en tabla usuarios
- `email_confirmed_at` existe en auth.users

**Solución**:
```sql
-- Sincronizar estado de verificación
UPDATE usuarios u
SET 
  email_verified = true,
  updated_at = NOW()
FROM auth.users au
WHERE 
  u.id = au.id
  AND u.provider = 'google'
  AND u.email_verified = false
  AND au.email_confirmed_at IS NOT NULL;
```

**Nota**: La migración `sync_google_users_email_verification` ya hace esto automáticamente.

### Problema 3: Rate Limiting

**Síntomas**:
- Error: "rate limit exceeded"
- Múltiples intentos de envío en poco tiempo

**Solución**:
1. Esperar 60 segundos entre intentos
2. Verificar que no hay bucles de reenvío
3. Implementar cooldown en la UI (ya implementado)

### Problema 4: Email No Llega (Gmail Específico)

**Síntomas**:
- Logs muestran envío exitoso
- No está en spam
- Usuario no recibe nada

**Posibles causas**:
1. **Filtros de Gmail**: Gmail puede estar bloqueando emails de `mail.app.supabase.io`
2. **Configuración de cuenta**: Configuración de seguridad de Gmail
3. **Límites de Supabase**: Plan gratuito tiene límites de envío

**Solución temporal**:
1. Usar el sistema de fallback (mostrar código en pantalla)
2. Probar con otro proveedor de email (Yahoo, Outlook)

**Solución permanente**:
1. Configurar dominio personalizado
2. Configurar SMTP propio
3. Usar servicio de email transaccional (SendGrid, Mailgun)

---

## 🛠️ Soluciones Implementadas

### 1. Migración de Sincronización

**Archivo**: `supabase/migrations/sync_google_users_email_verification.sql`

**Qué hace**:
- Sincroniza `email_verified` entre `usuarios` y `auth.users`
- Crea trigger automático para mantener sincronización
- Actualiza usuarios de Google existentes

**Ejecutar**:
```bash
# Ya aplicada automáticamente
```

### 2. Edge Function Mejorada

**Archivo**: `supabase/functions/send-verification-email/index.ts`

**Mejoras**:
- Usa sistema nativo de Supabase
- Mejor logging para debugging
- Sistema de fallback robusto
- Manejo de errores detallado

### 3. UI con Fallback

**Archivos**:
- `app/auth/configurar-password-google.tsx`
- `app/auth/verificar-email.tsx`

**Mejoras**:
- Instrucciones claras para el usuario
- Información sobre el remitente del email
- Consejos para encontrar el email
- Cooldown de 60 segundos entre reenvíos

---

## 📋 Checklist de Verificación

### Para el Usuario: jorgepereznoyagh@gmail.com

- [ ] Ejecutar query de diagnóstico
- [ ] Verificar estado en auth.users
- [ ] Revisar logs de Supabase Auth
- [ ] Confirmar que la migración se aplicó
- [ ] Probar flujo de configuración de contraseña
- [ ] Verificar que el email llega (o va a spam)
- [ ] Si no llega, usar sistema de fallback

### Para Nuevos Usuarios

- [ ] Verificar que los emails se envían
- [ ] Confirmar que llegan a la bandeja de entrada
- [ ] Probar con diferentes proveedores (Gmail, Yahoo, Outlook)
- [ ] Verificar que los enlaces funcionan
- [ ] Confirmar que la verificación se completa

---

## 🔧 Comandos Útiles

### Verificar Usuarios de Google sin Verificar

```sql
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.email_verified,
  u.provider,
  au.email_confirmed_at
FROM usuarios u
LEFT JOIN auth.users au ON u.id = au.id
WHERE 
  u.provider = 'google'
  AND u.email_verified = false
  AND au.email_confirmed_at IS NOT NULL;
```

### Forzar Verificación para Usuario Específico

```sql
UPDATE usuarios
SET 
  email_verified = true,
  updated_at = NOW()
WHERE email = 'jorgepereznoyagh@gmail.com';
```

### Ver Últimos Emails Enviados

```sql
-- Esto requiere acceso a los logs de Supabase
-- Ver en: Supabase Dashboard → Logs → Auth Logs
-- Filtrar por: event = 'mail.send'
```

---

## 📞 Próximos Pasos

### Inmediato (Para jorgepereznoyagh@gmail.com)

1. **Verificar sincronización**:
   ```sql
   SELECT email_verified FROM usuarios WHERE email = 'jorgepereznoyagh@gmail.com';
   ```
   - Si es `false`, ejecutar la migración manualmente
   - Si es `true`, el usuario ya puede iniciar sesión

2. **Probar flujo de configuración de contraseña**:
   - Ir a `/auth/configurar-password-google`
   - Solicitar correo de restablecimiento
   - Verificar logs de Supabase
   - Si no llega, revisar spam

3. **Alternativa**: Configurar contraseña manualmente
   - Usar Supabase Dashboard → Authentication → Users
   - Buscar usuario por email
   - Usar "Send password reset email"

### Corto Plazo (1-2 semanas)

1. **Monitorear entrega de emails**:
   - Revisar logs diariamente
   - Identificar patrones de fallos
   - Documentar proveedores problemáticos

2. **Mejorar sistema de fallback**:
   - Implementar códigos OTP en la UI
   - Agregar opción de SMS (opcional)
   - Mejorar mensajes de error

### Largo Plazo (1-3 meses)

1. **Configurar dominio personalizado**:
   - Registrar dominio para emails (ej: `noreply@barlive.app`)
   - Configurar DKIM, SPF, DMARC en IONOS
   - Usar servicio SMTP propio

2. **Migrar a servicio de email transaccional**:
   - Evaluar SendGrid, Mailgun, o Amazon SES
   - Configurar plantillas personalizadas
   - Implementar tracking de emails

---

## 📚 Referencias

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Troubleshooting Auth](https://supabase.com/docs/guides/auth/troubleshooting)

---

**Última actualización**: 2025-12-01
**Versión**: 1.0
**Estado**: ✅ Activo
