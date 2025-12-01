
# 🚨 SOLUCIÓN URGENTE: Dominio de Email No Verificado

## ❌ Problema Identificado

**Error:** `450 The barlive.app domain is not verified. Please, add and verify your domain on https://resend.com/domains`

**Impacto:** 
- ❌ NO se pueden enviar correos de recuperación de contraseña
- ❌ NO se pueden enviar correos de verificación de cuenta
- ❌ Los usuarios NO pueden restablecer sus contraseñas
- ❌ Los nuevos usuarios NO pueden verificar sus cuentas

**Causa raíz:** El dominio `barlive.app` no está verificado en Resend (el servicio de correo que usa Supabase).

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Acceder a Resend

1. Ve a: https://resend.com/domains
2. Inicia sesión con tu cuenta de Resend
3. Busca el dominio `barlive.app`

### Paso 2: Obtener los Registros DNS

En Resend, verás algo como esto:

```
⚠️ Domain not verified

Add these DNS records to verify your domain:
```

Los registros típicamente son:

#### 1. DKIM Record (para autenticación)
```
Type: TXT
Name: resend._domainkey.barlive.app
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... (valor largo)
TTL: 3600
```

#### 2. SPF Record (para prevenir spam)
```
Type: TXT
Name: barlive.app (o @)
Value: v=spf1 include:amazonses.com ~all
TTL: 3600
```

#### 3. DMARC Record (para políticas de email)
```
Type: TXT
Name: _dmarc.barlive.app
Value: v=DMARC1; p=none; rua=mailto:postmaster@barlive.app
TTL: 3600
```

### Paso 3: Añadir Registros en IONOS

1. **Accede a IONOS:**
   - Ve a: https://www.ionos.es
   - Inicia sesión
   - Ve a "Dominios" → "barlive.app" → "DNS"

2. **Añade el registro DKIM:**
   ```
   Tipo: TXT
   Nombre: resend._domainkey
   Valor: [copia el valor completo de Resend]
   TTL: 3600
   ```

3. **Añade el registro SPF:**
   ```
   Tipo: TXT
   Nombre: @ (o deja vacío)
   Valor: v=spf1 include:amazonses.com ~all
   TTL: 3600
   ```

4. **Añade el registro DMARC:**
   ```
   Tipo: TXT
   Nombre: _dmarc
   Valor: v=DMARC1; p=none; rua=mailto:postmaster@barlive.app
   TTL: 3600
   ```

5. **Guarda los cambios**

### Paso 4: Esperar Propagación DNS

- ⏱️ **Tiempo estimado:** 15-30 minutos (puede tardar hasta 48 horas)
- 🔍 **Verificar propagación:** https://dnschecker.org

### Paso 5: Verificar en Resend

1. Vuelve a https://resend.com/domains
2. Haz clic en "Verify" o "Check DNS"
3. Espera a que aparezca: ✅ **Domain verified**

---

## 🧪 CÓMO PROBAR QUE FUNCIONA

### Opción 1: Desde la App

1. Abre la app BarLive
2. Ve a "Recuperar contraseña"
3. Ingresa un email: `jorgepereznoyagh@gmail.com`
4. Haz clic en "Enviar correo de recuperación"
5. **Resultado esperado:** 
   - ✅ "Correo enviado exitosamente"
   - ✅ El correo llega a la bandeja de entrada

### Opción 2: Desde Supabase Dashboard

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/users
2. Selecciona un usuario
3. Haz clic en "Send password reset email"
4. **Resultado esperado:** 
   - ✅ No hay errores en los logs
   - ✅ El correo llega al usuario

### Opción 3: Verificar Logs

```bash
# Verificar logs de Auth en Supabase
# Buscar: "Error sending recovery email"
# Resultado esperado: NO debe aparecer el error 450
```

---

## 📊 VERIFICACIÓN DE ESTADO ACTUAL

### Antes de la Solución ❌

```
[Auth Logs]
error: "gomail: could not send email 1: 450 The barlive.app domain is not verified"
status: 500
code: "unexpected_failure"
```

### Después de la Solución ✅

```
[Auth Logs]
event: "mail.send"
mail_type: "recovery"
status: 200
msg: "mail sent successfully"
```

---

## 🔍 DIAGNÓSTICO RÁPIDO

### Verificar si el dominio está verificado:

```bash
# Verificar registro DKIM
dig TXT resend._domainkey.barlive.app

# Verificar registro SPF
dig TXT barlive.app

# Verificar registro DMARC
dig TXT _dmarc.barlive.app
```

### Resultado esperado:

```
resend._domainkey.barlive.app. 3600 IN TXT "p=MIGfMA0GCSqGSIb3DQEBAQUAA4..."
barlive.app. 3600 IN TXT "v=spf1 include:amazonses.com ~all"
_dmarc.barlive.app. 3600 IN TXT "v=DMARC1; p=none; rua=mailto:postmaster@barlive.app"
```

---

## 🚨 SOLUCIÓN TEMPORAL (Mientras se verifica el dominio)

### Opción 1: Usar el dominio por defecto de Supabase

En Supabase Dashboard:
1. Ve a Authentication → Email Templates
2. Cambia temporalmente el remitente a: `noreply@mail.app.supabase.io`
3. Esto permitirá enviar correos mientras se verifica el dominio personalizado

### Opción 2: Restablecer contraseñas manualmente

Para usuarios que necesitan acceso urgente:

```sql
-- En Supabase SQL Editor
-- Generar un token de recuperación manual
SELECT auth.generate_recovery_token('user_email@example.com');
```

---

## 📞 CONTACTO DE SOPORTE

Si después de seguir estos pasos el problema persiste:

- 📧 **Email:** soporte@barliveapp.es
- 🔗 **Resend Support:** https://resend.com/support
- 🔗 **Supabase Support:** https://supabase.com/support

---

## 📝 CHECKLIST DE VERIFICACIÓN

- [ ] Accedí a Resend Dashboard
- [ ] Copié los registros DNS de Resend
- [ ] Añadí el registro DKIM en IONOS
- [ ] Añadí el registro SPF en IONOS
- [ ] Añadí el registro DMARC en IONOS
- [ ] Esperé 30 minutos para propagación DNS
- [ ] Verifiqué el dominio en Resend
- [ ] El dominio muestra "✅ Verified" en Resend
- [ ] Probé enviar un correo de recuperación
- [ ] El correo llegó correctamente
- [ ] Verifiqué los logs de Supabase (sin errores 450)

---

## 🎯 RESULTADO ESPERADO

Una vez completados todos los pasos:

✅ Los correos de recuperación de contraseña se envían correctamente
✅ Los correos de verificación de cuenta se envían correctamente
✅ No hay errores 450 en los logs de Supabase
✅ Los usuarios pueden restablecer sus contraseñas sin problemas
✅ Los nuevos usuarios pueden verificar sus cuentas

---

## 📚 DOCUMENTACIÓN ADICIONAL

- [Resend Domain Verification](https://resend.com/docs/dashboard/domains/introduction)
- [Supabase Email Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [DNS Records Explained](https://www.cloudflare.com/learning/dns/dns-records/)

---

**Última actualización:** 2025-12-01
**Estado:** 🔴 URGENTE - Requiere acción inmediata
