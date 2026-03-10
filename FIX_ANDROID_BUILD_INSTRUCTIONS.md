
# 🔧 Instrucciones para Arreglar el Build de Android

## 📋 Problemas Identificados

Tu build de Android está fallando por dos razones principales:

### 1. **Error de API Level (compileSdk)**
```
Dependency 'androidx.activity:activity:1.11.0' requires libraries and applications that
depend on it to compile against version 36 or later of the Android APIs.
:app is currently compiled against android-35.
```

### 2. **Error de R8 Minify (ProGuard)**
```
ERROR: R8: Missing class expo.modules.kotlin.runtime.Runtime
```

## ✅ SOLUCIÓN COMPLETA

### PASO 1: Actualizar compileSdk a 36

Abre el archivo `android/app/build.gradle` y busca estas líneas:

```gradle
// CAMBIO: Subimos a 35 para dar soporte a NitroModules y Stripe
compileSdk 35

namespace 'com.barlive.app'
defaultConfig {
    applicationId 'com.barlive.app'
    
    // Aseguramos valores mínimos para Expo 54
    minSdkVersion 24 
    
    // Mantenemos target en 34 para máxima compatibilidad de tienda
    targetSdkVersion 34
```

**CÁMBIALAS POR:**

```gradle
// CAMBIO: Subimos a 36 para dar soporte a androidx.activity 1.11.0
compileSdk 36

namespace 'com.barlive.app'
defaultConfig {
    applicationId 'com.barlive.app'
    
    // Aseguramos valores mínimos para Expo 54
    minSdkVersion 24 
    
    // Subimos target a 36 para compatibilidad con compileSdk 36
    targetSdkVersion 36
```

### PASO 2: Agregar Reglas ProGuard para Expo Modules

Abre el archivo `android/app/proguard-rules.pro` y **AGREGA AL FINAL** estas reglas:

```proguard
# ============================================================================
# EXPO MODULES - CRITICAL FIX FOR R8 BUILD
# ============================================================================
# Prevent R8 from removing Expo module classes that are needed at runtime
# This fixes: "Missing class expo.modules.kotlin.runtime.Runtime" error

# Keep all Expo module classes and their runtime
-keep class expo.modules.** { *; }
-dontwarn expo.modules.**

# Keep Expo Kotlin module definitions
-keep @expo.modules.kotlin.modules.Module class * {
    *;
}

# Keep Expo view managers
-keep class * extends expo.modules.kotlin.views.ViewManager {
    *;
}

# Keep all Expo module interfaces and annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
-keepattributes EnclosingMethod

# Keep Expo module method names for reflection
-keepclassmembers class expo.modules.** {
    public <methods>;
    public <fields>;
}
```

### PASO 3: Limpiar el Entorno

Después de hacer los cambios anteriores, es **CRÍTICO** limpiar la caché de Gradle:

```bash
cd android
./gradlew clean
cd ..
```

### PASO 4: Volver a Compilar

Ahora puedes volver a ejecutar el comando de compilación:

```bash
eas build --platform android --profile production
```

O si estás compilando localmente:

```bash
cd android
./gradlew assembleRelease
```

## 📊 Verificación

Después de aplicar estos cambios, verifica que:

✅ **El build completa sin errores de API Level**
- No deberías ver más el error de `androidx.activity:activity:1.11.0`

✅ **El build completa sin errores de R8**
- No deberías ver más el error de `Missing class expo.modules.kotlin.runtime.Runtime`

✅ **El APK se genera correctamente**
- El archivo APK debería estar disponible para descarga/instalación

✅ **La app funciona correctamente**
- Todas las funcionalidades de Expo modules deberían funcionar sin problemas

## 🔍 Troubleshooting

### Si el build sigue fallando con error de API Level:

1. Verifica que cambiaste **AMBOS** valores:
   - `compileSdk 36`
   - `targetSdkVersion 36`

2. Asegúrate de haber ejecutado `./gradlew clean` desde el directorio `android`

3. Verifica que no haya otros archivos Gradle que estén sobrescribiendo estos valores

### Si el build sigue fallando con error de R8:

1. Verifica que las reglas ProGuard se agregaron correctamente al archivo `proguard-rules.pro`

2. Asegúrate de que el archivo `proguard-rules.pro` está en la ubicación correcta: `android/app/proguard-rules.pro`

3. Verifica que no haya errores de sintaxis en las reglas ProGuard

4. Ejecuta `./gradlew clean` nuevamente

### Si aparecen nuevos errores:

1. Revisa los logs completos del build para identificar el nuevo error

2. Busca en la documentación de Expo si hay reglas ProGuard adicionales necesarias para módulos específicos

3. Considera temporalmente deshabilitar minificación para debugging (NO recomendado para producción):
   ```gradle
   buildTypes {
       release {
           minifyEnabled false  // Cambiar de true a false
       }
   }
   ```

## 📝 Resumen de Cambios

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `android/app/build.gradle` | `compileSdk 35` → `compileSdk 36` | Requerido por androidx.activity 1.11.0 |
| `android/app/build.gradle` | `targetSdkVersion 34` → `targetSdkVersion 36` | Compatibilidad con compileSdk 36 |
| `android/app/proguard-rules.pro` | Agregar reglas para Expo modules | Prevenir que R8 elimine clases necesarias |

## 🎯 Commit Sugerido

Una vez que el build sea exitoso, crea un commit con el mensaje:

```
fix: update Android compileSdk to 36 and add ProGuard rules for Expo modules

- Update compileSdk from 35 to 36 to support androidx.activity 1.11.0
- Update targetSdkVersion from 34 to 36 for compatibility
- Add ProGuard keep rules to prevent R8 from removing Expo module classes
- Fixes "Missing class expo.modules.kotlin.runtime.Runtime" error
```

## ✅ Estado Final Esperado

Después de aplicar estos cambios:

- ✅ Build de Android completa exitosamente
- ✅ APK se genera sin errores
- ✅ Todas las funcionalidades de Expo funcionan correctamente
- ✅ La app está lista para distribución/testing

---

**Última Actualización**: 2025-01-15  
**Versión de Expo**: 54.0.1  
**Versión de React Native**: 0.81.5  
**Android Compile SDK**: 36  
**Android Target SDK**: 36
