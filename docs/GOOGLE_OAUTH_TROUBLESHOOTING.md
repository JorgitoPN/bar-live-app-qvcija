
# 🔧 Solución de Problemas: Google OAuth

## 🎯 Guía Rápida de Diagnóstico

### ¿Dónde está fallando?

```
┌─────────────────────────────────────────────────────────────┐
│  1. ¿El botón de Google Sign-In no hace nada?              │
│     → Ver: "Botón no responde"                              │
│                                                               │
│  2. ¿Se abre el navegador pero da error inmediatamente?     │
│     → Ver: "Error de configuración de Google"               │
│                                                               │
│  3. ¿Puedes seleccionar cuenta pero luego da error?         │
│     → Ver: "Error de Client ID"                             │
│                                                               │
│  4. ¿Se autentica pero no vuelve a la app?                  │
│     → Ver: "Error de Deep Link"                             │
│                                                               │
│  5. ¿Vuelve a la app pero no inicia sesión?                 │
│     → Ver: "Error de sesión de Supabase"                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚫 Error: "Invalid client"

### Síntomas
- El navegador se abre
- Puedes seleccionar tu cuenta de Google
- Después de dar consentimiento, aparece error "Invalid client"

### Causa
El Client ID que Google está usando no está en la lista de "Authorized Client IDs" en Supabase.

### Solución

#### Paso 1: Identificar qué Client ID está usando

Revisa los logs de tu app:
```javascript
// En utils/auth.ts, agrega logs
console.log('[Google Auth] Platform:', Platform.OS);
console.log('[Google Auth] Redirect URL:', redirectUrl);
```

#### Paso 2: Verificar en Supabase Dashboard

1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/providers
2. Busca **Google** y expande
3. Verifica el campo **Authorized Client IDs**

#### Paso 3: Agregar el Client ID faltante

Formato correcto:
```
WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
```

**⚠️ IMPORTANTE:**
- NO agregues espacios después de las comas
- El Web Client ID debe ir PRIMERO
- Todos los IDs deben terminar en `.apps.googleusercontent.com`

#### Paso 4: Esperar y Probar

1. Guarda los cambios en Supabase
2. Espera 5-10 minutos (propagación de cambios)
3. Cierra completamente la app
4. Vuelve a abrir y prueba de nuevo

### Verificación

```bash
# En la consola de tu app, deberías ver:
[Google Auth] Sesión establecida para usuario: abc123...
[Google Auth] Google Sign-In completado exitosamente
```

---

## 🔗 Error: "Redirect URI mismatch"

### Síntomas
- El navegador se abre
- Inmediatamente aparece error "Redirect URI mismatch"
- No llegas a seleccionar cuenta de Google

### Causa
La URL de redirección que Supabase está usando no está autorizada en Google Cloud Console.

### Solución

#### Paso 1: Identificar la Redirect URI que falta

El error te dirá qué URI está intentando usar. Ejemplo:
```
Error: redirect_uri_mismatch
The redirect URI in the request: https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
does not match the ones authorized for the OAuth client.
```

#### Paso 2: Agregar la URI en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Ve a **APIs & Services** → **Credentials**
3. Click en tu credencial de **Web application**
4. En **Authorized redirect URIs**, agrega:

```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
http://localhost:19006/auth/callback
natively://auth/callback
com.barlive.app://auth/callback
```

5. Click **SAVE**

#### Paso 3: Esperar y Probar

1. Espera 5-10 minutos
2. Cierra completamente la app
3. Vuelve a abrir y prueba de nuevo

### Verificación

El navegador debería abrirse y mostrarte la pantalla de selección de cuenta de Google sin errores.

---

## 🔐 Error: "SHA-1 fingerprint mismatch" (Android)

### Síntomas
- Solo en Android
- El navegador se abre
- Aparece error relacionado con SHA-1 o firma de la app

### Causa
El SHA-1 configurado en Google Cloud Console no coincide con el SHA-1 del keystore usado para firmar la APK.

### Solución

#### Paso 1: Identificar qué keystore estás usando

**Para desarrollo (Expo Go o `expo run:android`):**
```bash
~/.android/debug.keystore
```

**Para build standalone:**
```bash
# El keystore que usas para firmar tu APK de producción
/path/to/your/release.keystore
```

#### Paso 2: Generar el SHA-1 correcto

**Debug:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**Release:**
```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your-alias
```

Copia el valor de **SHA1**:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

#### Paso 3: Actualizar en Google Cloud Console

1. Ve a **APIs & Services** → **Credentials**
2. Click en tu credencial de **Android** (Debug o Release según corresponda)
3. Actualiza el **SHA-1 certificate fingerprint**
4. Click **SAVE**

#### Paso 4: Verificar que el Client ID esté en Supabase

1. Copia el Client ID de la credencial Android que acabas de actualizar
2. Ve a Supabase Dashboard → Authentication → Providers → Google
3. Verifica que ese Client ID esté en **Authorized Client IDs**

#### Paso 5: Rebuild y Probar

```bash
# Limpiar build anterior
npx expo prebuild --platform android --clean

# Rebuild
npx expo run:android
```

### Verificación

```bash
# Verifica que el SHA-1 de tu APK instalada coincida
adb shell pm list packages -f | grep barlive
# Luego verifica la firma de esa APK
```

---

## 📱 Error: El navegador se abre pero no vuelve a la app

### Síntomas
- El navegador se abre correctamente
- Puedes autenticarte con Google
- Después de autenticarte, el navegador se queda abierto
- No vuelves automáticamente a la app

### Causa
Los deep links no están configurados correctamente o no están funcionando.

### Solución

#### Paso 1: Verificar configuración de app.json

Asegúrate de que `app.json` tenga:

```json
{
  "expo": {
    "scheme": "natively",
    "ios": {
      "bundleIdentifier": "com.barlive.app",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": [
              "natively",
              "com.barlive.app"
            ]
          }
        ]
      }
    },
    "android": {
      "package": "com.barlive.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "embntaqwlwmgazvrglaf.supabase.co",
              "pathPrefix": "/auth/v1/callback"
            },
            {
              "scheme": "natively"
            },
            {
              "scheme": "com.barlive.app"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    }
  }
}
```

#### Paso 2: Rebuild completo

```bash
# Limpiar todo
npx expo start --clear

# Rebuild nativo
npx expo prebuild --clean

# Android
npx expo run:android

# iOS
npx expo run:ios
```

#### Paso 3: Probar deep links manualmente

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW -d "natively://auth/callback?access_token=test" com.barlive.app
```

**iOS:**
```bash
xcrun simctl openurl booted "natively://auth/callback?access_token=test"
```

Si la app se abre, los deep links están funcionando.

#### Paso 4: Verificar redirect URL en utils/auth.ts

Asegúrate de que el redirect URL sea correcto:

```typescript
// Para native apps
redirectUrl = 'natively://auth/callback';

// NO uses:
// redirectUrl = 'exp://...'; // ❌ Incorrecto
// redirectUrl = 'http://localhost:...'; // ❌ Solo para web
```

### Verificación

Después de autenticarte con Google, deberías volver automáticamente a la app en menos de 2 segundos.

---

## 🔄 Error: Vuelve a la app pero no inicia sesión

### Síntomas
- El flujo de OAuth funciona
- Vuelves a la app
- Pero no se inicia sesión (sigues viendo la pantalla de login)

### Causa
Los tokens no se están procesando correctamente o hay un error al crear la sesión.

### Solución

#### Paso 1: Verificar logs

Agrega logs detallados en `utils/auth.ts`:

```typescript
export const signInWithGoogle = async () => {
  try {
    console.log('[Google Auth] 1. Iniciando Google Sign-In');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    
    console.log('[Google Auth] 2. OAuth data:', data);
    console.log('[Google Auth] 3. OAuth error:', error);
    
    if (data?.url) {
      console.log('[Google Auth] 4. Abriendo navegador:', data.url);
      
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );
      
      console.log('[Google Auth] 5. Resultado:', result.type);
      console.log('[Google Auth] 6. URL recibida:', result.url);
      
      // ... resto del código
    }
  } catch (error) {
    console.error('[Google Auth] Error:', error);
  }
};
```

#### Paso 2: Verificar que los tokens se extraen correctamente

```typescript
if (result.type === 'success') {
  const url = result.url;
  console.log('[Google Auth] URL completa:', url);
  
  // Extraer tokens
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  
  // Intentar desde hash
  if (url.includes('#')) {
    const hashParams = new URLSearchParams(url.split('#')[1]);
    accessToken = hashParams.get('access_token');
    refreshToken = hashParams.get('refresh_token');
    console.log('[Google Auth] Tokens desde hash:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
  }
  
  // Intentar desde query
  if (!accessToken && url.includes('?')) {
    const queryParams = new URLSearchParams(url.split('?')[1]);
    accessToken = queryParams.get('access_token');
    refreshToken = queryParams.get('refresh_token');
    console.log('[Google Auth] Tokens desde query:', { accessToken: !!accessToken, refreshToken: !!refreshToken });
  }
  
  if (accessToken && refreshToken) {
    console.log('[Google Auth] Estableciendo sesión...');
    
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    console.log('[Google Auth] Sesión establecida:', !!sessionData.user);
    console.log('[Google Auth] Error de sesión:', sessionError);
  } else {
    console.error('[Google Auth] No se encontraron tokens en la URL');
  }
}
```

#### Paso 3: Verificar creación de perfil

```typescript
if (sessionData.user) {
  console.log('[Google Auth] Usuario autenticado:', sessionData.user.id);
  
  // Esperar a que se cree el perfil
  const { success, profile } = await waitForUserProfile(sessionData.user.id);
  
  console.log('[Google Auth] Perfil encontrado:', success);
  console.log('[Google Auth] Datos del perfil:', profile);
  
  if (!success || !profile) {
    console.log('[Google Auth] Intentando crear perfil manualmente...');
    
    const nombre = sessionData.user.user_metadata?.full_name || 
                  sessionData.user.user_metadata?.name || 
                  sessionData.user.email?.split('@')[0] || 
                  'Usuario';
    
    const avatar = sessionData.user.user_metadata?.avatar_url || 
                  sessionData.user.user_metadata?.picture;
    
    const manualResult = await createUserProfileManually(
      sessionData.user.id,
      sessionData.user.email || '',
      nombre,
      avatar,
      'google'
    );
    
    console.log('[Google Auth] Perfil creado manualmente:', manualResult.success);
  }
}
```

#### Paso 4: Verificar trigger de base de datos

Ejecuta este SQL en Supabase para verificar que el trigger existe:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Si no existe, créalo:

```sql
-- Función para crear perfil automáticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, avatar, rol_app, provider, activo, fecha_registro)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'cliente',
    CASE 
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      ELSE 'barlive'
    END,
    true,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Verificación

Después de autenticarte, deberías ver en los logs:
```
[Google Auth] Sesión establecida: true
[Google Auth] Perfil encontrado: true
[Google Auth] Google Sign-In completado exitosamente
```

---

## 🐛 Error: "Provider not enabled"

### Síntomas
- Error inmediato al hacer click en "Sign in with Google"
- Mensaje: "Provider not enabled" o similar

### Causa
El proveedor de Google no está habilitado en Supabase.

### Solución

1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/providers
2. Busca **Google**
3. Asegúrate de que el toggle esté en **Enabled** (verde)
4. Verifica que tengas:
   - Client ID (Web)
   - Client Secret (Web)
5. Click **Save**

### Verificación

El botón de Google Sign-In debería abrir el navegador sin errores.

---

## ⏱️ Error: "Session expired" o tokens inválidos

### Síntomas
- La autenticación funciona inicialmente
- Después de un tiempo, la sesión se pierde
- Tienes que volver a iniciar sesión frecuentemente

### Causa
Los tokens de Supabase están expirando y no se están refrescando correctamente.

### Solución

#### Paso 1: Verificar configuración de sesión

En tu inicialización de Supabase (`utils/supabase.ts`):

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true, // ✅ Importante
      persistSession: true, // ✅ Importante
      detectSessionInUrl: true, // ✅ Importante para OAuth
    },
  }
);
```

#### Paso 2: Manejar cambios de sesión

```typescript
// En tu AuthContext o componente principal
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log('[Auth] Estado cambió:', event);
      console.log('[Auth] Sesión:', !!session);
      
      if (event === 'SIGNED_IN' && session) {
        // Usuario inició sesión
        console.log('[Auth] Usuario autenticado:', session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // Usuario cerró sesión
        console.log('[Auth] Usuario cerró sesión');
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refrescado automáticamente
        console.log('[Auth] Token refrescado');
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### Paso 3: Verificar tiempo de expiración en Supabase

1. Ve a https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/settings
2. Busca **JWT expiry limit**
3. Valor recomendado: `3600` (1 hora)

### Verificación

La sesión debería mantenerse activa y refrescarse automáticamente sin que el usuario tenga que volver a iniciar sesión.

---

## 📊 Checklist de Diagnóstico Completo

Usa este checklist para diagnosticar cualquier problema:

### Google Cloud Console
- [ ] Credencial Web existe
- [ ] Credencial Android Debug existe (con SHA-1 correcto)
- [ ] Credencial Android Release existe (con SHA-1 correcto)
- [ ] Credencial iOS existe (con Bundle ID correcto)
- [ ] Redirect URIs configuradas en credencial Web
- [ ] OAuth Consent Screen configurado

### Supabase Dashboard
- [ ] Google Provider está Enabled
- [ ] Client ID (Web) configurado
- [ ] Client Secret (Web) configurado
- [ ] Todos los Client IDs en "Authorized Client IDs"
- [ ] Sin espacios extra en "Authorized Client IDs"
- [ ] Cambios guardados (Click Save)

### Aplicación
- [ ] `app.json` tiene scheme configurado
- [ ] `app.json` tiene intentFilters (Android)
- [ ] `app.json` tiene CFBundleURLTypes (iOS)
- [ ] `utils/auth.ts` usa redirect URL correcto
- [ ] App rebuildeada después de cambios
- [ ] Caché limpiada

### Pruebas
- [ ] Logs detallados agregados
- [ ] Probado en Expo Go
- [ ] Probado en build standalone
- [ ] Deep links funcionan manualmente
- [ ] Sesión persiste después de cerrar app

---

## 🆘 Comandos Útiles para Debugging

### Ver logs en tiempo real

**Android:**
```bash
adb logcat | grep -i "google\|auth\|oauth"
```

**iOS:**
```bash
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "BarLive"'
```

### Limpiar completamente

```bash
# Limpiar caché de Expo
npx expo start --clear

# Limpiar node_modules
rm -rf node_modules
npm install

# Limpiar builds nativos
rm -rf android ios
npx expo prebuild --clean

# Rebuild
npx expo run:android
npx expo run:ios
```

### Verificar configuración de deep links

**Android:**
```bash
adb shell dumpsys package com.barlive.app | grep -A 20 "android.intent.action.VIEW"
```

**iOS:**
```bash
xcrun simctl openurl booted "natively://test"
```

---

## 💡 Consejos Finales

1. **Siempre revisa los logs**: Los logs te dirán exactamente dónde está fallando
2. **Espera después de cambios**: Google Cloud Console puede tardar 5-10 minutos en propagar cambios
3. **Rebuild después de cambios**: Cualquier cambio en `app.json` requiere rebuild
4. **Prueba en dispositivo real**: Algunos problemas solo aparecen en dispositivos reales
5. **Documenta tus Client IDs**: Guárdalos en un lugar seguro para referencia futura

---

## 📚 Recursos Adicionales

- [Guía Completa](./GOOGLE_OAUTH_SETUP_COMPLETO.md)
- [Checklist Rápido](./GOOGLE_OAUTH_CHECKLIST.md)
- [Diagrama de Flujo](./GOOGLE_OAUTH_FLOW_DIAGRAM.md)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Expo Auth Session Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)

---

Si después de seguir esta guía sigues teniendo problemas, revisa los logs detalladamente y compáralos con los ejemplos de esta guía. La mayoría de los problemas se pueden resolver verificando que todos los Client IDs y redirect URIs estén configurados correctamente.

¡Buena suerte! 🚀
