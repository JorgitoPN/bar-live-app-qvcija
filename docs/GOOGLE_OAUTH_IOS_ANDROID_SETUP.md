
# Guía: Cambiar OAuth de Web Application a iOS y Android

## 📋 Resumen

Actualmente tu app usa OAuth 2.0 con **Type: Web Application**. Para una mejor experiencia en móviles nativos, debes crear credenciales específicas para **iOS** y **Android**.

## ✅ Ventajas de usar OAuth nativo (iOS/Android)

- ✨ **Mejor experiencia de usuario**: El flujo de autenticación es más fluido
- 🔒 **Mayor seguridad**: Las credenciales están vinculadas a tu app específica
- 🚀 **Más rápido**: No hay redirecciones innecesarias
- 📱 **Integración nativa**: Usa las APIs nativas de cada plataforma

## 🛠️ Pasos Sencillos

### Paso 1: Mantener la Credencial Web (Importante)

**⚠️ NO BORRES** tu credencial de Web Application. La necesitas para:
- Supabase (que usa la credencial Web internamente)
- Desarrollo en Expo Go
- Versión web de tu app (si la tienes)

### Paso 2: Crear Credencial para Android

#### 2.1 Obtener el SHA-1 Fingerprint

Abre tu terminal y ejecuta:

**Para desarrollo (Debug):**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Para producción (Release):**
```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

Copia el valor de **SHA1** que aparece. Se verá algo así:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

#### 2.2 Crear la Credencial Android en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Click en **+ CREATE CREDENTIALS** > **OAuth client ID**
5. Selecciona **Android**
6. Completa:
   - **Name**: `BarLive Android` (o el nombre que prefieras)
   - **Package name**: `com.barlive.app`
   - **SHA-1 certificate fingerprint**: Pega el SHA-1 que copiaste
7. Click **CREATE**
8. **GUARDA** el Client ID que te da (lo necesitarás después)

**⚠️ Importante**: Necesitas crear **DOS** credenciales Android:
- Una con el SHA-1 de **debug** (para desarrollo)
- Una con el SHA-1 de **release** (para producción)

### Paso 3: Crear Credencial para iOS

#### 3.1 Obtener tu Bundle ID

Tu Bundle ID es: `com.barlive.app` (está en tu `app.json`)

#### 3.2 Crear la Credencial iOS en Google Cloud Console

1. En **APIs & Services** > **Credentials**
2. Click en **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Selecciona **iOS**
4. Completa:
   - **Name**: `BarLive iOS` (o el nombre que prefieras)
   - **Bundle ID**: `com.barlive.app`
5. Click **CREATE**
6. **GUARDA** el Client ID que te da

### Paso 4: Configurar en Supabase Dashboard

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf)
2. Ve a **Authentication** > **Providers**
3. Busca **Google** y haz click para expandir
4. En **Client ID (for OAuth)**: Deja el Client ID de **Web** (no lo cambies)
5. En **Client Secret (for OAuth)**: Deja el Client Secret de **Web** (no lo cambies)
6. En **Authorized Client IDs**: Agrega TODOS los Client IDs separados por comas:
   ```
   TU_WEB_CLIENT_ID,TU_ANDROID_DEBUG_CLIENT_ID,TU_ANDROID_RELEASE_CLIENT_ID,TU_IOS_CLIENT_ID
   ```
   
   Ejemplo:
   ```
   123456789-abc.apps.googleusercontent.com,123456789-def.apps.googleusercontent.com,123456789-ghi.apps.googleusercontent.com,123456789-jkl.apps.googleusercontent.com
   ```

7. Click **Save**

### Paso 5: Verificar Redirect URLs

Asegúrate de que estas URLs estén en **Authorized redirect URIs** de tu credencial **Web**:

```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
natively://auth/callback
com.barlive.app://auth/callback
http://localhost:19006/auth/callback
```

Para agregarlas:
1. Ve a **APIs & Services** > **Credentials**
2. Click en tu credencial de **Web application**
3. En **Authorized redirect URIs**, agrega las URLs de arriba
4. Click **SAVE**

### Paso 6: Rebuild de la App

Después de estos cambios, debes hacer rebuild de tu app:

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

## 🧪 Cómo Probar

### En Desarrollo (Expo Go)

1. Ejecuta `npm run dev`
2. Abre la app en Expo Go
3. Intenta iniciar sesión con Google
4. Deberías ver el flujo de Google OAuth
5. Después de autenticarte, deberías volver a la app

### En Producción (Build Standalone)

1. Crea un build:
   ```bash
   eas build --platform android --profile preview
   ```
2. Instala el APK en tu dispositivo
3. Intenta iniciar sesión con Google
4. El flujo debería ser más fluido que antes

## 📝 Resumen de Client IDs

Al final, deberías tener:

| Tipo | Uso | Client ID |
|------|-----|-----------|
| **Web** | Supabase, Expo Go, Web | `123456789-abc.apps.googleusercontent.com` |
| **Android (Debug)** | Desarrollo Android | `123456789-def.apps.googleusercontent.com` |
| **Android (Release)** | Producción Android | `123456789-ghi.apps.googleusercontent.com` |
| **iOS** | iOS (dev y prod) | `123456789-jkl.apps.googleusercontent.com` |

## ❓ Preguntas Frecuentes

### ¿Tengo que borrar la credencial Web?

**NO**. La credencial Web es necesaria para que Supabase funcione. Solo estás **agregando** credenciales adicionales para iOS y Android.

### ¿Por qué necesito dos credenciales Android?

Una es para desarrollo (con el SHA-1 de debug) y otra para producción (con el SHA-1 de release). Cada una tiene un SHA-1 diferente.

### ¿Cómo sé si está funcionando?

Después de hacer los cambios y rebuild:
1. Abre la app
2. Intenta iniciar sesión con Google
3. Si ves la pantalla de Google y puedes autenticarte sin errores, ¡está funcionando!

### ¿Qué pasa si me da error "Invalid client"?

Verifica que:
1. Todos los Client IDs estén en "Authorized Client IDs" en Supabase
2. El SHA-1 de Android sea correcto
3. El Bundle ID de iOS sea correcto (`com.barlive.app`)
4. Hayas esperado 5-10 minutos después de hacer cambios en Google Cloud Console

### ¿Qué pasa si me da error "Redirect URI mismatch"?

Verifica que todas las redirect URLs estén en la credencial **Web** en Google Cloud Console:
- `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
- `natively://auth/callback`
- `com.barlive.app://auth/callback`

## 🎯 Checklist Final

Antes de considerar que todo está listo:

- [ ] Credencial Web existe y está configurada en Supabase
- [ ] Credencial Android (Debug) creada con SHA-1 correcto
- [ ] Credencial Android (Release) creada con SHA-1 correcto
- [ ] Credencial iOS creada con Bundle ID correcto
- [ ] Todos los Client IDs agregados a "Authorized Client IDs" en Supabase
- [ ] Redirect URLs configuradas en credencial Web
- [ ] App rebuildeada después de los cambios
- [ ] Probado en Expo Go (desarrollo)
- [ ] Probado en build standalone (producción)

## 📚 Recursos Adicionales

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)

## 💡 Consejo Final

**No te preocupes si algo no funciona a la primera**. El OAuth puede ser complicado. Si tienes problemas:

1. Revisa los logs de la consola
2. Verifica que todos los Client IDs estén correctos
3. Espera 5-10 minutos después de hacer cambios en Google Cloud Console
4. Asegúrate de haber rebuildeado la app

¡Buena suerte! 🚀
