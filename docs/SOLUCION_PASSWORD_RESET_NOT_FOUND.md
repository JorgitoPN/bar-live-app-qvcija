
# 🔧 Solución: Error "Not Found" en Restablecimiento de Contraseña

## 🔍 Problema Identificado

Cuando el usuario hace clic en el enlace del correo de restablecimiento de contraseña, es redirigido a:
```
https://barliveapp.es/auth/restablecer-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

Y aparece un error "Not Found".

## 🎯 Causas del Problema

1. **URL de redirección incorrecta**: El enlace del correo está apuntando a `/auth/restablecer-password` en lugar de `/auth/reset-password-web`
2. **Token expirado**: El error `otp_expired` indica que el enlace ya expiró (más de 1 hora)
3. **Redirect URLs no configuradas**: Supabase no tiene configurada la URL correcta en las Redirect URLs permitidas

## ✅ Solución Completa

### Paso 1: Configurar Redirect URLs en Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **BarLive** (ID: `embntaqwlwmgazvrglaf`)
3. Ve a **Authentication → URL Configuration**
4. En la sección **Redirect URLs**, agrega las siguientes URLs:
   ```
   https://barliveapp.es/auth/reset-password-web
   https://barliveapp.es/auth/restablecer-password
   ```
5. Haz clic en **Save**

### Paso 2: Verificar el Site URL

1. En la misma página de **URL Configuration**
2. Verifica que el **Site URL** sea:
   ```
   https://barliveapp.es
   ```
3. Si no lo es, cámbialo y guarda

### Paso 3: Verificar el archivo _redirects

El archivo `_redirects` ya está correctamente configurado con:
```
/auth/reset-password-web /auth/reset-password-web 200
/auth/restablecer-password /auth/restablecer-password 200
/* /index.html 200
```

**IMPORTANTE**: Este archivo debe estar en la raíz de tu proyecto web desplegado.

### Paso 4: Desplegar el archivo _redirects

Si estás usando **Netlify**:
1. El archivo `_redirects` debe estar en la carpeta `public/` o en la raíz del build
2. Asegúrate de que se copie al directorio de salida durante el build

Si estás usando **Vercel**:
1. Crea un archivo `vercel.json` en la raíz con:
```json
{
  "rewrites": [
    {
      "source": "/auth/reset-password-web",
      "destination": "/auth/reset-password-web"
    },
    {
      "source": "/auth/restablecer-password",
      "destination": "/auth/restablecer-password"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Si estás usando **Apache**:
1. Crea un archivo `.htaccess` en la raíz con:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

Si estás usando **Nginx**:
1. Configura tu `nginx.conf` con:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Paso 5: Verificar que la app esté correctamente desplegada

1. Abre tu navegador y ve a: `https://barliveapp.es/auth/reset-password-web`
2. Deberías ver la página de restablecimiento de contraseña (aunque sin token mostrará "Enlace inválido")
3. Si ves un error 404, el problema está en la configuración del servidor web

### Paso 6: Probar el flujo completo

1. Ve a tu app y haz clic en **"¿Olvidaste tu contraseña?"**
2. Ingresa tu email
3. Haz clic en **"Enviar enlace de recuperación"**
4. Revisa tu correo (y la carpeta de spam)
5. Haz clic en el botón **"🔒 Restablecer mi contraseña"** del correo
6. Deberías ser redirigido a `https://barliveapp.es/auth/reset-password-web` con el token en el hash
7. Ingresa tu nueva contraseña
8. ¡Listo!

## 🚨 Solución de Problemas Específicos

### Error: "Not Found" al hacer clic en el enlace

**Causa**: El servidor web no está redirigiendo correctamente las rutas de SPA.

**Solución**:
1. Verifica que el archivo `_redirects` (o equivalente) esté desplegado
2. Verifica que tu servidor web esté configurado para SPA routing
3. Revisa los logs del servidor para ver qué está pasando

### Error: "otp_expired" o "access_denied"

**Causa**: El enlace ya expiró (más de 1 hora) o ya fue usado.

**Solución**:
1. Solicita un nuevo correo de recuperación
2. Usa el enlace inmediatamente (no esperes más de 1 hora)
3. Cada enlace solo se puede usar UNA vez

### Error: "Enlace inválido o expirado" en la app

**Causa**: El token no se está extrayendo correctamente del hash de la URL.

**Solución**:
1. Abre las herramientas de desarrollador del navegador (F12)
2. Ve a la pestaña **Console**
3. Busca logs que empiecen con `[ResetPasswordWeb]` o `[RestablecerPassword]`
4. Verifica que el token se esté extrayendo correctamente

### El correo no llega

**Causa**: Problema con la configuración de SMTP o DNS.

**Solución**:
1. Ve a [Resend Dashboard](https://resend.com/domains)
2. Verifica que todos los registros DNS estén ✅ verificados
3. Ve a Supabase → Project Settings → Auth → SMTP Settings
4. Verifica que la configuración de SMTP esté correcta
5. Envía un correo de prueba desde Resend para verificar

## 📋 Checklist de Verificación

- [ ] Redirect URLs configuradas en Supabase (`/auth/reset-password-web` y `/auth/restablecer-password`)
- [ ] Site URL configurado en Supabase (`https://barliveapp.es`)
- [ ] Archivo `_redirects` (o equivalente) desplegado en el servidor web
- [ ] Servidor web configurado para SPA routing
- [ ] Registros DNS verificados en Resend
- [ ] Configuración de SMTP correcta en Supabase
- [ ] La URL `https://barliveapp.es/auth/reset-password-web` es accesible (no da 404)
- [ ] La URL `https://barliveapp.es/auth/restablecer-password` es accesible (no da 404)

## 🎯 Resultado Esperado

Después de aplicar todas estas soluciones:

1. El usuario solicita recuperar su contraseña
2. Recibe un correo con un enlace
3. Al hacer clic en el enlace, es redirigido a `https://barliveapp.es/auth/reset-password-web`
4. La página carga correctamente y muestra el formulario de nueva contraseña
5. El usuario ingresa su nueva contraseña
6. La contraseña se actualiza exitosamente
7. El usuario puede iniciar sesión con la nueva contraseña

## 📞 Soporte

Si después de seguir todos estos pasos sigues teniendo problemas:

1. Revisa los logs del navegador (F12 → Console)
2. Revisa los logs del servidor web
3. Revisa los logs de Supabase (Dashboard → Logs)
4. Contacta con soporte: soporte@barliveapp.es

---

**Última actualización**: 2 de febrero de 2025
