
# ✅ Checklist de Configuración - Sistema de Emails

## 🎯 Objetivo
Configurar el sistema de emails nativo de Supabase (15 minutos)

---

## 📋 Paso 1: Plantillas de Email (10 min)

### 1.1 Acceder al Dashboard
- [ ] Ir a https://supabase.com/dashboard
- [ ] Seleccionar proyecto: **embntaqwlwmgazvrglaf**
- [ ] Ir a **Authentication** → **Email Templates**

### 1.2 Configurar "Confirm signup"
- [ ] Hacer clic en "Confirm signup"
- [ ] Copiar el asunto de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Copiar el HTML de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Hacer clic en "Save"

### 1.3 Configurar "Reset password"
- [ ] Hacer clic en "Reset password"
- [ ] Copiar el asunto de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Copiar el HTML de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Hacer clic en "Save"

### 1.4 Configurar "Change email"
- [ ] Hacer clic en "Change email"
- [ ] Copiar el asunto de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Copiar el HTML de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Hacer clic en "Save"

### 1.5 Configurar "Magic link"
- [ ] Hacer clic en "Magic link"
- [ ] Copiar el asunto de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Copiar el HTML de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`
- [ ] Hacer clic en "Save"

---

## 🔗 Paso 2: URLs de Redirección (2 min)

### 2.1 Configurar Site URL
- [ ] Ir a **Authentication** → **URL Configuration**
- [ ] En "Site URL", ingresar: `https://natively.dev`
- [ ] Hacer clic en "Save"

### 2.2 Configurar Redirect URLs
- [ ] En "Redirect URLs", agregar: `https://natively.dev/email-confirmed`
- [ ] Hacer clic en "Add URL"
- [ ] Hacer clic en "Save"

---

## ⚙️ Paso 3: Configuración de Email (1 min)

### 3.1 Verificar Configuración
- [ ] Ir a **Authentication** → **Email**
- [ ] Verificar que "Enable email confirmations" esté ✅ activado
- [ ] Verificar que "Secure email change" esté ✅ activado
- [ ] Si no están activados, activarlos y hacer clic en "Save"

---

## 🧪 Paso 4: Pruebas (2 min)

### 4.1 Probar Registro
- [ ] Abrir la app
- [ ] Ir a "Crear cuenta"
- [ ] Registrar un nuevo usuario con un email real
- [ ] Verificar que aparece el mensaje de éxito
- [ ] Revisar el email recibido
- [ ] Verificar que el email está en español
- [ ] Verificar que tiene el branding de BarLive
- [ ] Hacer clic en el enlace de verificación
- [ ] Verificar que funciona correctamente

### 4.2 Probar Recuperación de Contraseña
- [ ] Ir a "Iniciar sesión"
- [ ] Hacer clic en "¿Olvidaste tu contraseña?"
- [ ] Ingresar el email
- [ ] Verificar que aparece el mensaje de éxito
- [ ] Revisar el email recibido
- [ ] Verificar que el email está en español
- [ ] Hacer clic en el enlace de recuperación
- [ ] Verificar que funciona correctamente

### 4.3 Probar Reenvío de Email
- [ ] Intentar iniciar sesión con email no verificado
- [ ] Hacer clic en "Reenviar correo"
- [ ] Verificar que aparece el mensaje de éxito
- [ ] Revisar el email recibido
- [ ] Verificar que funciona correctamente

---

## 🎉 ¡Completado!

Si todos los checkboxes están marcados, el sistema está **100% funcional**.

### Resumen:
- ✅ Plantillas configuradas en español
- ✅ URLs de redirección configuradas
- ✅ Configuración de email verificada
- ✅ Pruebas completadas exitosamente

### Próximos pasos:
1. Monitorear los logs en Supabase Dashboard
2. Ajustar plantillas si es necesario
3. Disfrutar del ahorro de $20-85/mes 💰

---

## 📞 ¿Necesitas ayuda?

Si algo no funciona:
1. Revisa `docs/VERIFICACION_SISTEMA_EMAILS.md`
2. Revisa los logs en Supabase Dashboard → Logs → Auth
3. Consulta `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`

---

**Tiempo estimado:** 15 minutos
**Dificultad:** Fácil
**Estado:** ⏳ Pendiente → ✅ Completado
