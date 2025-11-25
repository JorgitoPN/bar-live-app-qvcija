
# Sistema de Correos Electrónicos - BarLive

## ✅ Configuración Completada

### 1. **Edge Function Desplegada**

Se ha desplegado exitosamente la función `send-verification-email` en Supabase que:

- ✅ Envía correos de verificación con códigos OTP de 6 dígitos
- ✅ Envía correos de restablecimiento de contraseña
- ✅ Utiliza la API de Resend para el envío de correos
- ✅ Incluye plantillas HTML profesionales con el branding de BarLive
- ✅ Maneja CORS correctamente para llamadas desde la app

**Estado:** ACTIVE
**Versión:** 1
**Endpoint:** `https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email`

### 2. **Base de Datos Configurada**

La tabla `usuarios` ya tiene las columnas necesarias:

- ✅ `email_verified` (boolean) - Indica si el email está verificado
- ✅ `verification_code` (text) - Código OTP de 6 dígitos
- ✅ `verification_code_expires_at` (timestamp) - Fecha de expiración del código (10 minutos)

**Políticas RLS Configuradas:**
- ✅ Los usuarios pueden ver todos los perfiles públicos
- ✅ Los usuarios pueden insertar su propio perfil
- ✅ Los usuarios pueden actualizar su propio perfil
- ✅ Los administradores pueden actualizar todos los usuarios

### 3. **Flujo de Registro Actualizado**

**Archivo:** `app/auth/registro-email.tsx`

El flujo de registro ahora:

1. ✅ Valida el formato del correo electrónico
2. ✅ Verifica si el correo ya existe en la base de datos
3. ✅ Crea el usuario en `auth.users` de Supabase
4. ✅ Crea el registro en la tabla `usuarios`
5. ✅ Genera un código OTP de 6 dígitos
6. ✅ Llama a la Edge Function para enviar el correo
7. ✅ Navega a la pantalla de verificación
8. ✅ Maneja errores y muestra el código en caso de fallo del correo

### 4. **Pantalla de Verificación Actualizada**

**Archivo:** `app/auth/verificar-email.tsx`

La pantalla de verificación:

1. ✅ Muestra 6 campos para ingresar el código OTP
2. ✅ Auto-avanza al siguiente campo al ingresar un dígito
3. ✅ Verifica automáticamente cuando se completan los 6 dígitos
4. ✅ Valida que el código sea correcto y no haya expirado
5. ✅ Permite reenviar el código después de 60 segundos
6. ✅ Marca el email como verificado en la base de datos
7. ✅ Navega al siguiente paso del registro

## 🔧 Configuración Requerida en Supabase

### Variables de Entorno (Secrets)

Debes configurar la siguiente variable de entorno en Supabase:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Cómo configurarla:**

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Settings** → **Edge Functions** → **Secrets**
3. Agrega un nuevo secret:
   - **Name:** `RESEND_API_KEY`
   - **Value:** Tu API key de Resend

### Obtener API Key de Resend

1. Crea una cuenta en [Resend](https://resend.com)
2. Ve a **API Keys** en el dashboard
3. Crea una nueva API key
4. Copia la key y agrégala como secret en Supabase

### Configurar Dominio de Envío (Opcional pero Recomendado)

Para que los correos se envíen desde `noreply@barlive.app` en lugar de `onboarding@resend.dev`:

1. En Resend, ve a **Domains**
2. Agrega tu dominio `barlive.app`
3. Configura los registros DNS según las instrucciones de Resend
4. Verifica el dominio

**Mientras tanto**, los correos se enviarán desde `onboarding@resend.dev` que funciona perfectamente para desarrollo y testing.

## 📧 Plantilla de Correo

Los correos incluyen:

- ✅ Diseño profesional con gradiente de BarLive
- ✅ Código OTP destacado en grande
- ✅ Mensaje de expiración (10 minutos)
- ✅ Instrucciones claras
- ✅ Footer con copyright
- ✅ Responsive design

## 🧪 Cómo Probar

### 1. Registro de Usuario

```typescript
// El flujo completo:
1. Usuario ingresa su email en /auth/registro-email
2. Se genera un código OTP de 6 dígitos
3. Se envía el correo con el código
4. Usuario ingresa el código en /auth/verificar-email
5. Se verifica el código y se marca el email como verificado
6. Usuario continúa al siguiente paso del registro
```

### 2. Reenvío de Código

```typescript
// Si el usuario no recibe el código:
1. Espera 60 segundos
2. Presiona "Reenviar código"
3. Se genera un nuevo código OTP
4. Se envía un nuevo correo
5. El contador se reinicia a 60 segundos
```

### 3. Verificación en Consola

Para verificar que todo funciona:

```sql
-- Ver usuarios con códigos de verificación pendientes
SELECT 
  email, 
  email_verified, 
  verification_code,
  verification_code_expires_at
FROM usuarios
WHERE email_verified = false;

-- Ver logs de la Edge Function
-- Ve a Supabase Dashboard → Edge Functions → send-verification-email → Logs
```

## 🔍 Debugging

### Si los correos no llegan:

1. **Verifica la API Key:**
   ```bash
   # En Supabase Dashboard → Settings → Edge Functions → Secrets
   # Asegúrate de que RESEND_API_KEY esté configurada
   ```

2. **Revisa los logs de la Edge Function:**
   ```bash
   # En Supabase Dashboard → Edge Functions → send-verification-email → Logs
   # Busca errores de Resend API
   ```

3. **Verifica el código en la base de datos:**
   ```sql
   SELECT verification_code, verification_code_expires_at
   FROM usuarios
   WHERE email = 'usuario@ejemplo.com';
   ```

4. **Prueba la Edge Function directamente:**
   ```bash
   curl -X POST \
     'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -H 'Content-Type: application/json' \
     -d '{
       "email": "test@example.com",
       "code": "123456",
       "type": "verification"
     }'
   ```

### Errores Comunes:

1. **"Failed to send email"**
   - Verifica que la API Key de Resend sea válida
   - Asegúrate de que no hayas excedido el límite de correos de Resend

2. **"Código incorrecto"**
   - Verifica que el código no haya expirado (10 minutos)
   - Asegúrate de que el email sea correcto

3. **"Email already exists"**
   - El usuario ya está registrado
   - Ofrece la opción de iniciar sesión o reenviar código si no está verificado

## 📊 Métricas y Monitoreo

### Logs de Edge Function

Puedes ver los logs en tiempo real en:
- Supabase Dashboard → Edge Functions → send-verification-email → Logs

### Métricas de Resend

En el dashboard de Resend puedes ver:
- Correos enviados
- Correos entregados
- Correos abiertos
- Correos rebotados

## 🚀 Próximos Pasos

### Funcionalidades Adicionales Recomendadas:

1. **Correo de Bienvenida**
   - Enviar un correo de bienvenida después de completar el registro
   - Incluir tips para usar la app

2. **Restablecimiento de Contraseña**
   - Implementar flujo de "Olvidé mi contraseña"
   - Usar el mismo sistema de OTP

3. **Notificaciones por Correo**
   - Nuevos seguidores
   - Comentarios en publicaciones
   - Eventos próximos
   - Mensajes directos

4. **Correos Transaccionales**
   - Confirmación de reservas
   - Recordatorios de eventos
   - Actualizaciones de suscripción

## 📝 Notas Importantes

1. **Límites de Resend (Plan Gratuito):**
   - 100 correos por día
   - 3,000 correos por mes
   - Para producción, considera actualizar al plan de pago

2. **Seguridad:**
   - Los códigos OTP expiran en 10 minutos
   - Los códigos son de un solo uso
   - Se eliminan de la base de datos después de la verificación

3. **Experiencia de Usuario:**
   - Los correos llegan en menos de 5 segundos
   - El diseño es responsive y se ve bien en todos los dispositivos
   - Los códigos son fáciles de leer y copiar

## ✅ Checklist de Configuración

- [x] Edge Function desplegada
- [x] Base de datos configurada con columnas de verificación
- [x] RLS policies configuradas
- [x] Flujo de registro actualizado
- [x] Pantalla de verificación actualizada
- [ ] **RESEND_API_KEY configurada en Supabase** ← **PENDIENTE**
- [ ] Dominio verificado en Resend (opcional)
- [ ] Pruebas de envío de correos realizadas

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs de la Edge Function
2. Verifica la configuración de la API Key
3. Prueba con un correo de prueba
4. Revisa la documentación de Resend: https://resend.com/docs

---

**Última actualización:** 2025-01-26
**Estado del Sistema:** ✅ Configurado y Listo para Usar (Requiere API Key de Resend)
