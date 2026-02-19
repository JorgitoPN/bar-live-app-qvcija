
# 🔧 Solución: Emails de Token de Verificación No Llegan

## 🎯 Problema

Después de hacer clic en "Crear Cuenta", los usuarios no reciben el email con el token de verificación de 6 dígitos.

---

## 🔍 Diagnóstico

### Estado Actual

✅ **Funcionando:**
- Edge Function `request-verification-token` desplegada
- Tabla `verification_tokens` creada
- Flujo de registro redirige correctamente a `/auth/verificar-cuenta-token`
- Pantallas de login y verificación existen

❌ **No Funcionando:**
- Emails no se están enviando
- Usuarios no reciben el token de 6 dígitos

### Causa Raíz

El problema está en la configuración de **Resend API** en Supabase. La Edge Function necesita:

1. Variable de entorno `RESEND_API_KEY` configurada
2. Dominio `barliveapp.es` verificado en Resend
3. Registros DNS correctos (SPF, DKIM, DMARC)

---

## ✅ Solución Paso a Paso

### Paso 1: Obtener API Key de Resend

1. **Ir a Resend Dashboard:**
   - URL: https://resend.com/api-keys
   - Iniciar sesión con tu cuenta

2. **Crear nueva API Key:**
   - Hacer clic en "Create API Key"
   - Nombre: `Barlive Production`
   - Permisos: `Sending access`
   - Hacer clic en "Create"

3. **Copiar la API Key:**
   - Formato: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ **IMPORTANTE:** Guardar en lugar seguro, solo se muestra una vez

---

### Paso 2: Configurar API Key en Supabase

1. **Ir a Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
   - Iniciar sesión

2. **Navegar a Edge Functions Secrets:**
   - Menú lateral: **Settings**
   - Submenu: **Edge Functions**
   - Tab: **Secrets**

3. **Añadir RESEND_API_KEY:**
   - Hacer clic en "Add new secret"
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx` (tu API key de Resend)
   - Hacer clic en "Save"

4. **Verificar configuración:**
   - La variable debe aparecer en la lista de secrets
   - Estado: ✅ Configured

---

### Paso 3: Verificar Dominio en Resend

1. **Ir a Resend Domains:**
   - URL: https://resend.com/domains
   - Verificar que `barliveapp.es` está en la lista

2. **Si el dominio NO está verificado:**
   
   **a) Añadir dominio:**
   - Hacer clic en "Add Domain"
   - Introducir: `barliveapp.es`
   - Hacer clic en "Add"

   **b) Configurar registros DNS:**
   
   Resend te proporcionará 3 registros DNS que debes añadir en tu proveedor de dominio (IONOS, GoDaddy, etc.):

   **SPF Record:**
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   TTL: 3600
   ```

   **DKIM Record:**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [valor proporcionado por Resend]
   TTL: 3600
   ```

   **DMARC Record:**
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:dmarc@barliveapp.es
   TTL: 3600
   ```

   **c) Esperar propagación DNS:**
   - Puede tardar de 15 minutos a 48 horas
   - Verificar con: https://mxtoolbox.com/SuperTool.aspx

   **d) Verificar en Resend:**
   - Hacer clic en "Verify" en el dominio
   - Estado debe cambiar a: ✅ Verified

---

### Paso 4: Probar Envío de Email

1. **Ir a Supabase Edge Functions:**
   - Dashboard > Edge Functions
   - Seleccionar `request-verification-token`

2. **Ejecutar función de prueba:**
   - Hacer clic en "Invoke"
   - Payload:
   ```json
   {
     "email": "tu-email@ejemplo.com"
   }
   ```
   - Hacer clic en "Run"

3. **Verificar resultado:**
   - Respuesta esperada:
   ```json
   {
     "success": true
   }
   ```
   - Revisar bandeja de entrada del email

4. **Revisar logs:**
   - Tab "Logs" en la Edge Function
   - Buscar:
   ```
   [RequestVerificationToken] ✅ ¡Correo electrónico enviado con éxito!
   ```

---

### Paso 5: Verificar en la App

1. **Abrir la app BarLive**

2. **Ir a registro:**
   - Navegar a `/auth/registro-v6`
   - O hacer clic en "Regístrate gratis"

3. **Completar formulario:**
   - Nombre: Tu nombre
   - Email: tu-email@ejemplo.com
   - Contraseña: Password123
   - Confirmar contraseña: Password123
   - Aceptar términos

4. **Hacer clic en "Crear cuenta"**

5. **Verificar redirección:**
   - Debe redirigir a `/auth/verificar-cuenta-token`
   - Debe mostrar mensaje: "¡Correo enviado!"
   - Debe mostrar tu email

6. **Revisar bandeja de entrada:**
   - Buscar email de "BarLive <noreply@barliveapp.es>"
   - Asunto: "🎉 Verifica tu cuenta de Barlive"
   - Debe contener token de 6 dígitos

7. **Introducir token:**
   - Copiar token del email
   - Introducir en los 6 campos
   - Hacer clic en "Verificar cuenta"

8. **Verificar éxito:**
   - Mensaje: "✅ ¡Cuenta verificada!"
   - Redirección a `/auth/login-v6`

---

## 🐛 Troubleshooting

### Error: "Servicio de correo electrónico no configurado"

**Causa:** `RESEND_API_KEY` no está configurado en Supabase

**Solución:**
1. Ir a Supabase Dashboard > Settings > Edge Functions > Secrets
2. Añadir `RESEND_API_KEY` con tu API key de Resend
3. Reintentar envío de email

---

### Error: "Error de verificación del dominio"

**Causa:** Dominio no verificado en Resend

**Solución:**
1. Ir a https://resend.com/domains
2. Verificar que `barliveapp.es` tiene estado "Verified"
3. Si no, añadir registros DNS proporcionados por Resend
4. Esperar propagación DNS (15 min - 48 horas)
5. Hacer clic en "Verify" en Resend

---

### Error: "401 Unauthorized"

**Causa:** API key inválida o expirada

**Solución:**
1. Ir a https://resend.com/api-keys
2. Verificar que la API key existe y está activa
3. Si está revocada, crear nueva API key
4. Actualizar `RESEND_API_KEY` en Supabase
5. Reintentar envío

---

### Error: "403 Forbidden"

**Causa:** Dominio no verificado o sin permisos

**Solución:**
1. Verificar que el dominio está verificado en Resend
2. Verificar que el remitente usa el dominio verificado:
   ```
   from: 'BarLive <noreply@barliveapp.es>'
   ```
3. No usar dominios no verificados (gmail.com, etc.)

---

### Email no llega a bandeja de entrada

**Posibles causas:**
1. Email en carpeta de spam
2. Filtros de email del destinatario
3. Dominio no verificado correctamente

**Solución:**
1. Revisar carpeta de spam/correo no deseado
2. Añadir `noreply@barliveapp.es` a contactos
3. Verificar registros SPF, DKIM, DMARC
4. Probar con otro proveedor de email (Gmail, Outlook, etc.)

---

## 📊 Verificación de Configuración

### Checklist Completo

- [ ] **Resend API Key**
  - [ ] Cuenta creada en Resend
  - [ ] API Key generada
  - [ ] API Key configurada en Supabase
  - [ ] API Key empieza con `re_`

- [ ] **Dominio Verificado**
  - [ ] Dominio añadido en Resend
  - [ ] Registro SPF configurado
  - [ ] Registro DKIM configurado
  - [ ] Registro DMARC configurado
  - [ ] Estado: ✅ Verified

- [ ] **Edge Functions**
  - [ ] `request-verification-token` desplegada
  - [ ] `validate-verification-token` desplegada
  - [ ] `verify-account-with-token` desplegada
  - [ ] Todas en estado ACTIVE

- [ ] **Base de Datos**
  - [ ] Tabla `verification_tokens` existe
  - [ ] RLS policies configuradas
  - [ ] Tabla `username_history` existe

- [ ] **Flujo de App**
  - [ ] Registro redirige a verificar-cuenta-token
  - [ ] Pantalla de token muestra instrucciones
  - [ ] Login detecta email no verificado
  - [ ] Opción de reenviar código funciona

---

## 🔬 Comandos de Diagnóstico

### SQL Queries

```sql
-- Ver tokens generados recientemente
SELECT 
  email, 
  token, 
  expires_at, 
  used, 
  created_at,
  CASE 
    WHEN expires_at < now() THEN 'Expirado'
    WHEN used = true THEN 'Usado'
    ELSE 'Válido'
  END as estado
FROM verification_tokens 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver usuarios sin verificar
SELECT 
  id, 
  email, 
  nombre, 
  username,
  email_verified, 
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at))/3600 as horas_desde_registro
FROM usuarios 
WHERE email_verified = false 
ORDER BY created_at DESC;

-- Ver historial de cambios de username
SELECT 
  uh.entity_type,
  uh.old_username,
  uh.new_username,
  u.nombre as changed_by_name,
  uh.change_reason,
  uh.created_at
FROM username_history uh
LEFT JOIN usuarios u ON u.id = uh.changed_by
ORDER BY uh.created_at DESC
LIMIT 20;
```

### Edge Function Logs

```javascript
// Logs exitosos:
[RequestVerificationToken] 🚀 Iniciando solicitud de token de verificación
[RequestVerificationToken] ✅ Token almacenado en la base de datos
[RequestVerificationToken] ✅ ¡Correo electrónico enviado con éxito!

// Logs de error:
[RequestVerificationToken] ❌ RESEND_API_KEY no está configurado!
[RequestVerificationToken] ❌ Error de API de Resend
[RequestVerificationToken] ❌ Estado: 401/403/422
```

---

## 🚀 Implementación en Producción

### Checklist Pre-Producción

1. **Configuración de Resend:**
   - [ ] API Key de producción configurada
   - [ ] Dominio verificado
   - [ ] Registros DNS propagados
   - [ ] Email de prueba enviado exitosamente

2. **Configuración de Supabase:**
   - [ ] `RESEND_API_KEY` en Edge Functions Secrets
   - [ ] Edge Functions desplegadas
   - [ ] Tablas creadas con RLS

3. **Testing:**
   - [ ] Registro completo funciona
   - [ ] Email llega a bandeja de entrada
   - [ ] Token valida correctamente
   - [ ] Login después de verificación funciona

4. **Monitoreo:**
   - [ ] Logs de Edge Functions configurados
   - [ ] Alertas de errores configuradas
   - [ ] Dashboard de Resend monitoreado

---

## 📧 Plantilla de Email Actual

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Verifica tu cuenta - Barlive</title>
</head>
<body>
  <!-- Header con gradiente -->
  <h1>🎉 Barlive</h1>
  <p>¡Bienvenido a la comunidad!</p>

  <!-- Saludo -->
  <h2>¡Hola! 👋</h2>
  <p>Gracias por registrarte en Barlive.</p>

  <!-- Token -->
  <p>Para verificar tu cuenta, introduce este código en la app:</p>
  <div style="font-size: 56px; font-weight: bold; letter-spacing: 12px;">
    123456
  </div>

  <!-- Instrucciones -->
  <ol>
    <li>Abre la app BarLive</li>
    <li>Introduce el código de 6 dígitos</li>
    <li>¡Listo! Tu cuenta estará verificada</li>
  </ol>

  <!-- Nota de seguridad -->
  <p>Este código expirará en 1 hora</p>

  <!-- Soporte -->
  <a href="mailto:soporte@barliveapp.es">Contactar Soporte</a>
</body>
</html>
```

---

## 🔐 Seguridad

### Medidas Implementadas

1. **Tokens de 6 dígitos:**
   - Generados aleatoriamente
   - Expiración de 1 hora
   - Uso único

2. **Auditoría:**
   - IP address registrada
   - User agent registrado
   - Timestamp de creación y uso

3. **Rate Limiting:**
   - Implementar límite de solicitudes por email
   - Prevenir spam de tokens

---

## 📞 Contacto y Soporte

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

4. **Revisar documentación:**
   - Resend: https://resend.com/docs
   - Supabase: https://supabase.com/docs/guides/functions

---

## 🎯 Resultado Esperado

Después de aplicar esta solución:

1. ✅ Usuario se registra en la app
2. ✅ Sistema genera username automático
3. ✅ Sistema envía email con token de 6 dígitos
4. ✅ Usuario recibe email en su bandeja de entrada
5. ✅ Usuario introduce token en la app
6. ✅ Cuenta queda verificada
7. ✅ Usuario puede iniciar sesión

---

## 📝 Notas Adicionales

### Alternativa: Usar Supabase Native Email

Si Resend no funciona, puedes usar el sistema nativo de emails de Supabase:

```typescript
// En la Edge Function request-verification-token
const { error } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: normalizedEmail,
  options: {
    redirectTo: 'https://barliveapp.es/auth/verificar-cuenta-token',
  },
});
```

**Limitaciones:**
- Emails menos personalizables
- Puede tener límites de envío
- Menos control sobre diseño

**Ventajas:**
- No requiere configuración externa
- Incluido en plan de Supabase
- Más simple de configurar

---

## ✅ Checklist Final

Antes de considerar el problema resuelto:

- [ ] RESEND_API_KEY configurado en Supabase
- [ ] Dominio verificado en Resend (estado: ✅ Verified)
- [ ] Registros DNS propagados (verificar con mxtoolbox.com)
- [ ] Email de prueba enviado exitosamente
- [ ] Email recibido en bandeja de entrada (no spam)
- [ ] Token valida correctamente en la app
- [ ] Cuenta queda verificada después de introducir token
- [ ] Login funciona después de verificación
- [ ] Logs de Edge Function no muestran errores

---

## 🎉 Conclusión

Una vez completados todos los pasos, el sistema de verificación por token estará completamente funcional:

- Los usuarios recibirán emails con tokens de 6 dígitos
- Podrán verificar sus cuentas desde la app
- El flujo de registro será completo y sin interrupciones

**Tiempo estimado de implementación:** 30-60 minutos (+ tiempo de propagación DNS si es necesario)

**Prioridad:** 🔴 CRÍTICA - Sin esto, los usuarios no pueden completar el registro
