
# Guía de Depuración de Autenticación

## Problema Actual

El error "No pudo completar la autenticación" ocurre **después de que la autenticación en el servidor de Supabase es exitosa**. Los logs del servidor muestran:

```
"action":"login","actor_name":"Jorge Pérez","provider":"google","status":302
```

Esto significa que:
- ✅ Google OAuth funciona correctamente
- ✅ Supabase recibe y procesa la autenticación
- ✅ El servidor crea la sesión
- ❌ **El cliente no detecta o no persiste la sesión**

## Diagnóstico Implementado

He añadido las siguientes mejoras de diagnóstico:

### 1. Inspección de Storage (NUEVO)
La función `inspectStorage()` ahora verifica:
- SecureStore (iOS/Android)
- AsyncStorage (fallback)
- localStorage (Web)

Y muestra:
- Si la sesión está almacenada
- Si los tokens están presentes
- Cuándo expira la sesión
- El email del usuario

### 2. Estrategias de Recuperación Mejoradas

#### Estrategia 1: Detección Automática
- Espera 3 segundos (aumentado de 2s)
- Permite que Supabase detecte automáticamente la sesión de la URL

#### Estrategia 2: Reintentos con Backoff Exponencial
- 10 intentos (aumentado de 8)
- Delay inicial: 500ms
- Delay máximo: 3000ms

#### Estrategia 3: Restauración Manual desde Storage
- Lee directamente del storage
- Intenta establecer la sesión manualmente

#### Estrategia 4: Extracción de Tokens de URL
- Para web, extrae tokens del hash de la URL
- Establece la sesión manualmente

#### Estrategia 5: Refresh desde Storage (NUEVO)
- Si hay un refresh_token en storage
- Intenta refrescar la sesión
- Útil si la sesión expiró durante el proceso

### 3. Logging Mejorado

Ahora se registra:
- Cada paso del proceso de autenticación
- El contenido del storage en múltiples puntos
- Los primeros 20 caracteres del access_token
- Timestamps de expiración de sesión

## Qué Verificar

### 1. URLs de Redirección en Supabase

Ve a tu proyecto de Supabase:
1. Authentication > URL Configuration
2. Verifica que estas URLs estén configuradas:

```
natively://auth/callback
exp://[tu-ip]:8081/--/auth/callback
http://localhost:8081/auth/callback
https://[tu-dominio]/auth/callback
```

### 2. Permisos de Storage

En iOS/Android, verifica que la app tenga permisos para:
- SecureStore (Keychain en iOS)
- AsyncStorage

### 3. Configuración de Google OAuth

En Google Cloud Console:
1. Ve a APIs & Services > Credentials
2. Verifica que las URLs de redirección coincidan con las de Supabase

### 4. Logs en Tiempo Real

Cuando ejecutes la app, observa los logs en la consola:

```bash
# Busca estos mensajes clave:
[Callback] 🔍 === INSPECCIÓN DE STORAGE ===
[Callback] ✅ SecureStore: Sesión encontrada
[Callback] ✅ Sesión encontrada en intento X
[AuthContext] ✅ Sesión existente encontrada para: [email]
```

## Posibles Causas del Problema

### 1. Storage No Funciona
**Síntoma**: Los logs muestran "No hay sesión almacenada" en todas las inspecciones.

**Solución**:
- Verifica permisos de la app
- Prueba en un dispositivo diferente
- Verifica que SecureStore esté instalado correctamente

### 2. Timing Issue
**Síntoma**: La sesión se almacena pero no se detecta a tiempo.

**Solución**:
- Los delays ya se han aumentado
- Verifica la velocidad de la conexión
- Prueba en una red más rápida

### 3. URL de Redirección Incorrecta
**Síntoma**: El callback se ejecuta pero no hay tokens en la URL.

**Solución**:
- Verifica las URLs en Supabase Dashboard
- Asegúrate de que coincidan exactamente
- Incluye el esquema correcto (natively://)

### 4. Sesión Expira Inmediatamente
**Síntoma**: La sesión se encuentra pero expira antes de usarse.

**Solución**:
- Verifica la hora del sistema
- Asegúrate de que no haya diferencias de zona horaria
- Verifica la configuración de JWT en Supabase

## Próximos Pasos

1. **Ejecuta la app y observa los logs**
   - Busca el mensaje "=== INSPECCIÓN DE STORAGE ==="
   - Anota qué storage tiene la sesión (si alguno)

2. **Toma una captura de los logs completos**
   - Especialmente la sección de debug en la parte inferior de la pantalla
   - Comparte los últimos 20 mensajes de debug

3. **Verifica las URLs de redirección**
   - En Supabase Dashboard
   - En Google Cloud Console
   - Asegúrate de que coincidan

4. **Prueba en diferentes plataformas**
   - iOS
   - Android
   - Web
   - Anota en cuál funciona y en cuál no

## Información Adicional

### Formato de Sesión en Storage

La sesión se almacena con esta estructura:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "...",
  "expires_at": 1234567890,
  "user": {
    "id": "...",
    "email": "...",
    ...
  }
}
```

### Clave de Storage

La sesión se almacena con la clave: `supabase.auth.token`

### Duración de Sesión

Por defecto, las sesiones de Supabase duran:
- Access token: 1 hora
- Refresh token: 30 días

## Contacto

Si después de seguir estos pasos el problema persiste, proporciona:

1. Los logs completos de la pantalla de debug
2. La plataforma donde ocurre (iOS/Android/Web)
3. Las URLs de redirección configuradas en Supabase
4. Si el storage muestra alguna sesión almacenada
