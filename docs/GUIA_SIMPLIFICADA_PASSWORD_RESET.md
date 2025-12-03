
# Guía Simplificada - Restablecimiento de Contraseña

## 🎯 Sistema Simplificado

Hemos simplificado completamente el flujo de restablecimiento de contraseña para que funcione de manera confiable.

## 📋 Cambios Realizados

### 1. **Una Sola Página de Reset**
- **Antes**: Teníamos 3 páginas diferentes (`reset-password-web.tsx`, `restablecer-password.tsx`, `recuperar-password-v6.tsx`)
- **Ahora**: Solo 2 páginas simples:
  - `/auth/recuperar-password` - Para solicitar el enlace
  - `/auth/reset-password` - Para cambiar la contraseña

### 2. **Una Sola URL de Redirección**
- **Antes**: Múltiples URLs dependiendo de la plataforma
- **Ahora**: Una sola URL para todo: `https://barliveapp.es/auth/reset-password`

### 3. **Manejo Mejorado de Tokens**
- Detecta automáticamente si el token viene en la URL
- Maneja errores de token expirado de forma clara
- Limpia la URL después de procesar el token

## ⚙️ Configuración en Supabase

### Paso 1: Configurar Redirect URLs

Ve a tu proyecto de Supabase → Authentication → URL Configuration

**Redirect URLs** (añade esta URL):
```
https://barliveapp.es/auth/reset-password
```

**Site URL**:
```
https://barliveapp.es
```

### Paso 2: Configurar Email Template

Ve a Authentication → Email Templates → Reset Password

Usa esta plantilla simple:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - Barlive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Barlive</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Restablecer Contraseña</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: bold;">Hola,</h2>
              
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta de Barlive.
              </p>
              
              <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                Haz clic en el botón de abajo para crear una nueva contraseña:
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 16px 40px; background-color: #667eea; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Restablecer Contraseña
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 14px; line-height: 1.6;">
                O copia y pega este enlace en tu navegador:
              </p>
              
              <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f5f5f5; border-radius: 6px; color: #667eea; font-size: 13px; word-break: break-all;">
                {{ .ConfirmationURL }}
              </p>
              
              <!-- Security Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px; padding: 15px; margin: 0 0 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Importante:</strong> Este enlace expira en 1 hora por seguridad.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #6a6a6a; font-size: 13px; line-height: 1.6;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px;">
                © 2025 Barlive. Todos los derechos reservados.
              </p>
              <p style="margin: 0; color: #6a6a6a; font-size: 12px;">
                Este es un correo automático, por favor no respondas.
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

## 🧪 Cómo Probar

### 1. Solicitar Restablecimiento
1. Ve a la app Barlive
2. Haz clic en "¿Olvidaste tu contraseña?"
3. Ingresa tu email
4. Haz clic en "Enviar enlace de recuperación"

### 2. Verificar Email
1. Revisa tu bandeja de entrada
2. Busca el correo de Barlive
3. Haz clic en el botón "Restablecer Contraseña"

### 3. Cambiar Contraseña
1. Se abrirá la página de reset
2. Ingresa tu nueva contraseña
3. Confirma la contraseña
4. Haz clic en "Guardar nueva contraseña"

### 4. Iniciar Sesión
1. Vuelve a la app
2. Inicia sesión con tu nueva contraseña

## ❌ Solución de Problemas

### "Enlace inválido o expirado"

**Causas comunes:**
- El enlace tiene más de 1 hora
- Ya usaste el enlace anteriormente
- La URL de redirección no está configurada en Supabase

**Solución:**
1. Verifica que la URL `https://barliveapp.es/auth/reset-password` esté en Redirect URLs
2. Solicita un nuevo enlace
3. Usa el enlace inmediatamente

### "No recibo el correo"

**Solución:**
1. Revisa la carpeta de spam
2. Verifica que el email esté escrito correctamente
3. Espera unos minutos (puede tardar)
4. Intenta reenviar el correo

### "La página no carga"

**Solución:**
1. Verifica que el archivo `_redirects` esté en la raíz del proyecto
2. Asegúrate de que el deploy incluya el archivo `_redirects`
3. Limpia la caché del navegador

## 📝 Archivos Importantes

- `app/auth/recuperar-password.tsx` - Solicitar enlace de reset
- `app/auth/reset-password.tsx` - Cambiar contraseña
- `_redirects` - Configuración de rutas

## ✅ Checklist de Configuración

- [ ] Redirect URL configurada en Supabase: `https://barliveapp.es/auth/reset-password`
- [ ] Site URL configurada en Supabase: `https://barliveapp.es`
- [ ] Email template actualizado con la plantilla de arriba
- [ ] Archivo `_redirects` en la raíz del proyecto
- [ ] Deploy realizado con los nuevos archivos
- [ ] Prueba completa del flujo

## 🎉 ¡Listo!

El sistema ahora es mucho más simple y confiable. Solo hay una ruta para todo y el manejo de tokens es automático.

Si tienes algún problema, revisa los logs en la consola del navegador para ver mensajes detallados del proceso.
