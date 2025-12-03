
# 🚀 Guía Rápida: Solución Password Reset "Not Found"

## ⚡ Pasos Inmediatos (5 minutos)

### 1. Configurar Redirect URLs en Supabase

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/url-configuration
2. En **Redirect URLs**, agrega:
   ```
   https://barliveapp.es/auth/reset-password-web
   https://barliveapp.es/auth/restablecer-password
   ```
3. Haz clic en **Save**

### 2. Verificar Site URL

1. En la misma página, verifica que **Site URL** sea:
   ```
   https://barliveapp.es
   ```
2. Si no lo es, cámbialo y guarda

### 3. Verificar Despliegue del _redirects

El archivo `_redirects` ya está en tu proyecto. Asegúrate de que esté desplegado en tu servidor web.

**Para Netlify**: El archivo debe estar en la raíz del build
**Para Vercel**: Usa el archivo `vercel.json` (ver abajo)
**Para Apache**: Usa el archivo `.htaccess` (ver abajo)
**Para Nginx**: Configura `nginx.conf` (ver abajo)

## 📝 Archivos de Configuración por Servidor

### Netlify (ya configurado)
El archivo `_redirects` ya está en la raíz del proyecto. ✅

### Vercel
Crea `vercel.json` en la raíz:
```json
{
  "rewrites": [
    { "source": "/auth/reset-password-web", "destination": "/auth/reset-password-web" },
    { "source": "/auth/restablecer-password", "destination": "/auth/restablecer-password" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Apache
Crea `.htaccess` en la raíz:
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

### Nginx
Configura `nginx.conf`:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## ✅ Verificación Rápida

1. **Verifica que las URLs funcionen**:
   - Abre: https://barliveapp.es/auth/reset-password-web
   - Deberías ver la página (aunque sin token mostrará "Enlace inválido")
   - Si ves 404, el problema está en el servidor web

2. **Prueba el flujo completo**:
   - Ve a tu app → "¿Olvidaste tu contraseña?"
   - Ingresa tu email
   - Revisa tu correo
   - Haz clic en el enlace
   - Deberías ver el formulario de nueva contraseña

## 🔍 Diagnóstico de Problemas

### Si ves 404 al abrir la URL directamente:
- **Problema**: El servidor web no está configurado para SPA routing
- **Solución**: Configura el archivo de redirección según tu servidor (ver arriba)

### Si el enlace del correo da "otp_expired":
- **Problema**: El enlace ya expiró (más de 1 hora)
- **Solución**: Solicita un nuevo correo de recuperación

### Si el correo no llega:
- **Problema**: Configuración de SMTP o DNS
- **Solución**: 
  1. Verifica DNS en Resend: https://resend.com/domains
  2. Verifica SMTP en Supabase: Project Settings → Auth → SMTP Settings

## 📞 Soporte

Si después de estos pasos sigues teniendo problemas:

1. Abre las herramientas de desarrollador (F12)
2. Ve a la pestaña Console
3. Busca logs que empiecen con `[RecuperarPasswordV6]` o `[ResetPasswordWeb]`
4. Copia los logs y envíalos a: soporte@barliveapp.es

---

**Tiempo estimado**: 5-10 minutos
**Última actualización**: 2 de febrero de 2025
