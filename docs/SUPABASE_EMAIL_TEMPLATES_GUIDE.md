
# Guía de Configuración de Plantillas de Email en Supabase

Esta guía te ayudará a configurar las plantillas de email en Supabase para que estén en español y con el branding de BarLive.

## 📧 Sistema de Emails Nativo de Supabase

Hemos migrado de Resend (servicio de pago) al sistema de emails nativo de Supabase, que es **completamente gratuito** y está incluido en tu plan.

### Ventajas del Sistema Nativo:
- ✅ **Gratuito**: No hay costos adicionales
- ✅ **Integrado**: Funciona automáticamente con Supabase Auth
- ✅ **Confiable**: Mantenido por Supabase
- ✅ **Personalizable**: Puedes personalizar todas las plantillas

## 🎨 Configuración de Plantillas

### 1. Acceder al Dashboard de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: **embntaqwlwmgazvrglaf**
3. Ve a **Authentication** → **Email Templates**

### 2. Plantilla de Confirmación de Email (Signup)

Esta plantilla se envía cuando un usuario se registra.

**Asunto:**
```
Verifica tu correo electrónico - BarLive
```

**Cuerpo HTML:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">¡Bienvenido a BarLive!</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Gracias por registrarte en BarLive. Para completar tu registro y activar tu cuenta, por favor haz clic en el siguiente botón:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Verificar mi correo</a>
    </div>
    <p style="font-size: 14px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">{{ .ConfirmationURL }}</p>
    <p style="font-size: 14px; color: #666;">Este enlace expirará en 24 horas.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este registro, puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

### 3. Plantilla de Recuperación de Contraseña

Esta plantilla se envía cuando un usuario solicita restablecer su contraseña.

**Asunto:**
```
Restablece tu contraseña - BarLive
```

**Cuerpo HTML:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Restablece tu contraseña</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en BarLive.</p>
    <p style="font-size: 16px; color: #333;">Haz clic en el siguiente botón para crear una nueva contraseña:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Restablecer contraseña</a>
    </div>
    <p style="font-size: 14px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">{{ .ConfirmationURL }}</p>
    <p style="font-size: 14px; color: #666;">Este enlace expirará en 24 horas.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, tu cuenta está segura y puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>Saludos,</p>
    <p>El equipo de BarLive</p>
    <p style="margin-top: 20px;">© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

### 4. Plantilla de Cambio de Email

Esta plantilla se envía cuando un usuario cambia su dirección de email.

**Asunto:**
```
Confirma tu nuevo correo electrónico - BarLive
```

**Cuerpo HTML:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Confirma tu nuevo correo</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Recibimos una solicitud para cambiar el correo electrónico de tu cuenta en BarLive.</p>
    <p style="font-size: 16px; color: #333;">Para confirmar este cambio, haz clic en el siguiente botón:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Confirmar nuevo correo</a>
    </div>
    <p style="font-size: 14px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">{{ .ConfirmationURL }}</p>
    <p style="font-size: 14px; color: #666;">Este enlace expirará en 24 horas.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, por favor contacta con nuestro soporte inmediatamente.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

### 5. Plantilla de Invitación (Magic Link)

Esta plantilla se envía cuando se usa el sistema de magic links.

**Asunto:**
```
Tu enlace de acceso a BarLive
```

**Cuerpo HTML:**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Accede a BarLive</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Haz clic en el siguiente botón para acceder a tu cuenta de BarLive:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Acceder a BarLive</a>
    </div>
    <p style="font-size: 14px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
    <p style="font-size: 12px; color: #999; word-break: break-all;">{{ .ConfirmationURL }}</p>
    <p style="font-size: 14px; color: #666;">Este enlace expirará en 24 horas.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este acceso, puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

## 🔧 Configuración Adicional

### URL de Redirección

En **Authentication** → **URL Configuration**, asegúrate de tener configurado:

**Site URL:**
```
https://natively.dev
```

**Redirect URLs:**
```
https://natively.dev/email-confirmed
https://natively.dev/auth/email-confirmed
```

### Configuración de Email

En **Authentication** → **Email**, verifica:

- ✅ **Enable email confirmations**: Activado
- ✅ **Secure email change**: Activado (recomendado)
- ✅ **Double confirm email changes**: Activado (recomendado)

## 📱 Flujo de Usuario

### Registro:
1. Usuario se registra con email y contraseña
2. Supabase envía automáticamente un email de confirmación
3. Usuario hace clic en el enlace del email
4. Usuario es redirigido a `/auth/email-confirmed`
5. La app verifica la sesión y actualiza el estado
6. Usuario puede iniciar sesión

### Recuperación de Contraseña:
1. Usuario solicita recuperar contraseña
2. Supabase envía automáticamente un email con enlace
3. Usuario hace clic en el enlace del email
4. Usuario es redirigido a una página para establecer nueva contraseña
5. Usuario establece nueva contraseña
6. Usuario puede iniciar sesión con la nueva contraseña

## 🎯 Ventajas de Este Sistema

1. **Sin costos adicionales**: Todo incluido en Supabase
2. **Mantenimiento automático**: Supabase se encarga de todo
3. **Seguro**: Usa las mejores prácticas de seguridad
4. **Escalable**: Soporta millones de usuarios
5. **Confiable**: 99.9% de uptime garantizado

## 🔍 Solución de Problemas

### Los emails no llegan:
1. Verifica la carpeta de spam
2. Verifica que el email esté correctamente escrito
3. Revisa los logs en Supabase Dashboard → Logs → Auth

### El enlace no funciona:
1. Verifica que las URLs de redirección estén configuradas
2. Verifica que el enlace no haya expirado (24 horas)
3. Intenta solicitar un nuevo enlace

### Personalización adicional:
1. Puedes agregar tu logo en las plantillas
2. Puedes cambiar los colores del gradiente
3. Puedes agregar más información en el footer

## 📞 Soporte

Si tienes problemas con la configuración de emails:
1. Revisa los logs en Supabase Dashboard
2. Consulta la documentación oficial: https://supabase.com/docs/guides/auth/auth-email-templates
3. Contacta al soporte de Supabase si es necesario

---

**Última actualización:** 2025
**Versión:** 1.0
