
# Guía de Solución: Error de Envío de Correos

## 🔴 Error Actual

```
[CrearPasswordGoogle] Error sending email:
FunctionsHttpError: Edge Function returned a non-2xx status code
```

**Estado del Edge Function**: Retornando código 403 (Forbidden)

---

## 🎯 Causa del Problema

El Edge Function `send-verification-email` está funcionando correctamente, pero **Resend está rechazando las solicitudes con un código 403**. Esto ocurre por una de estas razones:

1. ❌ **RESEND_API_KEY no está configurada** en Supabase
2. ❌ **RESEND_API_KEY es inválida o expirada**
3. ❌ **El dominio `barlive.app` no está verificado** en Resend

---

## ✅ Solución Paso a Paso

### Paso 1: Verificar si RESEND_API_KEY está configurada (2 minutos)

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a **Settings** → **Edge Functions** → **Secrets**
3. Busca `RESEND_API_KEY` en la lista

**Si NO aparece:**
- Necesitas configurarla (ve al Paso 2)

**Si SÍ aparece:**
- Puede estar incorrecta o expirada (ve al Paso 2 para actualizarla)

---

### Paso 2: Obtener y Configurar la API Key de Resend (5 minutos)

#### 2.1. Obtener la API Key

1. Ve a **Resend**: https://resend.com
2. **Inicia sesión** (o crea una cuenta si no tienes)
3. Ve a **API Keys** en el menú lateral izquierdo
4. Haz clic en **Create API Key**
   - **Name**: `BarLive Production`
   - **Permission**: `Sending access` (por defecto)
5. **Copia la API Key** (empieza con `re_`)
   - ⚠️ **IMPORTANTE**: Solo se muestra una vez, guárdala en un lugar seguro

#### 2.2. Configurar en Supabase

**Opción A: Dashboard de Supabase (Recomendado)**

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions
2. Haz clic en **Add new secret** (o **Edit** si ya existe)
3. Configura:
   - **Name**: `RESEND_API_KEY`
   - **Value**: La API key que copiaste (ejemplo: `re_123abc456def`)
4. Haz clic en **Save**

**Opción B: CLI de Supabase**

```bash
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui --project-ref embntaqwlwmgazvrglaf
```

#### 2.3. Verificar la Configuración

```bash
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

Deberías ver:
```
RESEND_API_KEY
```

---

### Paso 3: Verificar el Dominio en Resend (10-15 minutos)

Para enviar correos desde `noreply@barlive.app`, el dominio debe estar verificado.

#### 3.1. Agregar el Dominio

1. En Resend, ve a **Domains**: https://resend.com/domains
2. Haz clic en **Add Domain**
3. Introduce: `barlive.app`
4. Haz clic en **Add**

#### 3.2. Configurar Registros DNS

Resend te mostrará los registros DNS necesarios. Debes agregarlos en tu proveedor de DNS (donde compraste o gestionas el dominio `barlive.app`).

**Registros Requeridos:**

```
1. SPF Record (TXT)
   Nombre: @
   Tipo: TXT
   Valor: v=spf1 include:_spf.resend.com ~all

2. DKIM Record 1 (CNAME)
   Nombre: resend._domainkey
   Tipo: CNAME
   Valor: [proporcionado por Resend - único para tu cuenta]

3. DKIM Record 2 (CNAME)
   Nombre: resend2._domainkey
   Tipo: CNAME
   Valor: [proporcionado por Resend - único para tu cuenta]

4. DKIM Record 3 (CNAME)
   Nombre: resend3._domainkey
   Tipo: CNAME
   Valor: [proporcionado por Resend - único para tu cuenta]

5. DMARC Record (TXT) - Opcional pero recomendado
   Nombre: _dmarc
   Tipo: TXT
   Valor: v=DMARC1; p=none; rua=mailto:dmarc@barlive.app
```

#### 3.3. Verificar el Dominio

1. Después de agregar los registros DNS, espera 5-10 minutos
2. En Resend, haz clic en **Verify** junto a tu dominio
3. Si todo está correcto, verás ✅ verde en todos los registros

**Nota**: La propagación DNS puede tardar hasta 48 horas, pero usualmente es más rápido (5-30 minutos).

---

### Paso 4: Probar el Sistema (5 minutos)

#### 4.1. Ver los Logs del Edge Function

Para ver si la API key está configurada correctamente:

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/send-verification-email/logs
2. Busca estos mensajes:
   - ✅ `[SendVerificationEmail] ✅ RESEND_API_KEY is configured`
   - ❌ `[SendVerificationEmail] ❌ RESEND_API_KEY is not configured`

#### 4.2. Probar desde la App

1. Abre la app BarLive
2. Ve a la pantalla de crear contraseña para usuarios de Google
3. Introduce tu email
4. Haz clic en "Enviar código de verificación"
5. Revisa:
   - Los logs del Edge Function
   - Tu bandeja de entrada (y spam)

#### 4.3. Probar con cURL (Opcional)

```bash
# Obtén tu Anon Key de: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/api

curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer TU_ANON_KEY_AQUI' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "tu@email.com",
    "code": "123456",
    "type": "password_reset"
  }'
```

**Respuestas esperadas:**

✅ **Éxito (200)**:
```json
{"success":true,"messageId":"abc123"}
```

❌ **API Key no configurada (500)**:
```json
{
  "error":"Email service not configured",
  "details":"RESEND_API_KEY is missing. Please contact support."
}
```

❌ **Dominio no verificado (403)**:
```json
{
  "error":"Failed to send email",
  "details":"Domain verification required. Admin: Check Resend Dashboard.",
  "troubleshooting":"Domain \"barlive.app\" may not be verified in Resend..."
}
```

---

## 🔍 Diagnóstico de Errores

### Error: "RESEND_API_KEY is missing"

**Causa**: La API key no está configurada en Supabase.

**Solución**:
1. Sigue el Paso 2 para obtener y configurar la API key
2. Espera 1-2 minutos para que se aplique
3. Prueba nuevamente

---

### Error: "Domain verification required" (403)

**Causa**: El dominio `barlive.app` no está verificado en Resend.

**Solución**:
1. Sigue el Paso 3 para verificar el dominio
2. Espera a que los registros DNS se propaguen
3. Verifica en Resend Dashboard que todos los registros tengan ✅

**Solución temporal mientras se verifica el dominio**:

Puedes usar el dominio de prueba de Resend temporalmente:

1. Edita el Edge Function (ya desplegado, solo para referencia):
   ```typescript
   from: 'onboarding@resend.dev',  // En lugar de 'BarLive <noreply@barlive.app>'
   ```
2. **Limitación**: Solo funciona para enviar a tu propio email (el registrado en Resend)

---

### Error: "Invalid API key" (401)

**Causa**: La API key es incorrecta o fue regenerada.

**Solución**:
1. Ve a Resend Dashboard → API Keys
2. Verifica que la API key sea válida
3. Si es necesario, genera una nueva
4. Actualiza el secret en Supabase
5. Espera 1-2 minutos y prueba nuevamente

---

## 🎨 Mejoras Implementadas

### En el Edge Function:

✅ **Logging detallado**:
- Muestra si RESEND_API_KEY está configurada
- Registra el status code de Resend
- Muestra el cuerpo completo de la respuesta de error

✅ **Mensajes de error específicos**:
- Identifica si es problema de API key (401)
- Identifica si es problema de dominio (403)
- Proporciona instrucciones de troubleshooting

✅ **CORS configurado correctamente**:
- Permite llamadas desde la app

### En la App (crear-password-google.tsx):

✅ **Manejo de errores mejorado**:
- Muestra el código en pantalla si el email falla
- Proporciona mensajes de error claros
- Permite continuar aunque el email falle

✅ **Logging detallado**:
- Registra cada paso del proceso
- Facilita el debugging

✅ **Sección de troubleshooting**:
- Guía al usuario si no recibe el correo

---

## 📊 Verificación de Estado

### Checklist de Configuración:

- [ ] Cuenta de Resend creada
- [ ] API Key obtenida de Resend
- [ ] API Key configurada en Supabase (Settings → Edge Functions → Secrets)
- [ ] API Key verificada (aparece en `supabase secrets list`)
- [ ] Dominio `barlive.app` agregado en Resend
- [ ] Registros DNS configurados (SPF, DKIM 1, DKIM 2, DKIM 3)
- [ ] Registros DNS verificados en Resend (✅ verde)
- [ ] Edge Function desplegado (versión 6)
- [ ] Prueba de envío exitosa
- [ ] Email recibido en bandeja de entrada

---

## 🚀 Próximos Pasos

Una vez que el sistema esté funcionando:

1. **Monitorear el uso**:
   - Resend plan gratuito: 3,000 emails/mes, 100/día
   - Revisa el dashboard de Resend regularmente

2. **Mejorar la entregabilidad**:
   - Configura DMARC policy a `quarantine` o `reject`
   - Monitorea bounce rates

3. **Implementar rate limiting**:
   - Limita envíos por usuario
   - Previene abuso del sistema

---

## 📞 Soporte

Si después de seguir esta guía el problema persiste:

1. **Revisa los logs del Edge Function**:
   - https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/send-verification-email/logs

2. **Revisa el dashboard de Resend**:
   - https://resend.com/emails

3. **Verifica la propagación DNS**:
   - https://dnschecker.org/

4. **Contacta soporte**:
   - Resend: https://resend.com/support
   - Supabase: https://supabase.com/support

---

## 📝 Notas Importantes

- ⏱️ **Tiempo de configuración**: 15-20 minutos
- 💰 **Costo**: Gratis (plan gratuito de Resend)
- 🔒 **Seguridad**: Nunca expongas tu API key en el código
- 📧 **Límites**: 100 emails/día, 3,000/mes (plan gratuito)

---

**Última actualización**: 1 de febrero de 2025  
**Versión del Edge Function**: 6  
**Estado**: ✅ Edge Function desplegado | ⚠️ Requiere configuración de Resend
