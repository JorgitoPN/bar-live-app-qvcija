
# Guía de Solución: "Enlace inválido o expirado"

## Problema

Cuando los usuarios hacen clic en el enlace de restablecimiento de contraseña que reciben por correo, ven el mensaje "Enlace inválido o expirado".

## Causas Comunes

1. **URL de redirección incorrecta en la plantilla de email**
2. **Token expirado** (los tokens de recuperación expiran en 1 hora)
3. **Token ya usado** (los tokens solo se pueden usar una vez)
4. **Configuración incorrecta en Supabase**

## Solución

### Paso 1: Configurar la Plantilla de Email en Supabase

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates

2. Selecciona la plantilla **"Reset Password"** (Restablecer contraseña)

3. **IMPORTANTE**: Cambia la URL en el botón de la plantilla HTML:

   **❌ INCORRECTO:**
   ```html
   <a href="{{ .ConfirmationURL }}">Restablecer contraseña</a>
   ```

   **✅ CORRECTO:**
   ```html
   <a href="https://barliveapp.es/auth/restablecer-password#access_token={{ .TokenHash }}&type=recovery">Restablecer contraseña</a>
   ```

4. Guarda los cambios

### Paso 2: Plantilla Completa Recomendada

Aquí está la plantilla HTML completa que debes usar:

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
                    <a href="https://barliveapp.es/auth/restablecer-password#access_token={{ .TokenHash }}&type=recovery" 
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
                <strong>⚠️ Este enlace expirará en 1 hora por seguridad.</strong>
              </p>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 10px 0 0 0;">
                <strong>💡 Consejo:</strong> Haz clic en el enlace inmediatamente después de recibirlo.
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

### Paso 3: Verificar la Configuración de URLs en Supabase

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/url-configuration

2. Asegúrate de que estas URLs estén en la lista de **Redirect URLs**:
   - `https://barliveapp.es/auth/restablecer-password`
   - `https://barliveapp.es/auth/callback`
   - `https://barliveapp.es/*` (wildcard para todas las rutas)

3. El **Site URL** debe ser: `https://barliveapp.es`

### Paso 4: Probar el Flujo

1. Ve a la página de recuperación de contraseña en tu app
2. Ingresa tu email
3. Haz clic en "Enviar correo de recuperación"
4. Revisa tu email (y la carpeta de spam)
5. Haz clic en el botón "Restablecer contraseña"
6. Deberías ver la página para ingresar tu nueva contraseña

## Explicación Técnica

### ¿Por qué usar `TokenHash` en lugar de `ConfirmationURL`?

La variable `{{ .ConfirmationURL }}` de Supabase genera una URL que apunta al servidor de Supabase:
```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=...
```

Esta URL:
1. Verifica el token en el servidor de Supabase
2. Luego redirige al usuario a tu app

El problema es que esta redirección puede fallar o el token puede expirar durante el proceso.

**Solución**: Usar `{{ .TokenHash }}` directamente en la URL de tu app:
```
https://barliveapp.es/auth/restablecer-password#access_token={{ .TokenHash }}&type=recovery
```

Esto permite que tu app:
1. Reciba el token directamente
2. Establezca la sesión usando `supabase.auth.setSession()`
3. Maneje errores de manera más elegante
4. Proporcione mejor feedback al usuario

### Flujo de Recuperación de Contraseña

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario solicita recuperación                            │
│    → app/auth/recuperar-password.tsx                        │
│    → supabase.auth.resetPasswordForEmail()                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Supabase envía email con enlace                          │
│    → Email contiene: TokenHash                              │
│    → URL: https://barliveapp.es/auth/restablecer-password  │
│           #access_token=TOKEN&type=recovery                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Usuario hace clic en el enlace                           │
│    → Navegador abre: /auth/restablecer-password            │
│    → Hash contiene: access_token y type                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. App procesa el token                                     │
│    → app/auth/restablecer-password.tsx                      │
│    → Lee access_token del hash                              │
│    → Llama supabase.auth.setSession()                       │
│    → Establece sesión de recuperación                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Usuario ingresa nueva contraseña                         │
│    → Formulario de nueva contraseña                         │
│    → supabase.auth.updateUser({ password })                 │
│    → Contraseña actualizada ✅                              │
└─────────────────────────────────────────────────────────────┘
```

## Solución de Problemas

### Problema: "Enlace inválido o expirado"

**Causas posibles:**

1. **Token expirado (más de 1 hora)**
   - Solución: Solicitar un nuevo enlace

2. **Token ya usado**
   - Los tokens solo se pueden usar una vez
   - Solución: Solicitar un nuevo enlace

3. **URL incorrecta en el email**
   - Verificar que la plantilla use `{{ .TokenHash }}`
   - Verificar que la URL sea `https://barliveapp.es/auth/restablecer-password`

4. **Token malformado**
   - Puede ocurrir si el usuario copia/pega el enlace incorrectamente
   - Solución: Hacer clic directamente en el botón del email

### Problema: Email no llega

Ver la guía: `SOLUCION_DEFINITIVA_EMAILS_DOMINIO.md`

### Problema: Error al establecer sesión

**Síntomas:**
- El enlace abre la página pero muestra error
- Console muestra: "Error estableciendo sesión"

**Solución:**
1. Verificar que el token no haya expirado
2. Verificar que las Redirect URLs estén configuradas en Supabase
3. Revisar los logs del navegador para más detalles

## Mejoras Implementadas

### 1. Mejor Manejo de Errores

La página `/auth/restablecer-password` ahora:
- ✅ Detecta errores en la URL
- ✅ Muestra mensajes específicos según el tipo de error
- ✅ Proporciona consejos útiles al usuario
- ✅ Registra información detallada en la consola

### 2. Validación de Token

El código ahora:
- ✅ Verifica que el token esté presente
- ✅ Verifica que el tipo sea 'recovery'
- ✅ Detecta tokens expirados
- ✅ Detecta tokens inválidos
- ✅ Limpia la URL después de procesar el token

### 3. Experiencia de Usuario Mejorada

- ✅ Pantalla de carga mientras se verifica el token
- ✅ Mensajes de error claros y útiles
- ✅ Botón para solicitar nuevo enlace
- ✅ Consejos para evitar problemas futuros

## Checklist de Verificación

Antes de considerar el problema resuelto, verifica:

- [ ] La plantilla de email en Supabase usa `{{ .TokenHash }}`
- [ ] La URL en la plantilla es `https://barliveapp.es/auth/restablecer-password`
- [ ] Las Redirect URLs están configuradas en Supabase
- [ ] El Site URL es `https://barliveapp.es`
- [ ] Puedes solicitar un enlace de recuperación
- [ ] El email llega correctamente
- [ ] Al hacer clic en el enlace, se abre la página de restablecer contraseña
- [ ] Puedes ingresar una nueva contraseña
- [ ] La contraseña se actualiza correctamente
- [ ] Puedes iniciar sesión con la nueva contraseña

## Contacto de Soporte

Si después de seguir esta guía el problema persiste:

1. Revisa los logs del navegador (F12 → Console)
2. Toma capturas de pantalla del error
3. Anota la hora exacta en que ocurrió el problema
4. Contacta a: soporte@barliveapp.es

## Referencias

- [Supabase Auth - Password Reset](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Next.js Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

**Última actualización:** 2 de febrero de 2025
**Versión:** 1.0
**Estado:** ✅ Implementado y probado
