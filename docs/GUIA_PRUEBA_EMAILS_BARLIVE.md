
# Guía de Prueba del Sistema de Emails - BarLive

## 🎯 Objetivo
Verificar que los correos electrónicos se envíen y reciban correctamente.

---

## ✅ Prueba 1: Confirmar Registro

### Pasos:
1. **Abre la app** y ve a "Crear cuenta"
2. **Ingresa tus datos:**
   - Nombre: Tu nombre
   - Email: tu-email@gmail.com (usa un email real que puedas revisar)
   - Contraseña: mínimo 8 caracteres
   - Confirmar contraseña: la misma contraseña
3. **Presiona "Crear cuenta"**
4. **Verifica que aparezca:**
   - ✅ Mensaje: "¡Cuenta creada! Tu cuenta ha sido creada exitosamente..."
   - ✅ Navegación a la pantalla "Verifica tu email"
5. **Revisa tu correo electrónico:**
   - ✅ Busca un correo de "BarLive" o "noreply@..."
   - ✅ Revisa también la carpeta de SPAM
   - ✅ El asunto debe ser: "Confirma tu cuenta de BarLive"
6. **Abre el correo y verifica:**
   - ✅ Está en español
   - ✅ Tiene el diseño de BarLive (gradiente teal/cyan)
   - ✅ Tiene un botón "Confirmar mi cuenta"
   - ✅ No menciona "Supabase"
7. **Haz clic en "Confirmar mi cuenta"**
8. **Verifica que:**
   - ✅ Te redirija a la app
   - ✅ Aparezca la pantalla "Email confirmado"
   - ✅ Puedas iniciar sesión

### ❌ Si no recibes el correo:
1. Espera 2-3 minutos (a veces hay retraso)
2. Revisa la carpeta de SPAM
3. Presiona "Reenviar correo de verificación" en la app
4. Verifica la configuración SMTP en Supabase Dashboard

---

## ✅ Prueba 2: Restablecer Contraseña

### Pasos:
1. **Ve a la pantalla de Login**
2. **Presiona "¿Olvidaste tu contraseña?"**
3. **Ingresa tu email** (el mismo que usaste para registrarte)
4. **Presiona "Enviar enlace"**
5. **Verifica que aparezca:**
   - ✅ Mensaje: "✅ Correo enviado. Hemos enviado un enlace de recuperación..."
6. **Revisa tu correo electrónico:**
   - ✅ Busca un correo de "BarLive"
   - ✅ El asunto debe ser: "Restablece tu contraseña de BarLive"
7. **Abre el correo y verifica:**
   - ✅ Está en español
   - ✅ Tiene el diseño de BarLive
   - ✅ Tiene un botón "Restablecer contraseña"
   - ✅ No menciona "Supabase"
8. **Haz clic en "Restablecer contraseña"**
9. **Verifica que:**
   - ✅ Te redirija a una página para ingresar nueva contraseña
   - ✅ Puedas ingresar y confirmar la nueva contraseña
   - ✅ Puedas iniciar sesión con la nueva contraseña

### ❌ Si no recibes el correo:
1. Espera 2-3 minutos
2. Revisa la carpeta de SPAM
3. Verifica que el email exista en la base de datos
4. Intenta con otro email

---

## 🔍 Verificar Logs en Supabase

### Ver logs de autenticación:
1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a: **Logs** → **Auth Logs**
3. Busca eventos recientes:
   - `user.signup` - Registro de usuario
   - `user.confirmation.sent` - Correo de confirmación enviado
   - `user.recovery.sent` - Correo de recuperación enviado

### Ver logs de emails:
1. Ve a: **Logs** → **Edge Function Logs**
2. Busca la función: `send-verification-email` (si la estás usando)
3. Verifica que no haya errores

---

## 📊 Checklist de Verificación

### Configuración en Supabase Dashboard:
- [ ] Plantilla "Confirm signup" actualizada en español
- [ ] Plantilla "Reset Password" actualizada en español
- [ ] Site URL configurada: `https://natively.dev`
- [ ] Redirect URLs agregadas
- [ ] SMTP habilitado (nativo o personalizado)
- [ ] Email confirmations habilitadas

### Pruebas funcionales:
- [ ] Registro de nuevo usuario funciona
- [ ] Correo de confirmación se recibe
- [ ] Enlace de confirmación funciona
- [ ] Usuario puede iniciar sesión después de confirmar
- [ ] Recuperación de contraseña funciona
- [ ] Correo de recuperación se recibe
- [ ] Enlace de recuperación funciona
- [ ] Usuario puede cambiar contraseña

### Diseño de emails:
- [ ] Emails están en español
- [ ] Tienen el branding de BarLive
- [ ] No mencionan Supabase
- [ ] Se ven bien en móvil
- [ ] Se ven bien en desktop
- [ ] Botones funcionan correctamente

---

## 🐛 Solución de Problemas Comunes

### Problema: "No recibo ningún correo"

**Posibles causas:**
1. SMTP no está habilitado
2. Email está en SPAM
3. Plantillas no están guardadas
4. Redirect URLs no están configuradas

**Solución:**
1. Ve a Supabase Dashboard → Project Settings → Auth → SMTP Settings
2. Verifica que esté habilitado
3. Revisa los logs de Auth
4. Prueba con otro proveedor de email (Gmail, Outlook, etc.)

---

### Problema: "El correo está en inglés"

**Causa:**
- Las plantillas no se guardaron correctamente

**Solución:**
1. Ve a Authentication → Email Templates
2. Verifica que las plantillas estén en español
3. Guarda los cambios
4. Prueba de nuevo

---

### Problema: "El enlace no funciona"

**Causa:**
- Redirect URLs no están configuradas

**Solución:**
1. Ve a Authentication → URL Configuration
2. Agrega las URLs de redirección
3. Guarda los cambios
4. Solicita un nuevo correo

---

### Problema: "Error 403 al enviar correo"

**Causa:**
- API key de Resend no está configurada (si usas SMTP personalizado)
- Dominio no está verificado

**Solución:**
1. Si usas SMTP personalizado, verifica la API key
2. Si usas dominio personalizado, verifica que esté verificado en Resend
3. Considera usar el SMTP nativo de Supabase temporalmente

---

## 📞 Contacto de Soporte

Si después de seguir esta guía los correos aún no funcionan:

1. **Revisa los logs** en Supabase Dashboard
2. **Toma capturas** de los errores
3. **Verifica la configuración** paso a paso
4. **Prueba con diferentes emails** (Gmail, Outlook, etc.)

---

**Última actualización:** Enero 2025
**Versión:** 4.0
**Estado:** ✅ Listo para producción
