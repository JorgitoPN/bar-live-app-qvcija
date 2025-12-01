
# Configuración de Plantillas de Correo Electrónico en Supabase

## ✅ Edge Functions Desplegadas

Las siguientes Edge Functions han sido desplegadas exitosamente:

1. **send-verification-email** (v5) - Envía códigos de verificación por correo
2. **update-user-password** (v1) - Actualiza contraseñas de usuario de forma segura

## 📧 Configuración de Plantillas de Correo en el Panel de Supabase

### Paso 1: Acceder a las Plantillas de Correo

1. Ve al panel de control de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto: **embntaqwlwmgazvrglaf**
3. En el menú lateral, ve a **Authentication** → **Email Templates**

### Paso 2: Configurar Cada Plantilla

Debes configurar las siguientes plantillas para que coincidan con el enfoque de solo código (sin enlaces):

---

#### 🔹 **Confirm signup** (Confirmar registro)

**Asunto:**
```
Verifica tu correo electrónico - BarLive
```

**Cuerpo del mensaje:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Verifica tu correo electrónico</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Gracias por registrarte en BarLive. Para completar tu registro, ingresa el siguiente código de verificación en la aplicación:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">{{ .Token }}</h2>
    </div>
    <p style="font-size: 14px; color: #666;">Este código expirará en 10 minutos.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este código, puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

**⚠️ IMPORTANTE:** Deshabilita esta plantilla si usas la Edge Function `send-verification-email` para enviar códigos personalizados.

---

#### 🔹 **Invite user** (Invitar usuario)

**Asunto:**
```
Has sido invitado a BarLive
```

**Cuerpo del mensaje:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Bienvenido a BarLive</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Has sido invitado a unirte a BarLive.</p>
    <p style="font-size: 16px; color: #333;">Ingresa este código en la aplicación para aceptar la invitación:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">{{ .Token }}</h2>
    </div>
    <p style="font-size: 14px; color: #666;">Este código expirará en 24 horas.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

---

#### 🔹 **Magic Link** (Enlace mágico)

**⚠️ DESHABILITAR ESTA PLANTILLA**

Esta plantilla no se usa en el sistema de solo código. Para deshabilitarla:
1. Haz clic en el botón de configuración de la plantilla
2. Busca la opción "Enable template" o similar
3. Desmarca la casilla para deshabilitarla

---

#### 🔹 **Change Email Address** (Cambiar dirección de correo)

**Asunto:**
```
Confirma tu nuevo correo electrónico - BarLive
```

**Cuerpo del mensaje:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Confirma tu nuevo correo</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Recibimos una solicitud para cambiar el correo electrónico de tu cuenta en BarLive.</p>
    <p style="font-size: 16px; color: #333;">Ingresa este código en la aplicación para confirmar el cambio:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">{{ .Token }}</h2>
    </div>
    <p style="font-size: 14px; color: #666;">Este código expirará en 10 minutos.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, tu cuenta está segura y puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>Saludos,</p>
    <p>El equipo de BarLive</p>
    <p style="margin-top: 20px;">© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

---

#### 🔹 **Reset Password** (Restablecer contraseña)

**Asunto:**
```
Restablece tu contraseña - BarLive
```

**Cuerpo del mensaje:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Restablece tu contraseña</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en BarLive.</p>
    <p style="font-size: 16px; color: #333;">Ingresa este código en la aplicación:</p>
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <h2 style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14B8A6; margin: 0;">{{ .Token }}</h2>
    </div>
    <p style="font-size: 14px; color: #666;">Este código expirará en 10 minutos.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, tu cuenta está segura y puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>Saludos,</p>
    <p>El equipo de BarLive</p>
    <p style="margin-top: 20px;">© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

**⚠️ IMPORTANTE:** Deshabilita esta plantilla si usas la Edge Function `send-verification-email` para enviar códigos personalizados de restablecimiento de contraseña.

---

### Paso 3: Configuración Adicional

#### Variables de Plantilla Disponibles

Supabase proporciona las siguientes variables que puedes usar en las plantillas:

- `{{ .Email }}` - Correo electrónico del usuario
- `{{ .Token }}` - Token de verificación (código de 6 dígitos)
- `{{ .TokenHash }}` - Hash del token
- `{{ .SiteURL }}` - URL del sitio configurada
- `{{ .ConfirmationURL }}` - URL de confirmación completa (no usar en sistema de solo código)
- `{{ .RedirectTo }}` - URL de redirección

#### Configuración de SMTP Personalizado

Si deseas usar tu propio servidor SMTP en lugar de Resend:

1. Ve a **Authentication** → **Settings** → **SMTP Settings**
2. Configura los siguientes valores:
   - **Sender Name:** BarLive
   - **Sender Email:** noreply@barlive.app
   - **Host:** smtp.resend.com
   - **Port:** 465 o 587
   - **Username:** resend
   - **Password:** [Tu API Key de Resend]

---

## 🔧 Configuración de URLs de Redirección

1. Ve a **Authentication** → **URL Configuration**
2. Configura las siguientes URLs:

**Site URL:**
```
https://barlive.app
```

**Redirect URLs (una por línea):**
```
https://natively.dev/email-confirmed
https://barlive.app/auth/callback
exp://192.168.1.100:8081
myapp://auth/callback
```

---

## 🎯 Enfoque de Solo Código

### ¿Por qué solo códigos?

El sistema actual de BarLive usa **códigos de verificación de 6 dígitos** en lugar de enlaces mágicos por las siguientes razones:

1. **Mejor experiencia móvil:** Los usuarios no tienen que salir de la app
2. **Mayor seguridad:** Los códigos expiran en 10 minutos
3. **Más simple:** No hay problemas con deep links o redirecciones
4. **Universal:** Funciona en cualquier plataforma (iOS, Android, Web)

### Flujo de Verificación

1. Usuario solicita verificación (registro, reset password, etc.)
2. Edge Function `send-verification-email` envía un código de 6 dígitos
3. Usuario ingresa el código en la app
4. App valida el código y completa la acción
5. Si es cambio de contraseña, Edge Function `update-user-password` actualiza la contraseña

---

## 📝 Notas Importantes

- **Deshabilita las plantillas de Magic Link** si usas el sistema de solo código
- **Mantén los códigos cortos:** 6 dígitos es el estándar
- **Configura tiempos de expiración cortos:** 10 minutos es recomendado
- **Usa colores de marca:** Los correos usan el gradiente de BarLive (#14B8A6 → #06B6D4)
- **Todos los correos en español:** Mantén la consistencia del idioma

---

## ✅ Checklist de Configuración

- [ ] Configurar plantilla "Confirm signup"
- [ ] Configurar plantilla "Invite user"
- [ ] **DESHABILITAR** plantilla "Magic Link"
- [ ] Configurar plantilla "Change Email Address"
- [ ] Configurar plantilla "Reset Password"
- [ ] Configurar SMTP personalizado (opcional)
- [ ] Configurar URLs de redirección
- [ ] Verificar que las Edge Functions estén desplegadas
- [ ] Probar el flujo completo de registro
- [ ] Probar el flujo completo de reset password

---

## 🚀 Comandos de Despliegue

Las Edge Functions ya están desplegadas, pero si necesitas redesplegarlas en el futuro:

```bash
# Desplegar send-verification-email
supabase functions deploy send-verification-email

# Desplegar update-user-password
supabase functions deploy update-user-password

# Desplegar ambas
supabase functions deploy send-verification-email update-user-password
```

---

## 🔍 Verificación

Para verificar que todo está configurado correctamente:

1. **Verifica las Edge Functions:**
   - Ve a **Edge Functions** en el panel de Supabase
   - Confirma que `send-verification-email` (v5) y `update-user-password` (v1) estén activas

2. **Prueba el envío de correos:**
   - Registra un nuevo usuario en la app
   - Verifica que llegue el correo con el código de 6 dígitos
   - Confirma que el código funcione correctamente

3. **Prueba el reset de contraseña:**
   - Solicita un reset de contraseña
   - Verifica que llegue el correo con el código
   - Ingresa el código y cambia la contraseña
   - Confirma que puedas iniciar sesión con la nueva contraseña

---

## 📞 Soporte

Si tienes problemas con la configuración:

1. Revisa los logs de las Edge Functions en el panel de Supabase
2. Verifica que la API Key de Resend esté configurada correctamente
3. Confirma que el dominio esté verificado en Resend
4. Revisa la documentación de Supabase: https://supabase.com/docs/guides/auth/auth-email-templates

---

**Última actualización:** 31 de enero de 2025
**Versión:** 1.0
**Estado:** ✅ Edge Functions desplegadas y listas para usar
