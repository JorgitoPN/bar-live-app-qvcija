
# 🔧 Correcciones de Autenticación y Feed Social - Barlive

## 📋 Resumen de Problemas y Soluciones

### ✅ 1. Generación Automática de Nombre de Usuario

**Problema:** El sistema debe asignar automáticamente un nombre de usuario al registrar una nueva cuenta.

**Solución:** ✅ **YA IMPLEMENTADO**

El sistema ya genera automáticamente un nombre de usuario único durante el registro en `app/auth/registro-v6.tsx`:

```typescript
// Genera un nombre de usuario único basado en el nombre del usuario
const generatedUsername = await generateUsername(nombre.trim());

// Se actualiza en la base de datos
await supabase
  .from('usuarios')
  .update({ username: generatedUsername })
  .eq('id', authData.user.id);
```

**Características:**
- El nombre de usuario se genera automáticamente a partir del nombre completo
- Se normaliza eliminando acentos y caracteres especiales
- Se verifica que sea único en la base de datos
- Si ya existe, se añade un número al final (ej: `jorge_perez1`, `jorge_perez2`)
- El usuario puede modificarlo posteriormente desde la página de editar perfil

**Archivo:** `utils/usernameGenerator.ts`

---

### ✅ 2. Filtrado de Momentos por Usuarios Seguidos

**Problema:** Los usuarios ven momentos de personas que no siguen, cuando deberían ver solo momentos de usuarios/locales que siguen.

**Solución:** ✅ **IMPLEMENTADO**

Se ha corregido el componente `MomentoCarousel.tsx` para filtrar correctamente los momentos:

**Cambios realizados:**

1. **Obtener lista de seguidos:**
```typescript
// Obtener usuarios y locales que el usuario sigue
const { data: followedData } = await supabase
  .from('seguidores')
  .select('seguido_id, local_id')
  .eq('seguidor_id', user.id);

const followedUserIds = new Set(
  followedData?.filter(f => f.seguido_id).map(f => f.seguido_id) || []
);

const followedLocalIds = new Set(
  followedData?.filter(f => f.local_id).map(f => f.local_id) || []
);
```

2. **Filtrar momentos:**
```typescript
const filteredMomentos = momentosData.filter((momento: any) => {
  // Siempre mostrar propios momentos
  if (isOwnUserMomento || isOwnLocalMomento) {
    return true;
  }

  // Mostrar momentos de usuarios seguidos
  if (momento.tipo === 'usuario' && followedUserIds.has(momento.autor_id)) {
    return true;
  }

  // Mostrar momentos de locales seguidos
  if (momento.tipo === 'local' && momento.local_id && followedLocalIds.has(momento.local_id)) {
    return true;
  }

  return false;
});
```

**Resultado:**
- ✅ Solo se muestran momentos de usuarios/locales que el usuario sigue
- ✅ Siempre se muestran los propios momentos del usuario
- ✅ Si no sigues a nadie, solo verás tus propios momentos

**Archivo:** `components/momento/MomentoCarousel.tsx`

---

### ✅ 3. Persistencia de Sesión Después de Iniciar Sesión

**Problema:** Después de iniciar sesión, la aplicación no reconoce correctamente la sesión activa y continúan mostrándose pantallas con "Inicia sesión para ver contenido".

**Solución:** ✅ **IMPLEMENTADO**

Se han realizado múltiples mejoras para garantizar la persistencia de la sesión:

**Cambios en `app/auth/login-v6.tsx`:**

```typescript
// ✅ CRITICAL FIX: Esperar a que la sesión se persista antes de navegar
console.log('[Login v6.3 - Token] ⏳ Waiting for session to persist...');
await new Promise(resolve => setTimeout(resolve, 800));

// Verificar que la sesión sigue válida
const { data: { session: verifiedSession } } = await supabase.auth.getSession();

if (!verifiedSession) {
  console.error('[Login v6.3 - Token] ❌ Session lost after login');
  Alert.alert('Error', 'Hubo un problema con la sesión. Por favor, intenta nuevamente.');
  setLoading(false);
  return;
}

console.log('[Login v6.3 - Token] ✅ Session verified and persisted');
router.replace('/(tabs)/explorar');
```

**Cambios en `contexts/AuthContext.tsx`:**

```typescript
// ✅ CRITICAL FIX: Actualizar sesión INMEDIATAMENTE para todos los eventos
if (currentSession) {
  console.log('[AuthContext] 📝 Actualizando sesión inmediatamente');
  setSession(currentSession);
  setSessionReady(true);
} else {
  console.log('[AuthContext] 📝 Limpiando sesión');
  setSession(null);
  setSessionReady(false);
}

// ✅ CRITICAL FIX: Esperar y verificar sesión después de login
if (event === 'SIGNED_IN' && currentSession) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const { data: { session: verifiedSession } } = await supabase.auth.getSession();
  
  if (!verifiedSession) {
    console.error('[AuthContext] ❌ Session lost after wait');
    setLoading(false);
    return;
  }
  
  console.log('[AuthContext] ✅ Session verified after wait');
  // ... continuar con carga de perfil
}
```

**Resultado:**
- ✅ La sesión se establece inmediatamente al iniciar sesión
- ✅ Se verifica que la sesión persista antes de navegar
- ✅ El contexto de autenticación actualiza el estado de sesión correctamente
- ✅ Las pantallas reconocen la sesión activa y no muestran "Inicia sesión"

**Archivos modificados:**
- `app/auth/login-v6.tsx`
- `contexts/AuthContext.tsx`
- `components/common/LoginPrompt.tsx` (actualizado para usar `/auth/login-v6` y `/auth/registro-v6`)

---

### ✅ 4. Verificación Única para Usuarios de Google

**Problema:** Al restablecer la contraseña de una cuenta creada con Google, el sistema solicita verificación en cada inicio de sesión.

**Solución:** ✅ **IMPLEMENTADO**

Se ha actualizado la Edge Function `update-password-with-token` para verificar automáticamente el email cuando un usuario de Google configura una contraseña:

**Cambios en `supabase/functions/update-password-with-token/index.ts`:**

```typescript
// ✅ CRITICAL FIX: Actualizar contraseña Y verificar email en una operación
const updatePayload: any = { password: newPassword };

// Si el usuario es de Google O el email no está confirmado, verificar el email
if (isGoogleUser || !user.email_confirmed_at) {
  console.log('[UpdatePasswordWithToken] ✅ Also verifying email (Google user or unverified)');
  updatePayload.email_confirm = true;
}

const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
  user.id,
  updatePayload
);

// ✅ CRITICAL FIX: Actualizar provider y email_verified para usuarios de Google
if (isGoogleUser) {
  await supabaseAdmin
    .from('usuarios')
    .update({ 
      provider: 'barlive',
      email_verified: true,
      updated_at: new Date().toISOString()
    })
    .eq('email', normalizedEmail);
} else {
  // Para restablecimiento de contraseña regular, actualizar email_verified
  await supabaseAdmin
    .from('usuarios')
    .update({ 
      email_verified: true,
      updated_at: new Date().toISOString()
    })
    .eq('email', normalizedEmail);
}
```

**Resultado:**
- ✅ Cuando un usuario de Google configura una contraseña, su email se verifica automáticamente
- ✅ El campo `provider` se actualiza de `google` a `barlive`
- ✅ El campo `email_verified` se establece en `true` en la tabla `usuarios`
- ✅ El campo `email_confirmed_at` se establece en `auth.users`
- ✅ No se solicita verificación en inicios de sesión posteriores

**Archivo:** `supabase/functions/update-password-with-token/index.ts` (Edge Function desplegada)

---

## 🔍 Verificación de Correcciones

### Cómo verificar que todo funciona correctamente:

#### 1. Generación Automática de Username
1. Registra una nueva cuenta en `/auth/registro-v6`
2. Completa el formulario con tu nombre
3. Verifica que recibes un mensaje indicando el username generado
4. Inicia sesión y ve a editar perfil
5. Confirma que puedes ver y editar tu username

#### 2. Filtrado de Momentos
1. Inicia sesión con un usuario que no sigue a nadie
2. Ve a la página Social
3. Verifica que solo ves tu propio momento (si lo tienes)
4. No deberías ver momentos de otros usuarios
5. Sigue a un usuario
6. Ahora deberías ver los momentos de ese usuario

#### 3. Persistencia de Sesión
1. Cierra sesión completamente
2. Inicia sesión con email y contraseña
3. Espera a que se complete el login (verás un pequeño delay de 800ms)
4. Verifica que la app te lleva a la página de explorar
5. Navega a la página Social
6. Confirma que NO ves el mensaje "Inicia sesión para ver contenido"
7. Verifica que puedes ver el feed social correctamente

#### 4. Verificación Única para Google Users
1. Crea una cuenta con Google (o usa una existente)
2. Intenta iniciar sesión con email/contraseña
3. El sistema te pedirá configurar una contraseña
4. Sigue el flujo de configuración de contraseña con token
5. Una vez configurada la contraseña, inicia sesión
6. Verifica que NO te pide verificar el email
7. Cierra sesión e inicia sesión nuevamente
8. Confirma que NO te pide verificación en inicios de sesión posteriores

---

## 📊 Tablas de Base de Datos Involucradas

### `usuarios`
- `username` - Nombre de usuario único (generado automáticamente)
- `email_verified` - Indica si el email ha sido verificado
- `provider` - Proveedor de autenticación (`barlive`, `google`)

### `seguidores`
- `seguidor_id` - ID del usuario que sigue
- `seguido_id` - ID del usuario seguido
- `local_id` - ID del local seguido (opcional)

### `momentos`
- `autor_id` - ID del autor del momento
- `tipo` - Tipo de autor (`usuario` o `local`)
- `local_id` - ID del local (si tipo = `local`)
- `expires_at` - Fecha de expiración (24 horas)

### `verification_tokens`
- `email` - Email del usuario
- `token` - Token de verificación de 6 dígitos
- `expires_at` - Fecha de expiración (1 hora)
- `used` - Indica si el token ya fue usado

### `password_tokens`
- `email` - Email del usuario
- `token` - Token de restablecimiento de 6 dígitos
- `expires_at` - Fecha de expiración (1 hora)
- `used` - Indica si el token ya fue usado

---

## 🚀 Edge Functions Actualizadas

### `update-password-with-token` (v8)
- ✅ Verifica automáticamente el email al configurar contraseña
- ✅ Actualiza el provider de `google` a `barlive`
- ✅ Establece `email_verified` en `true`
- ✅ Previene solicitudes de verificación repetidas

---

## 📝 Archivos Modificados

1. **components/momento/MomentoCarousel.tsx**
   - Añadido filtrado por usuarios/locales seguidos
   - Solo muestra momentos de seguidos + propios momentos

2. **contexts/AuthContext.tsx**
   - Mejorada la persistencia de sesión
   - Actualización inmediata del estado de sesión
   - Verificación de sesión después de login

3. **app/auth/login-v6.tsx**
   - Añadido delay para persistencia de sesión
   - Verificación de sesión antes de navegar
   - Mejor manejo de errores

4. **components/common/LoginPrompt.tsx**
   - Actualizado para usar rutas v6 (`/auth/login-v6`, `/auth/registro-v6`)

5. **supabase/functions/update-password-with-token/index.ts** (Edge Function)
   - Verificación automática de email para usuarios de Google
   - Actualización de provider y email_verified
   - Prevención de verificaciones repetidas

---

## 🎯 Flujos Corregidos

### Flujo de Registro
1. Usuario completa formulario de registro
2. Sistema genera username automáticamente
3. Se crea cuenta en `auth.users` y `usuarios`
4. Se envía token de verificación por email
5. Usuario introduce token de 6 dígitos
6. Sistema verifica email y marca cuenta como verificada
7. Usuario puede iniciar sesión sin verificaciones adicionales

### Flujo de Login
1. Usuario introduce email y contraseña
2. Sistema valida credenciales
3. **NUEVO:** Se espera 800ms para persistencia de sesión
4. **NUEVO:** Se verifica que la sesión sigue válida
5. Se navega a la página de explorar
6. La sesión está activa y reconocida en toda la app

### Flujo de Momentos
1. Usuario abre la página Social
2. Sistema carga lista de usuarios/locales seguidos
3. **NUEVO:** Se filtran momentos para mostrar solo de seguidos
4. Se muestran momentos propios + momentos de seguidos
5. Si no sigues a nadie, solo ves tus propios momentos

### Flujo de Google User → Email/Password
1. Usuario de Google intenta login con email/password
2. Sistema detecta que es usuario de Google
3. Ofrece configurar contraseña
4. Usuario solicita token de verificación
5. Usuario introduce token y nueva contraseña
6. **NUEVO:** Sistema verifica email automáticamente
7. **NUEVO:** Actualiza provider a `barlive`
8. **NUEVO:** Marca email como verificado
9. Usuario puede iniciar sesión sin verificaciones adicionales

---

## 🔐 Seguridad

Todas las correcciones mantienen los estándares de seguridad:

- ✅ Tokens de verificación expiran en 1 hora
- ✅ Tokens de un solo uso (no reutilizables)
- ✅ Validación de email en servidor (Edge Functions)
- ✅ Actualización segura de `auth.users` con Service Role Key
- ✅ RLS policies activas en todas las tablas

---

## 📱 Compatibilidad

Todas las correcciones son compatibles con:

- ✅ iOS
- ✅ Android
- ✅ Web (Expo)

---

## 🐛 Debugging

Si encuentras problemas, revisa los logs en la consola:

```
[MomentoCarousel] - Logs de carga y filtrado de momentos
[AuthContext] - Logs de estado de sesión
[Login v6.3 - Token] - Logs de proceso de login
[UpdatePasswordWithToken] - Logs de actualización de contraseña
```

---

## 📞 Soporte

Si necesitas ayuda adicional:
- Revisa los logs de la consola
- Verifica que las Edge Functions estén desplegadas
- Comprueba que los tokens no hayan expirado
- Contacta con soporte técnico en soporte@barlive.es

---

**Fecha de implementación:** 25 de enero de 2025  
**Versión:** 1.0  
**Estado:** ✅ Completado y probado
