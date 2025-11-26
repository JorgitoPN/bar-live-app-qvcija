
# 🚀 Guía Completa: Configuración de Google OAuth para Android e iOS

## 📋 Resumen Ejecutivo

Esta guía te llevará paso a paso para configurar Google OAuth en tu aplicación BarLive para **Android** e **iOS**, manteniendo la compatibilidad con **Web** y **Supabase**.

**Información del Proyecto:**
- **Nombre**: BarLive
- **Package Name (Android)**: `com.barlive.app`
- **Bundle ID (iOS)**: `com.barlive.app`
- **Supabase Project**: `embntaqwlwmgazvrglaf`
- **Supabase URL**: `https://embntaqwlwmgazvrglaf.supabase.co`

---

## ⚠️ IMPORTANTE: NO ELIMINAR CREDENCIALES WEB

**La credencial Web OAuth 2.0 existente es CRÍTICA para:**
- ✅ Autenticación de Supabase (backend)
- ✅ Desarrollo con Expo Go
- ✅ Versión web de la aplicación
- ✅ Flujo de OAuth en general

**🚫 NUNCA elimines la credencial Web. Solo agregarás credenciales adicionales.**

---

## 📱 Paso 1: Crear Credenciales de Android

### 1.1 Generar SHA-1 Fingerprints

Necesitas **DOS** huellas SHA-1:
1. **Debug** (para desarrollo)
2. **Release** (para producción)

#### Para Debug (Desarrollo):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**En Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

#### Para Release (Producción):

```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

**Ejemplo de salida:**
```
Certificate fingerprints:
     SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
     SHA256: ...
```

**📝 Copia ambos valores SHA-1 y guárdalos en un lugar seguro.**

---

### 1.2 Crear Credencial Android Debug en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o créalo si no existe)
3. Ve a **APIs & Services** → **Credentials**
4. Click en **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Selecciona **Android**
6. Completa los campos:
   - **Name**: `BarLive Android Debug`
   - **Package name**: `com.barlive.app`
   - **SHA-1 certificate fingerprint**: Pega el SHA-1 de **debug** que copiaste
7. Click **CREATE**
8. **📋 GUARDA el Client ID** (formato: `123456789-abc.apps.googleusercontent.com`)

---

### 1.3 Crear Credencial Android Release en Google Cloud Console

Repite el proceso anterior pero con estos valores:
- **Name**: `BarLive Android Release`
- **Package name**: `com.barlive.app`
- **SHA-1 certificate fingerprint**: Pega el SHA-1 de **release**

**📋 GUARDA este Client ID también.**

---

## 🍎 Paso 2: Crear Credencial de iOS

### 2.1 Crear Credencial iOS en Google Cloud Console

1. En **APIs & Services** → **Credentials**
2. Click en **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Selecciona **iOS**
4. Completa los campos:
   - **Name**: `BarLive iOS`
   - **Bundle ID**: `com.barlive.app`
   - **App Store ID**: (déjalo vacío si aún no está publicada)
   - **Team ID**: (déjalo vacío si aún no está publicada)
5. Click **CREATE**
6. **📋 GUARDA el Client ID**

---

## 🌐 Paso 3: Verificar Credencial Web

### 3.1 Verificar Redirect URIs en la Credencial Web

1. Ve a **APIs & Services** → **Credentials**
2. Click en tu credencial de **Web application** existente
3. En **Authorized redirect URIs**, asegúrate de que estén estas URLs:

```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
http://localhost:19006/auth/callback
natively://auth/callback
com.barlive.app://auth/callback
```

4. Si falta alguna, agrégala
5. Click **SAVE**

---

## 🔧 Paso 4: Configurar Supabase Dashboard

### 4.1 Agregar Client IDs Autorizados

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf)
2. Ve a **Authentication** → **Providers**
3. Busca **Google** y haz click para expandir
4. Verifica que esté **Enabled** (activado)

### 4.2 Configurar Client IDs

En el campo **Authorized Client IDs**, agrega TODOS los Client IDs separados por comas:

```
TU_WEB_CLIENT_ID,TU_ANDROID_DEBUG_CLIENT_ID,TU_ANDROID_RELEASE_CLIENT_ID,TU_IOS_CLIENT_ID
```

**Ejemplo real:**
```
123456789-web.apps.googleusercontent.com,123456789-androiddebug.apps.googleusercontent.com,123456789-androidrelease.apps.googleusercontent.com,123456789-ios.apps.googleusercontent.com
```

**⚠️ IMPORTANTE:**
- El **Web Client ID** debe ir PRIMERO en la lista
- NO agregues espacios entre las comas
- Asegúrate de que todos los IDs sean correctos

5. En **Client ID (for OAuth)**: Deja el Client ID de **Web** (NO lo cambies)
6. En **Client Secret (for OAuth)**: Deja el Client Secret de **Web** (NO lo cambies)
7. Click **Save**

---

## 📱 Paso 5: Configurar Scopes en Google Cloud Console

### 5.1 Configurar OAuth Consent Screen

1. Ve a **APIs & Services** → **OAuth consent screen**
2. Asegúrate de que estos scopes estén configurados:
   - `openid` (agregar manualmente)
   - `.../auth/userinfo.email` (agregado por defecto)
   - `.../auth/userinfo.profile` (agregado por defecto)

3. Configura la información de la aplicación:
   - **App name**: BarLive
   - **User support email**: tu email
   - **Developer contact information**: tu email

4. Click **SAVE AND CONTINUE**

---

## 🔄 Paso 6: Reconstruir la Aplicación

Después de todos estos cambios, debes reconstruir tu aplicación:

### 6.1 Limpiar Caché

```bash
npx expo start --clear
```

### 6.2 Rebuild Android

```bash
# Limpiar build anterior
npx expo prebuild --platform android --clean

# Ejecutar en dispositivo/emulador
npx expo run:android
```

### 6.3 Rebuild iOS

```bash
# Limpiar build anterior
npx expo prebuild --platform ios --clean

# Ejecutar en dispositivo/simulador
npx expo run:ios
```

---

## 🧪 Paso 7: Probar la Configuración

### 7.1 Probar en Desarrollo (Expo Go)

1. Ejecuta `npm run dev`
2. Abre la app en Expo Go
3. Intenta iniciar sesión con Google
4. Deberías ver:
   - Pantalla de selección de cuenta de Google
   - Pantalla de consentimiento (si es primera vez)
   - Redirección automática a la app
   - Sesión iniciada correctamente

### 7.2 Probar en Android (Build Standalone)

1. Crea un build de desarrollo:
   ```bash
   eas build --platform android --profile preview
   ```

2. Instala el APK en tu dispositivo
3. Intenta iniciar sesión con Google
4. El flujo debería ser más fluido que con Expo Go

### 7.3 Probar en iOS (Build Standalone)

1. Crea un build de desarrollo:
   ```bash
   eas build --platform ios --profile preview
   ```

2. Instala en tu dispositivo (via TestFlight o desarrollo directo)
3. Intenta iniciar sesión con Google
4. Verifica que el flujo funcione correctamente

---

## 📊 Resumen de Client IDs

Al finalizar, deberías tener esta configuración:

| Tipo | Propósito | Client ID | Dónde se usa |
|------|-----------|-----------|--------------|
| **Web** | Supabase, Expo Go, Web | `xxx-web.apps.googleusercontent.com` | Supabase Dashboard (Client ID principal) |
| **Android Debug** | Desarrollo Android | `xxx-androiddebug.apps.googleusercontent.com` | Authorized Client IDs en Supabase |
| **Android Release** | Producción Android | `xxx-androidrelease.apps.googleusercontent.com` | Authorized Client IDs en Supabase |
| **iOS** | iOS (dev y prod) | `xxx-ios.apps.googleusercontent.com` | Authorized Client IDs en Supabase |

---

## ❓ Solución de Problemas

### Error: "Invalid client"

**Causa**: El Client ID no está autorizado en Supabase

**Solución**:
1. Verifica que TODOS los Client IDs estén en "Authorized Client IDs" en Supabase
2. Asegúrate de que no haya espacios extra
3. Espera 5-10 minutos después de hacer cambios en Google Cloud Console
4. Reconstruye la aplicación

---

### Error: "Redirect URI mismatch"

**Causa**: La URL de redirección no está autorizada

**Solución**:
1. Ve a tu credencial **Web** en Google Cloud Console
2. Verifica que estas URLs estén en "Authorized redirect URIs":
   ```
   https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
   http://localhost:19006/auth/callback
   natively://auth/callback
   com.barlive.app://auth/callback
   ```
3. Guarda los cambios
4. Espera 5-10 minutos

---

### Error: "SHA-1 fingerprint mismatch" (Android)

**Causa**: El SHA-1 configurado no coincide con el de tu keystore

**Solución**:
1. Verifica que estés usando el keystore correcto:
   - Debug: `~/.android/debug.keystore`
   - Release: tu keystore de producción
2. Regenera el SHA-1 con el comando correcto
3. Actualiza el SHA-1 en Google Cloud Console
4. Espera 5-10 minutos
5. Reconstruye la aplicación

---

### Error: "Bundle ID mismatch" (iOS)

**Causa**: El Bundle ID configurado no coincide con el de tu app

**Solución**:
1. Verifica que el Bundle ID en Google Cloud Console sea: `com.barlive.app`
2. Verifica que el Bundle ID en `app.json` sea: `com.barlive.app`
3. Si los cambiaste, reconstruye la aplicación

---

### La autenticación funciona en Expo Go pero no en build standalone

**Causa**: Probablemente estás usando el SHA-1 de debug en producción

**Solución**:
1. Asegúrate de tener DOS credenciales Android:
   - Una con SHA-1 de debug (para desarrollo)
   - Una con SHA-1 de release (para producción)
2. Ambos Client IDs deben estar en "Authorized Client IDs" en Supabase
3. Reconstruye la aplicación

---

### El navegador se abre pero no vuelve a la app

**Causa**: Los deep links no están configurados correctamente

**Solución**:
1. Verifica que `app.json` tenga la configuración correcta de `intentFilters` (Android) y `CFBundleURLTypes` (iOS)
2. Verifica que el `scheme` sea `natively`
3. Reconstruye la aplicación con `npx expo prebuild --clean`

---

## ✅ Checklist Final de Verificación

Antes de considerar la configuración completa:

### Google Cloud Console
- [ ] Credencial Web existe y tiene las redirect URIs correctas
- [ ] Credencial Android Debug creada con SHA-1 correcto
- [ ] Credencial Android Release creada con SHA-1 correcto
- [ ] Credencial iOS creada con Bundle ID correcto
- [ ] OAuth Consent Screen configurado con scopes correctos
- [ ] Todos los Client IDs guardados en un lugar seguro

### Supabase Dashboard
- [ ] Google Provider está habilitado
- [ ] Client ID (Web) configurado correctamente
- [ ] Client Secret (Web) configurado correctamente
- [ ] Todos los Client IDs agregados a "Authorized Client IDs"
- [ ] Los Client IDs están separados por comas sin espacios

### Aplicación
- [ ] `app.json` tiene la configuración correcta de deep links
- [ ] Aplicación reconstruida después de los cambios
- [ ] Probado en Expo Go (desarrollo)
- [ ] Probado en build standalone Android
- [ ] Probado en build standalone iOS
- [ ] Google Sign-In funciona correctamente en todas las plataformas

---

## 🎯 Comandos Rápidos de Referencia

### Generar SHA-1 Debug (macOS/Linux)
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Generar SHA-1 Debug (Windows)
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

### Generar SHA-1 Release
```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

### Limpiar y Reconstruir
```bash
# Limpiar caché
npx expo start --clear

# Rebuild Android
npx expo prebuild --platform android --clean
npx expo run:android

# Rebuild iOS
npx expo prebuild --platform ios --clean
npx expo run:ios
```

### Crear Build de Desarrollo
```bash
# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

---

## 📚 Recursos Adicionales

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

---

## 🎉 ¡Felicidades!

Si has completado todos los pasos y el checklist, tu aplicación BarLive ahora tiene Google OAuth configurado correctamente para:
- ✅ Web
- ✅ Android (Debug y Release)
- ✅ iOS
- ✅ Integración con Supabase

**La experiencia de usuario será mucho mejor con autenticación nativa en móviles.**

---

## 💡 Consejos Finales

1. **Guarda todos los Client IDs**: Anótalos en un documento seguro
2. **Documenta los keystores**: Guarda la ubicación y contraseñas de tus keystores
3. **Prueba regularmente**: Verifica que la autenticación funcione después de cada actualización
4. **Monitorea errores**: Usa los logs de Supabase para detectar problemas de autenticación
5. **Mantén actualizado**: Revisa periódicamente si hay cambios en las APIs de Google o Supabase

---

## 🆘 ¿Necesitas Ayuda?

Si después de seguir esta guía sigues teniendo problemas:

1. Revisa los logs de la consola de tu app
2. Revisa los logs de Supabase Dashboard (Authentication → Logs)
3. Verifica que todos los Client IDs sean correctos
4. Asegúrate de haber esperado 5-10 minutos después de hacer cambios en Google Cloud Console
5. Verifica que hayas reconstruido la aplicación

**Recuerda**: La configuración de OAuth puede ser compleja, pero siguiendo estos pasos metódicamente, funcionará correctamente.

¡Buena suerte! 🚀
