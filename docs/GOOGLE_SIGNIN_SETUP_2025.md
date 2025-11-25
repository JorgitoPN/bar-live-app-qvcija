
# Configuración de Google Sign-In para BarLive - 2025

## Resumen del Problema

El inicio de sesión con Google ha dejado de funcionar en Android e iOS. Este documento proporciona una guía completa para reconfigurar el sistema desde cero.

## Arquitectura del Sistema

### Flujo de Autenticación

1. **Usuario hace clic en "Continuar con Google"**
2. **App abre navegador** con URL de OAuth de Supabase
3. **Usuario se autentica** en Google
4. **Google redirige** a la URL de callback con tokens
5. **App captura** los tokens del deep link
6. **Supabase establece** la sesión del usuario
7. **App crea/obtiene** el perfil del usuario
8. **Usuario es redirigido** a la pantalla apropiada

### Componentes Clave

- **`utils/auth.ts`**: Lógica de autenticación con Google
- **`app/auth/callback.tsx`**: Maneja el callback de OAuth
- **`app/_layout.tsx`**: Escucha deep links
- **`utils/supabase.ts`**: Cliente de Supabase configurado
- **`app.json`**: Configuración de esquemas de URL

## Configuración Paso a Paso

### 1. Configurar Google Cloud Console

#### A. Crear Proyecto (si no existe)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+ (Google People API)

#### B. Configurar Pantalla de Consentimiento

1. Ve a **APIs & Services** > **OAuth consent screen**
2. Selecciona **External** (o Internal si es para organización)
3. Completa la información:
   - **App name**: BarLive
   - **User support email**: tu email
   - **App logo**: (opcional) logo de BarLive
   - **App domain**: `barlive.app` (si tienes dominio personalizado)
   - **Authorized domains**: 
     - `supabase.co`
     - `barlive.app` (si aplica)
   - **Developer contact information**: tu email
4. En **Scopes**, agrega:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. Guarda y continúa

#### C. Crear Credenciales OAuth 2.0

##### Para Web (Requerido para todos)

1. Ve a **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Selecciona **Web application**
4. Nombre: "BarLive Web"
5. **Authorized JavaScript origins**:
   - `http://localhost:19006` (desarrollo local)
   - `https://embntaqwlwmgazvrglaf.supabase.co` (Supabase)
6. **Authorized redirect URIs**:
   - `http://localhost:19006/auth/callback` (desarrollo local)
   - `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback` (Supabase)
7. Click **Create**
8. **GUARDA** el Client ID y Client Secret

##### Para Android

1. Click **Create Credentials** > **OAuth client ID**
2. Selecciona **Android**
3. Nombre: "BarLive Android"
4. **Package name**: `com.barlive.app`
5. **SHA-1 certificate fingerprint**:

   **Para desarrollo (debug):**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

   **Para producción (release):**
   ```bash
   keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
   ```

6. Copia el SHA-1 y pégalo en el campo
7. Click **Create**
8. **GUARDA** el Client ID

**IMPORTANTE**: Necesitas crear DOS credenciales Android:
- Una con el SHA-1 de debug (para desarrollo)
- Una con el SHA-1 de release (para producción)

##### Para iOS

1. Click **Create Credentials** > **OAuth client ID**
2. Selecciona **iOS**
3. Nombre: "BarLive iOS"
4. **Bundle ID**: `com.barlive.app`
5. **App Store ID**: (si ya está publicada)
6. **Team ID**: (de tu cuenta de Apple Developer)
7. Click **Create**
8. **GUARDA** el Client ID

### 2. Configurar Supabase Dashboard

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf)
2. Navega a **Authentication** > **Providers**
3. Encuentra **Google** y haz click para expandir
4. **Habilita** el proveedor (toggle ON)
5. Configura:
   - **Client ID (for OAuth)**: El Client ID de Web de Google Cloud Console
   - **Client Secret (for OAuth)**: El Client Secret de Web de Google Cloud Console
   - **Authorized Client IDs**: Agrega TODOS los Client IDs separados por comas:
     ```
     WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
     ```
6. **Redirect URLs**: Verifica que estén configuradas:
   - `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
   - `natively://auth/callback`
   - `com.barlive.app://auth/callback`
   - `http://localhost:19006/auth/callback` (para desarrollo web)
7. Click **Save**

### 3. Verificar Configuración de la App

#### A. Verificar app.json

El archivo `app.json` debe tener:

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
              "com.barlive.app",
              "exp"
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
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        },
        {
          "action": "VIEW",
          "data": [{"scheme": "natively"}],
          "category": ["BROWSABLE", "DEFAULT"]
        },
        {
          "action": "VIEW",
          "data": [{"scheme": "com.barlive.app"}],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

#### B. Verificar Variables de Entorno

Asegúrate de que tu archivo `.env` tenga:

```env
EXPO_PUBLIC_SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### 4. Rebuild de la App

Después de cambiar `app.json`, debes hacer rebuild:

```bash
# Limpiar caché
npx expo start --clear

# Para Android
npx expo prebuild --platform android --clean
npx expo run:android

# Para iOS
npx expo prebuild --platform ios --clean
npx expo run:ios
```

## Testing

### En Expo Go (Desarrollo)

1. Inicia el servidor: `npm run dev`
2. Abre la app en Expo Go
3. Intenta iniciar sesión con Google
4. Deberías ver:
   - Navegador abre con pantalla de Google
   - Seleccionas cuenta de Google
   - Navegador cierra y vuelves a la app
   - Sesión iniciada correctamente

### En Build Standalone (Producción)

1. Crea un build:
   ```bash
   eas build --platform android --profile preview
   # o
   eas build --platform ios --profile preview
   ```
2. Instala el build en tu dispositivo
3. Prueba el flujo de Google Sign-In
4. Verifica que funcione correctamente

## Troubleshooting

### Error: "Provider not enabled"

**Causa**: Google no está habilitado en Supabase Dashboard

**Solución**:
1. Ve a Supabase Dashboard > Authentication > Providers
2. Habilita Google
3. Configura Client ID y Secret

### Error: "Invalid client"

**Causa**: El Client ID no coincide o no está autorizado

**Solución**:
1. Verifica que el Client ID en Supabase sea el de Web
2. Verifica que todos los Client IDs estén en "Authorized Client IDs"
3. Asegúrate de que las redirect URLs estén correctas

### Error: "Redirect URI mismatch"

**Causa**: La URL de redirección no está autorizada en Google Cloud Console

**Solución**:
1. Ve a Google Cloud Console > Credentials
2. Edita tu OAuth client ID de Web
3. Agrega la URL de Supabase a "Authorized redirect URIs":
   `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`

### La app se queda en "Conectando con Google..."

**Causa**: El deep link no está siendo capturado correctamente

**Solución**:
1. Verifica que `app.json` tenga los esquemas correctos
2. Haz rebuild de la app: `npx expo prebuild --clean`
3. Verifica los logs de la consola para ver qué está pasando

### Error: "No se pudieron obtener los tokens"

**Causa**: Los tokens no están en la URL de callback

**Solución**:
1. Verifica que `skipBrowserRedirect` esté en `true` para native
2. Verifica que la URL de redirección sea correcta
3. Revisa los logs para ver qué URL se está recibiendo

### Android: "Sign in failed"

**Causa**: SHA-1 fingerprint incorrecto o faltante

**Solución**:
1. Obtén el SHA-1 correcto:
   ```bash
   # Debug
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   
   # Release
   keytool -list -v -keystore /path/to/release.keystore -alias your-alias
   ```
2. Agrega el SHA-1 a Google Cloud Console
3. Espera 5-10 minutos para que se propague
4. Intenta nuevamente

### iOS: "Sign in cancelled"

**Causa**: Bundle ID incorrecto o no autorizado

**Solución**:
1. Verifica que el Bundle ID en `app.json` sea `com.barlive.app`
2. Verifica que el Bundle ID en Google Cloud Console sea el mismo
3. Verifica que el Client ID de iOS esté en "Authorized Client IDs" en Supabase

## Verificación Final

Antes de considerar que todo está funcionando, verifica:

- [ ] Google está habilitado en Supabase Dashboard
- [ ] Client ID y Secret de Web están configurados en Supabase
- [ ] Todos los Client IDs (Web, Android, iOS) están en "Authorized Client IDs"
- [ ] Redirect URLs están configuradas en Google Cloud Console
- [ ] Redirect URLs están configuradas en Supabase Dashboard
- [ ] `app.json` tiene los esquemas correctos
- [ ] La app ha sido rebuildeada después de cambios en `app.json`
- [ ] SHA-1 fingerprints están configurados para Android (debug y release)
- [ ] Bundle ID está configurado para iOS
- [ ] El flujo funciona en Expo Go
- [ ] El flujo funciona en build standalone (Android)
- [ ] El flujo funciona en build standalone (iOS)

## Notas Importantes

1. **Tiempo de Propagación**: Después de hacer cambios en Google Cloud Console, puede tomar 5-10 minutos para que se propaguen.

2. **Múltiples Entornos**: Necesitas diferentes credenciales para:
   - Desarrollo (Expo Go)
   - Debug builds
   - Release builds

3. **Client IDs**: El Client ID de Web es el que se usa en Supabase, pero necesitas agregar TODOS los Client IDs (Web, Android, iOS) a "Authorized Client IDs".

4. **Deep Links**: Los deep links solo funcionan en builds standalone, no en Expo Go. En Expo Go, usa la URL de Supabase como redirect.

5. **Logs**: Siempre revisa los logs de la consola para debugging. El código tiene logging extensivo.

## Recursos Adicionales

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [Expo Web Browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)

## Contacto

Si sigues teniendo problemas después de seguir esta guía, revisa:
1. Los logs de la consola
2. Los logs de Supabase Dashboard (Authentication > Logs)
3. Los logs de Google Cloud Console (APIs & Services > Credentials)
