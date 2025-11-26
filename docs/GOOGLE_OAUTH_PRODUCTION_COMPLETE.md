
# 🚀 Guía Completa: Google OAuth para Producción

## 📋 Resumen Ejecutivo

Esta guía te llevará paso a paso para configurar Google OAuth en tu aplicación React Native + Expo con Supabase, lista para **producción** en Android e iOS.

---

## ✅ Ventajas del OAuth Nativo

- ✨ **Mejor experiencia de usuario**: Flujo de autenticación más fluido y rápido
- 🔒 **Mayor seguridad**: Credenciales vinculadas específicamente a tu aplicación
- 🚀 **Rendimiento optimizado**: Sin redirecciones innecesarias
- 📱 **Integración nativa**: Usa las APIs nativas de cada plataforma
- 🎯 **Listo para producción**: Configuración completa para App Store y Google Play

---

## 🎯 Paso 1: Mantener la Credencial Web (CRÍTICO)

### ⚠️ IMPORTANTE: NO ELIMINAR

Tu credencial de **Web Application** existente es **ESENCIAL** para:

- ✅ Supabase (backend de autenticación)
- ✅ Desarrollo en Expo Go
- ✅ Versión web de tu aplicación
- ✅ Flujo de OAuth en navegadores

**Acción**: Verifica que tu credencial Web esté activa en [Google Cloud Console](https://console.cloud.google.com/)

---

## 📱 Paso 2: Crear Credenciales para Android

### 2.1 Obtener SHA-1 Fingerprints

Necesitas **DOS** huellas SHA-1:

#### A) SHA-1 para Desarrollo (Debug)

```bash
# En macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# En Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**Copia el valor SHA1** que aparece. Ejemplo:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
```

#### B) SHA-1 para Producción (Release)

Si ya tienes un keystore de producción:

```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

Si **NO** tienes un keystore de producción, créalo ahora:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore barlive-release.keystore -alias barlive-key -keyalg RSA -keysize 2048 -validity 10000
```

**⚠️ GUARDA ESTE ARCHIVO Y LA CONTRASEÑA EN UN LUGAR SEGURO**

Luego obtén el SHA-1:

```bash
keytool -list -v -keystore barlive-release.keystore -alias barlive-key
```

### 2.2 Crear Credenciales Android en Google Cloud Console

#### Credencial 1: Android Debug

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. Selecciona **Android**
6. Completa:
   - **Name**: `BarLive Android Debug`
   - **Package name**: `com.barlive.app`
   - **SHA-1 certificate fingerprint**: Pega el SHA-1 de **debug**
7. Click **CREATE**
8. **COPIA Y GUARDA** el Client ID (formato: `xxxxx.apps.googleusercontent.com`)

#### Credencial 2: Android Release

1. Repite los pasos anteriores
2. Usa estos valores:
   - **Name**: `BarLive Android Release`
   - **Package name**: `com.barlive.app`
   - **SHA-1 certificate fingerprint**: Pega el SHA-1 de **release**
3. Click **CREATE**
4. **COPIA Y GUARDA** el Client ID

---

## 🍎 Paso 3: Crear Credencial para iOS

### 3.1 Verificar Bundle ID

Tu Bundle ID es: `com.barlive.app` (definido en `app.json`)

### 3.2 Crear Credencial iOS en Google Cloud Console

1. En **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Selecciona **iOS**
4. Completa:
   - **Name**: `BarLive iOS`
   - **Bundle ID**: `com.barlive.app`
   - **App Store ID**: (déjalo vacío si aún no está publicado)
   - **Team ID**: (déjalo vacío si aún no está publicado)
5. Click **CREATE**
6. **COPIA Y GUARDA** el Client ID

---

## 🔧 Paso 4: Configurar Supabase Dashboard

### 4.1 Acceder a la Configuración de Google

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf)
2. Ve a **Authentication** → **Providers**
3. Busca **Google** y haz click para expandir

### 4.2 Configurar Client IDs

**IMPORTANTE**: Mantén los valores existentes de Web y agrega los nuevos:

- **Client ID (for OAuth)**: Mantén el Client ID de **Web** (NO lo cambies)
- **Client Secret (for OAuth)**: Mantén el Client Secret de **Web** (NO lo cambies)

### 4.3 Agregar Authorized Client IDs

En el campo **Authorized Client IDs**, agrega **TODOS** los Client IDs separados por comas:

```
WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
```

**Ejemplo real**:
```
123456789-abc.apps.googleusercontent.com,123456789-def.apps.googleusercontent.com,123456789-ghi.apps.googleusercontent.com,123456789-jkl.apps.googleusercontent.com
```

**⚠️ IMPORTANTE**: 
- NO uses espacios
- Separa con comas
- El orden no importa
- Asegúrate de incluir los 4 Client IDs

### 4.4 Guardar Cambios

Click **Save** y espera 5-10 minutos para que los cambios se propaguen.

---

## 🌐 Paso 5: Configurar Redirect URLs

### 5.1 Verificar URLs en Credencial Web

1. Ve a **APIs & Services** → **Credentials**
2. Click en tu credencial de **Web application**
3. En **Authorized redirect URIs**, asegúrate de tener:

```
https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback
natively://auth/callback
com.barlive.app://auth/callback
http://localhost:19006/auth/callback
```

4. Click **SAVE**

### 5.2 Verificar app.json

Tu `app.json` ya está configurado correctamente con:

- ✅ URL schemes: `natively` y `com.barlive.app`
- ✅ Intent filters para Android
- ✅ CFBundleURLTypes para iOS

---

## 🔨 Paso 6: Rebuild de la Aplicación

### 6.1 Limpiar Caché

```bash
# Limpiar caché de Expo
npx expo start --clear

# Limpiar node_modules (opcional pero recomendado)
rm -rf node_modules
npm install
```

### 6.2 Rebuild para Android

```bash
# Prebuild (genera archivos nativos)
npx expo prebuild --platform android --clean

# Ejecutar en dispositivo/emulador
npx expo run:android
```

### 6.3 Rebuild para iOS

```bash
# Prebuild (genera archivos nativos)
npx expo prebuild --platform ios --clean

# Ejecutar en dispositivo/simulador
npx expo run:ios
```

---

## 🧪 Paso 7: Probar la Configuración

### 7.1 Prueba en Desarrollo (Expo Go)

1. Ejecuta `npm run dev`
2. Abre la app en Expo Go
3. Intenta iniciar sesión con Google
4. Deberías ver:
   - ✅ Pantalla de Google OAuth
   - ✅ Selección de cuenta
   - ✅ Redirección exitosa a la app
   - ✅ Usuario autenticado

### 7.2 Prueba en Build Standalone (Android)

```bash
# Crear build de desarrollo
eas build --platform android --profile development

# O crear build de preview
eas build --platform android --profile preview
```

1. Instala el APK en tu dispositivo
2. Intenta iniciar sesión con Google
3. El flujo debería ser más fluido que en Expo Go

### 7.3 Prueba en Build Standalone (iOS)

```bash
# Crear build de desarrollo
eas build --platform ios --profile development

# O crear build de preview
eas build --platform ios --profile preview
```

1. Instala la app en tu dispositivo iOS
2. Intenta iniciar sesión con Google
3. Verifica que el flujo funcione correctamente

---

## 📊 Paso 8: Tabla de Resumen de Client IDs

| Tipo | Uso | Client ID | Estado |
|------|-----|-----------|--------|
| **Web** | Supabase, Expo Go, Web | `xxxxx-abc.apps.googleusercontent.com` | ✅ Existente |
| **Android Debug** | Desarrollo Android | `xxxxx-def.apps.googleusercontent.com` | 🆕 Crear |
| **Android Release** | Producción Android | `xxxxx-ghi.apps.googleusercontent.com` | 🆕 Crear |
| **iOS** | iOS (dev y prod) | `xxxxx-jkl.apps.googleusercontent.com` | 🆕 Crear |

---

## 🔍 Solución de Problemas

### Error: "Invalid client"

**Causa**: Client ID no autorizado en Supabase

**Solución**:
1. Verifica que todos los Client IDs estén en "Authorized Client IDs" en Supabase
2. Espera 5-10 minutos después de guardar cambios
3. Limpia caché y rebuild la app

### Error: "Redirect URI mismatch"

**Causa**: URL de redirección no configurada

**Solución**:
1. Verifica que todas las redirect URLs estén en la credencial **Web**
2. Asegúrate de incluir:
   - `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
   - `natively://auth/callback`
   - `com.barlive.app://auth/callback`

### Error: "SHA-1 fingerprint mismatch" (Android)

**Causa**: SHA-1 incorrecto o no coincide con el keystore usado

**Solución**:
1. Verifica que estés usando el keystore correcto
2. Regenera el SHA-1 con el comando correcto
3. Actualiza la credencial Android en Google Cloud Console
4. Espera 5-10 minutos y rebuild

### Error: "Bundle ID mismatch" (iOS)

**Causa**: Bundle ID incorrecto

**Solución**:
1. Verifica que el Bundle ID en Google Cloud Console sea `com.barlive.app`
2. Verifica que el Bundle ID en `app.json` sea `com.barlive.app`
3. Rebuild la app

### La autenticación funciona en Expo Go pero no en build standalone

**Causa**: Credenciales de Android/iOS no configuradas

**Solución**:
1. Asegúrate de haber creado las credenciales de Android/iOS
2. Verifica que los Client IDs estén en "Authorized Client IDs" en Supabase
3. Rebuild la app con `npx expo prebuild --clean`

---

## ✅ Checklist Final de Producción

Antes de publicar en App Store / Google Play:

### Google Cloud Console
- [ ] Credencial Web existe y está activa
- [ ] Credencial Android Debug creada con SHA-1 correcto
- [ ] Credencial Android Release creada con SHA-1 correcto
- [ ] Credencial iOS creada con Bundle ID correcto
- [ ] Todas las redirect URLs configuradas en credencial Web
- [ ] Scopes configurados: `openid`, `userinfo.email`, `userinfo.profile`

### Supabase Dashboard
- [ ] Google provider habilitado
- [ ] Client ID de Web configurado
- [ ] Client Secret de Web configurado
- [ ] Todos los Client IDs agregados a "Authorized Client IDs"
- [ ] Configuración guardada y propagada (esperar 5-10 min)

### Aplicación
- [ ] `app.json` configurado con URL schemes correctos
- [ ] `utils/auth.ts` implementa `signInWithGoogle` correctamente
- [ ] App rebuildeada después de cambios
- [ ] Probado en Expo Go (desarrollo)
- [ ] Probado en build standalone Android (preview/production)
- [ ] Probado en build standalone iOS (preview/production)

### Keystores (Android)
- [ ] Debug keystore accesible en `~/.android/debug.keystore`
- [ ] Release keystore creado y guardado de forma segura
- [ ] SHA-1 de ambos keystores obtenidos y configurados
- [ ] Contraseñas de keystores guardadas de forma segura

### Certificados (iOS)
- [ ] Bundle ID verificado: `com.barlive.app`
- [ ] Certificados de desarrollo configurados
- [ ] Certificados de producción configurados (para App Store)

### Testing
- [ ] Login con Google funciona en desarrollo
- [ ] Login con Google funciona en producción
- [ ] Flujo de autenticación es fluido
- [ ] Usuario se crea correctamente en base de datos
- [ ] Sesión persiste después de cerrar/abrir app
- [ ] Logout funciona correctamente

---

## 📚 Recursos Adicionales

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Expo Deep Linking](https://docs.expo.dev/guides/deep-linking/)
- [Expo Auth Session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

## 🎯 Comandos Rápidos de Referencia

### Obtener SHA-1 (Android)

```bash
# Debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release
keytool -list -v -keystore /ruta/a/release.keystore -alias tu-alias
```

### Crear Keystore de Producción

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore barlive-release.keystore -alias barlive-key -keyalg RSA -keysize 2048 -validity 10000
```

### Rebuild App

```bash
# Limpiar y rebuild Android
npx expo prebuild --platform android --clean
npx expo run:android

# Limpiar y rebuild iOS
npx expo prebuild --platform ios --clean
npx expo run:ios
```

### Crear Builds con EAS

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

---

## 💡 Mejores Prácticas

1. **Seguridad de Keystores**: Nunca subas tus keystores a Git. Usa `.gitignore` y guárdalos en un lugar seguro.

2. **Backup de Credenciales**: Guarda todos los Client IDs, Client Secrets y contraseñas en un gestor de contraseñas.

3. **Testing Exhaustivo**: Prueba en múltiples dispositivos y versiones de Android/iOS antes de publicar.

4. **Monitoreo**: Implementa logging para detectar errores de autenticación en producción.

5. **Documentación**: Mantén esta guía actualizada con cualquier cambio que hagas.

6. **Versionado**: Usa Git tags para marcar versiones estables de tu app.

---

## 🚀 ¡Listo para Producción!

Si has completado todos los pasos del checklist, tu aplicación está lista para:

- ✅ Publicar en Google Play Store
- ✅ Publicar en Apple App Store
- ✅ Ofrecer autenticación con Google nativa
- ✅ Proporcionar una experiencia de usuario fluida y segura

**¡Felicidades! 🎉**

---

## 📞 Soporte

Si encuentras problemas:

1. Revisa la sección de **Solución de Problemas**
2. Verifica el **Checklist Final**
3. Consulta los **Recursos Adicionales**
4. Revisa los logs de la consola para errores específicos

---

**Última actualización**: Enero 2025
**Versión**: 2.0 - Producción Completa
</write file>

<write file="docs/GOOGLE_OAUTH_QUICK_CHECKLIST.md">
# ✅ Google OAuth - Checklist Rápido

## 🎯 Resumen de 5 Minutos

Esta es una lista de verificación rápida para configurar Google OAuth. Para detalles completos, consulta `GOOGLE_OAUTH_PRODUCTION_COMPLETE.md`.

---

## 📋 Checklist de Configuración

### 1️⃣ Credenciales de Google Cloud Console

#### Web (Existente - NO BORRAR)
- [ ] Credencial Web existe
- [ ] Client ID copiado
- [ ] Client Secret copiado
- [ ] Redirect URLs configuradas:
  - [ ] `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
  - [ ] `natively://auth/callback`
  - [ ] `com.barlive.app://auth/callback`
  - [ ] `http://localhost:19006/auth/callback`

#### Android Debug (CREAR)
- [ ] SHA-1 obtenido: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
- [ ] Credencial creada en Google Cloud Console
- [ ] Package name: `com.barlive.app`
- [ ] Client ID copiado

#### Android Release (CREAR)
- [ ] Keystore de producción creado (si no existe)
- [ ] SHA-1 obtenido del keystore de producción
- [ ] Credencial creada en Google Cloud Console
- [ ] Package name: `com.barlive.app`
- [ ] Client ID copiado

#### iOS (CREAR)
- [ ] Credencial creada en Google Cloud Console
- [ ] Bundle ID: `com.barlive.app`
- [ ] Client ID copiado

---

### 2️⃣ Configuración de Supabase

- [ ] Ir a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
- [ ] Authentication → Providers → Google
- [ ] **Client ID (for OAuth)**: Mantener el de Web
- [ ] **Client Secret (for OAuth)**: Mantener el de Web
- [ ] **Authorized Client IDs**: Agregar TODOS los Client IDs separados por comas:
  ```
  WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
  ```
- [ ] Click **Save**
- [ ] Esperar 5-10 minutos para propagación

---

### 3️⃣ Configuración de la App

- [ ] `app.json` tiene URL schemes configurados
- [ ] `utils/auth.ts` implementa `signInWithGoogle`
- [ ] Limpiar caché: `npx expo start --clear`
- [ ] Rebuild Android: `npx expo prebuild --platform android --clean`
- [ ] Rebuild iOS: `npx expo prebuild --platform ios --clean`

---

### 4️⃣ Testing

#### Desarrollo (Expo Go)
- [ ] `npm run dev`
- [ ] Abrir en Expo Go
- [ ] Probar login con Google
- [ ] Verificar que funciona

#### Standalone (Android)
- [ ] Crear build: `eas build --platform android --profile preview`
- [ ] Instalar APK
- [ ] Probar login con Google
- [ ] Verificar que funciona

#### Standalone (iOS)
- [ ] Crear build: `eas build --platform ios --profile preview`
- [ ] Instalar en dispositivo
- [ ] Probar login con Google
- [ ] Verificar que funciona

---

## 🚨 Errores Comunes

### "Invalid client"
- ✅ Verificar que todos los Client IDs estén en "Authorized Client IDs" en Supabase
- ✅ Esperar 5-10 minutos después de guardar
- ✅ Rebuild la app

### "Redirect URI mismatch"
- ✅ Verificar redirect URLs en credencial Web
- ✅ Incluir todas las URLs listadas arriba

### "SHA-1 fingerprint mismatch"
- ✅ Verificar que el SHA-1 sea correcto
- ✅ Usar el keystore correcto (debug vs release)
- ✅ Actualizar credencial en Google Cloud Console

---

## 📝 Tabla de Client IDs

| Tipo | Client ID | Estado |
|------|-----------|--------|
| Web | `___________________.apps.googleusercontent.com` | ✅ |
| Android Debug | `___________________.apps.googleusercontent.com` | ⬜ |
| Android Release | `___________________.apps.googleusercontent.com` | ⬜ |
| iOS | `___________________.apps.googleusercontent.com` | ⬜ |

---

## 🎯 Comandos Rápidos

```bash
# SHA-1 Debug (Android)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# SHA-1 Release (Android)
keytool -list -v -keystore /ruta/a/release.keystore -alias tu-alias

# Crear Keystore de Producción
keytool -genkeypair -v -storetype PKCS12 -keystore barlive-release.keystore -alias barlive-key -keyalg RSA -keysize 2048 -validity 10000

# Limpiar y Rebuild
npx expo start --clear
npx expo prebuild --platform android --clean
npx expo prebuild --platform ios --clean

# Crear Builds
eas build --platform android --profile production
eas build --platform ios --profile production
```

---

## ✅ Checklist Final

- [ ] 4 credenciales creadas (Web, Android Debug, Android Release, iOS)
- [ ] Todos los Client IDs en Supabase
- [ ] Redirect URLs configuradas
- [ ] App rebuildeada
- [ ] Probado en desarrollo
- [ ] Probado en producción
- [ ] Keystores guardados de forma segura

---

**¿Todo listo?** → Consulta `GOOGLE_OAUTH_PRODUCTION_COMPLETE.md` para detalles completos.
</write file>

<write file="docs/GOOGLE_OAUTH_COMMANDS_REFERENCE.md">
# 🛠️ Google OAuth - Referencia de Comandos

## 📱 Android - Obtener SHA-1 Fingerprints

### Debug Keystore (Desarrollo)

**macOS / Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Windows:**
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**Salida esperada:**
```
Certificate fingerprints:
         SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0
         SHA256: ...
```

**Copia el valor SHA1** (sin espacios ni dos puntos si Google Cloud Console lo requiere).

---

### Release Keystore (Producción)

**Si ya tienes un keystore:**
```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

**Si NO tienes un keystore, créalo:**
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore barlive-release.keystore \
  -alias barlive-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Información requerida:**
- Contraseña del keystore (¡GUÁRDALA!)
- Nombre y apellido
- Unidad organizativa
- Organización
- Ciudad
- Estado/Provincia
- Código de país (ES para España)

**⚠️ IMPORTANTE**: Guarda el archivo `.keystore` y la contraseña en un lugar seguro. Si los pierdes, no podrás actualizar tu app en Google Play.

---

## 🍎 iOS - Verificar Bundle ID

**Desde app.json:**
```bash
cat app.json | grep bundleIdentifier
```

**Salida esperada:**
```json
"bundleIdentifier": "com.barlive.app"
```

---

## 🧹 Limpiar Caché y Rebuild

### Limpiar Caché de Expo
```bash
npx expo start --clear
```

### Limpiar node_modules (opcional)
```bash
rm -rf node_modules
npm install
```

### Limpiar caché de Metro Bundler
```bash
npx expo start --clear --reset-cache
```

---

## 🔨 Prebuild y Run

### Android

**Prebuild (genera archivos nativos):**
```bash
npx expo prebuild --platform android --clean
```

**Run en emulador/dispositivo:**
```bash
npx expo run:android
```

**Run con limpieza completa:**
```bash
npx expo prebuild --platform android --clean && npx expo run:android
```

---

### iOS

**Prebuild (genera archivos nativos):**
```bash
npx expo prebuild --platform ios --clean
```

**Run en simulador/dispositivo:**
```bash
npx expo run:ios
```

**Run con limpieza completa:**
```bash
npx expo prebuild --platform ios --clean && npx expo run:ios
```

---

## 🏗️ EAS Build (Builds en la nube)

### Android

**Development build:**
```bash
eas build --platform android --profile development
```

**Preview build:**
```bash
eas build --platform android --profile preview
```

**Production build:**
```bash
eas build --platform android --profile production
```

---

### iOS

**Development build:**
```bash
eas build --platform ios --profile development
```

**Preview build:**
```bash
eas build --platform ios --profile preview
```

**Production build:**
```bash
eas build --platform ios --profile production
```

---

### Ambas plataformas

**Build para ambas plataformas:**
```bash
eas build --platform all --profile production
```

---

## 🔍 Debugging

### Ver logs de Android
```bash
npx expo run:android --no-build-cache
```

### Ver logs de iOS
```bash
npx expo run:ios --no-build-cache
```

### Ver logs de Metro Bundler
```bash
npx expo start --clear
```

---

## 📦 Gestión de Keystores

### Listar alias en un keystore
```bash
keytool -list -v -keystore /ruta/a/keystore.keystore
```

### Cambiar contraseña de keystore
```bash
keytool -storepasswd -keystore /ruta/a/keystore.keystore
```

### Cambiar contraseña de alias
```bash
keytool -keypasswd -alias tu-alias -keystore /ruta/a/keystore.keystore
```

### Exportar certificado
```bash
keytool -export -alias tu-alias -keystore /ruta/a/keystore.keystore -file certificado.crt
```

---

## 🔐 Configurar Keystore en eas.json

**Ejemplo de configuración:**

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    }
  }
}
```

**Configurar credenciales locales:**
```bash
eas credentials
```

---

## 🌐 URLs de Referencia

### Google Cloud Console
```
https://console.cloud.google.com/
```

### Supabase Dashboard
```
https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
```

### Expo Dashboard
```
https://expo.dev/
```

---

## 📝 Verificar Configuración

### Verificar app.json
```bash
cat app.json | grep -A 10 "android"
cat app.json | grep -A 10 "ios"
```

### Verificar package.json
```bash
cat package.json | grep "expo"
```

### Verificar versión de Expo
```bash
npx expo --version
```

### Verificar versión de EAS CLI
```bash
eas --version
```

---

## 🚀 Workflow Completo de Desarrollo

### 1. Desarrollo Local
```bash
# Limpiar caché
npx expo start --clear

# Abrir en Expo Go
# Escanear QR code con la app Expo Go
```

### 2. Testing en Build Standalone
```bash
# Android
npx expo prebuild --platform android --clean
npx expo run:android

# iOS
npx expo prebuild --platform ios --clean
npx expo run:ios
```

### 3. Build para Testing (Preview)
```bash
# Android
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

### 4. Build para Producción
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### 5. Submit a Stores
```bash
# Android (Google Play)
eas submit --platform android

# iOS (App Store)
eas submit --platform ios
```

---

## 🔧 Troubleshooting Commands

### Limpiar todo y empezar de cero
```bash
# Limpiar caché
npx expo start --clear

# Limpiar node_modules
rm -rf node_modules
npm install

# Limpiar builds nativos
rm -rf android ios

# Prebuild limpio
npx expo prebuild --clean
```

### Verificar configuración de deep linking
```bash
# Android
adb shell am start -W -a android.intent.action.VIEW -d "natively://auth/callback" com.barlive.app

# iOS (en simulador)
xcrun simctl openurl booted "natively://auth/callback"
```

---

## 📚 Comandos de Git (Opcional)

### Crear tag de versión
```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

### Ver tags
```bash
git tag -l
```

---

**Última actualización**: Enero 2025
</write file>

Now let me verify the current app.json configuration is correct and make any necessary updates:

<write file="app.json">
{
  "expo": {
    "name": "BarLive",
    "slug": "BarLive",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/natively-dark.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/natively-dark.png",
      "resizeMode": "contain",
      "backgroundColor": "#000000"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.barlive.app",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSUserTrackingUsageDescription": "Esta app necesita tu permiso para enviarte notificaciones sobre eventos, ofertas y actividad social.",
        "NSLocationWhenInUseUsageDescription": "BarLive necesita tu ubicación para mostrarte locales cercanos.",
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
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/natively-dark.png",
        "backgroundColor": "#000000"
      },
      "edgeToEdgeEnabled": true,
      "package": "com.barlive.app",
      "permissions": [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.INTERNET"
      ],
      "useNextNotificationsApi": true,
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
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        },
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "natively"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        },
        {
          "action": "VIEW",
          "data": [
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
    },
    "web": {
      "favicon": "./assets/images/final_quest_240x240.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-font",
      "expo-router",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/natively-dark.png",
          "color": "#14B8A6",
          "sounds": [
            "./assets/sounds/cheers.wav"
          ]
        }
      ]
    ],
    "scheme": "natively",
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {}
    },
    "notification": {
      "icon": "./assets/images/natively-dark.png",
      "color": "#14B8A6",
      "androidMode": "default",
      "androidCollapsedTitle": "BarLive"
    }
  }
}
