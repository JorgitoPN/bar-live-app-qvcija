
# 🔧 Instrucciones para Configurar el Email de Recuperación de Contraseña

## ✅ Paso 1: Acceder a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **BarLive** (ID: `embntaqwlwmgazvrglaf`)
3. En el menú lateral, haz clic en **Authentication**
4. Luego haz clic en **Email Templates**

## ✅ Paso 2: Configurar la Plantilla de Reset Password

1. En la lista de plantillas, busca **"Reset Password"** o **"Recuperar contraseña"**
2. Haz clic en ella para editarla
3. **BORRA TODO** el contenido actual de la plantilla
4. **COPIA Y PEGA** el contenido completo del archivo `PLANTILLA_EMAIL_RESET_PASSWORD_SUPABASE.html`
5. Haz clic en **Save** o **Guardar**

## ✅ Paso 3: Verificar la Configuración de Redirect URLs

1. En el menú lateral de Supabase, ve a **Authentication → URL Configuration**
2. Verifica que en **Redirect URLs** esté configurado:
   ```
   https://barliveapp.es/auth/restablecer-password
   ```
3. Si no está, agrégalo y haz clic en **Save**

## ✅ Paso 4: Verificar la Configuración de SMTP

1. En el menú lateral de Supabase, ve a **Project Settings → Auth**
2. Desplázate hasta la sección **SMTP Settings**
3. Verifica que esté configurado:
   - **Enable Custom SMTP**: ✅ Activado
   - **Sender email**: `team@barliveapp.es`
   - **Sender name**: `BarLive`
   - **Host**: El host de Resend (probablemente `smtp.resend.com`)
   - **Port**: `587` o `465`
   - **Username**: Tu API key de Resend
   - **Password**: Tu API key de Resend

## ✅ Paso 5: Verificar DNS en Resend

1. Ve a [https://resend.com/domains](https://resend.com/domains)
2. Selecciona tu dominio `barliveapp.es`
3. Verifica que todos los registros DNS estén con estado **✅ Verified**:
   - **DKIM** (TXT): `resend._domainkey`
   - **SPF** (TXT): `send`
   - **MX**: `send`

### Si algún registro NO está verificado:

1. Ve a tu proveedor de DNS (IONOS, Cloudflare, etc.)
2. Agrega los registros DNS exactamente como aparecen en Resend
3. Espera 10-30 minutos para la propagación
4. Vuelve a Resend y haz clic en **Verify** en cada registro

## ✅ Paso 6: Probar el Sistema

1. En tu app, ve a **Recuperar contraseña**
2. Ingresa un email de prueba (tuyo)
3. Haz clic en **Enviar correo de recuperación**
4. Revisa tu bandeja de entrada (y spam)
5. Haz clic en el botón **"✨ Restablecer mi contraseña"**
6. Deberías ser redirigido a `https://barliveapp.es/auth/restablecer-password`
7. Ingresa tu nueva contraseña
8. ¡Listo! Deberías poder iniciar sesión con la nueva contraseña

## 🚨 Solución de Problemas

### Problema: "Domain is not verified"

**Causa**: Los registros DNS no están configurados correctamente en tu proveedor de DNS.

**Solución**:
1. Ve a Resend y copia EXACTAMENTE los valores de los registros DNS
2. Ve a tu proveedor de DNS (IONOS, Cloudflare, etc.)
3. Agrega cada registro DNS exactamente como aparece en Resend
4. Espera 30 minutos para la propagación
5. Verifica en Resend que todos los registros estén ✅

### Problema: "El enlace me lleva a una página en blanco"

**Causa**: La URL de redirección no está configurada correctamente en Supabase.

**Solución**:
1. Ve a Supabase → Authentication → URL Configuration
2. Agrega `https://barliveapp.es/auth/restablecer-password` a las Redirect URLs
3. Guarda los cambios
4. Solicita un nuevo correo de recuperación

### Problema: "Enlace inválido o expirado"

**Causa**: El enlace ya fue usado o pasaron más de 1 hora.

**Solución**:
1. Solicita un nuevo correo de recuperación
2. Usa el enlace inmediatamente (no esperes más de 1 hora)
3. Solo puedes usar cada enlace UNA vez

### Problema: "No me llega el correo"

**Causa**: Puede estar en spam o hay un problema con la configuración de SMTP.

**Solución**:
1. Revisa tu carpeta de **Spam** o **Correo no deseado**
2. Agrega `team@barliveapp.es` a tus contactos
3. Verifica que los registros DNS estén correctos en Resend
4. Verifica que la configuración de SMTP en Supabase esté correcta

## 📞 Soporte

Si después de seguir todos estos pasos sigues teniendo problemas:

- **Email**: soporte@barliveapp.es
- **Diagnóstico**: Ve a la app → Admin → Diagnóstico de Emails

---

**Última actualización**: 2 de febrero de 2025
