
# ✅ Checklist: Configuración Supabase para Password Reset

## 🎯 Objetivo
Asegurar que el flujo de restablecimiento de contraseña funcione correctamente.

## 📋 Checklist de Configuración

### 1. URL Configuration

Ve a: **Authentication → URL Configuration**

- [ ] **Site URL** configurado como: `https://barliveapp.es`
- [ ] **Redirect URLs** incluye:
  - [ ] `https://barliveapp.es/auth/reset-password-web`
  - [ ] `https://barliveapp.es/auth/restablecer-password`
  - [ ] `https://barliveapp.es/**` (wildcard para todas las rutas)

### 2. Email Templates

Ve a: **Authentication → Email Templates → Reset Password**

- [ ] La plantilla usa `{{ .ConfirmationURL }}` para el enlace
- [ ] El botón principal tiene el enlace a `{{ .ConfirmationURL }}`
- [ ] Hay un enlace alternativo (texto) con `{{ .ConfirmationURL }}`
- [ ] El diseño es responsive y se ve bien en móvil

### 3. SMTP Settings

Ve a: **Project Settings → Auth → SMTP Settings**

- [ ] **Enable Custom SMTP** está activado
- [ ] **Sender email**: `team@barliveapp.es`
- [ ] **Sender name**: `Barlive`
- [ ] **Host**: `smtp.resend.com` (o tu proveedor SMTP)
- [ ] **Port**: `587` o `465`
- [ ] **Username**: Tu API key de Resend
- [ ] **Password**: Tu API key de Resend

### 4. Auth Settings

Ve a: **Project Settings → Auth → General**

- [ ] **JWT expiry limit**: 3600 (1 hora) o más
- [ ] **Disable email confirmations**: Desactivado (debe estar en OFF)
- [ ] **Enable email confirmations**: Activado (debe estar en ON)

### 5. Resend Configuration

Ve a: https://resend.com/domains

- [ ] Dominio `barliveapp.es` está agregado
- [ ] Todos los registros DNS están verificados (✅):
  - [ ] **DKIM** (TXT): `resend._domainkey`
  - [ ] **SPF** (TXT): `send`
  - [ ] **MX**: `send`

### 6. Verificación de Funcionamiento

- [ ] Puedo acceder a: `https://barliveapp.es/auth/reset-password-web` (no da 404)
- [ ] Puedo acceder a: `https://barliveapp.es/auth/restablecer-password` (no da 404)
- [ ] Al solicitar recuperación, recibo el correo en menos de 1 minuto
- [ ] El correo no va a spam
- [ ] Al hacer clic en el botón del correo, me redirige correctamente
- [ ] Puedo ingresar mi nueva contraseña sin errores
- [ ] Después de cambiar la contraseña, puedo iniciar sesión

## 🚨 Problemas Comunes

### ❌ "Domain is not verified" en Resend
**Solución**: 
1. Ve a tu proveedor de DNS (IONOS, Cloudflare, etc.)
2. Agrega los registros DNS exactamente como aparecen en Resend
3. Espera 30 minutos para la propagación
4. Verifica en Resend

### ❌ "Redirect URL not allowed" en Supabase
**Solución**:
1. Ve a Authentication → URL Configuration
2. Agrega la URL exacta que aparece en el error
3. Guarda los cambios
4. Solicita un nuevo correo de recuperación

### ❌ "404 Not Found" al hacer clic en el enlace
**Solución**:
1. Verifica que el archivo `_redirects` esté desplegado
2. Verifica la configuración del servidor web (Apache, Nginx, etc.)
3. Revisa los logs del servidor para ver qué está pasando

### ❌ "otp_expired" o "access_denied"
**Solución**:
1. El enlace ya expiró (más de 1 hora)
2. Solicita un nuevo correo de recuperación
3. Usa el enlace inmediatamente

### ❌ El correo no llega
**Solución**:
1. Revisa la carpeta de spam
2. Verifica que los registros DNS estén correctos en Resend
3. Verifica que la configuración de SMTP en Supabase esté correcta
4. Envía un correo de prueba desde Resend

## 📊 Logs para Diagnóstico

### En el navegador (F12 → Console):
Busca logs que empiecen con:
- `[RecuperarPasswordV6]` - Proceso de solicitud de recuperación
- `[ResetPasswordWeb]` - Proceso de cambio de contraseña
- `[RestablecerPassword]` - Proceso de cambio de contraseña (app nativa)

### En Supabase (Dashboard → Logs):
- **Auth logs**: Para ver intentos de autenticación
- **API logs**: Para ver llamadas a la API
- **Edge Function logs**: Para ver ejecución de funciones

## 🎯 Resultado Esperado

Después de completar este checklist:

1. ✅ El usuario solicita recuperar su contraseña
2. ✅ Recibe un correo en menos de 1 minuto
3. ✅ El correo tiene un diseño profesional
4. ✅ Al hacer clic en el botón, es redirigido correctamente
5. ✅ La página carga sin errores
6. ✅ Puede ingresar su nueva contraseña
7. ✅ La contraseña se actualiza exitosamente
8. ✅ Puede iniciar sesión con la nueva contraseña

## 📞 Soporte

Si después de completar este checklist sigues teniendo problemas:

**Email**: soporte@barliveapp.es

**Información a incluir**:
- Logs del navegador (F12 → Console)
- Logs de Supabase (Dashboard → Logs)
- Captura de pantalla del error
- Email usado para la prueba

---

**Última actualización**: 2 de febrero de 2025
