
# 🔧 SOLUCIÓN DEFINITIVA: Emails de Recuperación de Contraseña No Llegan

## 📋 RESUMEN DEL PROBLEMA

Los correos electrónicos de recuperación de contraseña no están llegando a los usuarios. El Edge Function `request-password-token` está devolviendo errores 500 (non-2xx status code).

## ✅ CAMBIOS IMPLEMENTADOS

He actualizado el Edge Function `request-password-token` con:

- ✅ **Logging mejorado**: Ahora muestra información detallada de cada paso del proceso
- ✅ **Validación de RESEND_API_KEY**: Verifica que la clave API esté configurada
- ✅ **Manejo de errores mejorado**: Captura y registra errores detallados de la API de Resend
- ✅ **Información de debugging**: Muestra el estado de la respuesta, headers y detalles del error

## 🔍 DIAGNÓSTICO: POSIBLES CAUSAS

### 1. ❌ RESEND_API_KEY No Configurada o Inválida

**Síntoma**: El Edge Function devuelve error 500 inmediatamente

**Solución**:
1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a **Settings** → **Edge Functions** → **Secrets**
3. Verifica que existe una variable llamada `RESEND_API_KEY`
4. Si no existe o es incorrecta, obtén una nueva clave API de Resend:
   - Ve a https://resend.com/api-keys
   - Crea una nueva API Key
   - Cópiala y agrégala como secret en Supabase

**Comando para agregar el secret**:
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
```

### 2. ❌ Dominio No Verificado en Resend

**Síntoma**: Resend devuelve error 403 o "Domain not verified"

**Solución**:
1. Ve a tu dashboard de Resend: https://resend.com/domains
2. Verifica que el dominio `barliveapp.es` esté en la lista
3. Si no está verificado, verás un estado "Pending" o "Not Verified"
4. Haz clic en el dominio y sigue las instrucciones para agregar los registros DNS:
   - **SPF Record**: TXT record para verificación
   - **DKIM Record**: TXT record para autenticación
   - **DMARC Record**: TXT record para políticas

**Registros DNS necesarios** (ejemplo):
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all

Type: TXT
Name: resend._domainkey
Value: [valor proporcionado por Resend]

Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@barliveapp.es
```

### 3. ❌ Email "From" No Autorizado

**Síntoma**: Resend devuelve error 400 o "Unauthorized sender"

**Solución**:
El email actual es: `Barlive <noreply@barliveapp.es>`

Opciones:
- **Opción A**: Verifica el dominio `barliveapp.es` en Resend (recomendado)
- **Opción B**: Usa un email verificado temporalmente:
  ```typescript
  from: 'Barlive <onboarding@resend.dev>', // Email de prueba de Resend
  ```

### 4. ❌ Límite de Rate Limiting

**Síntoma**: Funciona algunas veces pero luego falla

**Solución**:
- Resend tiene límites de envío según tu plan
- Verifica tu plan en: https://resend.com/settings/billing
- Plan gratuito: 100 emails/día
- Si necesitas más, actualiza tu plan

## 🧪 CÓMO PROBAR Y DIAGNOSTICAR

### Paso 1: Ver los Logs del Edge Function

1. Ve a tu dashboard de Supabase
2. Navega a **Edge Functions** → **request-password-token**
3. Haz clic en **Logs**
4. Intenta enviar un código de recuperación desde la app
5. Observa los logs en tiempo real

**Logs esperados si todo funciona**:
```
[RequestPasswordToken] ═══════════════════════════════════════
[RequestPasswordToken] 🚀 Starting password reset request
[RequestPasswordToken] 📧 Email: usuario@ejemplo.com
[RequestPasswordToken] 👤 User exists: true
[RequestPasswordToken] 🔑 Generated token: 123456
[RequestPasswordToken] 💾 Storing token in database...
[RequestPasswordToken] ✅ Token stored successfully
[RequestPasswordToken] 📧 Sending email via Resend...
[RequestPasswordToken] 📬 Resend API response status: 200
[RequestPasswordToken] ✅ Email sent successfully!
[RequestPasswordToken] ═══════════════════════════════════════
```

**Logs si hay error con Resend**:
```
[RequestPasswordToken] ❌ Resend API error response: {"message":"Domain not verified"}
[RequestPasswordToken] ❌ Response status: 403
```

### Paso 2: Probar Manualmente con cURL

Puedes probar el Edge Function directamente:

```bash
curl -X POST https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/request-password-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [TU_ANON_KEY]" \
  -d '{"email":"tu-email@ejemplo.com"}'
```

### Paso 3: Verificar Estado de Resend

1. Ve a https://resend.com/emails
2. Busca los emails enviados recientemente
3. Verifica el estado:
   - ✅ **Delivered**: El email fue entregado correctamente
   - ⏳ **Queued**: El email está en cola
   - ❌ **Failed**: El email falló (haz clic para ver detalles)

## 🚀 SOLUCIÓN RÁPIDA (TEMPORAL)

Si necesitas que funcione INMEDIATAMENTE mientras configuras Resend:

### Opción 1: Usar Email de Prueba de Resend

Modifica temporalmente el Edge Function para usar el email de prueba:

```typescript
from: 'Barlive <onboarding@resend.dev>',
```

**Nota**: Este email solo funciona en modo de desarrollo y tiene limitaciones.

### Opción 2: Usar Supabase Auth Nativo

Alternativamente, puedes usar el sistema de recuperación de contraseña nativo de Supabase:

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://tu-app.com/reset-password',
});
```

## 📝 CHECKLIST DE VERIFICACIÓN

Marca cada item cuando lo hayas verificado:

- [ ] **RESEND_API_KEY** está configurada en Supabase Secrets
- [ ] **Dominio barliveapp.es** está verificado en Resend
- [ ] **Registros DNS** (SPF, DKIM, DMARC) están configurados correctamente
- [ ] **Plan de Resend** tiene suficiente cuota de envío
- [ ] **Logs del Edge Function** muestran el proceso completo
- [ ] **Email de prueba** fue recibido correctamente

## 🔧 COMANDOS ÚTILES

### Ver logs en tiempo real:
```bash
supabase functions logs request-password-token --follow
```

### Desplegar cambios:
```bash
supabase functions deploy request-password-token
```

### Listar secrets:
```bash
supabase secrets list
```

### Agregar/actualizar secret:
```bash
supabase secrets set RESEND_API_KEY=tu_clave_api
```

## 📞 SOPORTE

Si después de seguir todos estos pasos el problema persiste:

1. **Revisa los logs del Edge Function** para ver el error exacto
2. **Contacta con soporte de Resend**: https://resend.com/support
3. **Verifica el estado de Resend**: https://status.resend.com/

## 🎯 PRÓXIMOS PASOS

Una vez que los emails funcionen:

1. ✅ Prueba el flujo completo de recuperación de contraseña
2. ✅ Verifica que los tokens expiren correctamente (1 hora)
3. ✅ Prueba con diferentes proveedores de email (Gmail, Outlook, etc.)
4. ✅ Configura alertas para fallos en el envío de emails
5. ✅ Considera implementar un sistema de reintentos automáticos

## 📊 MONITOREO

Para evitar problemas futuros:

- **Configura alertas** en Supabase para errores en Edge Functions
- **Monitorea la cuota** de Resend regularmente
- **Revisa los logs** semanalmente para detectar patrones de error
- **Mantén actualizada** la documentación de configuración DNS

---

**Última actualización**: 2025-12-10
**Versión del Edge Function**: 7
**Estado**: ✅ Desplegado con logging mejorado
