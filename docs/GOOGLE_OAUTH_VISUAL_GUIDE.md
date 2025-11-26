
# 📸 Google OAuth - Guía Visual Paso a Paso

Esta guía te muestra exactamente dónde hacer click y qué configurar en cada paso.

---

## 🌐 Parte 1: Google Cloud Console

### Paso 1: Acceder a Google Cloud Console

1. Ve a: https://console.cloud.google.com/
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto (o créalo si no existe)

**Ubicación en pantalla:**
- Arriba a la izquierda verás el nombre del proyecto
- Click en el nombre para cambiar de proyecto

---

### Paso 2: Ir a Credentials

1. En el menú lateral izquierdo, busca **"APIs & Services"**
2. Click en **"Credentials"**

**Ruta completa:**
```
☰ Menú → APIs & Services → Credentials
```

---

### Paso 3: Verificar Credencial Web (NO BORRAR)

1. En la lista de **"OAuth 2.0 Client IDs"**, busca tu credencial de tipo **"Web application"**
2. Click en el nombre para abrirla
3. Verifica que tenga:
   - **Client ID**: Cópialo (formato: `xxxxx.apps.googleusercontent.com`)
   - **Client Secret**: Cópialo (guárdalo de forma segura)

**Authorized redirect URIs** debe incluir:
```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
natively://auth/callback
com.barlive.app://auth/callback
http://localhost:19006/auth/callback
```

**Si faltan URLs:**
1. Click en **"ADD URI"**
2. Pega cada URL
3. Click **"SAVE"**

---

### Paso 4: Crear Credencial Android Debug

1. En la página de Credentials, click en **"+ CREATE CREDENTIALS"**
2. Selecciona **"OAuth client ID"**
3. En **"Application type"**, selecciona **"Android"**

**Formulario:**
- **Name**: `BarLive Android Debug`
- **Package name**: `com.barlive.app`
- **SHA-1 certificate fingerprint**: Pega el SHA-1 de debug

**Obtener SHA-1 de debug:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

4. Click **"CREATE"**
5. **COPIA el Client ID** que aparece (formato: `xxxxx.apps.googleusercontent.com`)

---

### Paso 5: Crear Credencial Android Release

1. Repite el Paso 4, pero con estos valores:
   - **Name**: `BarLive Android Release`
   - **Package name**: `com.barlive.app`
   - **SHA-1 certificate fingerprint**: Pega el SHA-1 de release

**Obtener SHA-1 de release:**
```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

2. Click **"CREATE"**
3. **COPIA el Client ID**

---

### Paso 6: Crear Credencial iOS

1. En la página de Credentials, click en **"+ CREATE CREDENTIALS"**
2. Selecciona **"OAuth client ID"**
3. En **"Application type"**, selecciona **"iOS"**

**Formulario:**
- **Name**: `BarLive iOS`
- **Bundle ID**: `com.barlive.app`
- **App Store ID**: (déjalo vacío si no está publicado)
- **Team ID**: (déjalo vacío si no está publicado)

4. Click **"CREATE"**
5. **COPIA el Client ID**

---

### Resumen de Client IDs Creados

Al final de esta sección, deberías tener **4 Client IDs**:

| Tipo | Name | Client ID |
|------|------|-----------|
| Web | (existente) | `xxxxx-abc.apps.googleusercontent.com` |
| Android | BarLive Android Debug | `xxxxx-def.apps.googleusercontent.com` |
| Android | BarLive Android Release | `xxxxx-ghi.apps.googleusercontent.com` |
| iOS | BarLive iOS | `xxxxx-jkl.apps.googleusercontent.com` |

---

## 🔧 Parte 2: Supabase Dashboard

### Paso 1: Acceder a Supabase

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Inicia sesión si es necesario

---

### Paso 2: Ir a Authentication Providers

1. En el menú lateral izquierdo, click en **"Authentication"**
2. Click en **"Providers"**

**Ruta completa:**
```
🔐 Authentication → Providers
```

---

### Paso 3: Configurar Google Provider

1. En la lista de providers, busca **"Google"**
2. Click en **"Google"** para expandir la configuración

**Verás estos campos:**

#### A) Enable Google Provider
- ✅ Asegúrate de que esté **habilitado** (toggle en verde)

#### B) Client ID (for OAuth)
- **NO CAMBIES** este valor
- Debe ser el Client ID de tu credencial **Web**
- Formato: `xxxxx-abc.apps.googleusercontent.com`

#### C) Client Secret (for OAuth)
- **NO CAMBIES** este valor
- Debe ser el Client Secret de tu credencial **Web**

#### D) Authorized Client IDs
- **AQUÍ ES DONDE AGREGAS LOS NUEVOS CLIENT IDs**
- Formato: Lista separada por comas, SIN espacios

**Ejemplo:**
```
123456789-abc.apps.googleusercontent.com,123456789-def.apps.googleusercontent.com,123456789-ghi.apps.googleusercontent.com,123456789-jkl.apps.googleusercontent.com
```

**Orden:**
```
WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
```

---

### Paso 4: Guardar Configuración

1. Scroll hasta abajo
2. Click en **"Save"**
3. Verás un mensaje de confirmación
4. **ESPERA 5-10 MINUTOS** para que los cambios se propaguen

---

## 📱 Parte 3: Configuración de la App

### Paso 1: Verificar app.json

Tu `app.json` ya está configurado correctamente con:

**iOS:**
```json
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
  },
  "associatedDomains": [
    "applinks:embntaqwlwmgazvrglaf.supabase.co"
  ]
}
```

**Android:**
```json
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
      ]
    },
    {
      "action": "VIEW",
      "data": [{ "scheme": "natively" }]
    },
    {
      "action": "VIEW",
      "data": [{ "scheme": "com.barlive.app" }]
    }
  ]
}
```

---

### Paso 2: Verificar utils/auth.ts

Tu archivo `utils/auth.ts` ya tiene la función `signInWithGoogle()` implementada correctamente.

**Características clave:**
- ✅ Usa `expo-web-browser` para abrir el navegador
- ✅ Maneja tokens de autenticación
- ✅ Crea perfil de usuario automáticamente
- ✅ Soporta web y nativo

---

## 🔨 Parte 4: Rebuild de la App

### Paso 1: Limpiar Caché

**Terminal:**
```bash
npx expo start --clear
```

**Qué hace:**
- Limpia la caché de Metro Bundler
- Asegura que los cambios se apliquen

---

### Paso 2: Rebuild Android

**Terminal:**
```bash
# Prebuild (genera archivos nativos)
npx expo prebuild --platform android --clean

# Run en dispositivo/emulador
npx expo run:android
```

**Qué hace:**
- Regenera los archivos nativos de Android
- Aplica los cambios de `app.json`
- Compila e instala la app

---

### Paso 3: Rebuild iOS

**Terminal:**
```bash
# Prebuild (genera archivos nativos)
npx expo prebuild --platform ios --clean

# Run en simulador/dispositivo
npx expo run:ios
```

**Qué hace:**
- Regenera los archivos nativos de iOS
- Aplica los cambios de `app.json`
- Compila e instala la app

---

## 🧪 Parte 5: Testing

### Paso 1: Probar en Expo Go (Desarrollo)

1. **Terminal:**
   ```bash
   npm run dev
   ```

2. **Escanear QR code:**
   - Android: Usa la app Expo Go
   - iOS: Usa la cámara del iPhone

3. **Probar login:**
   - Abre la app
   - Click en "Iniciar sesión con Google"
   - Selecciona tu cuenta de Google
   - Verifica que vuelvas a la app autenticado

---

### Paso 2: Probar en Build Standalone (Android)

1. **Crear build:**
   ```bash
   eas build --platform android --profile preview
   ```

2. **Esperar a que termine** (puede tomar 10-20 minutos)

3. **Descargar e instalar APK:**
   - Recibirás un link por email
   - Descarga el APK en tu dispositivo Android
   - Instala el APK

4. **Probar login:**
   - Abre la app
   - Click en "Iniciar sesión con Google"
   - El flujo debería ser más fluido que en Expo Go

---

### Paso 3: Probar en Build Standalone (iOS)

1. **Crear build:**
   ```bash
   eas build --platform ios --profile preview
   ```

2. **Esperar a que termine**

3. **Instalar en dispositivo:**
   - Necesitas un dispositivo iOS registrado en tu cuenta de Apple Developer
   - Sigue las instrucciones de EAS para instalar

4. **Probar login:**
   - Abre la app
   - Click en "Iniciar sesión con Google"
   - Verifica que funcione correctamente

---

## ✅ Checklist Visual

### Google Cloud Console
- [ ] ✅ Credencial Web existe
- [ ] ✅ Redirect URLs configuradas en credencial Web
- [ ] 🆕 Credencial Android Debug creada
- [ ] 🆕 Credencial Android Release creada
- [ ] 🆕 Credencial iOS creada
- [ ] 📋 Todos los Client IDs copiados

### Supabase Dashboard
- [ ] ✅ Google provider habilitado
- [ ] ✅ Client ID de Web configurado
- [ ] ✅ Client Secret de Web configurado
- [ ] 🆕 Todos los Client IDs en "Authorized Client IDs"
- [ ] 💾 Cambios guardados
- [ ] ⏰ Esperado 5-10 minutos

### App
- [ ] ✅ `app.json` configurado
- [ ] ✅ `utils/auth.ts` implementado
- [ ] 🧹 Caché limpiada
- [ ] 🔨 Android rebuildeado
- [ ] 🔨 iOS rebuildeado

### Testing
- [ ] 🧪 Probado en Expo Go
- [ ] 🧪 Probado en build Android
- [ ] 🧪 Probado en build iOS
- [ ] ✅ Login funciona correctamente

---

## 🎯 Resultado Final

Después de completar todos los pasos, tu app tendrá:

- ✅ **Google OAuth nativo** en Android e iOS
- ✅ **Experiencia de usuario fluida** sin redirecciones innecesarias
- ✅ **Mayor seguridad** con credenciales específicas por plataforma
- ✅ **Lista para producción** en App Store y Google Play

---

## 📸 Capturas de Pantalla Esperadas

### Durante el Login

1. **Pantalla de tu app** con botón "Iniciar sesión con Google"
2. **Navegador/Modal de Google** con selección de cuenta
3. **Pantalla de consentimiento** (si es la primera vez)
4. **Vuelta a tu app** con usuario autenticado

### Flujo Exitoso

```
Tu App → Google OAuth → Seleccionar Cuenta → Consentimiento → Tu App (Autenticado)
```

---

**Última actualización**: Enero 2025
