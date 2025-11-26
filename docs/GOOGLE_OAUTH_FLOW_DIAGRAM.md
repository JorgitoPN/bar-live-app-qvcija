
# 🔄 Diagrama de Flujo: Google OAuth en BarLive

## 📊 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD CONSOLE                      │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Web Client   │  │Android Debug │  │Android Release│          │
│  │     ID       │  │  Client ID   │  │  Client ID   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐                                                │
│  │  iOS Client  │                                                │
│  │     ID       │                                                │
│  └──────────────┘                                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Todos los Client IDs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE DASHBOARD                          │
│                                                                   │
│  Authentication > Providers > Google                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Client ID (for OAuth): WEB_CLIENT_ID                    │   │
│  │ Client Secret (for OAuth): WEB_CLIENT_SECRET            │   │
│  │                                                          │   │
│  │ Authorized Client IDs:                                  │   │
│  │ WEB_ID,ANDROID_DEBUG_ID,ANDROID_RELEASE_ID,IOS_ID      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Autenticación
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BARLIVE APP                              │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Web    │  │  Expo Go │  │ Android  │  │   iOS    │       │
│  │          │  │          │  │ Standalone│  │Standalone│       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Flujo de Autenticación Detallado

### 1️⃣ Usuario Inicia Sesión con Google

```
┌──────────────┐
│   Usuario    │
│  Click en    │
│ "Sign in     │
│ with Google" │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│              BarLive App (utils/auth.ts)                  │
│                                                            │
│  signInWithGoogle() {                                     │
│    - Determina redirect URL según plataforma             │
│    - Llama a supabase.auth.signInWithOAuth()             │
│  }                                                         │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Supabase Auth                            │
│                                                            │
│  - Valida que Google Provider esté habilitado            │
│  - Genera URL de OAuth con parámetros                    │
│  - Retorna URL de Google OAuth                           │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Navegador / WebBrowser                       │
│                                                            │
│  - Abre URL de Google OAuth                              │
│  - Usuario selecciona cuenta de Google                   │
│  - Usuario da consentimiento                             │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Google OAuth                             │
│                                                            │
│  - Valida Client ID                                       │
│  - Valida Redirect URI                                    │
│  - Genera tokens (access_token, refresh_token)           │
│  - Redirige a: redirect_uri?access_token=...             │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              Supabase Auth Callback                       │
│                                                            │
│  - Recibe tokens de Google                               │
│  - Valida tokens                                          │
│  - Valida que Client ID esté en Authorized Client IDs    │
│  - Crea/actualiza usuario en auth.users                  │
│  - Genera sesión de Supabase                             │
│  - Redirige a app con tokens de Supabase                 │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│              BarLive App (Deep Link)                      │
│                                                            │
│  - Recibe callback con tokens                            │
│  - Establece sesión con supabase.auth.setSession()      │
│  - Obtiene/crea perfil de usuario en tabla usuarios     │
│  - Redirige a pantalla principal                         │
└──────────────────────────────────────────────────────────┘
```

---

## 🔑 Validación de Client IDs

### Cómo Supabase Valida los Client IDs

```
┌─────────────────────────────────────────────────────────────┐
│                    Google OAuth Response                     │
│                                                               │
│  {                                                            │
│    "aud": "123456789-androidrelease.apps.googleusercontent.com"│
│    "sub": "user_google_id",                                  │
│    "email": "user@example.com",                              │
│    ...                                                        │
│  }                                                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Auth Validation                        │
│                                                               │
│  1. Extrae "aud" (audience) del token de Google             │
│     aud = "123456789-androidrelease.apps.googleusercontent.com"│
│                                                               │
│  2. Busca en "Authorized Client IDs":                       │
│     [                                                         │
│       "123-web.apps.googleusercontent.com",                  │
│       "456-androiddebug.apps.googleusercontent.com",         │
│       "789-androidrelease.apps.googleusercontent.com", ✅    │
│       "012-ios.apps.googleusercontent.com"                   │
│     ]                                                         │
│                                                               │
│  3. Si encuentra coincidencia: ✅ AUTORIZADO                │
│     Si no encuentra: ❌ "Invalid client"                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Flujo por Plataforma

### Web

```
Usuario → BarLive Web → Supabase Auth → Google OAuth (Web Client ID)
                                              ↓
                                    Redirect a Supabase
                                              ↓
                                    Callback a BarLive Web
                                              ↓
                                    Usuario autenticado
```

### Android (Expo Go - Desarrollo)

```
Usuario → BarLive (Expo Go) → Supabase Auth → Google OAuth (Web Client ID)
                                                      ↓
                                            Abre navegador
                                                      ↓
                                            Redirect a Supabase
                                                      ↓
                                            Deep link: natively://
                                                      ↓
                                            Vuelve a Expo Go
                                                      ↓
                                            Usuario autenticado
```

### Android (Standalone - Desarrollo)

```
Usuario → BarLive APK → Supabase Auth → Google OAuth (Android Debug Client ID)
                                                ↓
                                      Abre navegador
                                                ↓
                                      Valida SHA-1 Debug
                                                ↓
                                      Redirect a Supabase
                                                ↓
                                      Deep link: com.barlive.app://
                                                ↓
                                      Vuelve a BarLive APK
                                                ↓
                                      Usuario autenticado
```

### Android (Standalone - Producción)

```
Usuario → BarLive APK → Supabase Auth → Google OAuth (Android Release Client ID)
                                                ↓
                                      Abre navegador
                                                ↓
                                      Valida SHA-1 Release
                                                ↓
                                      Redirect a Supabase
                                                ↓
                                      Deep link: com.barlive.app://
                                                ↓
                                      Vuelve a BarLive APK
                                                ↓
                                      Usuario autenticado
```

### iOS (Standalone)

```
Usuario → BarLive iOS → Supabase Auth → Google OAuth (iOS Client ID)
                                                ↓
                                      Abre navegador
                                                ↓
                                      Valida Bundle ID
                                                ↓
                                      Redirect a Supabase
                                                ↓
                                      Deep link: com.barlive.app://
                                                ↓
                                      Vuelve a BarLive iOS
                                                ↓
                                      Usuario autenticado
```

---

## 🔗 Deep Links y Redirect URIs

### Configuración de Redirect URIs

```
┌─────────────────────────────────────────────────────────────┐
│           Google Cloud Console - Web Credential              │
│                                                               │
│  Authorized redirect URIs:                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback│
│  │ http://localhost:19006/auth/callback                │   │
│  │ natively://auth/callback                            │   │
│  │ com.barlive.app://auth/callback                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Cómo Funcionan los Deep Links

```
┌─────────────────────────────────────────────────────────────┐
│                      app.json                                │
│                                                               │
│  "scheme": "natively",                                       │
│                                                               │
│  "ios": {                                                    │
│    "bundleIdentifier": "com.barlive.app",                   │
│    "infoPlist": {                                            │
│      "CFBundleURLTypes": [                                   │
│        {                                                      │
│          "CFBundleURLSchemes": [                             │
│            "natively",                                        │
│            "com.barlive.app"                                 │
│          ]                                                    │
│        }                                                      │
│      ]                                                        │
│    }                                                          │
│  },                                                           │
│                                                               │
│  "android": {                                                │
│    "package": "com.barlive.app",                            │
│    "intentFilters": [                                        │
│      {                                                        │
│        "action": "VIEW",                                     │
│        "data": [                                             │
│          { "scheme": "https",                                │
│            "host": "embntaqwlwmgazvrglaf.supabase.co",      │
│            "pathPrefix": "/auth/v1/callback" },             │
│          { "scheme": "natively" },                           │
│          { "scheme": "com.barlive.app" }                    │
│        ]                                                      │
│      }                                                        │
│    ]                                                          │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Seguridad: SHA-1 Fingerprints (Android)

### Por Qué Son Necesarios

```
┌─────────────────────────────────────────────────────────────┐
│                    Android Keystore                          │
│                                                               │
│  Debug Keystore:                                             │
│  ~/.android/debug.keystore                                   │
│  SHA-1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6... │
│                                                               │
│  Release Keystore:                                           │
│  /path/to/release.keystore                                   │
│  SHA-1: Z9:Y8:X7:W6:V5:U4:T3:S2:R1:Q0:P9:O8:N7:M6:L5:K4... │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Firma la APK
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      APK Firmada                             │
│                                                               │
│  Contiene firma digital basada en el keystore                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Usuario instala APK
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Google OAuth Validation                     │
│                                                               │
│  1. Extrae SHA-1 de la APK instalada                        │
│  2. Compara con SHA-1 configurado en Google Cloud Console   │
│  3. Si coincide: ✅ AUTORIZADO                              │
│     Si no coincide: ❌ "SHA-1 fingerprint mismatch"         │
└─────────────────────────────────────────────────────────────┘
```

### Por Qué Necesitas DOS Credenciales Android

```
┌─────────────────────────────────────────────────────────────┐
│                    DESARROLLO                                │
│                                                               │
│  APK firmada con: debug.keystore                            │
│  SHA-1: A1:B2:C3:...                                        │
│                                                               │
│  Google Cloud Console:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Android Debug Client ID                             │   │
│  │ Package: com.barlive.app                            │   │
│  │ SHA-1: A1:B2:C3:...                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PRODUCCIÓN                                │
│                                                               │
│  APK firmada con: release.keystore                          │
│  SHA-1: Z9:Y8:X7:...                                        │
│                                                               │
│  Google Cloud Console:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Android Release Client ID                           │   │
│  │ Package: com.barlive.app                            │   │
│  │ SHA-1: Z9:Y8:X7:...                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Debugging: Cómo Identificar Problemas

### Error: "Invalid client"

```
┌─────────────────────────────────────────────────────────────┐
│                    PROBLEMA                                  │
│                                                               │
│  Google OAuth retorna token con:                            │
│  "aud": "123456789-androidrelease.apps.googleusercontent.com"│
│                                                               │
│  Pero en Supabase "Authorized Client IDs" solo está:        │
│  "123-web.apps.googleusercontent.com"                       │
│                                                               │
│  ❌ No hay coincidencia → "Invalid client"                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SOLUCIÓN                                  │
│                                                               │
│  Agregar TODOS los Client IDs a "Authorized Client IDs":    │
│  "123-web.apps.googleusercontent.com,                       │
│   456-androiddebug.apps.googleusercontent.com,              │
│   789-androidrelease.apps.googleusercontent.com,            │
│   012-ios.apps.googleusercontent.com"                       │
│                                                               │
│  ✅ Ahora hay coincidencia → Autenticación exitosa          │
└─────────────────────────────────────────────────────────────┘
```

### Error: "Redirect URI mismatch"

```
┌─────────────────────────────────────────────────────────────┐
│                    PROBLEMA                                  │
│                                                               │
│  Google OAuth intenta redirigir a:                          │
│  "https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback"│
│                                                               │
│  Pero en Google Cloud Console solo está:                    │
│  "http://localhost:19006/auth/callback"                     │
│                                                               │
│  ❌ No hay coincidencia → "Redirect URI mismatch"           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SOLUCIÓN                                  │
│                                                               │
│  Agregar TODAS las redirect URIs en credencial Web:         │
│  - https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback│
│  - http://localhost:19006/auth/callback                     │
│  - natively://auth/callback                                  │
│  - com.barlive.app://auth/callback                          │
│                                                               │
│  ✅ Ahora hay coincidencia → Redirección exitosa            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Resumen Visual de Configuración

```
┌─────────────────────────────────────────────────────────────┐
│                  CONFIGURACIÓN COMPLETA                      │
│                                                               │
│  Google Cloud Console:                                       │
│  ├─ Web Client ID ────────────────┐                         │
│  ├─ Android Debug Client ID ──────┤                         │
│  ├─ Android Release Client ID ────┤                         │
│  └─ iOS Client ID ────────────────┤                         │
│                                    │                          │
│                                    ▼                          │
│  Supabase Dashboard:                                         │
│  ├─ Client ID: Web Client ID                                │
│  ├─ Client Secret: Web Client Secret                        │
│  └─ Authorized Client IDs: [Todos los IDs]                  │
│                                    │                          │
│                                    ▼                          │
│  BarLive App:                                                │
│  ├─ app.json: Deep links configurados                       │
│  ├─ utils/auth.ts: OAuth flow implementado                  │
│  └─ Rebuild: npx expo prebuild --clean                      │
│                                    │                          │
│                                    ▼                          │
│  ✅ Google OAuth funcionando en todas las plataformas       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Conclusión

Este diagrama muestra cómo todos los componentes trabajan juntos para proporcionar autenticación de Google en BarLive. La clave es:

1. **Múltiples Client IDs**: Uno para cada plataforma/entorno
2. **Authorized Client IDs en Supabase**: Todos los IDs deben estar listados
3. **Redirect URIs correctas**: Deben coincidir con las configuradas
4. **SHA-1 Fingerprints**: Deben coincidir con los keystores usados
5. **Deep Links**: Deben estar configurados en app.json

Siguiendo esta arquitectura, la autenticación funcionará correctamente en todas las plataformas.
