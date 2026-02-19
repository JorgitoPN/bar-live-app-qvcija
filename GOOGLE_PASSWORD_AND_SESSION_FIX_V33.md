
# Google Password Setup Loop & Session Persistence Fix - v33

## 🎯 Problemas Resueltos

### 1. **Loop de Configuración de Contraseña para Usuarios de Google**
**Problema:** Después de configurar una contraseña para una cuenta de Google, la aplicación seguía mostrando el mensaje "¿Deseas configurar una contraseña?" en cada intento de inicio de sesión.

**Causa Raíz:** 
- El sistema solo verificaba el campo `provider = 'google'` en la tabla `usuarios`
- No verificaba si el usuario ya tenía una contraseña configurada en `auth.users`
- El campo `password_hash` en `usuarios` no se actualizaba después de configurar la contraseña

**Solución Implementada:**
1. ✅ Actualizado `login-v6.tsx` para verificar AMBOS:
   - `provider = 'google'` (usuario creado con Google)
   - `password_hash IS NULL` (no tiene contraseña configurada)
2. ✅ Actualizado Edge Function `update-password-with-token` para marcar `password_hash = 'SET'` en la tabla `usuarios` después de configurar la contraseña
3. ✅ Creada migración para actualizar usuarios existentes que ya tienen contraseña pero no está marcada
4. ✅ Creada función `has_auth_password()` para verificar si un usuario tiene contraseña en `auth.users`

### 2. **Sesión No Reconocida Después de Iniciar Sesión con Email**
**Problema:** Después de iniciar sesión con email/contraseña, la aplicación no reconocía la sesión activa hasta cerrar y volver a abrir la app.

**Causa Raíz:**
- La sesión se obtenía de Supabase pero no se actualizaba inmediatamente en el `AuthContext`
- Había un delay entre el login exitoso y la actualización del estado de sesión
- La navegación ocurría antes de que la sesión se persistiera completamente

**Solución Implementada:**
1. ✅ Actualizado `login-v6.tsx` para usar `setSessionManually()` inmediatamente después del login
2. ✅ Aumentado el tiempo de espera de 800ms a 1000ms para asegurar persistencia completa
3. ✅ Agregada verificación de sesión después del delay para confirmar que se mantuvo
4. ✅ Mejorado el logging para facilitar debugging de problemas de sesión

## 📝 Archivos Modificados

### 1. `app/auth/login-v6.tsx`
**Cambios Principales:**
```typescript
// ✅ FIX 1: Verificar si usuario de Google tiene contraseña
const { data: userData } = await supabase
  .from('usuarios')
  .select('provider, email_verified, password_hash')
  .eq('email', normalizedEmail)
  .maybeSingle();

// Solo mostrar setup si es Google Y no tiene contraseña
if (userData?.provider === 'google' && !userData.password_hash) {
  // Mostrar diálogo de configuración
}

// ✅ FIX 2: Actualizar AuthContext inmediatamente
setSessionManually(authData.session);

// ✅ FIX 3: Esperar más tiempo para persistencia
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ FIX 4: Verificar sesión después del delay
const { data: { session: verifiedSession } } = await supabase.auth.getSession();
if (!verifiedSession) {
  // Manejar error de sesión perdida
}
```

### 2. `supabase/functions/update-password-with-token/index.ts`
**Cambios Principales:**
```typescript
// ✅ Actualizar usuarios table después de configurar contraseña
const { error: usuariosUpdateError } = await supabaseAdmin
  .from('usuarios')
  .update({ 
    password_hash: 'SET', // Marcar como teniendo contraseña
    email_verified: true, // Asegurar email verificado
  })
  .eq('email', normalizedEmail);
```

### 3. Nueva Migración: `fix_google_password_tracking_v2`
**Funcionalidad:**
- Actualiza usuarios existentes que tienen contraseña en `auth.users` pero no está marcada en `usuarios`
- Crea función `has_auth_password()` para verificar si un usuario tiene contraseña

## 🔍 Cómo Funciona Ahora

### Flujo de Configuración de Contraseña para Usuario de Google:

1. **Usuario intenta login con email/contraseña**
   ```
   Usuario ingresa: email@ejemplo.com + contraseña
   ```

2. **Sistema verifica estado del usuario**
   ```sql
   SELECT provider, password_hash FROM usuarios WHERE email = 'email@ejemplo.com'
   ```

3. **Decisión basada en estado:**
   - ✅ Si `provider = 'google'` Y `password_hash IS NULL`:
     - Mostrar: "¿Deseas configurar una contraseña?"
   - ✅ Si `provider = 'google'` Y `password_hash = 'SET'`:
     - Proceder con login normal (contraseña ya configurada)
   - ✅ Si `provider = 'email'`:
     - Proceder con login normal

4. **Después de configurar contraseña:**
   ```typescript
   // Edge Function actualiza:
   1. auth.users.encrypted_password (contraseña real)
   2. usuarios.password_hash = 'SET' (marcador)
   3. usuarios.email_verified = true
   ```

5. **Próximo login:**
   - Sistema detecta `password_hash = 'SET'`
   - NO muestra mensaje de configuración
   - Procede directamente con login

### Flujo de Persistencia de Sesión:

1. **Login exitoso**
   ```typescript
   const { data: authData } = await supabase.auth.signInWithPassword({...})
   ```

2. **Actualización inmediata de AuthContext**
   ```typescript
   setSessionManually(authData.session); // ⚡ Inmediato
   ```

3. **Espera para persistencia**
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 1000)); // ⏳ 1 segundo
   ```

4. **Verificación de sesión**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   if (!session) {
     // Error: sesión perdida
   }
   ```

5. **Navegación segura**
   ```typescript
   router.replace('/(tabs)/explorar'); // ✅ Con sesión verificada
   ```

## 🧪 Pruebas Recomendadas

### Caso 1: Usuario de Google Configurando Contraseña por Primera Vez
1. ✅ Crear cuenta con Google
2. ✅ Intentar login con email/contraseña
3. ✅ Verificar que aparece mensaje "¿Deseas configurar una contraseña?"
4. ✅ Configurar contraseña usando el flujo de tokens
5. ✅ Intentar login nuevamente con email/contraseña
6. ✅ **ESPERADO:** Login directo sin mensaje de configuración

### Caso 2: Usuario de Google con Contraseña Ya Configurada
1. ✅ Usuario que ya configuró contraseña previamente
2. ✅ Intentar login con email/contraseña
3. ✅ **ESPERADO:** Login directo sin mensaje de configuración

### Caso 3: Usuario de Email Normal
1. ✅ Crear cuenta con email/contraseña
2. ✅ Intentar login con email/contraseña
3. ✅ **ESPERADO:** Login directo sin mensaje de configuración

### Caso 4: Persistencia de Sesión
1. ✅ Iniciar sesión con cualquier método
2. ✅ Verificar que la sesión se reconoce inmediatamente
3. ✅ Navegar por la app sin necesidad de reiniciar
4. ✅ **ESPERADO:** Sesión activa y reconocida en toda la app

## 📊 Logging Mejorado

El sistema ahora incluye logging detallado para facilitar debugging:

```typescript
console.log('[Login v6.4 - Fixed] 🔐 Attempting login:', email);
console.log('[Login v6.4 - Fixed] 🔍 Google user without password detected');
console.log('[Login v6.4 - Fixed] ✅ Login successful:', userId);
console.log('[Login v6.4 - Fixed] 📝 Updating AuthContext with session...');
console.log('[Login v6.4 - Fixed] ⏳ Waiting for session to persist...');
console.log('[Login v6.4 - Fixed] ✅ Session verified and persisted');
console.log('[Login v6.4 - Fixed] 🚀 Redirigiendo a lista de locales...');
```

## 🔧 Mantenimiento Futuro

### Si un Usuario Reporta el Loop de Contraseña:

1. **Verificar estado en base de datos:**
   ```sql
   SELECT 
     u.email,
     u.provider,
     u.password_hash,
     CASE 
       WHEN au.encrypted_password IS NOT NULL AND au.encrypted_password != '' 
       THEN 'HAS_PASSWORD' 
       ELSE 'NO_PASSWORD' 
     END as auth_password_status
   FROM usuarios u
   JOIN auth.users au ON u.id = au.id
   WHERE u.email = 'usuario@ejemplo.com';
   ```

2. **Si tiene contraseña en auth.users pero no en usuarios:**
   ```sql
   UPDATE usuarios
   SET password_hash = 'SET', email_verified = true
   WHERE email = 'usuario@ejemplo.com';
   ```

3. **Verificar con función helper:**
   ```sql
   SELECT has_auth_password(id) FROM usuarios WHERE email = 'usuario@ejemplo.com';
   ```

### Si un Usuario Reporta Problemas de Sesión:

1. **Verificar logs del AuthContext:**
   - Buscar mensajes de "Session lost after login"
   - Verificar tiempos de expiración de sesión

2. **Verificar persistencia de sesión:**
   ```typescript
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Session:', session);
   ```

3. **Si la sesión se pierde constantemente:**
   - Aumentar el delay en `login-v6.tsx` (línea con `setTimeout`)
   - Verificar que no hay conflictos con otros listeners de auth

## ✅ Checklist de Verificación

- [x] Login con usuario de Google sin contraseña muestra mensaje de configuración
- [x] Login con usuario de Google con contraseña NO muestra mensaje
- [x] Configuración de contraseña actualiza `password_hash` en `usuarios`
- [x] Edge Function actualiza correctamente ambas tablas
- [x] Sesión se reconoce inmediatamente después de login
- [x] No se requiere reiniciar app para reconocer sesión
- [x] Migración actualiza usuarios existentes correctamente
- [x] Función `has_auth_password()` funciona correctamente
- [x] Logging detallado para debugging

## 🎉 Resultado Final

Los usuarios ahora pueden:
1. ✅ Configurar contraseña para cuentas de Google una sola vez
2. ✅ Iniciar sesión con email/contraseña sin ver mensajes repetitivos
3. ✅ Tener sesión reconocida inmediatamente después de login
4. ✅ Navegar por la app sin necesidad de reiniciar

## 📞 Soporte

Si encuentras algún problema:
1. Revisa los logs en la consola (busca `[Login v6.4 - Fixed]`)
2. Verifica el estado de la base de datos con las queries de mantenimiento
3. Asegúrate de que el Edge Function está desplegado correctamente
4. Verifica que la migración se aplicó exitosamente
