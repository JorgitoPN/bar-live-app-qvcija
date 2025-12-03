
# 📋 Instrucciones para Desplegar Edge Function - Password Reset V6

## ✅ Fase 3: Desplegar Edge Function (30 min)

### 1️⃣ Instalar Supabase CLI

**En Windows:**
```bash
npm install -g supabase
```

**En macOS/Linux:**
```bash
brew install supabase/tap/supabase
```

**Verificar instalación:**
```bash
supabase --version
```

---

### 2️⃣ Autenticar y Vincular Proyecto

**Paso 1: Login en Supabase**
```bash
supabase login
```
- Se abrirá tu navegador
- Autoriza el acceso
- Copia el token que aparece

**Paso 2: Vincular tu proyecto**
```bash
supabase link --project-ref embntaqwlwmgazvrglaf
```
- Te pedirá la contraseña de la base de datos
- Puedes encontrarla en: Supabase Dashboard → Settings → Database → Database password

---

### 3️⃣ Configurar Secreto RESEND_API_KEY

**Obtener tu API Key de Resend:**
1. Ve a https://resend.com/api-keys
2. Crea una nueva API key si no tienes una
3. Copia la key (empieza con `re_`)

**Configurar el secreto en Supabase:**
```bash
supabase secrets set RESEND_API_KEY="tu_api_key_aqui"
```

**Ejemplo:**
```bash
supabase secrets set RESEND_API_KEY="re_123abc456def789ghi"
```

**Verificar que se configuró:**
```bash
supabase secrets list
```

---

### 4️⃣ Desplegar la Edge Function

**Navega a la carpeta de tu proyecto:**
```bash
cd /ruta/a/tu/proyecto
```

**Despliega la función:**
```bash
supabase functions deploy send-password-change-confirmation
```

**Salida esperada:**
```
Deploying function send-password-change-confirmation...
✓ Function deployed successfully
Function URL: https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-password-change-confirmation
```

---

### 5️⃣ Verificar el Despliegue

**Probar la función:**
```bash
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-password-change-confirmation' \
  -H 'Authorization: Bearer TU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"email":"tu-email@ejemplo.com"}'
```

**Ver logs en tiempo real:**
```bash
supabase functions logs send-password-change-confirmation
```

---

## 📧 Plantillas de Email para Supabase

### Plantilla 1: Email de Restablecimiento de Contraseña

**Ubicación en Supabase:**
1. Ve a: **Authentication → Email Templates**
2. Selecciona: **Reset Password**
3. Pega el siguiente código HTML:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña - Barlive</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">
                🔐 Barlive
              </h1>
              <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 18px;">
                Solicitud de restablecimiento de contraseña
              </p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
                Hola 👋
              </h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Barlive.
              </p>
              <p style="margin: 0 0 30px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Si fuiste tú quien solicitó este cambio, haz clic en el botón de abajo para crear una nueva contraseña:
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      🔒 Restablecer mi contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative link -->
              <p style="margin: 0 0 30px 0; color: #6b7280; font-size: 14px; line-height: 20px; text-align: center;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <td style="background-color: #f9fafb; padding: 16px; border-radius: 8px; word-break: break-all;">
                    <a href="{{ .ConfirmationURL }}" style="color: #667eea; text-decoration: none; font-size: 13px;">
                      {{ .ConfirmationURL }}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security info -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px 0; color: #92400e; font-size: 15px; font-weight: 600;">
                      🔒 Nota de seguridad
                    </p>
                    <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 20px;">
                      Este enlace expirará en <strong>1 hora</strong> por razones de seguridad. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fee2e2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px 0; color: #991b1b; font-size: 15px; font-weight: 600;">
                      ⚠️ ¿No fuiste tú?
                    </p>
                    <p style="margin: 0 0 12px 0; color: #7f1d1d; font-size: 14px; line-height: 20px;">
                      Si no solicitaste restablecer tu contraseña, es posible que alguien esté intentando acceder a tu cuenta.
                    </p>
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 20px;">
                      <strong>Recomendaciones:</strong>
                    </p>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #7f1d1d; font-size: 14px; line-height: 20px;">
                      <li style="margin-bottom: 4px;">Ignora este correo</li>
                      <li style="margin-bottom: 4px;">Cambia tu contraseña inmediatamente</li>
                      <li style="margin-bottom: 0;">Contacta con soporte si sospechas actividad inusual</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support section -->
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                ¿Necesitas ayuda? Estamos aquí para ti
              </p>
              <a href="mailto:soporte@barliveapp.es" style="display: inline-block; background-color: transparent; color: #667eea; text-decoration: none; padding: 12px 24px; border: 2px solid #667eea; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Contactar Soporte
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                Este es un correo automático, por favor no respondas a este mensaje.
              </p>
              <p style="margin: 0 0 16px 0; color: #9ca3af; font-size: 12px;">
                © 2025 Barlive. Todos los derechos reservados.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                <a href="https://barliveapp.es/legal/privacidad" style="color: #667eea; text-decoration: none;">Política de Privacidad</a> • 
                <a href="https://barliveapp.es/legal/terminos" style="color: #667eea; text-decoration: none;">Términos de Servicio</a>
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

**Importante:** Asegúrate de que la variable `{{ .ConfirmationURL }}` esté presente en el template.

---

### Plantilla 2: Email de Confirmación de Registro

**Ubicación en Supabase:**
1. Ve a: **Authentication → Email Templates**
2. Selecciona: **Confirm Signup**
3. Usa una plantilla similar adaptada para confirmación de registro

---

## 🔧 Configuración Adicional en Supabase

### Configurar URLs de Redirección

**Ubicación:** Authentication → URL Configuration

**Site URL:**
```
https://barliveapp.es
```

**Redirect URLs (añade estas):**
```
https://barliveapp.es/auth/reset-password-web
https://barliveapp.es/auth/email-confirmed
https://barliveapp.es/*
```

---

## ✅ Checklist de Verificación

- [ ] Supabase CLI instalado y funcionando
- [ ] Proyecto vinculado correctamente
- [ ] Secreto `RESEND_API_KEY` configurado
- [ ] Edge Function desplegada exitosamente
- [ ] Plantilla de "Reset Password" actualizada en Supabase
- [ ] URLs de redirección configuradas
- [ ] Función probada con un email de prueba
- [ ] Logs revisados sin errores

---

## 🐛 Solución de Problemas

### Error: "Function not found"
```bash
# Verifica que la función existe
supabase functions list
```

### Error: "RESEND_API_KEY not found"
```bash
# Verifica los secretos
supabase secrets list

# Reconfigura si es necesario
supabase secrets set RESEND_API_KEY="tu_key"
```

### Error: "Email not sent"
- Verifica que tu dominio esté verificado en Resend
- Revisa los logs: `supabase functions logs send-password-change-confirmation`
- Verifica que la API key sea válida

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `supabase functions logs send-password-change-confirmation`
2. Verifica la configuración de Resend
3. Contacta al equipo de soporte de Supabase

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu sistema de restablecimiento de contraseña estará completamente funcional.
