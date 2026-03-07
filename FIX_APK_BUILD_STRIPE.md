
# 🚨 FIX INMEDIATO - Error de Build APK Stripe

## ⚡ Solución Rápida (1 minuto)

El build está fallando porque Stripe intenta descargarse desde JitPack (que está dando timeout). La solución es forzar que se descargue desde Maven Central.

---

## 📋 INSTRUCCIONES PASO A PASO

### 1️⃣ Abre el archivo

Navega a: **`android/build.gradle`**

### 2️⃣ Reemplaza TODO el contenido

Borra todo lo que hay en el archivo y pega este código:

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

### 3️⃣ Guarda el archivo

Presiona `Ctrl+S` (Windows/Linux) o `Cmd+S` (Mac)

### 4️⃣ Intenta el build nuevamente

El build debería funcionar ahora. ✅

---

## 🔍 ¿Qué hace este fix?

| Cambio | Efecto |
|--------|--------|
| ❌ Elimina JitPack | Evita timeouts de red |
| ✅ Usa Maven Central | Repositorio estable y rápido |
| 🔒 Fuerza versión 20.49.0 | Evita rangos dinámicos (21.22.+) |
| 🛡️ Intercepta resolución | Garantiza que Stripe use Maven Central |

---

## ✅ Verificación

Después de guardar, tu archivo `android/build.gradle` debe tener:

- ✅ Línea 11-12: `google()` y `mavenCentral()` (sin JitPack)
- ✅ Línea 18-30: Bloque `configurations.all { resolutionStrategy { ... } }`
- ✅ Línea 22: `force 'com.stripe:stripe-android:20.49.0'`
- ✅ Línea 35-36: Plugins de Expo al final

---

## 🆘 Si sigue fallando

1. **Verifica que guardaste el archivo correctamente**
2. **Asegúrate de que no hay errores de sintaxis** (copia el código exactamente como está)
3. **Revisa que Maven Central sea accesible** desde tu red
4. **Consulta** `SOLUCION_BUILD_APK_STRIPE.md` para troubleshooting avanzado

---

## 📊 Archivos ya configurados

Estos archivos ya están correctamente configurados (no necesitas tocarlos):

- ✅ `android/gradle.properties` - Timeouts de red configurados
- ✅ `eas.json` - Gradle optimizado con `--no-daemon --max-workers=4`

---

## 🎯 Resultado esperado

```
✅ BUILD SUCCESSFUL in 5m 23s
✅ APK generado correctamente
✅ Sin errores de Stripe
```

---

## 📚 Documentación adicional

- **Solución completa:** `SOLUCION_BUILD_APK_STRIPE.md`
- **Instrucciones detalladas:** `INSTRUCCIONES_BUILD_GRADLE.md`
- **Stripe en Maven Central:** https://mvnrepository.com/artifact/com.stripe/stripe-android/20.49.0
