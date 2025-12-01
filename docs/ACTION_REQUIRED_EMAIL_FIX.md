
# ⚠️ ACCIÓN REQUERIDA: Configurar Resend para Envío de Correos

## 🎯 Qué Necesitas Hacer AHORA

El sistema de envío de correos está **casi listo**, pero necesita que configures tu cuenta de Resend. Sin esto, los usuarios no recibirán códigos de verificación por email (aunque el código se mostrará en pantalla como fallback).

---

## ✅ Checklist de Configuración (15 minutos)

### [ ] Paso 1: Crear Cuenta en Resend (3 minutos)

1. Ve a: **https://resend.com**
2. Haz clic en **Sign Up**
3. Regístrate con tu email
4. Verifica tu email (revisa tu bandeja de entrada)

---

### [ ] Paso 2: Obtener API Key (2 minutos)

1. Una vez dentro de Resend, ve a **API Keys** (menú lateral izquierdo)
2. Haz clic en **Create API Key**
3. Configura:
   - **Name**: `BarLive Production`
   - **Permission**: `Sending access` (ya está seleccionado por defecto)
4. Haz clic en **Create**
5. **COPIA LA API KEY** (empieza con `re_`)
   - ⚠️ **MUY IMPORTANTE**: Solo se muestra una vez
   - Guárdala en un lugar seguro (Notepad, Notes, etc.)

**Ejemplo de API Key**: `re_123abc456def789ghi012jkl345mno678pqr`

---

### [ ] Paso 3: Configurar API Key en Supabase (2 minutos)

1. Ve a tu proyecto en Supabase:
   **https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions**

2. Busca la sección **Secrets**

3. Haz clic en **Add new secret**

4. Configura:
   - **Name**: `RESEND_API_KEY` (exactamente así, en mayúsculas)
   - **Value**: Pega la API key que copiaste en el Paso 2

5. Haz clic en **Save**

6. Espera 1-2 minutos para que se aplique

---

### [ ] Paso 4: Verificar que Funciona (3 minutos)

1. Abre la app BarLive

2. Ve a la pantalla de crear contraseña para usuarios de Google

3. Introduce tu email

4. Haz clic en **"Enviar código de verificación"**

5. Revisa:
   - ✅ Tu bandeja de entrada (y carpeta de spam)
   - ✅ Los logs en Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/send-verification-email/logs

**Si ves el email**: ¡Perfecto! Ya está funcionando.

**Si NO ves el email**: El código se mostrará en pantalla. Continúa con el Paso 5.

---

### [ ] Paso 5: Verificar Dominio (Opcional - 10 minutos)

**Nota**: Este paso es opcional pero **muy recomendado** para producción. Sin esto, los correos se enviarán desde `onboarding@resend.dev` en lugar de `noreply@barlive.app`.

1. En Resend, ve a **Domains**: https://resend.com/domains

2. Haz clic en **Add Domain**

3. Introduce: `barlive.app`

4. Haz clic en **Add**

5. Resend te mostrará varios registros DNS. **Copia cada uno**.

6. Ve a tu proveedor de DNS (donde compraste o gestionas `barlive.app`)

7. Agrega estos registros DNS:

   ```
   Registro 1 - SPF:
   Tipo: TXT
   Nombre: @
   Valor: v=spf1 include:_spf.resend.com ~all

   Registro 2 - DKIM 1:
   Tipo: CNAME
   Nombre: resend._domainkey
   Valor: [el que te muestre Resend]

   Registro 3 - DKIM 2:
   Tipo: CNAME
   Nombre: resend2._domainkey
   Valor: [el que te muestre Resend]

   Registro 4 - DKIM 3:
   Tipo: CNAME
   Nombre: resend3._domainkey
   Valor: [el que te muestre Resend]
   ```

8. Espera 5-30 minutos (puede tardar hasta 48 horas)

9. En Resend, haz clic en **Verify** junto a tu dominio

10. Si todo está bien, verás ✅ verde en todos los registros

---

## 🔍 Cómo Verificar que Todo Está Bien

### Opción 1: Ver los Logs del Edge Function

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/send-verification-email/logs

2. Busca estos mensajes:
   - ✅ `[SendVerificationEmail] ✅ RESEND_API_KEY is configured`
   - ✅ `[SendVerificationEmail] ✅ Email sent successfully!`

3. Si ves estos mensajes, ¡todo está funcionando!

### Opción 2: Probar con cURL

```bash
# Obtén tu Anon Key de:
# https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/api

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

**Respuesta esperada si funciona**:
```json
{"success":true,"messageId":"abc123"}
```

---

## ❓ Preguntas Frecuentes

### ¿Es gratis?

Sí, Resend tiene un plan gratuito que incluye:
- ✅ 3,000 emails al mes
- ✅ 100 emails al día
- ✅ Dominio personalizado
- ✅ Perfecto para desarrollo y apps pequeñas

### ¿Qué pasa si no configuro esto?

- ❌ Los usuarios NO recibirán emails con códigos de verificación
- ✅ El código se mostrará en pantalla como fallback
- ⚠️ Experiencia de usuario no óptima

### ¿Cuánto tiempo toma?

- **Configuración básica (Pasos 1-4)**: 10 minutos
- **Verificación de dominio (Paso 5)**: 10-15 minutos adicionales

### ¿Necesito verificar el dominio?

- **Para desarrollo/pruebas**: No es necesario
- **Para producción**: Sí, muy recomendado
- **Sin verificación**: Los correos se envían desde `onboarding@resend.dev`
- **Con verificación**: Los correos se envían desde `noreply@barlive.app`

---

## 🚨 Problemas Comunes

### "No veo la opción de Secrets en Supabase"

Ve directamente a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/settings/functions

### "El email no llega"

1. Revisa la carpeta de spam
2. Verifica que la API key esté configurada correctamente
3. Revisa los logs del Edge Function
4. El código se mostrará en pantalla como fallback

### "Error 403 en los logs"

Significa que el dominio no está verificado. Opciones:
1. Completa el Paso 5 para verificar el dominio
2. Usa el código que se muestra en pantalla (funciona sin email)

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:

1. **Revisa los logs**: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/functions/send-verification-email/logs

2. **Lee la guía completa**: `docs/EMAIL_ERROR_FIX_GUIDE.md`

3. **Contacta soporte de Resend**: https://resend.com/support

---

## ✅ Confirmación Final

Una vez completados los pasos, marca aquí:

- [ ] Cuenta de Resend creada
- [ ] API Key obtenida
- [ ] API Key configurada en Supabase
- [ ] Prueba de envío exitosa
- [ ] Email recibido (o código mostrado en pantalla)
- [ ] (Opcional) Dominio verificado

---

**Tiempo total estimado**: 10-25 minutos  
**Dificultad**: Fácil ⭐⭐☆☆☆  
**Costo**: Gratis 💰

**¡Una vez completado, el sistema de emails estará 100% funcional!** 🎉
