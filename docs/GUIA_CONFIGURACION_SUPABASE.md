
# 🔧 Guía Completa de Configuración de Supabase

## 📋 Resumen

Esta guía te ayudará a configurar correctamente Supabase para que el sistema de autenticación v4.0 funcione correctamente. Sigue estos pasos en orden.

---

## 🎯 Paso 1: Actualizar Plantillas de Correo Electrónico

### Acceder a las Plantillas

1. Ve a tu **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral, ve a: **Authentication** → **Email Templates**

### Plantilla 1: "Confirm signup" (Confirmar registro)

**Asunto (Subject):**
```
Confirma tu correo electrónico - BarLive
```

**Cuerpo (Body HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">¡Bienvenido a BarLive!</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Gracias por registrarte en BarLive. Por favor, confirma tu correo electrónico haciendo clic en el siguiente botón:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Confirmar correo electrónico</a>
    </div>
    <p style="font-size: 14px; color: #666;">Este enlace expirará en 24 horas.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>Saludos,</p>
    <p>El equipo de BarLive</p>
    <p style="margin-top: 20px;">© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

### Plantilla 2: "Reset Password" (Restablecer contraseña)

**Asunto (Subject):**
```
Restablece tu contraseña - BarLive
```

**Cuerpo (Body HTML):**
```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #14B8A6, #06B6D4); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Restablece tu contraseña</h1>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; color: #333;">Hola,</p>
    <p style="font-size: 16px; color: #333;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en BarLive.</p>
    <p style="font-size: 16px; color: #333;">Haz clic en el siguiente botón para continuar:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{ .ConfirmationURL }}" style="background: #14B8A6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">Restablecer contraseña</a>
    </div>
    <p style="font-size: 14px; color: #666;">Este enlace expirará en 1 hora.</p>
    <p style="font-size: 14px; color: #666;">Si no solicitaste este cambio, tu cuenta está segura y puedes ignorar este correo.</p>
  </div>
  <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
    <p>Saludos,</p>
    <p>El equipo de BarLive</p>
    <p style="margin-top: 20px;">© 2025 BarLive. Todos los derechos reservados.</p>
  </div>
</div>
```

**⚠️ Importante:** Asegúrate de que las plantillas contengan `{{ .ConfirmationURL }}` para que los enlaces funcionen correctamente.

---

## 🔗 Paso 2: Agregar URLs de Redireccionamiento

### Acceder a la Configuración de URLs

1. En tu **Supabase Dashboard**
2. Ve a: **Authentication** → **URL Configuration**

### Configurar Site URL

**Site URL:**
```
https://natively.dev
```

### Agregar Redirect URLs

En la sección **Redirect URLs**, agrega las siguientes URLs (una por línea):

```
https://natively.dev/email-confirmed
https://natively.dev/auth/*
exp://localhost:8081/email-confirmed
```

**Explicación:**
- `https://natively.dev/email-confirmed` - URL de producción para confirmación de email
- `https://natively.dev/auth/*` - Permite todas las rutas de autenticación
- `exp://localhost:8081/email-confirmed` - URL de desarrollo para Expo

**💡 Tip:** Si usas un dominio personalizado, reemplaza `natively.dev` con tu dominio.

---

## ✉️ Paso 3: Habilitar Configuración del Correo Electrónico

### Acceder a la Configuración de Email

1. En tu **Supabase Dashboard**
2. Ve a: **Authentication** → **Providers** → **Email**

### Configuraciones Requeridas

Asegúrate de que las siguientes opciones estén **ACTIVADAS** (✅):

#### 1. Enable email confirmations
```
✅ ON
```
**Qué hace:** Requiere que los usuarios confirmen su email antes de poder iniciar sesión.

#### 2. Secure email change
```
✅ ON
```
**Qué hace:** Requiere confirmación cuando un usuario cambia su email.

#### 3. Double confirm email changes
```
✅ ON
```
**Qué hace:** Envía confirmación tanto al email antiguo como al nuevo.

### Configuración Adicional (Opcional pero Recomendado)

#### Minimum Password Length
```
8 caracteres (mínimo recomendado)
```

#### Enable sign ups
```
✅ ON
```
**Qué hace:** Permite que nuevos usuarios se registren.

---

## 📧 Paso 4: Configurar SMTP (Opcional pero Recomendado para Producción)

### ¿Por qué configurar SMTP?

Por defecto, Supabase usa su propio servidor SMTP, pero tiene límites de envío. Para producción, es recomendable usar tu propio servidor SMTP.

### Acceder a la Configuración SMTP

1. En tu **Supabase Dashboard**
2. Ve a: **Project Settings** → **Auth** → **SMTP Settings**

### Opción 1: Usar SMTP de Supabase (Desarrollo)

**Ventajas:**
- ✅ Ya está configurado
- ✅ No requiere configuración adicional
- ✅ Gratis

**Desventajas:**
- ⚠️ Límites de envío
- ⚠️ Puede ir a spam

**Acción:** No hacer nada, ya está configurado por defecto.

### Opción 2: Configurar tu Propio SMTP (Producción)

**Proveedores Recomendados:**
- **SendGrid** (gratis hasta 100 emails/día)
- **Mailgun** (gratis hasta 5,000 emails/mes)
- **Gmail SMTP** (gratis, pero con límites)
- **Amazon SES** (muy económico)

**Configuración Ejemplo (SendGrid):**

1. Crea una cuenta en SendGrid
2. Obtén tu API Key
3. En Supabase SMTP Settings:
   - **Enable Custom SMTP**: ✅ ON
   - **Host**: `smtp.sendgrid.net`
   - **Port**: `587`
   - **Username**: `apikey`
   - **Password**: `[Tu API Key de SendGrid]`
   - **Sender email**: `noreply@tudominio.com`
   - **Sender name**: `BarLive`

**💡 Tip:** Usa un email de tu dominio (ej: `noreply@barlive.app`) para evitar que los correos vayan a spam.

---

## ✅ Paso 5: Verificar la Configuración

### Checklist de Verificación

Antes de continuar, verifica que hayas completado:

- [ ] ✅ Plantilla "Confirm signup" actualizada
- [ ] ✅ Plantilla "Reset Password" actualizada
- [ ] ✅ Site URL configurada: `https://natively.dev`
- [ ] ✅ Redirect URLs agregadas (3 URLs)
- [ ] ✅ "Enable email confirmations" activado
- [ ] ✅ "Secure email change" activado
- [ ] ✅ "Double confirm email changes" activado
- [ ] ✅ SMTP configurado (opcional)

---

## 🧪 Paso 6: Probar el Sistema

### Prueba 1: Registro de Usuario

1. Abre tu app
2. Ve a la pantalla de registro
3. Ingresa un email válido y contraseña
4. Presiona "Registrarse"
5. **Resultado esperado:**
   - ✅ Mensaje de éxito
   - ✅ Recibes un email de confirmación
   - ✅ El email contiene un botón "Confirmar correo electrónico"

### Prueba 2: Confirmación de Email

1. Abre el email de confirmación
2. Haz clic en "Confirmar correo electrónico"
3. **Resultado esperado:**
   - ✅ Redirige a `https://natively.dev/email-confirmed`
   - ✅ Muestra mensaje de éxito
   - ✅ Puedes iniciar sesión

### Prueba 3: Inicio de Sesión

1. Ve a la pantalla de login
2. Ingresa tu email y contraseña
3. Presiona "Iniciar sesión"
4. **Resultado esperado:**
   - ✅ Inicia sesión correctamente
   - ✅ Redirige a la pantalla principal

### Prueba 4: Restablecer Contraseña

1. Ve a la pantalla de login
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Presiona "Enviar"
5. **Resultado esperado:**
   - ✅ Recibes un email de restablecimiento
   - ✅ El email contiene un botón "Restablecer contraseña"
   - ✅ Puedes establecer una nueva contraseña

---

## 🔍 Solución de Problemas

### Problema 1: No recibo emails

**Posibles causas:**
1. Email en carpeta de spam
2. SMTP no configurado correctamente
3. Email bloqueado por el proveedor

**Soluciones:**
1. ✅ Revisa la carpeta de spam
2. ✅ Verifica la configuración SMTP en Supabase
3. ✅ Revisa los logs en: **Supabase Dashboard** → **Logs** → **Auth Logs**
4. ✅ Prueba con otro proveedor de email (Gmail, Outlook, etc.)
5. ✅ Configura tu propio SMTP (ver Paso 4)

### Problema 2: El enlace de confirmación no funciona

**Posibles causas:**
1. Redirect URLs no configuradas
2. Enlace expirado (24 horas)
3. Enlace ya usado

**Soluciones:**
1. ✅ Verifica que las Redirect URLs estén configuradas (Paso 2)
2. ✅ Solicita un nuevo email de confirmación
3. ✅ Revisa los logs de Supabase

### Problema 3: Error al iniciar sesión

**Posibles causas:**
1. Email no confirmado
2. Contraseña incorrecta
3. Usuario no existe

**Soluciones:**
1. ✅ Verifica que el email esté confirmado
2. ✅ Usa "Olvidé mi contraseña" para restablecer
3. ✅ Verifica que el usuario exista en: **Supabase Dashboard** → **Authentication** → **Users**

### Problema 4: Los emails van a spam

**Soluciones:**
1. ✅ Configura tu propio SMTP con un dominio verificado
2. ✅ Configura SPF, DKIM y DMARC en tu dominio
3. ✅ Usa un email de tu dominio (no @gmail.com)
4. ✅ Evita palabras spam en el asunto y cuerpo

---

## 📊 Monitoreo

### Ver Logs de Autenticación

1. Ve a: **Supabase Dashboard** → **Logs** → **Auth Logs**
2. Busca errores o problemas
3. Filtra por tipo de evento (signup, login, password_reset, etc.)

### Ver Usuarios Registrados

1. Ve a: **Supabase Dashboard** → **Authentication** → **Users**
2. Verifica que los usuarios se estén registrando correctamente
3. Revisa el estado de confirmación de email

### Métricas Importantes

- **Tasa de confirmación de email**: Debe ser > 80%
- **Tasa de éxito de login**: Debe ser > 90%
- **Tasa de error**: Debe ser < 5%

---

## 🎉 ¡Listo!

Si completaste todos los pasos y las pruebas funcionan correctamente, tu sistema de autenticación está configurado y listo para usar.

### Próximos Pasos

1. ✅ Prueba el sistema con usuarios reales
2. ✅ Monitorea los logs durante los primeros días
3. ✅ Configura alertas para errores críticos
4. ✅ Considera configurar tu propio SMTP para producción
5. ✅ Documenta cualquier problema que encuentres

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa esta guía** - La mayoría de problemas están cubiertos aquí
2. **Revisa los logs** - Supabase Dashboard → Logs
3. **Consulta la documentación** - Revisa `docs/AUTH_V4_IMPLEMENTATION.md`
4. **Contacta al equipo** - Si el problema persiste

---

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth](https://supabase.com/docs/guides/auth)
- [Configuración de Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Configuración de SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Troubleshooting Auth](https://supabase.com/docs/guides/auth/troubleshooting)

---

**Última actualización:** 2025-01-31  
**Versión:** 4.0  
**Estado:** ✅ Producción
