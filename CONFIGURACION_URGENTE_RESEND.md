
# 🚨 CONFIGURACIÓN URGENTE: Resend API para Emails de Verificación

## ⏱️ Tiempo Estimado: 30 minutos

---

## 🎯 Objetivo

Configurar Resend API para que los usuarios reciban emails con tokens de verificación después de registrarse.

---

## 📝 Paso 1: Crear Cuenta en Resend (5 min)

1. **Ir a Resend:**
   ```
   https://resend.com/signup
   ```

2. **Crear cuenta:**
   - Email: tu-email@ejemplo.com
   - Contraseña: (crear una segura)
   - Verificar email

3. **Completar perfil:**
   - Nombre de la empresa: Barlive
   - Tipo: Startup/Small Business

---

## 🔑 Paso 2: Obtener API Key (2 min)

1. **Ir a API Keys:**
   ```
   https://resend.com/api-keys
   ```

2. **Crear nueva API Key:**
   - Click en "Create API Key"
   - Name: `Barlive Production`
   - Permission: `Sending access`
   - Click en "Create"

3. **Copiar API Key:**
   ```
   re_xxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   ⚠️ **IMPORTANTE:** Guardar en lugar seguro, solo se muestra una vez

---

## 🌐 Paso 3: Añadir Dominio (3 min)

1. **Ir a Domains:**
   ```
   https://resend.com/domains
   ```

2. **Añadir dominio:**
   - Click en "Add Domain"
   - Domain: `barliveapp.es`
   - Region: Europe (EU)
   - Click en "Add"

3. **Copiar registros DNS:**
   Resend te mostrará 3 registros que debes añadir:

   **SPF:**
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

   **DKIM:**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [valor único proporcionado por Resend]
   ```

   **DMARC:**
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@barliveapp.es
   ```

---

## 🔧 Paso 4: Configurar DNS en IONOS (10 min)

1. **Ir a IONOS:**
   ```
   https://www.ionos.es/
   ```

2. **Iniciar sesión:**
   - Email: tu-email-ionos@ejemplo.com
   - Contraseña: (tu contraseña de IONOS)

3. **Ir a Dominios:**
   - Menú > Dominios y SSL
   - Seleccionar `barliveapp.es`
   - Click en "DNS"

4. **Añadir registros DNS:**

   **Registro SPF:**
   - Click en "Añadir registro"
   - Tipo: TXT
   - Nombre: @ (o dejar vacío)
   - Valor: `v=spf1 include:_spf.resend.com ~all`
   - TTL: 3600
   - Guardar

   **Registro DKIM:**
   - Click en "Añadir registro"
   - Tipo: TXT
   - Nombre: `resend._domainkey`
   - Valor: [copiar de Resend]
   - TTL: 3600
   - Guardar

   **Registro DMARC:**
   - Click en "Añadir registro"
   - Tipo: TXT
   - Nombre: `_dmarc`
   - Valor: `v=DMARC1; p=none; rua=mailto:dmarc@barliveapp.es`
   - TTL: 3600
   - Guardar

5. **Esperar propagación:**
   - Tiempo: 15 minutos - 48 horas
   - Normalmente: 15-30 minutos

---

## ☁️ Paso 5: Configurar en Supabase (2 min)

1. **Ir a Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
   ```

2. **Navegar a Edge Functions:**
   - Menú lateral: Settings
   - Submenu: Edge Functions
   - Tab: Secrets

3. **Añadir RESEND_API_KEY:**
   - Click en "Add new secret"
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx` (tu API key de Resend)
   - Click en "Save"

4. **Verificar:**
   - La variable debe aparecer en la lista
   - Estado: ✅ Configured

---

## ✅ Paso 6: Verificar Dominio en Resend (5 min)

1. **Esperar propagación DNS:**
   - Mínimo 15 minutos después de configurar DNS
   - Verificar con: https://mxtoolbox.com/SuperTool.aspx
   - Buscar: `barliveapp.es`
   - Verificar que aparecen los registros TXT

2. **Verificar en Resend:**
   - Ir a: https://resend.com/domains
   - Seleccionar `barliveapp.es`
   - Click en "Verify DNS Records"
   - Esperar verificación automática

3. **Estado esperado:**
   ```
   ✅ SPF: Verified
   ✅ DKIM: Verified
   ✅ DMARC: Verified
   ✅ Domain Status: Verified
   ```

---

## 🧪 Paso 7: Probar Envío de Email (3 min)

### Opción A: Desde Supabase

1. **Ir a Edge Functions:**
   ```
   Supabase Dashboard > Edge Functions > request-verification-token
   ```

2. **Ejecutar función:**
   - Click en "Invoke"
   - Payload:
   ```json
   {
     "email": "tu-email@ejemplo.com"
   }
   ```
   - Click en "Run"

3. **Verificar respuesta:**
   ```json
   {
     "success": true
   }
   ```

4. **Revisar email:**
   - Abrir bandeja de entrada
   - Buscar email de "BarLive <noreply@barliveapp.es>"
   - Verificar que contiene token de 6 dígitos

### Opción B: Desde la App

1. **Abrir app BarLive**

2. **Ir a registro:**
   - Click en "Regístrate gratis"

3. **Completar formulario:**
   - Nombre: Test Usuario
   - Email: tu-email@ejemplo.com
   - Contraseña: Test1234
   - Confirmar contraseña: Test1234
   - Aceptar términos

4. **Crear cuenta:**
   - Click en "Crear cuenta"
   - Verificar redirección a pantalla de token
   - Verificar que muestra tu email

5. **Revisar email:**
   - Abrir bandeja de entrada
   - Buscar email de BarLive
   - Copiar token de 6 dígitos

6. **Verificar cuenta:**
   - Introducir token en la app
   - Click en "Verificar cuenta"
   - Verificar mensaje de éxito
   - Verificar redirección a login

7. **Iniciar sesión:**
   - Introducir email y contraseña
   - Click en "Iniciar sesión"
   - Verificar login exitoso

---

## 🔍 Verificación de Logs

### Logs Exitosos

```javascript
[RequestVerificationToken] 🚀 Iniciando solicitud de token de verificación
[RequestVerificationToken] ✅ Establecer RESEND_API_KEY
[RequestVerificationToken] 📧 Correo electrónico: test@ejemplo.com
[RequestVerificationToken] 🔑 Token generado: 123456
[RequestVerificationToken] ✅ Token almacenado en la base de datos
[RequestVerificationToken] 📧 Enviando correo electrónico a través de Resend...
[RequestVerificationToken] ✅ ¡Correo electrónico enviado con éxito!
```

### Logs de Error

```javascript
// Error 1: API Key no configurada
[RequestVerificationToken] ❌ RESEND_API_KEY no está configurado!

// Error 2: API Key inválida
[RequestVerificationToken] ❌ ERROR 401: La clave API de Resend no es válida

// Error 3: Dominio no verificado
[RequestVerificationToken] ❌ ERROR 403: El dominio no está verificado
```

---

## 📊 Checklist de Verificación

### Configuración de Resend

- [ ] Cuenta creada en Resend
- [ ] API Key generada
- [ ] API Key empieza con `re_`
- [ ] Dominio `barliveapp.es` añadido
- [ ] Registros DNS configurados en IONOS
- [ ] Dominio verificado en Resend (✅ Verified)

### Configuración de Supabase

- [ ] `RESEND_API_KEY` añadido en Secrets
- [ ] Edge Function `request-verification-token` en estado ACTIVE
- [ ] Edge Function `validate-verification-token` en estado ACTIVE
- [ ] Edge Function `verify-account-with-token` en estado ACTIVE

### Pruebas

- [ ] Email de prueba enviado desde Supabase
- [ ] Email recibido en bandeja de entrada
- [ ] Token de 6 dígitos visible en email
- [ ] Registro completo desde la app funciona
- [ ] Email llega después de registro
- [ ] Token valida correctamente
- [ ] Login funciona después de verificación

---

## 🚨 Errores Comunes y Soluciones

### Error: "Servicio de correo electrónico no configurado"

**Solución:**
```bash
1. Ir a Supabase Dashboard
2. Settings > Edge Functions > Secrets
3. Añadir RESEND_API_KEY
4. Reintentar
```

### Error: "401 Unauthorized"

**Solución:**
```bash
1. Verificar que API Key es correcta
2. Verificar que empieza con "re_"
3. Regenerar API Key en Resend si es necesario
4. Actualizar en Supabase
```

### Error: "403 Forbidden"

**Solución:**
```bash
1. Ir a Resend > Domains
2. Verificar que barliveapp.es está verificado
3. Si no, configurar registros DNS
4. Esperar propagación (15 min - 48 horas)
5. Click en "Verify" en Resend
```

### Email en spam

**Solución:**
```bash
1. Verificar registros SPF, DKIM, DMARC
2. Añadir noreply@barliveapp.es a contactos
3. Marcar como "No es spam"
4. Esperar que el dominio gane reputación
```

---

## 📞 Soporte

### Si el problema persiste:

1. **Revisar logs de Edge Function:**
   ```
   Supabase Dashboard > Edge Functions > request-verification-token > Logs
   ```

2. **Verificar estado de Resend:**
   ```
   https://resend.com/status
   ```

3. **Contactar soporte de Resend:**
   ```
   https://resend.com/support
   ```

4. **Documentación:**
   - Resend: https://resend.com/docs
   - Supabase: https://supabase.com/docs/guides/functions

---

## 🎉 Resultado Final

Después de completar todos los pasos:

✅ Usuarios se registran en la app
✅ Reciben email con token de 6 dígitos
✅ Introducen token en la app
✅ Cuenta queda verificada
✅ Pueden iniciar sesión
✅ Sistema de usernames completo funciona

**Estado:** Listo para producción

**Bloqueador actual:** Configuración de Resend API

**Acción requerida:** Seguir los 7 pasos de esta guía

---

## 📋 Resumen de Comandos

### Verificar DNS
```bash
# Verificar registros SPF
nslookup -type=TXT barliveapp.es

# Verificar con MXToolbox
https://mxtoolbox.com/SuperTool.aspx?action=txt%3abarliveapp.es
```

### Verificar en Supabase
```sql
-- Ver tokens generados
SELECT * FROM verification_tokens ORDER BY created_at DESC LIMIT 10;

-- Ver usuarios sin verificar
SELECT email, nombre, email_verified, created_at 
FROM usuarios 
WHERE email_verified = false 
ORDER BY created_at DESC;
```

### Probar Edge Function
```bash
# Desde Supabase Dashboard > Edge Functions > request-verification-token
# Payload:
{
  "email": "test@ejemplo.com"
}

# Respuesta esperada:
{
  "success": true
}
```

---

## ✅ Checklist Final

Antes de considerar completado:

- [ ] API Key de Resend obtenida
- [ ] API Key configurada en Supabase
- [ ] Dominio añadido en Resend
- [ ] Registros DNS configurados en IONOS
- [ ] Dominio verificado en Resend (✅ Verified)
- [ ] Email de prueba enviado
- [ ] Email recibido en bandeja de entrada
- [ ] Token funciona en la app
- [ ] Registro completo funciona end-to-end

---

## 🎯 Siguiente Paso

Una vez completada la configuración de Resend, el sistema estará 100% funcional.

**Documentación adicional:**
- `SOLUCION_EMAILS_TOKEN_VERIFICACION.md` - Guía detallada
- `IMPLEMENTACION_MEJORAS_USERNAME.md` - Sistema de usernames
- `RESUMEN_FINAL_MEJORAS_USERNAME_Y_AUTH.md` - Resumen completo
