
# ✅ Verificación Pre-Build - Checklist Completo

## 📋 Antes de Ejecutar el Build

Usa este checklist para asegurarte de que todo está configurado correctamente antes de ejecutar el build de Release.

---

## 1️⃣ Verificar Reglas ProGuard

### ✅ Archivo Existe
```bash
ls -la android/app/proguard-rules.pro
```
**Debe existir:** ✅

### ✅ Reglas Agregadas
Abre `android/app/proguard-rules.pro` y verifica que contiene:

```proguard
# Expo Modules - Keep all classes and members
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-dontwarn expo.modules.**

# Expo Kotlin Runtime - Critical for module initialization
-keep class expo.modules.kotlin.** { *; }
-keepclassmembers class expo.modules.kotlin.** { *; }
-dontwarn expo.modules.kotlin.**

# Expo Media Library - Specific module that was failing
-keep class expo.modules.medialibrary.** { *; }
-keepclassmembers class expo.modules.medialibrary.** { *; }
-dontwarn expo.modules.medialibrary.**

# Kotlin Standard Library - Required for reflection
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**

# Kotlin Reflection - Used by Expo modules
-keepclassmembers class **$WhenMappings { <fields>; }
-keepclassmembers class kotlin.Metadata { public <methods>; }

# Kotlin Coroutines - Required for async operations
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.** { volatile <fields>; }
```

**Reglas presentes:** ✅

---

## 2️⃣ Verificar Configuración de build.gradle

### ✅ ProGuard Habilitado
Abre `android/app/build.gradle` y verifica:

```gradle
buildTypes {
    release {
        minifyEnabled true  // ← Debe ser true
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
    }
}
```

**Configuración correcta:** ✅

---

## 3️⃣ Limpieza de Caché

### ✅ Eliminar Carpetas de Caché

```bash
# Verificar si existen
ls -la android/.gradle
ls -la android/app/build

# Eliminar si existen
rm -rf android/.gradle
rm -rf android/app/build
```

**Carpetas eliminadas:** ✅

### ✅ Ejecutar Gradle Clean

```bash
cd android
./gradlew clean
cd ..
```

**Clean ejecutado:** ✅

---

## 4️⃣ Verificar Dependencias

### ✅ Node Modules Actualizados

```bash
# Verificar que node_modules está actualizado
npm install
# o
yarn install
```

**Dependencias actualizadas:** ✅

---

## 5️⃣ Verificar Configuración de Expo

### ✅ Expo Prebuild (si es necesario)

```bash
# Solo si has modificado configuración nativa
npx expo prebuild --clean
```

**Prebuild ejecutado (si necesario):** ✅

---

## 6️⃣ Checklist Final Pre-Build

Marca cada item antes de ejecutar el build:

- [ ] ✅ Reglas ProGuard agregadas a `android/app/proguard-rules.pro`
- [ ] ✅ Carpeta `android/.gradle` eliminada
- [ ] ✅ Carpeta `android/app/build` eliminada
- [ ] ✅ `./gradlew clean` ejecutado exitosamente
- [ ] ✅ `minifyEnabled true` en `build.gradle`
- [ ] ✅ `proguardFiles` configurado correctamente
- [ ] ✅ Dependencias de Node actualizadas
- [ ] ✅ No hay cambios sin commitear (opcional)

---

## 7️⃣ Ejecutar el Build

Una vez que todos los checks están ✅, ejecuta:

```bash
# Para APK
cd android
./gradlew assembleRelease
cd ..

# Para AAB (Google Play)
cd android
./gradlew bundleRelease
cd ..
```

---

## 8️⃣ Verificación Post-Build

### ✅ Build Exitoso

Verifica que el build se completó sin errores:

```
BUILD SUCCESSFUL in Xm Ys
```

**Build exitoso:** ✅

### ✅ No Errores de R8

Verifica que NO aparece:

```
ERROR: Missing class expo.modules.kotlin.runtime.Runtime
```

**Sin errores de R8:** ✅

### ✅ APK/AAB Generado

Verifica que el archivo fue creado:

```bash
# Para APK
ls -lh android/app/build/outputs/apk/release/app-release.apk

# Para AAB
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

**Archivo generado:** ✅

---

## 9️⃣ Prueba del APK

### ✅ Instalación

```bash
# Instalar en dispositivo conectado
adb install android/app/build/outputs/apk/release/app-release.apk
```

**APK instalado correctamente:** ✅

### ✅ Funcionalidad

Prueba en el dispositivo:

- [ ] ✅ La app abre correctamente
- [ ] ✅ No hay crashes al iniciar
- [ ] ✅ Funcionalidades de Expo funcionan (cámara, media library, etc.)
- [ ] ✅ No hay errores en logcat

---

## 🔟 Commit y Push

### ✅ Crear Commit

```bash
git add android/app/proguard-rules.pro
git commit -m "fix: add comprehensive ProGuard keep rules for Expo and Kotlin runtime"
```

**Commit creado:** ✅

### ✅ Push a Repositorio

```bash
git push origin main
# o tu rama actual
```

**Push exitoso:** ✅

---

## 🎯 Resumen de Verificación

| Check | Estado | Descripción |
|-------|--------|-------------|
| ProGuard Rules | ✅ | Reglas agregadas correctamente |
| Cache Limpio | ✅ | .gradle y build eliminados |
| Gradle Clean | ✅ | ./gradlew clean ejecutado |
| Build Config | ✅ | minifyEnabled y proguardFiles OK |
| Build Exitoso | ✅ | Sin errores de R8 |
| APK Generado | ✅ | Archivo creado correctamente |
| APK Funcional | ✅ | Instalado y probado |
| Commit/Push | ✅ | Cambios guardados en repo |

---

## 🚨 Si Algo Falla

### Error: "Missing class expo.modules.kotlin.runtime.Runtime"

1. Verifica que las reglas ProGuard están al FINAL del archivo
2. Elimina las carpetas de caché de nuevo
3. Ejecuta `./gradlew clean` de nuevo
4. Intenta con `./gradlew assembleRelease --no-daemon`

### Error: "proguard-rules.pro not found"

1. Verifica que el archivo existe en `android/app/proguard-rules.pro`
2. Verifica que `build.gradle` apunta al archivo correcto

### Build muy lento

1. Usa `--no-daemon` para evitar procesos en segundo plano
2. Cierra Android Studio si está abierto
3. Libera memoria RAM

---

## ✅ Verificación Completa

Si todos los checks están ✅, tu build está listo y el error de R8 está resuelto.

**¡Felicidades! 🎉**
