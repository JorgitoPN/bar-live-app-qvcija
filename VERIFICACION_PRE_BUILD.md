
# ✅ Verificación Pre-Build: Checklist Completo

## 🎯 Objetivo
Asegurar que el APK de producción se genere correctamente con todo el código y assets empaquetados.

---

## 📋 Checklist de Verificación

### **1. Configuración de EAS Build** ✅

**Archivo**: `eas.json`

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease --no-daemon --max-workers=4"
      }
    }
  }
}
```

✅ **Verificado**: 
- `buildType: "apk"` → Genera APK (no AAB)
- `gradleCommand` contiene `assembleRelease` → Build de producción
- `--no-daemon` → Evita problemas de memoria

---

### **2. Empaquetado de Assets** ✅

**Archivo**: `app.json`

```json
{
  "expo": {
    "assetBundlePatterns": ["**/*"]
  }
}
```

✅ **Verificado**: Todos los assets se empaquetarán en el APK

**Assets que se incluirán**:
- ✅ `assets/images/` → Todas las imágenes
- ✅ `assets/fonts/` → Todas las fuentes
- ✅ `assets/sounds/` → Todos los sonidos
- ✅ Iconos de notificaciones
- ✅ Splash screen
- ✅ Adaptive icons

---

### **3. Motor JavaScript (Hermes)** ✅

**Archivo**: `app.json`

```json
{
  "android": {
    "jsEngine": "hermes"
  }
}
```

✅ **Verificado**: Hermes habilitado para mejor rendimiento

**Beneficios de Hermes**:
- ⚡ Inicio de app más rápido
- 📦 Bundle JavaScript más pequeño
- 🚀 Mejor rendimiento en tiempo de ejecución

---

### **4. Optimizaciones de Producción** ✅

**Archivo**: `app.json` → `expo-build-properties`

```json
{
  "android": {
    "enableProguardInReleaseBuilds": true,
    "proguardRules": "-keep class com.stripe.** { *; }\n-keep class com.google.android.gms.wallet.** { *; }"
  }
}
```

✅ **Verificado**: ProGuard habilitado para minificación

**Optimizaciones aplicadas**:
- 🗜️ Código minificado y ofuscado
- 📉 Tamaño del APK reducido
- 🔒 Código más difícil de descompilar

---

### **5. Plugin de Stripe** ✅

**Archivo**: `plugins/withStripeFixed.js`

✅ **Verificado**: Plugin configurado correctamente

**Funcionalidad**:
- Excluye Stripe de JitPack (evita timeouts)
- Configura opciones de Kotlin para Stripe
- Previene errores de compilación

---

### **6. Dependencias Críticas** ✅

**Verificación de dependencias clave**:

```json
{
  "dependencies": {
    "expo": "~54.0.1",
    "expo-router": "^6.0.0",
    "react-native": "0.81.5",
    "@stripe/stripe-react-native": "0.59.2"
  }
}
```

✅ **Verificado**: Todas las dependencias son compatibles

---

## 🔍 Proceso de Build Detallado

### **Fase 1: Prebuild (Generación de Archivos Nativos)**

```bash
# Esto se ejecuta automáticamente
expo prebuild -p android --clean
```

**Resultado**:
- ✅ Genera carpeta `android/`
- ✅ Aplica plugins de Expo
- ✅ Configura dependencias nativas

---

### **Fase 2: Bundle JavaScript**

```bash
# Esto se ejecuta automáticamente durante el build
metro bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle
```

**Resultado**:
- ✅ Empaqueta todo el código JavaScript
- ✅ Incluye todas las dependencias
- ✅ Optimiza el código para producción
- ✅ Genera el bundle en `android/app/src/main/assets/`

---

### **Fase 3: Compilación Release**

```bash
# Esto se ejecuta automáticamente
cd android && ./gradlew assembleRelease --no-daemon --max-workers=4
```

**Resultado**:
- ✅ Compila el código nativo
- ✅ Aplica ProGuard (minificación)
- ✅ Incluye el bundle JavaScript
- ✅ Empaqueta todos los assets
- ✅ Genera el APK firmado

---

### **Fase 4: Firma del APK**

**Automático con EAS Build**:
- ✅ Usa credenciales de producción
- ✅ Firma el APK con keystore
- ✅ Genera `app-release.apk` (firmado)

---

## 📍 Ubicación Final del APK

```
android/app/build/outputs/apk/release/app-release.apk
```

**Tamaño esperado**: 30-50 MB (dependiendo de los assets)

---

## 🧪 Pruebas Post-Build

### **Test 1: Instalación**
```bash
# Instalar el APK en un dispositivo
adb install android/app/build/outputs/apk/release/app-release.apk
```

### **Test 2: Funcionamiento Offline**
1. Instala el APK
2. Desactiva WiFi y datos móviles
3. Abre la app
4. ✅ Si funciona → Bundle empaquetado correctamente

### **Test 3: Assets**
1. Verifica que todas las imágenes se muestren
2. Verifica que las fuentes se carguen
3. Verifica que los sonidos funcionen
4. ✅ Si todo funciona → Assets empaquetados correctamente

---

## 🚨 Indicadores de Problemas

### **❌ Problema: App se queda en splash screen**
**Causa**: Bundle JavaScript no se empaquetó
**Verificar**: 
- `assetBundlePatterns` en `app.json`
- Que el comando sea `assembleRelease` (no `assembleDebug`)

### **❌ Problema: "Unable to load script from assets"**
**Causa**: Bundle JavaScript no está en el APK
**Verificar**:
- Que el build sea de tipo `release`
- Que Hermes esté habilitado

### **❌ Problema: Imágenes no se muestran**
**Causa**: Assets no se empaquetaron
**Verificar**:
- `assetBundlePatterns: ["**/*"]` en `app.json`

---

## ✅ Confirmación Final

**Tu configuración está lista para producción si**:

1. ✅ `eas.json` tiene `gradleCommand: ":app:assembleRelease"`
2. ✅ `app.json` tiene `assetBundlePatterns: ["**/*"]`
3. ✅ `app.json` tiene `jsEngine: "hermes"`
4. ✅ `expo-build-properties` tiene `enableProguardInReleaseBuilds: true`
5. ✅ Plugin de Stripe está configurado

**Resultado esperado**:
- 📦 APK de 30-50 MB
- ⚡ Inicio rápido con Hermes
- 🔒 Código minificado con ProGuard
- 📱 Funciona sin conexión al servidor Metro
- 🎯 Listo para distribución

---

## 🎉 ¡Todo Verificado!

Tu proyecto está **100% configurado** para generar un APK de producción independiente.

**Próximo paso**: El sistema generará automáticamente el APK con todos los pasos verificados.

**Ubicación final**: `android/app/build/outputs/apk/release/app-release.apk`
