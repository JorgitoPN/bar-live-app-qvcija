
# ✅ Checklist Completo: Configuración de Emails en BarLive

## 🎯 Objetivo
Asegurar que todos los correos electrónicos funcionen correctamente.

---

## 📧 Parte 1: Configuración en Supabase Dashboard

### 1.1. Plantillas de Email

**Ubicación:** Authentication → Email Templates

- [ ] **Plantilla "Confirm signup"**
  - [ ] Asunto: "Confirma tu cuenta de BarLive"
  - [ ] Cuerpo: HTML completo en español (ver `EMAIL_TEMPLATE_CONFIRM_SIGNUP.html`)
  - [ ] Botón "Confirmar mi cuenta" funciona
  - [ ] Variable `{{ .ConfirmationURL }}` está presente
  - [ ] Footer con "© 2025 BarLive"
  - [ ] Guardado correctamente

- [ ] **Plantilla "Reset Password"**
  - [ ] Asunto: "Restablece tu contraseña de BarLive"
  - [ ] Cuerpo: HTML completo en español (ver `EMAIL_TEMPLATE_RESET_PASSWORD.html`)
  - [ ] Botón "Restablecer contraseña" funciona
  - [ ] Variable `{{ .ConfirmationURL }}` está presente
  - [ ] Footer con "© 2025 BarLive"
  - [ ] Guardado correctamente

### 1.2. URLs de Redirección

**Ubicación:** Authentication → URL Configuration

- [ ] **Site URL configurada:**
  ```
  https://natively.dev
  ```

- [ ] **Redirect URLs agregadas:**
  - [ ] `https://natively.dev/email-confirmed`
  - [ ] `https://natively.dev/auth/*`
  - [ ] `exp://localhost:8081/email-confirmed` (para desarrollo)
  - [ ] `exp://localhost:8081/auth/*` (para desarrollo)

### 1.3. Configuración de Email

**Ubicación:** Project Settings → Auth

- [ ] **Email confirmations:** ✅ Habilitado
- [ ] **Secure email change:** ✅ Habilitado
- [ ] **Double confirm email changes:** ✅ Habilitado

### 1.4. Configuración SMTP

**Ubicación:** Project Settings → Auth → SMTP Settings

**Opción A: SMTP Nativo de Supabase (Recomendado para empezar)**
- [ ] SMTP está habilitado por defecto
- [ ] No requiere configuración adicional

**Opción B: SMTP Personalizado (Para producción)**
- [ ] "Enable Custom SMTP" activado
- [ ] Host configurado (ej: `smtp.resend.com`)
- [ ] Port configurado (ej: `465`)
- [ ] Username configurado
- [ ] Password/API Key configurado
- [ ] Sender email configurado (ej: `noreply@barlive.app`)
- [ ] Sender name configurado (ej: `BarLive`)
- [ ] Dominio verificado (si aplica)

---

## 🧪 Parte 2: Pruebas Funcionales

### 2.1. Prueba de Registro

- [ ] Crear nueva cuenta con email real
- [ ] Verificar mensaje de éxito en la app
- [ ] Navegar a pantalla "Verifica tu email"
- [ ] Recibir correo de confirmación (revisar SPAM)
- [ ] Correo está en español
- [ ] Correo tiene diseño de BarLive
- [ ] Hacer clic en "Confirmar mi cuenta"
- [ ] Redirección funciona correctamente
- [ ] Poder iniciar sesión después de confirmar

### 2.2. Prueba de Recuperación de Contraseña

- [ ] Ir a "¿Olvidaste tu contraseña?"
- [ ] Ingresar email registrado
- [ ] Verificar mensaje de éxito
- [ ] Recibir correo de recuperación (revisar SPAM)
- [ ] Correo está en español
- [ ] Correo tiene diseño de BarLive
- [ ] Hacer clic en "Restablecer contraseña"
- [ ] Poder ingresar nueva contraseña
- [ ] Poder iniciar sesión con nueva contraseña

### 2.3. Prueba de Reenvío de Correo

- [ ] Crear cuenta sin confirmar email
- [ ] Ir a pantalla "Verifica tu email"
- [ ] Presionar "Reenviar correo de verificación"
- [ ] Esperar 60 segundos (cooldown)
- [ ] Recibir nuevo correo
- [ ] Correo funciona correctamente

---

## 🔍 Parte 3: Verificación de Logs

### 3.1. Logs de Autenticación

**Ubicación:** Supabase Dashboard → Logs → Auth Logs

- [ ] Ver evento `user.signup` cuando se registra usuario
- [ ] Ver evento `user.confirmation.sent` cuando se envía correo
- [ ] Ver evento `user.recovery.sent` cuando se solicita recuperación
- [ ] No hay errores en los logs

### 3.2. Logs de Edge Functions (si aplica)

**Ubicación:** Supabase Dashboard → Edge Functions → Logs

- [ ] Ver logs de `send-verification-email` (si la usas)
- [ ] No hay errores 403 o 500
- [ ] Respuestas son exitosas (200)

---

## 📱 Parte 4: Pruebas en Diferentes Dispositivos

### 4.1. Prueba en iOS

- [ ] Registro funciona
- [ ] Correos se reciben
- [ ] Enlaces funcionan
- [ ] Redirección funciona

### 4.2. Prueba en Android

- [ ] Registro funciona
- [ ] Correos se reciben
- [ ] Enlaces funcionan
- [ ] Redirección funciona

### 4.3. Prueba en Web (si aplica)

- [ ] Registro funciona
- [ ] Correos se reciben
- [ ] Enlaces funcionan
- [ ] Redirección funciona

---

## 📧 Parte 5: Pruebas con Diferentes Proveedores de Email

### 5.1. Gmail

- [ ] Correo de confirmación llega
- [ ] Correo de recuperación llega
- [ ] No va a SPAM
- [ ] Diseño se ve correctamente

### 5.2. Outlook/Hotmail

- [ ] Correo de confirmación llega
- [ ] Correo de recuperación llega
- [ ] No va a SPAM
- [ ] Diseño se ve correctamente

### 5.3. Yahoo

- [ ] Correo de confirmación llega
- [ ] Correo de recuperación llega
- [ ] No va a SPAM
- [ ] Diseño se ve correctamente

### 5.4. Otros (ProtonMail, iCloud, etc.)

- [ ] Correo de confirmación llega
- [ ] Correo de recuperación llega
- [ ] No va a SPAM
- [ ] Diseño se ve correctamente

---

## 🎨 Parte 6: Verificación de Diseño

### 6.1. Contenido

- [ ] Todo el texto está en español
- [ ] No hay menciones a "Supabase"
- [ ] Branding de BarLive presente
- [ ] Gradiente teal/cyan (#14B8A6 → #06B6D4)
- [ ] Footer con copyright 2025

### 6.2. Responsive

- [ ] Se ve bien en móvil
- [ ] Se ve bien en tablet
- [ ] Se ve bien en desktop
- [ ] Botones son clickeables
- [ ] Texto es legible

### 6.3. Clientes de Email

- [ ] Gmail (web) - diseño correcto
- [ ] Gmail (app móvil) - diseño correcto
- [ ] Outlook (web) - diseño correcto
- [ ] Outlook (app móvil) - diseño correcto
- [ ] Apple Mail - diseño correcto

---

## 🔒 Parte 7: Seguridad

### 7.1. Enlaces

- [ ] Enlaces expiran después de 24 horas (confirmación)
- [ ] Enlaces expiran después de 1 hora (recuperación)
- [ ] Enlaces son de un solo uso
- [ ] Enlaces usan HTTPS

### 7.2. Datos

- [ ] No se exponen contraseñas en emails
- [ ] No se exponen tokens en logs
- [ ] Emails se envían de forma segura

---

## 📊 Parte 8: Monitoreo

### 8.1. Métricas

- [ ] Tasa de entrega de emails > 95%
- [ ] Tasa de apertura de emails > 50%
- [ ] Tasa de clicks en enlaces > 80%
- [ ] Tasa de confirmación de emails > 70%

### 8.2. Alertas

- [ ] Configurar alerta si emails fallan
- [ ] Configurar alerta si tasa de entrega baja
- [ ] Revisar logs diariamente

---

## 🚀 Parte 9: Producción

### 9.1. Antes de Lanzar

- [ ] Todas las pruebas pasadas
- [ ] SMTP configurado correctamente
- [ ] Dominio verificado (si usas personalizado)
- [ ] Plantillas finalizadas
- [ ] URLs de producción configuradas

### 9.2. Después de Lanzar

- [ ] Monitorear logs primeras 24 horas
- [ ] Verificar que usuarios reciban emails
- [ ] Responder a reportes de usuarios
- [ ] Ajustar configuración si es necesario

---

## ❌ Problemas Comunes y Soluciones

### Problema: No recibo correos

**Soluciones:**
1. [ ] Revisar carpeta de SPAM
2. [ ] Verificar SMTP está habilitado
3. [ ] Revisar logs de Auth
4. [ ] Probar con otro email
5. [ ] Esperar 2-3 minutos

### Problema: Correos en inglés

**Soluciones:**
1. [ ] Verificar plantillas están en español
2. [ ] Guardar cambios en Supabase Dashboard
3. [ ] Limpiar caché del navegador
4. [ ] Solicitar nuevo correo

### Problema: Enlaces no funcionan

**Soluciones:**
1. [ ] Verificar Redirect URLs configuradas
2. [ ] Verificar Site URL correcta
3. [ ] Probar en navegador diferente
4. [ ] Solicitar nuevo correo

### Problema: Error 403

**Soluciones:**
1. [ ] Verificar API key de SMTP
2. [ ] Verificar dominio verificado
3. [ ] Usar SMTP nativo de Supabase
4. [ ] Revisar logs de Edge Functions

---

## 📞 Contacto

Si después de completar este checklist aún hay problemas:

1. **Documentar el problema:**
   - Capturas de pantalla
   - Logs de Supabase
   - Pasos para reproducir

2. **Verificar configuración:**
   - Revisar cada paso del checklist
   - Comparar con documentación

3. **Buscar ayuda:**
   - Documentación de Supabase
   - Comunidad de Supabase
   - Soporte técnico

---

**Última actualización:** Enero 2025
**Versión:** 4.0
**Tiempo estimado:** 45-60 minutos
**Dificultad:** Media ⭐⭐⭐☆☆
