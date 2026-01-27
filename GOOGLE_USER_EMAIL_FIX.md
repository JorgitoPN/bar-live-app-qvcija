
# Solución: Usuarios de Google no reciben correos

## 🔍 Problema Identificado

Los usuarios que se registraron originalmente con Google OAuth no pueden recibir correos electrónicos porque:

1. **No tienen contraseña configurada** - Se registraron con Google OAuth, no con email/password
2. **Su provider es 'google'** - Están marcados como usuarios de Google en la base de datos
3. **No pueden usar password reset** - Supabase no envía correos de reset a usuarios OAuth sin contraseña

## ✅ Solución Implementada

### 1. Nueva Pantalla: Configurar Contraseña para Usuarios Google

**Archivo:** `app/auth/configurar-password-google.tsx`

Esta pantalla:
- Explica al usuario que necesita configurar una contraseña
- Muestra su correo electrónico
- Envía un correo de reset de contraseña usando `supabase.auth.resetPasswordForEmail()`
- Guía al usuario a revisar su correo

### 2. Detección Automática en Login

**Archivo:** `app/auth/login.tsx` (actualizado)

Cambios implementados:
- **Función `checkIfGoogleUser()`**: Verifica si el usuario tiene `provider: 'google'` en la tabla `usuarios`
- **Detección antes de login**: Si el usuario intenta iniciar sesión y es usuario de Google, se le redirige automáticamente
- **Detección en error de credenciales**: Si falla el login y es usuario de Google, se le ofrece configurar contraseña
- **Detección en "Olvidé mi contraseña"**: Si intenta recuperar contraseña y es usuario de Google, se le redirige

### 3. Detección en Recuperar Contraseña

**Archivo:** `app/auth/recuperar-password.tsx` (actualizado)

Cambios implementados:
- Verifica si el usuario es de Google antes de enviar el correo
- Si es usuario de Google, lo redirige a la pantalla de configuración
- Si no es usuario de Google, procede con el flujo normal de reset

## 🔄 Flujo de Usuario

### Para Usuarios de Google que intentan iniciar sesión:

1. **Usuario ingresa email y contraseña** → Click en "Iniciar sesión"
2. **Sistema detecta que es usuario de Google**
3. **Muestra alerta**: "Anteriormente iniciaste sesión con Google. Para continuar, necesitas configurar una contraseña..."
4. **Usuario hace click en "Configurar contraseña"**
5. **Se abre pantalla de configuración** con su email pre-cargado
6. **Usuario hace click en "Enviar correo de configuración"**
7. **Supabase envía correo de reset** a su email
8. **Usuario recibe correo** con enlace para configurar contraseña
9. **Usuario hace click en el enlace** → Se abre página de Supabase
10. **Usuario configura su nueva contraseña**
11. **Usuario puede iniciar sesión** con email y contraseña

### Para Usuarios de Google que intentan recuperar contraseña:

1. **Usuario hace click en "¿Olvidaste tu contraseña?"**
2. **Ingresa su email** → Click en "Enviar enlace"
3. **Sistema detecta que es usuario de Google**
4. **Muestra alerta**: "Tu cuenta fue creada con Google. Para poder iniciar sesión con contraseña, primero necesitas configurar una."
5. **Usuario hace click en "Configurar contraseña"**
6. **Continúa con el flujo anterior** (pasos 5-11)

## 📊 Usuarios Afectados

Según la consulta a la base de datos, hay **4 usuarios** con `provider: 'google'`:

- benxaque@gmail.com
- jorgepereznoya@gmail.com
- almudenasanchezmourino@gmail.com
- jorgepereznoyagh@gmail.com

Todos estos usuarios:
- ✅ Tienen cuenta en `auth.users` de Supabase
- ✅ Tienen email confirmado (`email_confirmed_at` está configurado)
- ❌ No tienen contraseña configurada (se registraron con Google OAuth)
- ❌ No pueden recibir correos de reset porque no tienen contraseña

## 🔧 Verificación Técnica

### Verificar usuarios de Google:

```sql
SELECT 
  u.id,
  u.email,
  u.nombre,
  u.provider,
  u.email_verified,
  au.email_confirmed_at,
  au.raw_app_meta_data->>'provider' as auth_provider
FROM usuarios u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.provider = 'google';
```

### Verificar que el correo se envía correctamente:

1. Usuario hace click en "Configurar contraseña"
2. Se llama a `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://natively.dev/email-confirmed' })`
3. Supabase envía el correo automáticamente
4. Usuario recibe correo con enlace de reset

## 📧 Configuración de Emails en Supabase

Asegúrate de que en el Dashboard de Supabase:

1. **Authentication → Email Templates → Reset Password** está configurado correctamente
2. **Authentication → URL Configuration** incluye:
   - `https://natively.dev/email-confirmed`
   - `https://natively.dev/auth/*`
3. **SMTP Settings** están configurados (o usar el servicio nativo de Supabase)

## 🎯 Próximos Pasos

### Para los usuarios existentes:

1. **Comunicar el cambio**: Enviar un email a los 4 usuarios de Google explicando que necesitan configurar una contraseña
2. **Incluir instrucciones**: Explicar el proceso paso a paso
3. **Ofrecer soporte**: Proporcionar un canal de soporte si tienen problemas

### Email sugerido para enviar:

```
Asunto: Actualización importante - Configura tu contraseña en BarLive

Hola [Nombre],

Hemos actualizado nuestro sistema de autenticación para mejorar la seguridad y experiencia de usuario.

Como anteriormente iniciaste sesión con Google, necesitas configurar una contraseña para continuar usando BarLive.

Pasos a seguir:
1. Abre la app BarLive
2. Intenta iniciar sesión con tu email
3. Sigue las instrucciones para configurar tu contraseña
4. Recibirás un correo con un enlace para completar el proceso

Si tienes algún problema, no dudes en contactarnos.

Gracias por tu comprensión,
El equipo de BarLive
```

## 🔒 Seguridad

Esta solución:
- ✅ Usa el sistema nativo de Supabase para reset de contraseñas
- ✅ No expone información sensible
- ✅ Requiere acceso al email para configurar la contraseña
- ✅ Mantiene la seguridad de los usuarios
- ✅ No permite bypass del sistema de autenticación

## 📝 Notas Adicionales

- Los usuarios de Google **mantienen su cuenta** y todos sus datos
- Solo necesitan **configurar una contraseña** para poder iniciar sesión
- Una vez configurada la contraseña, pueden usar **email/password** para iniciar sesión
- El proceso es **seguro** y usa el sistema nativo de Supabase
- Los correos se envían **automáticamente** por Supabase

## 🐛 Troubleshooting

### Si un usuario no recibe el correo:

1. **Verificar spam**: Pedir al usuario que revise su carpeta de spam
2. **Verificar email en Supabase**: Comprobar que el email está correcto en `auth.users`
3. **Verificar configuración SMTP**: Asegurarse de que Supabase puede enviar correos
4. **Revisar logs**: Usar `get_logs` para ver si hay errores de envío de correos
5. **Reenviar correo**: El usuario puede intentar nuevamente desde la app

### Si el enlace del correo no funciona:

1. **Verificar redirect URLs**: Asegurarse de que `https://natively.dev/email-confirmed` está en la lista de URLs permitidas
2. **Verificar expiración**: Los enlaces expiran después de 24 horas
3. **Generar nuevo enlace**: El usuario puede solicitar un nuevo correo

## ✨ Mejoras Futuras

1. **Migración automática**: Crear un script para enviar correos masivos a todos los usuarios de Google
2. **Notificación in-app**: Mostrar un banner en la app para usuarios de Google
3. **Estadísticas**: Trackear cuántos usuarios han completado la migración
4. **Soporte multi-provider**: Permitir que los usuarios vinculen múltiples métodos de autenticación
