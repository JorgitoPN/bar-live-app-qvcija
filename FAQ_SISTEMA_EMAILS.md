
# ❓ Preguntas Frecuentes - Sistema de Emails

## 📧 General

### ¿Por qué cambiamos de Resend a Supabase?
**R:** Para eliminar costos mensuales ($20-85/mes) y simplificar el sistema. Supabase ofrece un sistema de emails gratuito, confiable y escalable.

### ¿Cuánto cuesta el nuevo sistema?
**R:** $0/mes. Está incluido en tu plan de Supabase sin costo adicional.

### ¿Cuántos emails puedo enviar?
**R:** 
- Plan Free: 50,000 emails/mes
- Plan Pro: 100,000 emails/mes
- Plan Team: Ilimitado

### ¿Los emails son confiables?
**R:** Sí, Supabase usa infraestructura de nivel empresarial con 99.9% de uptime.

---

## ⚙️ Configuración

### ¿Dónde configuro las plantillas de email?
**R:** En Supabase Dashboard → Authentication → Email Templates

### ¿Tengo que configurar algo más?
**R:** Sí, también debes configurar las URLs de redirección en Authentication → URL Configuration

### ¿Puedo personalizar los emails?
**R:** Sí, puedes editar completamente las plantillas HTML en el dashboard.

### ¿Los emails están en español?
**R:** Sí, después de configurar las plantillas con el contenido de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`

---

## 📨 Envío de Emails

### ¿Cuánto tardan en llegar los emails?
**R:** Normalmente 1-5 minutos. En algunos casos puede tardar hasta 10 minutos.

### ¿Qué pasa si el email no llega?
**R:** 
1. Revisa la carpeta de spam
2. Espera 10 minutos
3. Solicita reenvío desde la app
4. Revisa los logs en Supabase Dashboard

### ¿Los emails van a spam?
**R:** Ocasionalmente pueden ir a spam, especialmente en Gmail. Es normal y mejorará con el tiempo a medida que se establece la reputación del dominio.

### ¿Puedo usar mi propio dominio para enviar emails?
**R:** Sí, puedes configurar un dominio personalizado en Supabase. Consulta la documentación oficial de Supabase para más detalles.

---

## 🔐 Seguridad

### ¿Los enlaces de verificación expiran?
**R:** Sí, expiran en 24 horas por seguridad.

### ¿Qué pasa si el enlace expira?
**R:** El usuario puede solicitar un nuevo enlace desde la app.

### ¿Los enlaces se pueden usar múltiples veces?
**R:** No, cada enlace solo se puede usar una vez.

### ¿Es seguro este sistema?
**R:** Sí, Supabase usa las mejores prácticas de seguridad y cumple con estándares internacionales.

---

## 🐛 Problemas Comunes

### El email no llega
**Posibles causas:**
- Está en la carpeta de spam
- El email es inválido
- Hay un problema temporal con el servicio

**Solución:**
1. Revisar carpeta de spam
2. Verificar que el email sea válido
3. Esperar 10 minutos
4. Solicitar reenvío
5. Revisar logs en Supabase Dashboard

### El enlace no funciona
**Posibles causas:**
- El enlace ha expirado (24 horas)
- El enlace ya fue usado
- Las URLs de redirección no están configuradas

**Solución:**
1. Solicitar un nuevo enlace
2. Verificar configuración de URLs en Supabase
3. Usar el enlace más reciente

### Error "Email not confirmed"
**Posibles causas:**
- El usuario no ha verificado su email
- El enlace no funcionó
- La configuración no está activada

**Solución:**
1. Reenviar el email de verificación
2. Verificar que "Enable email confirmations" esté activado
3. Revisar logs para ver si hay errores

### Los emails están en inglés
**Causa:**
- Las plantillas no están configuradas en español

**Solución:**
1. Ir a Supabase Dashboard → Authentication → Email Templates
2. Configurar cada plantilla con el contenido de `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md`

---

## 🔧 Técnico

### ¿Qué archivos se modificaron?
**R:** 
- `app/auth/registro-email.tsx` - Simplificado
- `app/auth/login.tsx` - Mejorado
- `app/auth/recuperar-password.tsx` - Simplificado

### ¿Qué archivos se eliminaron?
**R:**
- `app/auth/verificar-codigo-password.tsx` - Ya no necesario
- `app/auth/restablecer-password.tsx` - Ya no necesario
- `supabase/functions/send-verification-email/index.ts` - Ya no necesario

### ¿Cómo funciona el nuevo sistema?
**R:** Usa las funciones nativas de Supabase Auth:
- `supabase.auth.signUp()` - Envía email de verificación automáticamente
- `supabase.auth.resetPasswordForEmail()` - Envía email de recuperación automáticamente
- `supabase.auth.resend()` - Reenvía emails de verificación

### ¿Necesito configurar algo en el código?
**R:** No, el código ya está actualizado y listo para usar. Solo necesitas configurar las plantillas en el dashboard.

---

## 📊 Monitoreo

### ¿Cómo veo los logs de emails?
**R:** Supabase Dashboard → Logs → Auth

### ¿Cómo sé si un email fue enviado?
**R:** Revisa los logs en Supabase Dashboard. Verás eventos de "email sent" o "email failed".

### ¿Cómo monitoreo la tasa de entrega?
**R:** Usa las queries SQL en `docs/VERIFICACION_SISTEMA_EMAILS.md` para ver estadísticas.

### ¿Puedo ver cuántos emails he enviado?
**R:** Sí, en Supabase Dashboard → Settings → Usage puedes ver el uso de emails.

---

## 💰 Costos

### ¿Cuánto ahorro con este cambio?
**R:** $20-85/mes, o $240-1,020/año.

### ¿Hay límites en el plan gratuito?
**R:** Sí, 50,000 emails/mes. Si necesitas más, puedes actualizar a un plan superior.

### ¿Qué pasa si supero el límite?
**R:** Supabase te notificará y puedes actualizar tu plan.

### ¿Puedo volver a Resend si quiero?
**R:** Sí, pero no es recomendable ya que el sistema actual es más simple y gratuito.

---

## 🚀 Próximos Pasos

### ¿Qué debo hacer después de configurar?
**R:**
1. Probar todos los flujos
2. Monitorear los logs
3. Ajustar plantillas si es necesario
4. Disfrutar del ahorro 💰

### ¿Puedo agregar más funcionalidades?
**R:** Sí, Supabase Auth soporta muchas funcionalidades adicionales como:
- Magic links (enlaces mágicos)
- OTP (códigos de un solo uso)
- Autenticación de dos factores
- Y más...

### ¿Dónde encuentro más información?
**R:**
- `docs/SUPABASE_EMAIL_TEMPLATES_GUIDE.md` - Guía de configuración
- `docs/MIGRACION_EMAILS_SUPABASE_NATIVO.md` - Detalles técnicos
- `docs/VERIFICACION_SISTEMA_EMAILS.md` - Lista de verificación
- [Supabase Docs](https://supabase.com/docs/guides/auth) - Documentación oficial

---

## 📞 Soporte

### ¿Dónde obtengo ayuda?
**R:**
1. Consulta la documentación en la carpeta `docs/`
2. Revisa los logs en Supabase Dashboard
3. Consulta la documentación oficial de Supabase
4. Contacta al soporte de Supabase si es necesario

### ¿Hay algún tutorial en video?
**R:** Supabase tiene tutoriales en video en su canal de YouTube: https://www.youtube.com/@Supabase

---

**Última actualización:** 2025
**Versión:** 1.0
