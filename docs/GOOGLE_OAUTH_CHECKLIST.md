
# ✅ Checklist Rápido: Google OAuth para Android e iOS

## 📋 Información del Proyecto

- **Package Name (Android)**: `com.barlive.app`
- **Bundle ID (iOS)**: `com.barlive.app`
- **Supabase Project**: `embntaqwlwmgazvrglaf`
- **Supabase URL**: `https://embntaqwlwmgazvrglaf.supabase.co`

---

## 🔑 Paso 1: Generar SHA-1 Fingerprints (Android)

### Debug Keystore
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

- [ ] SHA-1 Debug copiado: `_______________________________________`

### Release Keystore
```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

- [ ] SHA-1 Release copiado: `_______________________________________`

---

## 🌐 Paso 2: Google Cloud Console - Credenciales

### Credencial Web (NO ELIMINAR)
- [ ] Credencial Web existe
- [ ] Client ID Web guardado: `_______________________________________`
- [ ] Client Secret Web guardado: `_______________________________________`

### Credencial Android Debug
- [ ] Creada en Google Cloud Console
- [ ] Name: `BarLive Android Debug`
- [ ] Package name: `com.barlive.app`
- [ ] SHA-1: (debug fingerprint)
- [ ] Client ID guardado: `_______________________________________`

### Credencial Android Release
- [ ] Creada en Google Cloud Console
- [ ] Name: `BarLive Android Release`
- [ ] Package name: `com.barlive.app`
- [ ] SHA-1: (release fingerprint)
- [ ] Client ID guardado: `_______________________________________`

### Credencial iOS
- [ ] Creada en Google Cloud Console
- [ ] Name: `BarLive iOS`
- [ ] Bundle ID: `com.barlive.app`
- [ ] Client ID guardado: `_______________________________________`

---

## 🔗 Paso 3: Redirect URIs (Credencial Web)

En la credencial **Web**, verifica que estén estas URLs en **Authorized redirect URIs**:

- [ ] `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
- [ ] `http://localhost:19006/auth/callback`
- [ ] `natively://auth/callback`
- [ ] `com.barlive.app://auth/callback`

---

## 🎯 Paso 4: OAuth Consent Screen

- [ ] App name: `BarLive`
- [ ] User support email configurado
- [ ] Developer contact email configurado
- [ ] Scopes configurados:
  - [ ] `openid`
  - [ ] `.../auth/userinfo.email`
  - [ ] `.../auth/userinfo.profile`

---

## 🔧 Paso 5: Supabase Dashboard

URL: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf/auth/providers

### Google Provider
- [ ] Google Provider está **Enabled**
- [ ] Client ID (for OAuth): (Web Client ID)
- [ ] Client Secret (for OAuth): (Web Client Secret)

### Authorized Client IDs
- [ ] Todos los Client IDs agregados (separados por comas, sin espacios):

```
WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
```

**Ejemplo:**
```
123-web.apps.googleusercontent.com,456-androiddebug.apps.googleusercontent.com,789-androidrelease.apps.googleusercontent.com,012-ios.apps.googleusercontent.com
```

- [ ] Cambios guardados (Click **Save**)

---

## 🔄 Paso 6: Rebuild de la Aplicación

### Limpiar Caché
```bash
npx expo start --clear
```
- [ ] Caché limpiada

### Android
```bash
npx expo prebuild --platform android --clean
npx expo run:android
```
- [ ] Android rebuildeado

### iOS
```bash
npx expo prebuild --platform ios --clean
npx expo run:ios
```
- [ ] iOS rebuildeado

---

## 🧪 Paso 7: Pruebas

### Expo Go (Desarrollo)
- [ ] App abierta en Expo Go
- [ ] Google Sign-In probado
- [ ] Autenticación exitosa
- [ ] Usuario redirigido correctamente a la app

### Android Standalone
- [ ] Build creado: `eas build --platform android --profile preview`
- [ ] APK instalado en dispositivo
- [ ] Google Sign-In probado
- [ ] Autenticación exitosa

### iOS Standalone
- [ ] Build creado: `eas build --platform ios --profile preview`
- [ ] App instalada en dispositivo
- [ ] Google Sign-In probado
- [ ] Autenticación exitosa

---

## 🐛 Solución de Problemas Rápida

### Error: "Invalid client"
- [ ] Verificar que todos los Client IDs estén en "Authorized Client IDs" en Supabase
- [ ] Esperar 5-10 minutos después de cambios en Google Cloud Console
- [ ] Reconstruir la aplicación

### Error: "Redirect URI mismatch"
- [ ] Verificar redirect URIs en credencial Web
- [ ] Esperar 5-10 minutos
- [ ] Reconstruir la aplicación

### Error: "SHA-1 fingerprint mismatch"
- [ ] Verificar que el SHA-1 sea correcto
- [ ] Verificar que estés usando el keystore correcto
- [ ] Actualizar SHA-1 en Google Cloud Console
- [ ] Esperar 5-10 minutos
- [ ] Reconstruir la aplicación

---

## 📊 Resumen Final

### Client IDs Configurados

| Tipo | Client ID | Ubicación |
|------|-----------|-----------|
| Web | `_______________` | Supabase (Client ID principal) |
| Android Debug | `_______________` | Authorized Client IDs |
| Android Release | `_______________` | Authorized Client IDs |
| iOS | `_______________` | Authorized Client IDs |

### Estado de la Configuración

- [ ] ✅ Todas las credenciales creadas
- [ ] ✅ Todos los Client IDs configurados en Supabase
- [ ] ✅ Redirect URIs configuradas
- [ ] ✅ Aplicación rebuildeada
- [ ] ✅ Pruebas exitosas en todas las plataformas

---

## 📚 Documentación Completa

Para más detalles, consulta:
- **[Guía Completa](./GOOGLE_OAUTH_SETUP_COMPLETO.md)** - Guía paso a paso detallada
- **[Guía Resumida](./GOOGLE_OAUTH_IOS_ANDROID_SETUP.md)** - Guía rápida

---

## 🎉 ¡Configuración Completa!

Si todos los checkboxes están marcados, tu aplicación BarLive tiene Google OAuth configurado correctamente para Web, Android e iOS.

**Fecha de configuración**: _______________

**Configurado por**: _______________

**Notas adicionales**:
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```
