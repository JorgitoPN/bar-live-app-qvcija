
# Google Sign-In Quick Fix - Safari Error

## El Problema

Después de hacer clic en "Continue" en Google, Safari muestra: **"Safari no puede abrir la página porque la dirección no es válida"**

## La Solución Rápida

### 1. Actualizar Google Cloud Console (5 minutos)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** > **Credentials**
3. Edita tu **OAuth 2.0 Client ID (Web)**
4. En **Authorized redirect URIs**, agrega:
   ```
   com.barlive.app://auth/callback
   ```
5. Guarda los cambios
6. **Espera 10 minutos** para que se propaguen los cambios

### 2. Actualizar Supabase Dashboard (2 minutos)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf)
2. **Authentication** > **URL Configuration**
3. En **Redirect URLs**, agrega:
   ```
   com.barlive.app://auth/callback
   ```
4. Guarda los cambios

### 3. Rebuild la App (3 minutos)

```bash
# Limpiar caché
npx expo start --clear

# iOS
npx expo prebuild --platform ios --clean
npx expo run:ios

# Android
npx expo prebuild --platform android --clean
npx expo run:android
```

## ¿Por Qué Funciona?

- **Antes:** Safari intentaba redirigir a una URL de Supabase que no reconocía
- **Ahora:** Safari redirige a `com.barlive.app://` que abre la app directamente
- **Resultado:** No más errores de "dirección no válida"

## Verificar que Funciona

1. Abre la app
2. Toca "Continuar con Google"
3. Selecciona tu cuenta de Google
4. Toca "Continue"
5. ✅ Safari se cierra y la app se abre automáticamente
6. ✅ Ves "Completando autenticación..."
7. ✅ Inicias sesión correctamente

## Si Aún No Funciona

### Problema: Sigue mostrando "Invalid Address"

**Solución:**
1. Verifica que agregaste la URL en Google Cloud Console
2. Espera 10 minutos más (los cambios tardan en propagarse)
3. Asegúrate de haber rebuildeado la app

### Problema: La app no se abre después de OAuth

**Solución:**
1. Verifica que `app.json` tenga:
   ```json
   {
     "expo": {
       "scheme": "com.barlive.app"
     }
   }
   ```
2. Rebuild la app: `npx expo prebuild --clean`

### Problema: "Provider not enabled"

**Solución:**
1. Supabase Dashboard > Authentication > Providers
2. Habilita Google
3. Agrega Client ID y Secret

## Checklist Rápido

Antes de probar, verifica:

- [ ] URL agregada en Google Cloud Console
- [ ] URL agregada en Supabase Dashboard
- [ ] App rebuildeada después de cambios
- [ ] Esperado 10 minutos después de cambios en Google
- [ ] Google provider habilitado en Supabase

## Archivos Modificados

Los siguientes archivos ya han sido actualizados con la solución:

- ✅ `utils/auth.ts` - Usa custom URL scheme
- ✅ `app/_layout.tsx` - Maneja deep links correctamente
- ✅ `app.json` - Configuración de URL scheme

**No necesitas modificar ningún archivo de código.** Solo necesitas:
1. Actualizar Google Cloud Console
2. Actualizar Supabase Dashboard
3. Rebuild la app

## Tiempo Total

- **Configuración:** 10 minutos
- **Espera de propagación:** 10 minutos
- **Rebuild:** 3 minutos
- **Total:** ~23 minutos

## Soporte

Si después de seguir estos pasos aún tienes problemas:

1. Revisa los logs de la consola
2. Verifica que todos los pasos se completaron
3. Asegúrate de haber esperado 10 minutos después de los cambios en Google
4. Intenta desinstalar y reinstalar la app

## Documentación Completa

Para más detalles, consulta:
- `docs/SAFARI_OAUTH_FIX_2025.md` - Explicación completa del problema y solución
- `docs/GOOGLE_SIGNIN_SETUP_2025.md` - Guía completa de configuración de Google Sign-In
