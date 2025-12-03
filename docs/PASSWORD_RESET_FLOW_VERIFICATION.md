
# Verificación del Flujo de Restablecimiento de Contraseña

## 🔍 Problema Reportado

Después de hacer clic en el enlace de "Restablecer contraseña", el usuario es redirigido a:
```
https://barliveapp.es/auth/restablecer-password#access_token=...&expires_at=...&refresh_token=...&token_type=bearer&type=recovery
```

Pero la página no muestra los campos para restablecer la contraseña.

## ✅ Solución Implementada

### 1. Flujo Actualizado

El flujo ahora funciona de la siguiente manera:

1. **Usuario solicita restablecimiento** → `/auth/recuperar-password`
   - Ingresa su email
   - Supabase envía email con enlace de recuperación

2. **Usuario hace clic en el enlace del email**
   - URL: `https://barliveapp.es/auth/restablecer-password#access_token=...&type=recovery`
   - La página detecta los parámetros en el hash de la URL

3. **Página de restablecimiento** → `/auth/restablecer-password`
   - Extrae el `access_token` y `refresh_token` del hash
   - Establece la sesión de recuperación con `supabase.auth.setSession()`
   - Muestra el formulario para ingresar la nueva contraseña
   - Limpia el hash de la URL para evitar confusión

4. **Usuario ingresa nueva contraseña**
   - Valida requisitos de seguridad
   - Actualiza la contraseña con `supabase.auth.updateUser()`
   - Cierra sesión y redirige a login

### 2. Código Clave

El código en `app/auth/restablecer-password.tsx` ahora:

```typescript
// Detecta parámetros en el hash de la URL (solo web)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const hash = window.location.hash;
  
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');

    // Si es un token de recuperación, establece la sesión
    if (type === 'recovery' && accessToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      });

      if (!error && data.session) {
        // Sesión establecida correctamente
        setHasValidSession(true);
        
        // Limpia el hash de la URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }
}
```

### 3. Logs de Depuración

El código incluye logs detallados para facilitar la depuración:

```
[RestablecerPassword] 🔍 Verificando sesión de recuperación...
[RestablecerPassword] Platform: web
[RestablecerPassword] 📋 URL hash: #access_token=...
[RestablecerPassword] 📋 Hash params encontrados: { hasAccessToken: true, type: 'recovery' }
[RestablecerPassword] 🔐 Estableciendo sesión de recuperación...
[RestablecerPassword] ✅ Sesión de recuperación establecida para: user@example.com
```

## 🧪 Cómo Probar

### Paso 1: Solicitar Restablecimiento
1. Ir a `/auth/recuperar-password`
2. Ingresar email: `jorgepereznoyagh@gmail.com`
3. Hacer clic en "Enviar enlace de recuperación"
4. Verificar que aparece el mensaje de éxito

### Paso 2: Verificar Email
1. Abrir el email recibido
2. Verificar que el enlace tiene el formato correcto:
   ```
   https://barliveapp.es/auth/restablecer-password#access_token=...&type=recovery
   ```

### Paso 3: Hacer Clic en el Enlace
1. Hacer clic en el enlace del email
2. La página debe:
   - Mostrar "Verificando enlace..." brevemente
   - Luego mostrar el formulario con:
     - Campo "Nueva contraseña"
     - Campo "Confirmar contraseña"
     - Requisitos de la contraseña
     - Botón "Actualizar contraseña"

### Paso 4: Restablecer Contraseña
1. Ingresar nueva contraseña (debe cumplir requisitos)
2. Confirmar contraseña
3. Hacer clic en "Actualizar contraseña"
4. Verificar mensaje de éxito
5. Ser redirigido a `/auth/login`

### Paso 5: Iniciar Sesión
1. Iniciar sesión con el email y la nueva contraseña
2. Verificar que funciona correctamente

## 🔧 Configuración de Supabase

### Plantilla de Email (Reset Password)

Asegúrate de que la plantilla de email en Supabase use esta URL:

```html
<a href="{{ .SiteURL }}/auth/restablecer-password#access_token={{ .Token }}&type=recovery">
  Restablecer contraseña
</a>
```

O simplemente:

```html
<a href="{{ .ConfirmationURL }}">
  Restablecer contraseña
</a>
```

### Redirect URLs

En Supabase → Authentication → URL Configuration:

- **Site URL**: `https://barliveapp.es`
- **Redirect URLs**: 
  - `https://barliveapp.es/auth/restablecer-password`
  - `https://barliveapp.es/auth/callback`
  - `https://barliveapp.es/**` (wildcard)

## 🐛 Solución de Problemas

### Problema: "Enlace inválido o expirado"

**Causas posibles:**
1. El token ha expirado (24 horas)
2. El token ya fue usado
3. La URL no tiene los parámetros correctos

**Solución:**
- Solicitar un nuevo enlace de recuperación
- Verificar que el email tiene el formato correcto de URL

### Problema: La página no muestra el formulario

**Causas posibles:**
1. Los parámetros del hash no se están leyendo correctamente
2. Error al establecer la sesión

**Solución:**
1. Abrir la consola del navegador (F12)
2. Buscar logs que empiecen con `[RestablecerPassword]`
3. Verificar si hay errores
4. Compartir los logs para depuración

### Problema: Error al actualizar contraseña

**Causas posibles:**
1. La contraseña no cumple los requisitos
2. La sesión expiró
3. Error de red

**Solución:**
1. Verificar que la contraseña cumple todos los requisitos:
   - Mínimo 8 caracteres
   - Al menos una mayúscula
   - Al menos una minúscula
   - Al menos un número
2. Si persiste, solicitar nuevo enlace

## 📝 Notas Importantes

1. **Seguridad**: Los tokens de recuperación expiran en 24 horas
2. **Un solo uso**: Cada token solo puede usarse una vez
3. **Sesión temporal**: La sesión de recuperación es temporal y se cierra después de actualizar la contraseña
4. **Validación**: La contraseña debe cumplir todos los requisitos de seguridad

## 🎯 Próximos Pasos

Si el problema persiste después de esta implementación:

1. **Verificar logs del navegador**:
   - Abrir DevTools (F12)
   - Ir a la pestaña Console
   - Buscar mensajes de `[RestablecerPassword]`
   - Compartir cualquier error

2. **Verificar configuración de Supabase**:
   - Ir a Authentication → Email Templates
   - Verificar que la plantilla "Reset Password" usa la URL correcta
   - Verificar que las Redirect URLs están configuradas

3. **Probar en modo incógnito**:
   - A veces el caché del navegador puede causar problemas
   - Probar en una ventana de incógnito

4. **Verificar email recibido**:
   - Copiar la URL completa del enlace
   - Verificar que contiene `#access_token=` y `&type=recovery`
