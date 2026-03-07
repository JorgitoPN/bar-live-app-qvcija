
# 🔧 FIX CRÍTICO - Error de Build APK Stripe

## ⚠️ ACCIÓN REQUERIDA INMEDIATA

El build de APK está fallando porque el archivo `android/build.gradle` está intentando resolver la dependencia de Stripe desde JitPack (que está causando timeouts). Necesitas actualizar este archivo manualmente.

---

## 📝 PASO 1: Actualizar android/build.gradle

**Archivo a modificar:** `android/build.gradle` (en la raíz de la carpeta android)

**Acción:** Abre el archivo y reemplaza TODO su contenido con el siguiente código:

```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    // Removed JitPack - it's causing timeouts and Stripe doesn't need it
    // All dependencies should resolve from Maven Central or Google
  }
  
  // Force Stripe Android SDK to resolve from Maven Central with a specific version
  configurations.all {
    resolutionStrategy {
      // Force a specific version of Stripe Android SDK that's available on Maven Central
      force 'com.stripe:stripe-android:20.49.0'
      
      // Prevent any attempts to resolve from JitPack
      eachDependency { details ->
        if (details.requested.group == 'com.stripe' && details.requested.name == 'stripe-android') {
          details.useVersion '20.49.0'
          details.because 'Force Stripe to use a specific version from Maven Central, avoiding JitPack timeouts'
        }
      }
    }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
```

---

## ✅ PASO 2: Verificar el cambio

Después de guardar el archivo, verifica que contiene:

1. ✅ **Repositorios correctos:**
   - `google()`
   - `mavenCentral()`
   - **NO debe contener** `jitpack.io`

2. ✅ **Bloque resolutionStrategy:**
   - Debe tener `configurations.all { resolutionStrategy { ... } }`
   - Debe forzar `com.stripe:stripe-android:20.49.0`

3. ✅ **Plugins al final:**
   - `apply plugin: "expo-root-project"`
   - `apply plugin: "com.facebook.react.rootproject"`

---

## 🚀 PASO 3: Intentar el build nuevamente

Una vez hayas guardado el archivo, el build debería funcionar porque:

- ✅ Stripe se resolverá desde Maven Central (no JitPack)
- ✅ Versión específica 20.49.0 (no rango dinámico 21.22.+)
- ✅ Timeouts ya configurados en `gradle.properties` (60 segundos)
- ✅ Gradle optimizado en `eas.json` (`--no-daemon --max-workers=4`)

---

## 🔍 ¿Por qué este fix funciona?

### Problema Original:
```
Could not GET 'https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml'
Read timed out
```

### Solución:
1. **Eliminamos JitPack** de los repositorios (no es necesario para Stripe)
2. **Forzamos versión específica** (20.49.0) desde Maven Central
3. **Interceptamos resolución** con `eachDependency` para evitar cualquier intento de usar JitPack
4. **Timeouts configurados** para evitar cuelgues en conexiones lentas

---

## 📊 Estado de los archivos

| Archivo | Estado | Acción |
|---------|--------|--------|
| `android/build.gradle` | ⚠️ **Requiere actualización** | **Aplicar Paso 1** |
| `android/gradle.properties` | ✅ Ya configurado | Ninguna |
| `eas.json` | ✅ Ya configurado | Ninguna |

---

## 🆘 Si el build sigue fallando

1. **Verifica que guardaste el archivo** `android/build.gradle` correctamente
2. **Revisa que no haya errores de sintaxis** en el código Gradle
3. **Asegúrate de que Maven Central sea accesible** desde tu red
4. **Consulta el archivo** `SOLUCION_BUILD_APK_STRIPE.md` para troubleshooting avanzado

---

## ✨ Resultado esperado

Después de aplicar este fix, el build debería completarse exitosamente y generar el APK sin errores de timeout de Stripe.
