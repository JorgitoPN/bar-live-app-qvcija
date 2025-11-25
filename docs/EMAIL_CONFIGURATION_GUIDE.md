
# Guía de Configuración del Sistema de Emails

## 📧 Configuración de Resend API

### Paso 1: Obtener API Key de Resend

1. Ve a [https://resend.com/](https://resend.com/)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** en el menú lateral
4. Haz clic en **Create API Key**
5. Dale un nombre descriptivo (ej: "BarLive Production")
6. Copia la API key (empieza con `re_`)

### Paso 2: Configurar en Supabase

Ejecuta este comando en tu terminal (reemplaza `TU_API_KEY` con tu API key real):

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxx --project-ref embntaqwlwmgazvrglaf
```

### Paso 3: Verificar la Configuración

Para verificar que la API key está configurada correctamente:

```bash
supabase secrets list --project-ref embntaqwlwmgazvrglaf
```

Deberías ver `RESEND_API_KEY` en la lista.

### Paso 4: Configurar Dominio de Envío (Opcional pero Recomendado)

Para enviar emails desde tu propio dominio:

1. En Resend, ve a **Domains**
2. Haz clic en **Add Domain**
3. Introduce tu dominio (ej: `barlive.app`)
4. Sigue las instrucciones para configurar los registros DNS
5. Una vez verificado, actualiza el Edge Function para usar tu dominio:

```typescript
from: 'BarLive <noreply@barlive.app>'
```

## 🔧 Solución de Problemas de Autenticación

### Error: "Invalid login credentials"

Este error puede ocurrir por varias razones:

#### 1. Email no verificado
**Solución:** El usuario debe verificar su email antes de iniciar sesión.
- Revisa la bandeja de entrada (y spam)
- Haz clic en el enlace de verificación
- Intenta iniciar sesión nuevamente

#### 2. Credenciales incorrectas
**Solución:** Verifica que:
- El email esté escrito correctamente (sin espacios)
- La contraseña sea correcta
- No haya mayúsculas/minúsculas incorrectas en la contraseña

#### 3. Usuario no existe
**Solución:** Registra una nueva cuenta primero

#### 4. Problemas con la normalización del email
**Solución:** El código ahora normaliza automáticamente los emails:
- Convierte a minúsculas
- Elimina espacios en blanco
- Valida el formato

### Error: "Email not confirmed"

**Causa:** El usuario intentó iniciar sesión sin verificar su email.

**Solución:**
1. Revisa tu bandeja de entrada
2. Busca el email de verificación de BarLive
3. Haz clic en el enlace de verificación
4. Intenta iniciar sesión nuevamente

**Si no recibiste el email:**
1. Revisa la carpeta de spam
2. Verifica que el email esté escrito correctamente
3. Solicita un nuevo email de verificación

### Error: "Too many requests"

**Causa:** Demasiados intentos de inicio de sesión en poco tiempo.

**Solución:** Espera 5-10 minutos antes de intentar nuevamente.

## 📝 Verificar Configuración de Supabase Auth

### 1. Verificar Email Templates

En el Dashboard de Supabase:
1. Ve a **Authentication** > **Email Templates**
2. Verifica que los templates estén configurados:
   - Confirm signup
   - Magic Link
   - Change Email Address
   - Reset Password

### 2. Verificar SMTP Settings

En el Dashboard de Supabase:
1. Ve a **Project Settings** > **Auth**
2. Scroll hasta **SMTP Settings**
3. Si usas Resend, configura:
   - **Host:** smtp.resend.com
   - **Port:** 465 o 587
   - **Username:** resend
   - **Password:** Tu API key de Resend

### 3. Verificar Email Rate Limits

En el Dashboard de Supabase:
1. Ve a **Authentication** > **Rate Limits**
2. Ajusta los límites según tus necesidades:
   - Email sends per hour
   - SMS sends per hour

## 🧪 Probar el Sistema de Emails

### Probar Registro con Email

```typescript
import { signUpWithBarLive } from '@/utils/auth';

const testSignup = async () => {
  const result = await signUpWithBarLive(
    'test@example.com',
    'password123',
    'Usuario Test'
  );
  
  if (result.error) {
    console.error('Error:', result.error);
  } else {
    console.log('Usuario creado:', result.user);
    console.log('⚠️ Verifica tu email para activar la cuenta');
  }
};
```

### Probar Inicio de Sesión

```typescript
import { signInWithBarLive } from '@/utils/auth';

const testLogin = async () => {
  const result = await signInWithBarLive(
    'test@example.com',
    'password123'
  );
  
  if (result.error) {
    console.error('Error:', result.error);
  } else {
    console.log('Sesión iniciada:', result.user);
  }
};
```

## 📊 Monitorear Emails

### Ver Logs de Emails en Resend

1. Ve a [https://resend.com/emails](https://resend.com/emails)
2. Verás todos los emails enviados con su estado:
   - ✅ Delivered
   - ⏳ Queued
   - ❌ Failed

### Ver Logs en Supabase

```bash
supabase functions logs send-verification-email --project-ref embntaqwlwmgazvrglaf
```

## 🔐 Mejores Prácticas

### 1. Seguridad
- ✅ Nunca expongas tu API key de Resend en el código
- ✅ Usa variables de entorno
- ✅ Configura rate limits apropiados
- ✅ Implementa verificación de email obligatoria

### 2. Experiencia de Usuario
- ✅ Mensajes de error claros y útiles
- ✅ Indicadores de carga durante el proceso
- ✅ Confirmación visual cuando se envía un email
- ✅ Opción para reenviar email de verificación

### 3. Monitoreo
- ✅ Revisa regularmente los logs de emails
- ✅ Monitorea la tasa de entrega
- ✅ Configura alertas para fallos de envío
- ✅ Mantén un registro de emails enviados

## 🆘 Soporte

Si sigues teniendo problemas:

1. **Revisa los logs:**
   ```bash
   supabase functions logs send-verification-email --project-ref embntaqwlwmgazvrglaf
   ```

2. **Verifica la configuración:**
   ```bash
   supabase secrets list --project-ref embntaqwlwmgazvrglaf
   ```

3. **Contacta con soporte:**
   - Resend: [https://resend.com/support](https://resend.com/support)
   - Supabase: [https://supabase.com/support](https://supabase.com/support)

## 📚 Recursos Adicionales

- [Documentación de Resend](https://resend.com/docs)
- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Guía de Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
