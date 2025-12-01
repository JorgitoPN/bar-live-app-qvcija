
# Configuración de Correos Electrónicos de BarLive

## 🎯 Objetivo

Configurar todos los correos electrónicos de BarLive para que:
- ✅ Estén completamente en español
- ✅ Usen el branding de BarLive (sin menciones a Supabase)
- ✅ Se envíen desde `noreply@barlive.app`
- ✅ Tengan un diseño profesional y consistente

---

## 📧 Paso 1: Configurar Plantillas de Correo en Supabase

### 1.1. Acceder a las Plantillas

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Navega a **Authentication** → **Email Templates**
3. Verás 4 plantillas principales:
   - **Confirm signup** (Confirmar registro)
   - **Invite user** (Invitar usuario)
   - **Magic Link** (Enlace mágico)
   - **Change Email Address** (Cambiar dirección de correo)
   - **Reset Password** (Restablecer contraseña)

### 1.2. Plantilla: Confirm Signup (Confirmar Registro)

**Asunto:**
```
Confirma tu cuenta de BarLive
```

**Cuerpo (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirma tu cuenta - BarLive</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(to right, #14B8A6, #06B6D4); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">¡Bienvenido a BarLive!</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Confirma tu correo electrónico</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hola,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Gracias por registrarte en BarLive. Para completar tu registro y activar tu cuenta, 
                por favor confirma tu correo electrónico haciendo clic en el botón de abajo:
              </p>
              
              <!-- Botón de confirmación -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); 
                              color: #ffffff; text-decoration: none; padding: 16px 40px; 
                              border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Confirmar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Si no creaste una cuenta en BarLive, puedes ignorar este correo.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 10px 0 0 0;">
                Este enlace expirará en 24 horas.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 BarLive. Todos los derechos reservados.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                Descubre los mejores bares y locales de tu ciudad
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

### 1.3. Plantilla: Reset Password (Restablecer Contraseña)

**Asunto:**
```
Restablece tu contraseña de BarLive
```

**Cuerpo (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablece tu contraseña - BarLive</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(to right, #14B8A6, #06B6D4); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Restablece tu contraseña</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Solicitud de cambio de contraseña</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hola,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta de BarLive. 
                Si fuiste tú quien lo solicitó, haz clic en el botón de abajo para crear una nueva contraseña:
              </p>
              
              <!-- Botón de restablecimiento -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); 
                              color: #ffffff; text-decoration: none; padding: 16px 40px; 
                              border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. 
                Tu contraseña actual seguirá siendo válida.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 10px 0 0 0;">
                Este enlace expirará en 1 hora por seguridad.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 BarLive. Todos los derechos reservados.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                Descubre los mejores bares y locales de tu ciudad
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

### 1.4. Plantilla: Change Email Address (Cambiar Correo)

**Asunto:**
```
Confirma tu nuevo correo electrónico - BarLive
```

**Cuerpo (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirma tu nuevo correo - BarLive</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(to right, #14B8A6, #06B6D4); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Confirma tu nuevo correo</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Cambio de dirección de correo electrónico</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hola,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Recibimos una solicitud para cambiar el correo electrónico de tu cuenta de BarLive. 
                Para confirmar este cambio, haz clic en el botón de abajo:
              </p>
              
              <!-- Botón de confirmación -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); 
                              color: #ffffff; text-decoration: none; padding: 16px 40px; 
                              border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Confirmar nuevo correo
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Si no solicitaste este cambio, por favor ignora este correo y contacta con nuestro soporte.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 10px 0 0 0;">
                Este enlace expirará en 24 horas.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 BarLive. Todos los derechos reservados.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                Descubre los mejores bares y locales de tu ciudad
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

### 1.5. Plantilla: Magic Link (Enlace Mágico)

**Asunto:**
```
Tu enlace de acceso a BarLive
```

**Cuerpo (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accede a BarLive - BarLive</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9f9f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9f9f9; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header con gradiente -->
          <tr>
            <td style="background: linear-gradient(to right, #14B8A6, #06B6D4); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Accede a BarLive</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Tu enlace de acceso rápido</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hola,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Haz clic en el botón de abajo para acceder a tu cuenta de BarLive:
              </p>
              
              <!-- Botón de acceso -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" 
                       style="display: inline-block; background: linear-gradient(to right, #14B8A6, #06B6D4); 
                              color: #ffffff; text-decoration: none; padding: 16px 40px; 
                              border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Acceder a mi cuenta
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                Si no solicitaste este enlace, puedes ignorar este correo.
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 10px 0 0 0;">
                Este enlace expirará en 1 hora por seguridad.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2025 BarLive. Todos los derechos reservados.
              </p>
              <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0;">
                Descubre los mejores bares y locales de tu ciudad
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

---

## 📧 Paso 2: Configurar SMTP Personalizado (Opcional)

Para enviar correos desde `noreply@barlive.app` en lugar de usar el SMTP de Supabase:

### 2.1. Opción A: Usar Resend (Recomendado)

1. **Obtén tu API Key de Resend** (ver `docs/RESEND_CONFIGURATION_COMPLETE.md`)

2. **Configura SMTP en Supabase:**
   - Ve a **Project Settings** → **Auth** → **SMTP Settings**
   - Activa **Enable Custom SMTP**
   - Configura:
     ```
     Host: smtp.resend.com
     Port: 465
     Username: resend
     Password: [Tu API Key de Resend]
     Sender email: noreply@barlive.app
     Sender name: BarLive
     ```

3. **Verifica tu dominio en Resend:**
   - Agrega `barlive.app` en Resend
   - Configura los registros DNS (SPF, DKIM, DMARC)
   - Espera la verificación

### 2.2. Opción B: Usar Gmail SMTP

Si prefieres usar Gmail temporalmente:

```
Host: smtp.gmail.com
Port: 587
Username: tu-email@gmail.com
Password: [App Password de Gmail]
Sender email: tu-email@gmail.com
Sender name: BarLive
```

**Nota:** Necesitas crear una "App Password" en tu cuenta de Gmail.

---

## 🧪 Paso 3: Probar las Plantillas

### 3.1. Probar Confirmación de Registro

1. Crea una nueva cuenta en la app
2. Revisa tu bandeja de entrada
3. Verifica que el correo:
   - ✅ Esté en español
   - ✅ Tenga el diseño de BarLive
   - ✅ No mencione Supabase
   - ✅ El enlace funcione correctamente

### 3.2. Probar Restablecimiento de Contraseña

1. Ve a "¿Olvidaste tu contraseña?"
2. Ingresa tu correo
3. Revisa tu bandeja de entrada
4. Verifica el correo y prueba el enlace

### 3.3. Revisar Logs

Para ver si los correos se están enviando:

```bash
# Ver logs de autenticación
supabase logs --project-ref embntaqwlwmgazvrglaf --type auth

# Ver logs de Edge Functions (si usas Resend)
supabase functions logs send-verification-email --project-ref embntaqwlwmgazvrglaf
```

---

## 🔧 Solución de Problemas

### Problema: Los correos siguen mencionando Supabase

**Solución:**
1. Verifica que hayas guardado las plantillas correctamente
2. Limpia la caché del navegador
3. Prueba con un nuevo registro

### Problema: Los correos no llegan

**Solución:**
1. Revisa la carpeta de spam
2. Verifica la configuración SMTP
3. Revisa los logs de Supabase
4. Si usas dominio personalizado, verifica que esté verificado

### Problema: El diseño se ve roto

**Solución:**
1. Algunos clientes de correo no soportan CSS avanzado
2. Usa solo estilos inline
3. Prueba en diferentes clientes (Gmail, Outlook, Apple Mail)

---

## ✅ Checklist de Configuración

- [ ] Plantilla "Confirm signup" actualizada en español
- [ ] Plantilla "Reset Password" actualizada en español
- [ ] Plantilla "Change Email" actualizada en español
- [ ] Plantilla "Magic Link" actualizada en español
- [ ] SMTP configurado (Resend o Gmail)
- [ ] Dominio verificado (si usas dominio personalizado)
- [ ] Correo de prueba enviado y recibido
- [ ] Diseño verificado en múltiples clientes
- [ ] Enlaces funcionando correctamente
- [ ] Sin menciones a Supabase en ningún correo

---

## 📚 Recursos Adicionales

- [Documentación de Supabase Auth Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Guía de Resend](docs/RESEND_CONFIGURATION_COMPLETE.md)
- [Solución de problemas de autenticación](docs/EMAIL_TROUBLESHOOTING_GUIDE.md)

---

**Última actualización:** Enero 2025  
**Tiempo estimado:** 30-45 minutos  
**Dificultad:** Media ⭐⭐⭐☆☆
