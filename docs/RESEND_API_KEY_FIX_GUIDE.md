
# 🔧 Guía de Solución: Error de Clave API de Resend Inválida

## 📋 Resumen del Problema

**Error:** `La clave API no es válida` (Status 401)

**Causa:** La variable de entorno `RESEND_API_KEY` en Supabase contiene una clave API inválida o expirada.

**Impacto:** Los correos electrónicos de recuperación de contraseña no se están enviando a los usuarios.

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener una Clave API Válida de Resend

1. **Accede a tu cuenta de Resend:**
   - Ve a: https://resend.com/api-keys
   - Inicia sesión con tus credenciales

2. **Crea o copia una clave API válida:**
   - Haz clic en **"Create API Key"** (Crear clave API)
   - Dale un nombre descriptivo (ej: "BarLive Production")
   - Selecciona los permisos necesarios: **"Sending access"**
   - Copia la clave API generada (formato: `re_xxxxxxxxxxxxxxxxxxxxx`)
   
   ⚠️ **IMPORTANTE:** Guarda esta clave en un lugar seguro. Solo se mostrará una vez.

### Paso 2: Actualizar la Variable de Entorno en Supabase

1. **Accede al Dashboard de Supabase:**
   - Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
   - Inicia sesión si es necesario

2. **Navega a la configuración de Edge Functions:**
   - En el menú lateral, haz clic en **"Edge Functions"**
   - Luego haz clic en **"Manage secrets"** o **"Environment Variables"**

3. **Actualiza la clave API:**
   - Busca la variable `RESEND_API_KEY`
   - Haz clic en **"Edit"** (Editar)
   - Pega la nueva clave API de Resend
   - Haz clic en **"Save"** (Guardar)

### Paso 3: Verificar la Configuración

La Edge Function ya ha sido redespliegada automáticamente. Ahora puedes probar el flujo:

1. **Prueba el flujo de recuperación de contraseña:**
   - Ve a la pantalla de inicio de sesión en tu app
   - Haz clic en "¿Olvidaste tu contraseña?"
   - Ingresa un correo electrónico válido
   - Haz clic en "Enviar código de recuperación"

2. **Verifica los logs:**
   - Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/logs/edge-functions
   - Selecciona la función `request-password-token`
   - Busca mensajes como:
     - ✅ `Email sent successfully`
     - ✅ `Resend API response status: 200`

3. **Revisa tu bandeja de entrada:**
   - El correo debería llegar en menos de 1 minuto
   - Revisa también la carpeta de spam si no lo ves

---

## 🔍 Verificación de Configuración Completa

### Checklist de Configuración de Resend

- [ ] **Dominio verificado:** `barliveapp.es` debe estar verificado en Resend
- [ ] **Registros DNS configurados:**
  - [ ] SPF record
  - [ ] DKIM record
  - [ ] DMARC record (opcional pero recomendado)
- [ ] **API Key válida:** Debe empezar con `re_`
- [ ] **Permisos correctos:** La API key debe tener permisos de "Sending access"
- [ ] **Email FROM correcto:** Debe usar `noreply@barliveapp.es` (dominio verificado)

### Verificar Registros DNS

Puedes verificar tus registros DNS con estas herramientas:

1. **SPF Record:**
   ```bash
   nslookup -type=TXT barliveapp.es
   ```
   Debe contener: `v=spf1 include:_spf.resend.com ~all`

2. **DKIM Record:**
   ```bash
   nslookup -type=TXT resend._domainkey.barliveapp.es
   ```
   Debe devolver una clave pública

3. **Verificación online:**
   - https://mxtoolbox.com/SuperTool.aspx
   - Ingresa `barliveapp.es` y verifica SPF, DKIM, DMARC

---

## 🚨 Solución de Problemas Comunes

### Error 401: "La clave API no es válida"

**Causas posibles:**
- La clave API está mal copiada (espacios extra, caracteres faltantes)
- La clave API fue revocada o expiró
- La clave API no tiene los permisos correctos

**Solución:**
1. Genera una nueva clave API en Resend
2. Asegúrate de copiarla completamente (sin espacios)
3. Actualiza la variable de entorno en Supabase
4. Espera 1-2 minutos para que se apliquen los cambios

### Error 403: "Domain not verified"

**Causa:** El dominio `barliveapp.es` no está verificado en Resend

**Solución:**
1. Ve a https://resend.com/domains
2. Verifica que `barliveapp.es` esté en la lista
3. Si no está, agrégalo y configura los registros DNS
4. Espera a que la verificación se complete (puede tardar hasta 48 horas)

### Error 422: "Invalid from address"

**Causa:** El email FROM no coincide con el dominio verificado

**Solución:**
- Asegúrate de que el email FROM sea: `Barlive <noreply@barliveapp.es>`
- NO uses: `noreply@gmail.com`, `noreply@resend.dev`, etc.

### Los correos no llegan

**Posibles causas:**
1. **Filtros de spam:** Revisa la carpeta de spam
2. **Dominio no verificado:** Verifica el dominio en Resend
3. **Registros DNS incorrectos:** Verifica SPF, DKIM, DMARC
4. **Límites de envío:** Verifica que no hayas alcanzado el límite de tu plan

**Solución:**
1. Verifica los logs de Supabase para confirmar que el email se envió (status 200)
2. Verifica los logs de Resend: https://resend.com/emails
3. Revisa la carpeta de spam del destinatario
4. Verifica los registros DNS con las herramientas mencionadas arriba

---

## 📊 Monitoreo y Logs

### Ver Logs de la Edge Function

1. **Dashboard de Supabase:**
   - https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/logs/edge-functions
   - Selecciona `request-password-token`
   - Filtra por fecha/hora

2. **Logs importantes a buscar:**
   - `✅ Email sent successfully` - Email enviado correctamente
   - `❌ Error al enviar el correo electrónico` - Error al enviar
   - `📬 Estado de respuesta de API de reenvío: 200` - Respuesta exitosa de Resend
   - `📬 Estado de respuesta de API de reenvío: 401` - Clave API inválida

### Ver Logs de Resend

1. **Dashboard de Resend:**
   - https://resend.com/emails
   - Aquí puedes ver todos los emails enviados, su estado, y cualquier error

2. **Estados posibles:**
   - **Sent:** Email enviado correctamente
   - **Delivered:** Email entregado al destinatario
   - **Bounced:** Email rebotado (dirección inválida)
   - **Complained:** Marcado como spam por el destinatario

---

## 🎯 Próximos Pasos

Una vez que hayas actualizado la clave API:

1. ✅ **Prueba el flujo completo:**
   - Solicita un código de recuperación
   - Verifica que llegue el email
   - Ingresa el código en la app
   - Cambia la contraseña

2. ✅ **Documenta la nueva clave:**
   - Guarda la clave API en un gestor de contraseñas seguro
   - Documenta dónde se usa (Supabase Edge Functions)
   - Establece un recordatorio para renovarla periódicamente

3. ✅ **Configura alertas:**
   - Configura alertas en Resend para errores de envío
   - Monitorea los logs de Supabase regularmente

---

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. **Verifica los logs detallados** en Supabase y Resend
2. **Contacta al soporte de Resend:** https://resend.com/support
3. **Revisa la documentación de Resend:** https://resend.com/docs

---

## 📝 Notas Adicionales

### Seguridad de la Clave API

- ⚠️ **NUNCA** compartas tu clave API públicamente
- ⚠️ **NUNCA** la incluyas en el código fuente
- ✅ **SIEMPRE** usa variables de entorno
- ✅ **ROTA** las claves periódicamente (cada 3-6 meses)

### Límites de Envío

Verifica los límites de tu plan de Resend:
- **Plan Free:** 100 emails/día
- **Plan Pro:** 50,000 emails/mes
- **Plan Enterprise:** Ilimitado

Si necesitas más capacidad, considera actualizar tu plan.

---

## ✨ Resumen

**Problema:** Clave API de Resend inválida (401)

**Solución:**
1. Obtén una nueva clave API de Resend
2. Actualiza `RESEND_API_KEY` en Supabase
3. La Edge Function ya está redespliegada
4. Prueba el flujo de recuperación de contraseña

**Resultado esperado:**
- ✅ Status 200 en los logs
- ✅ Email recibido en menos de 1 minuto
- ✅ Usuario puede restablecer su contraseña

---

**Última actualización:** 10 de diciembre de 2025
**Edge Function version:** 9
**Estado:** ✅ Redespliegue completado
