
# Google Sign-In Checklist - BarLive

Use esta checklist para verificar que todo esté configurado correctamente.

## 1. Google Cloud Console

### Proyecto
- [ ] Proyecto de Google Cloud creado
- [ ] Google+ API (Google People API) habilitada

### Pantalla de Consentimiento
- [ ] Pantalla de consentimiento configurada
- [ ] Tipo: External (o Internal)
- [ ] App name: BarLive
- [ ] User support email configurado
- [ ] Authorized domains incluye: `supabase.co`
- [ ] Scopes configurados:
  - [ ] `.../auth/userinfo.email`
  - [ ] `.../auth/userinfo.profile`
  - [ ] `openid`

### Credenciales OAuth - Web
- [ ] OAuth client ID de tipo "Web application" creado
- [ ] Authorized JavaScript origins incluye:
  - [ ] `http://localhost:19006`
  - [ ] `https://embntaqwlwmgazvrglaf.supabase.co`
- [ ] Authorized redirect URIs incluye:
  - [ ] `http://localhost:19006/auth/callback`
  - [ ] `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
- [ ] Client ID guardado: `___________________________`
- [ ] Client Secret guardado: `___________________________`

### Credenciales OAuth - Android (Debug)
- [ ] OAuth client ID de tipo "Android" creado
- [ ] Package name: `com.barlive.app`
- [ ] SHA-1 fingerprint de debug agregado
- [ ] Client ID guardado: `___________________________`

### Credenciales OAuth - Android (Release)
- [ ] OAuth client ID de tipo "Android" creado
- [ ] Package name: `com.barlive.app`
- [ ] SHA-1 fingerprint de release agregado
- [ ] Client ID guardado: `___________________________`

### Credenciales OAuth - iOS
- [ ] OAuth client ID de tipo "iOS" creado
- [ ] Bundle ID: `com.barlive.app`
- [ ] Client ID guardado: `___________________________`

## 2. Supabase Dashboard

### Proveedor Google
- [ ] Navegado a Authentication > Providers > Google
- [ ] Proveedor habilitado (toggle ON)
- [ ] Client ID (for OAuth) configurado con el Client ID de Web
- [ ] Client Secret (for OAuth) configurado con el Client Secret de Web
- [ ] Authorized Client IDs configurado con TODOS los Client IDs:
  ```
  WEB_CLIENT_ID,ANDROID_DEBUG_CLIENT_ID,ANDROID_RELEASE_CLIENT_ID,IOS_CLIENT_ID
  ```
- [ ] Cambios guardados

### Redirect URLs
- [ ] Navegado a Authentication > URL Configuration
- [ ] Redirect URLs incluye:
  - [ ] `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
  - [ ] `natively://auth/callback`
  - [ ] `com.barlive.app://auth/callback`
  - [ ] `http://localhost:19006/auth/callback`

## 3. Configuración de la App

### Variables de Entorno (.env)
- [ ] Archivo `.env` existe
- [ ] `EXPO_PUBLIC_SUPABASE_URL` configurado
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` configurado

### app.json
- [ ] `scheme` configurado como `"natively"`
- [ ] iOS `bundleIdentifier` es `"com.barlive.app"`
- [ ] iOS `CFBundleURLSchemes` incluye:
  - [ ] `"natively"`
  - [ ] `"com.barlive.app"`
  - [ ] `"exp"`
- [ ] Android `package` es `"com.barlive.app"`
- [ ] Android `intentFilters` configurados correctamente

### Código
- [ ] `utils/auth.ts` tiene la función `signInWithGoogle` actualizada
- [ ] `app/auth/callback.tsx` maneja el callback correctamente
- [ ] `app/_layout.tsx` escucha deep links
- [ ] `utils/supabase.ts` tiene `detectSessionInUrl: false`

## 4. Build y Deploy

### Desarrollo (Expo Go)
- [ ] Servidor iniciado con `npm run dev`
- [ ] App abierta en Expo Go
- [ ] Google Sign-In probado
- [ ] Funciona correctamente

### Android Debug Build
- [ ] Prebuild ejecutado: `npx expo prebuild --platform android --clean`
- [ ] Build ejecutado: `npx expo run:android`
- [ ] Google Sign-In probado
- [ ] Funciona correctamente

### Android Release Build
- [ ] Build creado con EAS: `eas build --platform android --profile production`
- [ ] APK/AAB instalado en dispositivo
- [ ] Google Sign-In probado
- [ ] Funciona correctamente

### iOS Build
- [ ] Prebuild ejecutado: `npx expo prebuild --platform ios --clean`
- [ ] Build ejecutado: `npx expo run:ios`
- [ ] Google Sign-In probado
- [ ] Funciona correctamente

## 5. Testing

### Flujo Completo
- [ ] Usuario hace clic en "Continuar con Google"
- [ ] Navegador se abre con pantalla de Google
- [ ] Usuario selecciona cuenta de Google
- [ ] Usuario da consentimiento (si es primera vez)
- [ ] Navegador se cierra
- [ ] App vuelve a primer plano
- [ ] Sesión se establece correctamente
- [ ] Perfil de usuario se crea/obtiene
- [ ] Usuario es redirigido a la pantalla correcta

### Casos de Error
- [ ] Usuario cancela: No muestra error, solo cierra
- [ ] Credenciales inválidas: Muestra mensaje de error claro
- [ ] Sin conexión: Muestra mensaje de error de red
- [ ] Proveedor no habilitado: Muestra mensaje de configuración

## 6. Logs y Debugging

### Logs de Consola
- [ ] Logs de `[Google Auth]` visibles
- [ ] No hay errores en los logs
- [ ] Flujo completo se registra correctamente

### Logs de Supabase
- [ ] Navegado a Authentication > Logs en Dashboard
- [ ] Eventos de Google Sign-In visibles
- [ ] No hay errores en los logs

### Logs de Google Cloud
- [ ] Navegado a APIs & Services > Credentials
- [ ] Uso de OAuth visible
- [ ] No hay errores reportados

## Notas

**Fecha de última verificación**: _______________

**Problemas encontrados**:
- 
- 
- 

**Soluciones aplicadas**:
- 
- 
- 

**Estado final**: ⬜ Funcionando ⬜ Con problemas ⬜ No funcionando
