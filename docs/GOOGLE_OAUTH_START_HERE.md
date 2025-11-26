
# 🚀 Google OAuth - EMPIEZA AQUÍ

## 👋 Bienvenido

Esta es tu guía de inicio rápido para configurar Google OAuth en tu aplicación BarLive.

---

## 📚 ¿Qué documentación usar?

### 🎯 Si quieres implementar TODO desde cero:
→ **GOOGLE_OAUTH_PRODUCTION_COMPLETE.md**
- Guía completa paso a paso
- Explicaciones detalladas
- Tiempo estimado: 2-3 horas

### ✅ Si solo quieres verificar que todo esté bien:
→ **GOOGLE_OAUTH_QUICK_CHECKLIST.md**
- Checklist rápido
- Tabla de Client IDs
- Tiempo estimado: 15 minutos

### 🛠️ Si necesitas un comando específico:
→ **GOOGLE_OAUTH_COMMANDS_REFERENCE.md**
- Todos los comandos
- Referencia rápida
- Tiempo estimado: 2 minutos

### 📸 Si prefieres instrucciones visuales:
→ **GOOGLE_OAUTH_VISUAL_GUIDE.md**
- Dónde hacer click
- Qué configurar
- Tiempo estimado: 2-3 horas

### 🔧 Si algo no funciona:
→ **GOOGLE_OAUTH_TROUBLESHOOTING.md**
- Errores comunes
- Soluciones paso a paso
- Tiempo estimado: 10-30 minutos

---

## ⚡ Inicio Rápido (5 minutos)

### Paso 1: Obtener SHA-1 de Android

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Copia el valor SHA1** que aparece.

---

### Paso 2: Crear Credenciales en Google Cloud Console

1. Ve a: https://console.cloud.google.com/
2. APIs & Services → Credentials
3. Crea 3 credenciales nuevas:

**Android Debug:**
- Type: Android
- Package: `com.barlive.app`
- SHA-1: (el que copiaste arriba)

**Android Release:**
- Type: Android
- Package: `com.barlive.app`
- SHA-1: (de tu keystore de producción)

**iOS:**
- Type: iOS
- Bundle ID: `com.barlive.app`

4. **COPIA los 3 Client IDs**

---

### Paso 3: Configurar Supabase

1. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
2. Authentication → Providers → Google
3. En **"Authorized Client IDs"**, agrega:
   ```
   TU_WEB_CLIENT_ID,TU_ANDROID_DEBUG_CLIENT_ID,TU_ANDROID_RELEASE_CLIENT_ID,TU_IOS_CLIENT_ID
   ```
4. Click **Save**
5. **Espera 5-10 minutos**

---

### Paso 4: Rebuild la App

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

---

### Paso 5: Probar

1. Abre la app
2. Click en "Iniciar sesión con Google"
3. Selecciona tu cuenta
4. ¡Deberías estar autenticado! ✅

---

## 🎯 ¿Qué Sigue?

### Si todo funcionó:
- ✅ ¡Felicidades! Ya tienes Google OAuth configurado
- 📱 Prueba en diferentes dispositivos
- 🚀 Crea builds de producción

### Si algo no funcionó:
- 🔧 Consulta **GOOGLE_OAUTH_TROUBLESHOOTING.md**
- 📋 Verifica **GOOGLE_OAUTH_QUICK_CHECKLIST.md**
- 📖 Lee **GOOGLE_OAUTH_PRODUCTION_COMPLETE.md**

---

## ⚠️ IMPORTANTE: NO Borres la Credencial Web

Tu credencial de **Web Application** existente es **ESENCIAL**.

**NO la borres.** Supabase la necesita para funcionar.

Solo estás **agregando** credenciales adicionales para Android e iOS.

---

## 📊 Resumen Visual

```
Google Cloud Console
├── Web (existente) ✅ NO BORRAR
├── Android Debug 🆕 CREAR
├── Android Release 🆕 CREAR
└── iOS 🆕 CREAR
         │
         ▼
    Supabase Dashboard
    └── Authorized Client IDs
        └── Agregar los 4 Client IDs
                 │
                 ▼
            Tu Aplicación
            └── Rebuild y probar
```

---

## 🎓 Conceptos Clave en 30 Segundos

1. **4 Client IDs**: Web (existente) + Android Debug + Android Release + iOS
2. **SHA-1**: Huella digital de tu keystore de Android
3. **Bundle ID**: Identificador único de tu app iOS (`com.barlive.app`)
4. **Authorized Client IDs**: Lista en Supabase de Client IDs permitidos
5. **Rebuild**: Necesario después de cambios en configuración

---

## 🚨 Errores Comunes

### "Invalid client"
→ Falta agregar Client ID a "Authorized Client IDs" en Supabase

### "Redirect URI mismatch"
→ Falta agregar redirect URLs en credencial Web

### "SHA-1 mismatch"
→ SHA-1 incorrecto o keystore incorrecto

**Solución:** Consulta **GOOGLE_OAUTH_TROUBLESHOOTING.md**

---

## 📞 Recursos

- **Guía Completa**: GOOGLE_OAUTH_PRODUCTION_COMPLETE.md
- **Checklist**: GOOGLE_OAUTH_QUICK_CHECKLIST.md
- **Comandos**: GOOGLE_OAUTH_COMMANDS_REFERENCE.md
- **Visual**: GOOGLE_OAUTH_VISUAL_GUIDE.md
- **Troubleshooting**: GOOGLE_OAUTH_TROUBLESHOOTING.md
- **Resumen**: GOOGLE_OAUTH_IMPLEMENTATION_SUMMARY.md

---

## ✅ Checklist Ultra-Rápido

- [ ] SHA-1 obtenido
- [ ] 3 credenciales creadas en Google Cloud Console
- [ ] 3 Client IDs copiados
- [ ] Client IDs agregados a Supabase
- [ ] Esperado 5-10 minutos
- [ ] App rebuildeada
- [ ] Login probado
- [ ] ¡Funciona! 🎉

---

## 🎯 Siguiente Paso

**Abre ahora:** GOOGLE_OAUTH_PRODUCTION_COMPLETE.md

Y sigue los pasos uno por uno.

**¡Buena suerte! 🚀**

---

**Última actualización**: Enero 2025
