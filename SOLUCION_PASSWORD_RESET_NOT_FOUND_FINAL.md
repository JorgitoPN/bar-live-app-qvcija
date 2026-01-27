
# Solución Definitiva: Password Reset "Not Found" Error

## 🔴 Problema
Después de hacer clic en el botón o enlace del correo de restablecimiento de contraseña, los usuarios son redirigidos a:
```
https://barliveapp.es/auth/restablecer-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

Y ven un mensaje de "Not Found".

## ✅ Solución Implementada

### 1. Archivos Actualizados

#### `_redirects`
- Configurado para manejar correctamente `/auth/reset-password` como la ruta principal
- Redirige rutas antiguas a la nueva ruta simplificada
- Asegura que el SPA funcione correctamente

#### `app/auth/reset-password.tsx`
- Maneja correctamente los tokens de recuperación desde el hash de la URL
- Detecta y muestra errores específicos (token expirado, inválido, etc.)
- Proporciona mensajes de error claros y amigables
- Incluye indicadores visuales de fortaleza de contraseña
- Maneja tanto web como móvil

### 2. Configuración Requerida en Supabase

#### A. URL Configuration (Dashboard)

Ve a: **Authentication > URL Configuration** en tu dashboard de Supabase

**Site URL:**
```
https://barliveapp.es
```

**Redirect URLs (añade estas URLs a la lista permitida):**
```
https://barliveapp.es/auth/reset-password
https://barliveapp.es/auth/recuperar-password
http://localhost:3000/auth/reset-password
http://localhost:3000/**
```

#### B. Email Template Configuration

Ve a: **Authentication > Email Templates** en tu dashboard de Supabase

**Selecciona: "Reset Password" (Recovery)**

**Subject:**
```
Restablece tu contraseña - Barlive
```

**Email Template (HTML):**

Reemplaza `{{ .ConfirmationURL }}` con la siguiente URL personalizada:

```html
{{ .SiteURL }}/auth/reset-password#access_token={{ .Token }}&type=recovery
```

**Template completo recomendado:**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - Barlive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                🔐 Barlive
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px;">
                Restablece tu contraseña
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                Hola 👋
              </h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en Barlive.
              </p>
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Haz clic en el botón de abajo para crear una nueva contraseña:
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="{{ .SiteURL }}/auth/reset-password#access_token={{ .Token }}&type=recovery" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">
                      🔒 Restablecer mi contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative link -->
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px; text-align: center;">
                Si el botón no funciona, copia y pega este enlace:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 16px; border-radius: 8px; word-break: break-all;">
                    <a href="{{ .SiteURL }}/auth/reset-password#access_token={{ .Token }}&type=recovery" 
                       style="color: #667eea; text-decoration: none; font-size: 13px;">
                      {{ .SiteURL }}/auth/reset-password#access_token={{ .Token }}&type=recovery
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security warning -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px 0; color: #92400e; font-size: 15px; font-weight: 600;">
                      🔒 Importante
                    </p>
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 20px;">
                      Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, ignora este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                © 2025 Barlive. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

### 3. Verificación

#### Paso 1: Verifica la configuración de URLs
1. Ve a tu dashboard de Supabase
2. Authentication > URL Configuration
3. Asegúrate de que `https://barliveapp.es/auth/reset-password` esté en la lista de Redirect URLs

#### Paso 2: Actualiza el template de email
1. Ve a Authentication > Email Templates
2. Selecciona "Reset Password"
3. Reemplaza el contenido con el template de arriba
4. Guarda los cambios

#### Paso 3: Prueba el flujo
1. Ve a `/auth/recuperar-password`
2. Ingresa tu email
3. Revisa tu correo
4. Haz clic en el botón "Restablecer mi contraseña"
5. Deberías ver la página de reset-password con el formulario para ingresar tu nueva contraseña

### 4. Solución de Problemas

#### Error: "otp_expired"
**Causa:** El token ha expirado (más de 1 hora desde que se envió el email)
**Solución:** Solicita un nuevo enlace de recuperación

#### Error: "access_denied"
**Causa:** El token ya fue usado o es inválido
**Solución:** Solicita un nuevo enlace de recuperación

#### Error: "Not Found"
**Causa:** La ruta no está configurada correctamente en `_redirects`
**Solución:** Asegúrate de que el archivo `_redirects` esté en la raíz del proyecto y se despliegue correctamente

### 5. Notas Importantes

1. **Tokens de un solo uso:** Los tokens de recuperación solo pueden usarse una vez. Si el usuario abre el enlace dos veces, la segunda vez verá un error.

2. **Expiración:** Los tokens expiran después de 1 hora por seguridad.

3. **URL Hash vs Query Params:** Supabase envía los tokens en el hash de la URL (#) no en query params (?). Esto es por seguridad, ya que los hashes no se envían al servidor.

4. **Despliegue Web:** Asegúrate de que el archivo `_redirects` se despliegue correctamente en tu hosting (Netlify, Vercel, etc.)

### 6. Mejoras Implementadas

- ✅ Mensajes de error claros y específicos
- ✅ Indicadores visuales de fortaleza de contraseña
- ✅ Manejo de tokens expirados
- ✅ Manejo de tokens inválidos
- ✅ Interfaz amigable para solicitar nuevo enlace
- ✅ Logs detallados para debugging
- ✅ Soporte para web y móvil
- ✅ Limpieza automática del hash de la URL después de usar el token

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Revisa los logs del navegador (Console)
2. Verifica que el archivo `_redirects` se haya desplegado
3. Confirma que las URLs en Supabase coincidan exactamente con tu dominio
4. Asegúrate de que el template de email use `{{ .Token }}` no `{{ .TokenHash }}`

## 🎉 Resultado Esperado

Después de implementar esta solución:

1. El usuario recibe un email con un enlace válido
2. Al hacer clic, es redirigido a `/auth/reset-password`
3. Ve un formulario para ingresar su nueva contraseña
4. Puede cambiar su contraseña exitosamente
5. Es redirigido a la página de login

Si el enlace expira o es inválido, el usuario ve un mensaje claro explicando el problema y puede solicitar un nuevo enlace fácilmente.
