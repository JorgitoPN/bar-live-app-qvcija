
# 🔐 Configuración de Google OAuth para Producción

## 📋 Resumen Ejecutivo

Esta guía te ayudará a configurar Google OAuth correctamente para producción en iOS y Android, manteniendo la compatibilidad con Supabase.

## ⚠️ IMPORTANTE: No Borrar Credencial Web

La credencial Web es **ESENCIAL** para que Supabase funcione. Solo estás **agregando** credenciales adicionales para mejorar la experiencia en móviles.

## 🎯 Objetivo

Pasar de usar OAuth con credencial Web a usar credenciales nativas específicas para iOS y Android, mejorando:
- ✨ Experiencia de usuario
- 🔒 Seguridad
- 🚀 Velocidad
- 📱 Integración nativa

## 📱 Paso 1: Credencial Android (Debug)

### 1.1 Obtener SHA-1 de Debug

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Busca la línea que dice `SHA1:` y copia el valor completo.

Ejemplo:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

### 1.2 Crear Credencial en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
5. Selecciona **Android**
6. Completa:
   - **Name:** `BarLive Android Debug`
   - **Package name:** `com.barlive.app`
   - **SHA-1 certificate fingerprint:** Pega el SHA-1 que copiaste
7. Click **CREATE**
8. **GUARDA** el Client ID (formato: `123456789-abc.apps.googleusercontent.com`)

## 📱 Paso 2: Credencial Android (Release)

### 2.1 Obtener SHA-1 de Release

Si ya tienes un keystore de release:

```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

Si NO tienes un keystore de release, créalo:

```bash
keytool -genkey -v -keystore barlive-release.keystore -alias barlive -keyalg RSA -keysize 2048 -validity 10000
```

**⚠️ IMPORTANTE:** Guarda el keystore y la contraseña en un lugar seguro. Los necesitarás para todas las actualizaciones futuras.

### 2.2 Crear Credencial en Google Cloud Console

Repite los pasos del 1.2 pero con:
- **Name:** `BarLive Android Release`
- **SHA-1:** El SHA-1 del keystore de release

## 🍎 Paso 3: Credencial iOS

### 3.1 Verificar Bundle ID

Tu Bundle ID es: `com.barlive.app` (está en `app.json`)

### 3.2 Crear Credencial en Google Cloud Console

1. En **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Selecciona **iOS**
4. Completa:
   - **Name:** `BarLive iOS`
   - **Bundle ID:** `com.barlive.app`
5. Si ya está en App Store, agrega:
   - **App Store ID:** Tu App Store ID
   - **Team ID:** Tu Apple Developer Team ID
6. Click **CREATE**
7. **GUARDA** el Client ID

## 🔧 Paso 4: Configurar Supabase

### 4.1 Agregar Client IDs

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf)
2. Ve a **Authentication** > **Providers**
3. Busca **Google** y expande
4. En **Client ID (for OAuth):** Deja el Client ID de **Web** (NO lo cambies)
5. En **Client Secret (for OAuth):** Deja el Client Secret de **Web** (NO lo cambies)
6. En **Authorized Client IDs:** Agrega TODOS los Client IDs separados por comas:

```
TU_WEB_CLIENT_ID,TU_ANDROID_DEBUG_CLIENT_ID,TU_ANDROID_RELEASE_CLIENT_ID,TU_IOS_CLIENT_ID
```

Ejemplo real:
```
123456789-web.apps.googleusercontent.com,123456789-android-debug.apps.googleusercontent.com,123456789-android-release.apps.googleusercontent.com,123456789-ios.apps.googleusercontent.com
```

7. Click **Save**

### 4.2 Verificar Redirect URLs

En tu credencial **Web** en Google Cloud Console, asegúrate de tener estas URLs en **Authorized redirect URIs**:

```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
natively://auth/callback
com.barlive.app://auth/callback
http://localhost:19006/auth/callback
```

## 🔄 Paso 5: Rebuild de la App

Después de estos cambios, **DEBES** hacer rebuild:

```bash
# Limpiar caché
npx expo start --clear

# Android
npx expo prebuild --platform android --clean
npx expo run:android

# iOS
npx expo prebuild --platform ios --clean
npx expo run:ios
```

## 🧪 Paso 6: Testing

### En Desarrollo (Expo Go)

1. Ejecuta `npm run dev`
2. Abre la app en Expo Go
3. Intenta iniciar sesión con Google
4. Verifica que el flujo funcione correctamente

### En Producción (Build Standalone)

1. Crea un build de preview:
   ```bash
   eas build --platform android --profile preview
   ```
2. Instala el APK en tu dispositivo
3. Intenta iniciar sesión con Google
4. El flujo debería ser más fluido que antes

## 📊 Resumen de Client IDs

Al final, deberías tener 4 credenciales:

| Tipo | Uso | Client ID | Notas |
|------|-----|-----------|-------|
| **Web** | Supabase, Expo Go, Web | `xxx-web.apps.googleusercontent.com` | NO BORRAR |
| **Android (Debug)** | Desarrollo Android | `xxx-android-debug.apps.googleusercontent.com` | SHA-1 de debug |
| **Android (Release)** | Producción Android | `xxx-android-release.apps.googleusercontent.com` | SHA-1 de release |
| **iOS** | iOS (dev y prod) | `xxx-ios.apps.googleusercontent.com` | Bundle ID |

## ❓ Troubleshooting

### Error: "Invalid client"

**Causa:** Client ID no está en "Authorized Client IDs" en Supabase

**Solución:**
1. Verifica que TODOS los Client IDs estén en Supabase
2. Espera 5-10 minutos después de hacer cambios
3. Rebuild de la app

### Error: "Redirect URI mismatch"

**Causa:** Redirect URL no está en la credencial Web

**Solución:**
1. Ve a la credencial Web en Google Cloud Console
2. Agrega todas las redirect URLs listadas arriba
3. Espera 5-10 minutos
4. Intenta de nuevo

### Error: "SHA-1 fingerprint mismatch"

**Causa:** El SHA-1 configurado no coincide con el del build

**Solución:**
1. Verifica que estés usando el SHA-1 correcto (debug vs release)
2. Asegúrate de tener ambas credenciales (debug y release)
3. Rebuild de la app

### El flujo sigue usando la credencial Web

**Causa:** La app no se rebuildeó después de los cambios

**Solución:**
1. Limpia caché: `npx expo start --clear`
2. Rebuild completo: `npx expo prebuild --clean`
3. Reinstala la app

## 🎯 Checklist Final

Antes de considerar que todo está listo:

- [ ] Credencial Web existe y NO fue borrada
- [ ] Credencial Android (Debug) creada con SHA-1 correcto
- [ ] Credencial Android (Release) creada con SHA-1 correcto
- [ ] Credencial iOS creada con Bundle ID correcto
- [ ] Todos los 4 Client IDs agregados a "Authorized Client IDs" en Supabase
- [ ] Redirect URLs configuradas en credencial Web
- [ ] App rebuildeada después de los cambios
- [ ] Probado en Expo Go (desarrollo)
- [ ] Probado en build standalone (producción)
- [ ] Keystore de release guardado en lugar seguro
- [ ] Contraseñas del keystore documentadas

## 📚 Recursos Adicionales

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [iOS Bundle ID](https://developer.apple.com/documentation/appstoreconnectapi/bundle_ids)

## 💡 Mejores Prácticas

1. **Nunca** compartas tu keystore de release
2. **Siempre** haz backup del keystore de release
3. **Documenta** todas las contraseñas en un gestor seguro
4. **Espera** 5-10 minutos después de cambios en Google Cloud Console
5. **Rebuild** siempre después de cambios en OAuth
6. **Prueba** en dispositivos reales antes de publicar
7. **Monitorea** los logs de autenticación en producción

## 🚀 Próximos Pasos

Una vez completada esta configuración:

1. ✅ OAuth nativo funcionando en iOS y Android
2. ✅ Mejor experiencia de usuario
3. ✅ Mayor seguridad
4. ✅ Listo para producción

¡Felicidades! Tu app está lista para ofrecer la mejor experiencia de autenticación posible. 🎉
