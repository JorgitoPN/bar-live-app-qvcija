
# 🔧 Solución de Problemas: Resend + BarLive

Guía completa para resolver cualquier problema con el sistema de emails.

---

## 🚨 Diagnóstico Rápido

### ¿Qué problema tienes?

1. [No llegan los correos](#problema-1-no-llegan-los-correos)
2. [Error "Failed to send email"](#problema-2-error-failed-to-send-email)
3. [Error "Invalid API Key"](#problema-3-error-invalid-api-key)
4. [Código de verificación no funciona](#problema-4-código-de-verificación-no-funciona)
5. [Correos van a spam](#problema-5-correos-van-a-spam)
6. [Dominio no se verifica](#problema-6-dominio-no-se-verifica)
7. [Límite de correos excedido](#problema-7-límite-de-correos-excedido)
8. [Edge Function no responde](#problema-8-edge-function-no-responde)

---

## Problema 1: No llegan los correos

### 🔍 Diagnóstico

**Síntomas:**
- Usuario registra cuenta
- No recibe email de verificación
- No hay errores visibles en la app

**Causas posibles:**
1. API Key no configurada
2. API Key incorrecta
3. Correo en spam
4. Límite de Resend excedido
5. Email inválido

### ✅ Solución Paso a Paso

#### Paso 1: Verificar API Key en Supabase

```bash
# Opción A: CLI
supabase secrets list --project-ref embntaqwlwmgazvrglaf

# Deberías ver:
# RESEND_API_KEY
```

**Dashboard:**
1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions
2. Click en "Secrets"
3. Busca `RESEND_API_KEY`

**Si no está:**
```bash
supabase secrets set RESEND_API_KEY=re_tu_api_key --project-ref embntaqwlwmgazvrglaf
```

#### Paso 2: Verificar API Key en Resend

1. Ve a: https://resend.com/api-keys
2. Verifica que la key esté activa (no revocada)
3. Si está revocada, crea una nueva

#### Paso 3: Revisar Logs de Supabase

```bash
# Ver logs en tiempo real
supabase functions logs send-verification-email --tail --project-ref embntaqwlwmgazvrglaf
```

**Dashboard:**
1. Ve a: Edge Functions → send-verification-email → Logs
2. Busca errores recientes

**Errores comunes:**
- `RESEND_API_KEY is not defined` → API Key no configurada
- `401 Unauthorized` → API Key incorrecta
- `403 Forbidden` → Dominio no verificado
- `429 Too Many Requests` → Límite excedido

#### Paso 4: Revisar Carpeta de Spam

1. Abre tu cliente de email
2. Ve a la carpeta de Spam/Correo no deseado
3. Busca correos de:
   - `onboarding@resend.dev`
   - `noreply@barlive.app`

**Si está en spam:**
- Marca como "No es spam"
- Agrega el remitente a contactos
- Configura dominio personalizado para mejorar entregabilidad

#### Paso 5: Verificar Límites de Resend

1. Ve a: https://resend.com/emails
2. Revisa el contador de uso
3. Plan gratuito:
   - 100 correos/día
   - 3,000 correos/mes

**Si excediste el límite:**
- Espera hasta el siguiente período
- Actualiza al plan de pago
- Optimiza el uso de correos

#### Paso 6: Probar Manualmente

```bash
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer [TU_ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "tu@email.com",
    "code": "123456",
    "type": "verification"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "messageId": "abc123..."
}
```

---

## Problema 2: Error "Failed to send email"

### 🔍 Diagnóstico

**Síntomas:**
- Error visible en la app
- Mensaje: "Failed to send email"
- Usuario no puede continuar

**Causas posibles:**
1. API Key incorrecta
2. Resend API caída
3. Dominio no verificado
4. Formato de email inválido

### ✅ Solución Paso a Paso

#### Paso 1: Revisar Logs Detallados

```bash
supabase functions logs send-verification-email --limit 50 --project-ref embntaqwlwmgazvrglaf
```

Busca el error específico:

**Error: "401 Unauthorized"**
```
Causa: API Key incorrecta o no configurada
Solución: Verifica y reconfigura la API Key
```

**Error: "403 Forbidden"**
```
Causa: Dominio no verificado (si usas dominio personalizado)
Solución: 
1. Verifica el dominio en Resend
2. O usa onboarding@resend.dev temporalmente
```

**Error: "422 Unprocessable Entity"**
```
Causa: Formato de email inválido
Solución: Valida el email antes de enviar
```

**Error: "500 Internal Server Error"**
```
Causa: Problema con Resend API
Solución: 
1. Revisa status.resend.com
2. Espera unos minutos
3. Contacta soporte de Resend
```

#### Paso 2: Verificar Formato de Email

```javascript
// Validación de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('Email inválido:', email);
}
```

#### Paso 3: Probar con Email Conocido

Prueba con un email que sabes que funciona:
- Gmail: `test@gmail.com`
- Outlook: `test@outlook.com`

Si funciona con estos pero no con otros:
- Problema con el dominio del destinatario
- Servidor de email del destinatario bloqueando

#### Paso 4: Verificar Estado de Resend

1. Ve a: https://status.resend.com
2. Verifica que todos los servicios estén operativos
3. Si hay problemas, espera a que se resuelvan

---

## Problema 3: Error "Invalid API Key"

### 🔍 Diagnóstico

**Síntomas:**
- Error 401 en logs
- Mensaje: "Invalid API Key"
- Todos los correos fallan

### ✅ Solución Paso a Paso

#### Paso 1: Verificar API Key en Resend

1. Ve a: https://resend.com/api-keys
2. Verifica que la key exista
3. Verifica que no esté revocada
4. Verifica que tenga permisos de "Sending access"

#### Paso 2: Crear Nueva API Key

Si la key está revocada o no funciona:

1. En Resend → API Keys
2. Click "Create API Key"
3. Nombre: `BarLive Production v2`
4. Permisos: Sending access
5. Click "Create"
6. **Copia la nueva key**

#### Paso 3: Actualizar en Supabase

```bash
# Eliminar la key antigua
supabase secrets unset RESEND_API_KEY --project-ref embntaqwlwmgazvrglaf

# Configurar la nueva
supabase secrets set RESEND_API_KEY=re_nueva_api_key --project-ref embntaqwlwmgazvrglaf
```

**O en Dashboard:**
1. Settings → Edge Functions → Secrets
2. Elimina `RESEND_API_KEY`
3. Agrega nuevo secret con la nueva key

#### Paso 4: Verificar

```bash
# Listar secrets
supabase secrets list --project-ref embntaqwlwmgazvrglaf

# Probar envío
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer [ANON_KEY]' \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","code":"123456","type":"verification"}'
```

---

## Problema 4: Código de verificación no funciona

### 🔍 Diagnóstico

**Síntomas:**
- Usuario recibe el correo
- Ingresa el código
- Error: "Código incorrecto" o "Código expirado"

### ✅ Solución Paso a Paso

#### Paso 1: Verificar en Base de Datos

```sql
-- Conectarse a la base de datos
-- Supabase Dashboard → SQL Editor

SELECT 
  email,
  verification_code,
  verification_code_expires_at,
  email_verified,
  NOW() as current_time
FROM usuarios
WHERE email = 'usuario@ejemplo.com';
```

**Verifica:**
- ¿El código coincide?
- ¿La fecha de expiración es futura?
- ¿El email ya está verificado?

#### Paso 2: Verificar Expiración

Los códigos expiran en 10 minutos. Si pasó más tiempo:

```sql
-- Generar nuevo código
UPDATE usuarios
SET 
  verification_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
  verification_code_expires_at = NOW() + INTERVAL '10 minutes'
WHERE email = 'usuario@ejemplo.com';
```

Luego reenvía el correo desde la app.

#### Paso 3: Verificar Formato del Código

El código debe ser:
- 6 dígitos
- Solo números
- Sin espacios
- Sin guiones

```javascript
// Validación correcta
const code = userInput.trim().replace(/\s/g, '');
if (!/^\d{6}$/.test(code)) {
  console.error('Formato de código inválido');
}
```

#### Paso 4: Verificar Lógica de Verificación

En tu código de verificación:

```javascript
// Ejemplo correcto
const { data: usuario } = await supabase
  .from('usuarios')
  .select('verification_code, verification_code_expires_at')
  .eq('email', email)
  .single();

// Verificar código
if (usuario.verification_code !== code) {
  throw new Error('Código incorrecto');
}

// Verificar expiración
if (new Date(usuario.verification_code_expires_at) < new Date()) {
  throw new Error('Código expirado');
}

// Marcar como verificado
await supabase
  .from('usuarios')
  .update({ 
    email_verified: true,
    verification_code: null,
    verification_code_expires_at: null
  })
  .eq('email', email);
```

---

## Problema 5: Correos van a spam

### 🔍 Diagnóstico

**Síntomas:**
- Correos se envían correctamente
- Pero llegan a la carpeta de spam
- Afecta la experiencia del usuario

### ✅ Solución Paso a Paso

#### Paso 1: Configurar Dominio Personalizado

**Por qué ayuda:**
- Mejor reputación del remitente
- Autenticación SPF/DKIM
- Más profesional

**Cómo hacerlo:**
Ver sección "Configurar Dominio" en `RESEND_CONFIGURATION_COMPLETE.md`

#### Paso 2: Configurar SPF

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**Verificar SPF:**
```bash
dig TXT barlive.app
# O usa: https://mxtoolbox.com/spf.aspx
```

#### Paso 3: Configurar DKIM

```
Type: TXT
Name: resend._domainkey
Value: [Valor de Resend]
```

**Verificar DKIM:**
```bash
dig TXT resend._domainkey.barlive.app
# O usa: https://mxtoolbox.com/dkim.aspx
```

#### Paso 4: Configurar DMARC

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
```

**Verificar DMARC:**
```bash
dig TXT _dmarc.barlive.app
# O usa: https://mxtoolbox.com/dmarc.aspx
```

#### Paso 5: Mejorar Contenido del Email

**Evita:**
- ❌ Demasiadas imágenes
- ❌ Palabras spam ("gratis", "urgente", etc.)
- ❌ MAYÚSCULAS EXCESIVAS
- ❌ Muchos enlaces
- ❌ Archivos adjuntos

**Usa:**
- ✅ Texto claro y conciso
- ✅ HTML bien formado
- ✅ Ratio texto/imagen balanceado
- ✅ Enlaces HTTPS
- ✅ Remitente reconocible

#### Paso 6: Calentar el Dominio

Si es un dominio nuevo:

1. **Día 1-3**: Envía 10-20 correos/día
2. **Día 4-7**: Envía 50-100 correos/día
3. **Día 8-14**: Envía 200-500 correos/día
4. **Día 15+**: Envía volumen normal

Esto construye reputación gradualmente.

---

## Problema 6: Dominio no se verifica

### 🔍 Diagnóstico

**Síntomas:**
- Agregaste el dominio en Resend
- Configuraste los registros DNS
- Pero sigue sin verificarse

### ✅ Solución Paso a Paso

#### Paso 1: Verificar Registros DNS

**Herramientas:**
- https://mxtoolbox.com/SuperTool.aspx
- https://dnschecker.org/
- https://toolbox.googleapps.com/apps/dig/

**Verificar SPF:**
```bash
dig TXT barlive.app +short
# Debe mostrar: "v=spf1 include:_spf.resend.com ~all"
```

**Verificar DKIM:**
```bash
dig TXT resend._domainkey.barlive.app +short
# Debe mostrar el valor de Resend
```

#### Paso 2: Verificar Propagación DNS

La propagación puede tardar:
- Mínimo: 5-10 minutos
- Normal: 1-2 horas
- Máximo: 48 horas

**Verificar propagación global:**
https://www.whatsmydns.net/

Introduce:
- `barlive.app` (para SPF)
- `resend._domainkey.barlive.app` (para DKIM)

#### Paso 3: Verificar Formato de Registros

**Errores comunes:**

1. **Espacios extra:**
   ```
   ❌ v=spf1  include:_spf.resend.com ~all
   ✅ v=spf1 include:_spf.resend.com ~all
   ```

2. **Comillas incorrectas:**
   ```
   ❌ "v=spf1 include:_spf.resend.com ~all"
   ✅ v=spf1 include:_spf.resend.com ~all
   ```

3. **Nombre de registro incorrecto:**
   ```
   ❌ resend._domainkey.barlive.app
   ✅ resend._domainkey
   ```

#### Paso 4: Verificar con Proveedor DNS

Algunos proveedores agregan automáticamente el dominio:

**Ejemplo:**
- Introduces: `resend._domainkey`
- Proveedor crea: `resend._domainkey.barlive.app.barlive.app` ❌

**Solución:**
- Usa solo: `resend._domainkey`
- O el formato que requiera tu proveedor

#### Paso 5: Contactar Soporte

Si después de 48 horas no funciona:

1. **Resend Support**: https://resend.com/support
   - Proporciona: Dominio, capturas de registros DNS
   
2. **Proveedor DNS**: Contacta a tu proveedor
   - Verifica que los registros estén correctos

---

## Problema 7: Límite de correos excedido

### 🔍 Diagnóstico

**Síntomas:**
- Error 429 en logs
- Mensaje: "Too Many Requests"
- Usuarios no pueden registrarse

### ✅ Solución Paso a Paso

#### Paso 1: Verificar Uso Actual

1. Ve a: https://resend.com/emails
2. Revisa el contador:
   - Correos enviados hoy
   - Correos enviados este mes

**Límites del plan gratuito:**
- 100 correos/día
- 3,000 correos/mes

#### Paso 2: Soluciones Inmediatas

**Opción A: Esperar**
- El límite diario se resetea a medianoche UTC
- El límite mensual se resetea el día 1 del mes

**Opción B: Actualizar Plan**
1. Ve a: https://resend.com/settings/billing
2. Selecciona un plan de pago:
   - $20/mes: 50,000 correos
   - $80/mes: 250,000 correos

**Opción C: Optimizar Uso**
- Implementa rate limiting por usuario
- Agrupa notificaciones
- Usa batch sending

#### Paso 3: Implementar Rate Limiting

```javascript
// En tu Edge Function
const RATE_LIMIT = {
  perUser: 5, // 5 correos por usuario por hora
  perIP: 10,  // 10 correos por IP por hora
};

// Verificar antes de enviar
const recentEmails = await supabase
  .from('email_logs')
  .select('*')
  .eq('email', email)
  .gte('created_at', new Date(Date.now() - 3600000)); // última hora

if (recentEmails.length >= RATE_LIMIT.perUser) {
  throw new Error('Demasiados correos enviados. Intenta más tarde.');
}
```

#### Paso 4: Monitorear Uso

```javascript
// Crear tabla de logs
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT true
);

// Registrar cada envío
await supabase.from('email_logs').insert({
  email,
  type,
  success: true
});
```

---

## Problema 8: Edge Function no responde

### 🔍 Diagnóstico

**Síntomas:**
- Timeout al llamar la función
- No hay respuesta
- Error de red

### ✅ Solución Paso a Paso

#### Paso 1: Verificar Estado de la Función

```bash
# Listar funciones
supabase functions list --project-ref embntaqwlwmgazvrglaf

# Debe mostrar:
# send-verification-email | ACTIVE
```

**Dashboard:**
1. Ve a: Edge Functions
2. Verifica que `send-verification-email` esté ACTIVE

#### Paso 2: Verificar Logs

```bash
supabase functions logs send-verification-email --tail --project-ref embntaqwlwmgazvrglaf
```

Busca:
- Errores de timeout
- Errores de memoria
- Errores de sintaxis

#### Paso 3: Probar Conectividad

```bash
# Ping a la función
curl -I https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email

# Debe responder con:
# HTTP/2 200
```

#### Paso 4: Verificar Configuración de Red

**En la app:**
```javascript
// Verificar que la URL sea correcta
const SUPABASE_URL = 'https://embntaqwlwmgazvrglaf.supabase.co';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/send-verification-email`;

// Verificar headers
const headers = {
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};
```

#### Paso 5: Redesplegar la Función

Si nada funciona, redesplegar:

```bash
# Desde el directorio del proyecto
supabase functions deploy send-verification-email --project-ref embntaqwlwmgazvrglaf
```

---

## 🛠️ Herramientas de Diagnóstico

### Verificar Email Deliverability

**Mail Tester:**
https://www.mail-tester.com/

1. Envía un correo a la dirección que te dan
2. Revisa el score (debe ser > 8/10)
3. Sigue las recomendaciones

### Verificar DNS

**MXToolbox:**
https://mxtoolbox.com/SuperTool.aspx

Verifica:
- SPF Record
- DKIM Record
- DMARC Record
- Blacklist status

### Verificar API

**Resend API Playground:**
https://resend.com/docs/api-reference/emails/send-email

Prueba tu API Key directamente.

---

## 📞 Contactar Soporte

### Resend Support

**Email**: support@resend.com
**Docs**: https://resend.com/docs
**Status**: https://status.resend.com

**Información a proporcionar:**
- API Key (últimos 4 caracteres)
- Dominio
- Mensaje de error completo
- Timestamp del error

### Supabase Support

**Dashboard**: https://supabase.com/dashboard/support
**Docs**: https://supabase.com/docs
**Discord**: https://discord.supabase.com

**Información a proporcionar:**
- Project ID: embntaqwlwmgazvrglaf
- Edge Function name: send-verification-email
- Logs relevantes
- Timestamp del error

---

## ✅ Checklist de Diagnóstico

Antes de contactar soporte, verifica:

- [ ] API Key configurada en Supabase
- [ ] API Key válida en Resend
- [ ] Edge Function activa
- [ ] Logs revisados
- [ ] Límites no excedidos
- [ ] DNS configurado correctamente (si aplica)
- [ ] Dominio verificado (si aplica)
- [ ] Email de prueba enviado
- [ ] Carpeta de spam revisada
- [ ] Herramientas de diagnóstico usadas

---

**Última actualización**: Enero 2025  
**Versión**: 1.0  
**Mantenido por**: Equipo BarLive
