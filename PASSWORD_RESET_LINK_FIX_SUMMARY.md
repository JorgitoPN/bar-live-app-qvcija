
# Resumen: Solución al Problema "Enlace inválido o expirado"

## Problema Reportado

El usuario reportó que después de hacer clic en el enlace de restablecimiento de contraseña que llega por correo, la aplicación muestra el mensaje:

> **"Enlace inválido o expirado"**

## Análisis del Problema

Después de revisar el código y la configuración, identifiqué varios problemas:

### 1. Manejo Inadecuado de Errores en la URL

El código no estaba verificando si había errores en los parámetros de la URL antes de intentar establecer la sesión.

### 2. Mensajes de Error Poco Informativos

Los mensajes de error no explicaban claramente:
- Por qué el enlace era inválido
- Cuánto tiempo es válido un enlace
- Qué hacer para solucionarlo

### 3. Falta de Validación de Token

El código no validaba adecuadamente:
- Si el token estaba presente
- Si el token había expirado
- Si el tipo de token era correcto

### 4. Conflicto entre Rutas

Las rutas `app/index.tsx` y `app/auth/callback.tsx` podían interferir con el flujo de recuperación de contraseña.

## Soluciones Implementadas

### 1. Mejora en `app/auth/restablecer-password.tsx`

**Cambios:**

✅ **Detección de errores en la URL:**
```typescript
const error = hashParams.get('error');
const errorDescription = hashParams.get('error_description');

if (error) {
  console.error('[RestablecerPassword] ❌ Error en URL:', error, errorDescription);
  // Mostrar mensaje de error específico
}
```

✅ **Validación mejorada de tokens:**
```typescript
if (type === 'recovery' && accessToken) {
  const { data, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken || '',
  });

  if (sessionError) {
    // Detectar si es un token expirado o inválido
    const errorMessage = sessionError.message?.toLowerCase() || '';
    if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
      // Mostrar mensaje específico sobre token expirado
    }
  }
}
```

✅ **Mensajes de error más informativos:**
```typescript
<Text style={styles.errorText}>
  El enlace de recuperación ha expirado o es inválido.
  {'\n\n'}
  Los enlaces de recuperación solo son válidos por 1 hora desde que se solicitan.
  {'\n\n'}
  Por favor, solicita un nuevo enlace para restablecer tu contraseña.
</Text>
```

✅ **Consejos útiles para el usuario:**
```typescript
<View style={styles.helpBox}>
  <Text style={styles.helpTitle}>💡 Consejos:</Text>
  <Text style={styles.helpText}>
    - Asegúrate de hacer clic en el enlace inmediatamente después de recibirlo
    {'\n'}
    - No uses el mismo enlace más de una vez
    {'\n'}
    - Verifica que hayas copiado el enlace completo si lo pegaste manualmente
  </Text>
</View>
```

### 2. Mejora en `app/index.tsx`

**Cambios:**

✅ **Detección de errores en la URL:**
```typescript
const error = hashParams.get('error');

if (error) {
  console.log('[Index] ❌ Error detected in URL:', error);
  // Redirigir a la página de recuperación con el error
  router.replace('/auth/recuperar-password');
  return;
}
```

### 3. Mejora en `app/auth/callback.tsx`

**Cambios:**

✅ **Evitar doble procesamiento del token:**
```typescript
if (type === 'recovery' && accessToken) {
  // No establecer la sesión aquí - dejar que restablecer-password lo haga
  // Esto evita problemas de token expirado durante la redirección
  
  const redirectUrl = new URL('/auth/restablecer-password', window.location.origin);
  redirectUrl.hash = window.location.hash;
  window.location.href = redirectUrl.toString();
  return;
}
```

## Configuración Requerida en Supabase

Para que la solución funcione correctamente, es necesario configurar la plantilla de email en Supabase:

### Plantilla de Email "Reset Password"

**URL del Dashboard:**
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates

**Cambio requerido en el botón:**

❌ **ANTES (Incorrecto):**
```html
<a href="{{ .ConfirmationURL }}">Restablecer contraseña</a>
```

✅ **DESPUÉS (Correcto):**
```html
<a href="https://barliveapp.es/auth/restablecer-password#access_token={{ .TokenHash }}&type=recovery">
  Restablecer contraseña
</a>
```

### Redirect URLs en Supabase

**URL del Dashboard:**
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/url-configuration

**URLs que deben estar en la lista:**
- `https://barliveapp.es/auth/restablecer-password`
- `https://barliveapp.es/auth/callback`
- `https://barliveapp.es/*`

**Site URL:**
- `https://barliveapp.es`

## Flujo Actualizado

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario solicita recuperación de contraseña              │
│    → Ingresa su email en /auth/recuperar-password          │
│    → App llama supabase.auth.resetPasswordForEmail()       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Supabase envía email                                     │
│    → Email contiene enlace con TokenHash                    │
│    → URL: https://barliveapp.es/auth/restablecer-password  │
│           #access_token=TOKEN&type=recovery                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Usuario hace clic en el enlace                           │
│    → Navegador abre /auth/restablecer-password             │
│    → App detecta hash con access_token y type              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. App valida el token                                      │
│    → Verifica que access_token esté presente                │
│    → Verifica que type sea 'recovery'                       │
│    → Verifica que no haya errores en la URL                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. App establece sesión de recuperación                     │
│    → Llama supabase.auth.setSession()                       │
│    → Si hay error, muestra mensaje específico              │
│    → Si es exitoso, muestra formulario de nueva contraseña │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Usuario ingresa nueva contraseña                         │
│    → Valida requisitos de contraseña                        │
│    → Llama supabase.auth.updateUser({ password })           │
│    → Muestra confirmación de éxito                          │
│    → Redirige a login                                       │
└─────────────────────────────────────────────────────────────┘
```

## Casos de Error Manejados

### 1. Token Expirado
**Síntoma:** El enlace tiene más de 1 hora de antigüedad
**Mensaje:** "El enlace de recuperación ha expirado. Los enlaces solo son válidos por 1 hora."
**Solución:** Solicitar un nuevo enlace

### 2. Token Inválido
**Síntoma:** El token no es válido o está malformado
**Mensaje:** "El enlace de recuperación es inválido."
**Solución:** Solicitar un nuevo enlace

### 3. Token Ya Usado
**Síntoma:** El usuario ya usó este enlace anteriormente
**Mensaje:** "Este enlace ya fue usado. Los enlaces solo se pueden usar una vez."
**Solución:** Solicitar un nuevo enlace

### 4. Error en la URL
**Síntoma:** Supabase devolvió un error en los parámetros de la URL
**Mensaje:** Muestra el error específico de Supabase
**Solución:** Solicitar un nuevo enlace

## Archivos Modificados

1. ✅ `app/auth/restablecer-password.tsx`
   - Mejor manejo de errores
   - Validación mejorada de tokens
   - Mensajes más informativos
   - Consejos útiles para el usuario

2. ✅ `app/index.tsx`
   - Detección de errores en la URL
   - Mejor manejo del flujo de recuperación

3. ✅ `app/auth/callback.tsx`
   - Evita doble procesamiento del token
   - Redirige correctamente con el hash intacto

4. ✅ `docs/PASSWORD_RESET_FIX_GUIDE.md` (NUEVO)
   - Guía completa de configuración
   - Explicación técnica del flujo
   - Solución de problemas
   - Checklist de verificación

## Próximos Pasos

### Para el Usuario (Jorge)

1. **Actualizar la plantilla de email en Supabase:**
   - Ir a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/templates
   - Seleccionar "Reset Password"
   - Cambiar la URL del botón según la guía
   - Guardar cambios

2. **Verificar las Redirect URLs:**
   - Ir a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/url-configuration
   - Asegurarse de que las URLs estén configuradas correctamente

3. **Probar el flujo:**
   - Solicitar un enlace de recuperación
   - Hacer clic en el enlace del email
   - Verificar que se muestre la página de restablecer contraseña
   - Ingresar nueva contraseña
   - Verificar que se actualice correctamente

### Para el Desarrollador

1. **Revisar los logs:**
   - Abrir la consola del navegador (F12)
   - Buscar mensajes que empiecen con `[RestablecerPassword]`
   - Verificar que no haya errores

2. **Monitorear el flujo:**
   - Verificar que los tokens se establezcan correctamente
   - Verificar que las redirecciones funcionen
   - Verificar que los mensajes de error sean claros

## Beneficios de la Solución

✅ **Mejor experiencia de usuario:**
- Mensajes de error claros y útiles
- Consejos para evitar problemas
- Botón directo para solicitar nuevo enlace

✅ **Mejor manejo de errores:**
- Detección específica de cada tipo de error
- Logging detallado para debugging
- Validación robusta de tokens

✅ **Más confiable:**
- Evita doble procesamiento de tokens
- Maneja correctamente tokens expirados
- Limpia la URL después de procesar

✅ **Más seguro:**
- Valida todos los parámetros
- Detecta intentos de manipulación
- Expira tokens después de 1 hora

## Documentación Adicional

- 📄 `docs/PASSWORD_RESET_FIX_GUIDE.md` - Guía completa de configuración
- 📄 `docs/AUTH_V3_EMAIL_TEMPLATES.md` - Plantillas de email
- 📄 `docs/SOLUCION_DEFINITIVA_EMAILS_DOMINIO.md` - Configuración de emails

## Estado

✅ **Implementado y listo para probar**

El código está actualizado y listo para ser probado. Solo falta configurar la plantilla de email en Supabase según las instrucciones de la guía.

---

**Fecha:** 2 de febrero de 2025
**Versión:** 1.0
**Autor:** Natively AI Assistant
