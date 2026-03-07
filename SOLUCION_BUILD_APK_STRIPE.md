
# Solución para Error de Build APK - Stripe Android SDK

## Problema

El build de APK falla con el siguiente error:

```
Could not resolve com.stripe:stripe-android:21.22.+
Required by: project :app > project :stripe_stripe-react-native
Failed to list versions for com.stripe:stripe-android.
Unable to load Maven meta-data from https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml.
Could not GET 'https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml'.
Read timed out
```

## Causa Raíz

El paquete `@stripe/stripe-react-native` (versión 0.50.3) está intentando resolver su dependencia de Android SDK desde JitPack, que está causando timeouts. La dependencia de Stripe Android SDK debe resolverse desde Maven Central.

## Solución

### Paso 1: Actualizar android/build.gradle

Reemplaza el contenido del archivo `android/build.gradle` con:

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

### Paso 2: Verificar android/gradle.properties

Asegúrate de que el archivo `android/gradle.properties` contenga estas configuraciones de timeout:

```properties
# Network timeout settings to prevent hanging on repository access
systemProp.org.gradle.internal.http.connectionTimeout=60000
systemProp.org.gradle.internal.http.socketTimeout=60000
systemProp.http.socketTimeout=60000
systemProp.http.connectionTimeout=60000

# Gradle daemon settings for stability
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.configureondemand=true
```

### Paso 3: Actualizar eas.json (Ya aplicado)

El archivo `eas.json` ya ha sido actualizado con las opciones de build optimizadas:

```json
{
  "build": {
    "production": {
      "node": "20.18.0",
      "android": {
        "buildType": "apk",
        "credentialsSource": "remote",
        "gradleCommand": ":app:assembleRelease --no-daemon --max-workers=4"
      }
    }
  }
}
```

## Explicación Técnica

### 1. Eliminación de JitPack
JitPack no es necesario para Stripe y está causando timeouts de red. Todas las dependencias de Stripe están disponibles en Maven Central.

### 2. Resolution Strategy
Forzamos una versión específica de Stripe Android SDK (20.49.0) que:
- Está disponible en Maven Central
- Es compatible con `@stripe/stripe-react-native` 0.50.3
- Evita el rango de versiones dinámico (21.22.+) que causa problemas

### 3. Dependency Override
El bloque `eachDependency` intercepta cualquier intento de resolver `com.stripe:stripe-android` y lo redirige a la versión 20.49.0 desde Maven Central, evitando completamente JitPack.

### 4. Timeouts de Red
Configuramos timeouts más largos (60 segundos) para evitar fallos por conexiones lentas o repositorios temporalmente no disponibles.

### 5. Gradle Command Optimizado
Usamos `--no-daemon --max-workers=4` para:
- Evitar problemas de memoria con el daemon de Gradle
- Limitar el número de workers para builds más estables
- Mejorar la reproducibilidad del build

## Cómo Aplicar la Solución

### Opción A: Modificación Manual (Recomendado)

1. Abre el archivo `android/build.gradle` en tu editor
2. Reemplaza el contenido con el código proporcionado en el Paso 1
3. Guarda el archivo
4. Limpia el proyecto:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```
5. Intenta el build nuevamente

### Opción B: Regenerar Archivos Nativos

Si la modificación manual no funciona:

1. Elimina la carpeta `android`:
   ```bash
   rm -rf android
   ```

2. Regenera los archivos nativos:
   ```bash
   npx expo prebuild --clean
   ```

3. Aplica manualmente los cambios del Paso 1 al nuevo `android/build.gradle`

4. Intenta el build nuevamente

## Verificación del Fix

Después de aplicar los cambios, verifica que:

1. El archivo `android/build.gradle` NO contiene referencias a JitPack
2. El archivo `android/build.gradle` contiene el bloque `resolutionStrategy`
3. El archivo `android/gradle.properties` contiene las configuraciones de timeout
4. El archivo `eas.json` contiene el `gradleCommand` optimizado

## Alternativa: Remover Stripe

Si Stripe no se está usando activamente en la aplicación, considera removerlo:

1. Verifica si hay código que use `@stripe/stripe-react-native`
2. Si no se usa, elimínalo de `package.json`
3. Ejecuta `npm install` o `pnpm install`
4. Ejecuta `npx expo prebuild --clean`

## Troubleshooting

### Si el error persiste:

1. **Verifica la conexión a internet**: Asegúrate de que Maven Central sea accesible
2. **Limpia caché de Gradle**:
   ```bash
   cd android
   ./gradlew clean cleanBuildCache
   cd ..
   ```
3. **Verifica versiones**: Asegúrate de que `@stripe/stripe-react-native` sea 0.50.3
4. **Revisa logs completos**: Busca otros errores que puedan estar ocultos

### Si Maven Central no es accesible:

Agrega un mirror o proxy en `android/gradle.properties`:

```properties
systemProp.http.proxyHost=your-proxy-host
systemProp.http.proxyPort=your-proxy-port
systemProp.https.proxyHost=your-proxy-host
systemProp.https.proxyPort=your-proxy-port
```

## Notas Importantes

- ✅ **Maven Central**: Todas las dependencias de Stripe están disponibles aquí
- ❌ **NO usar JitPack**: Causa timeouts y no es necesario
- ✅ **Versión Específica**: 20.49.0 es estable y compatible
- ✅ **Orden de repositorios**: Google primero, luego Maven Central
- ✅ **Timeouts**: 60 segundos es suficiente para la mayoría de conexiones

## Estado Actual

- ✅ `eas.json` actualizado con gradleCommand optimizado
- ⚠️ `android/build.gradle` requiere modificación manual (ver Paso 1)
- ✅ `android/gradle.properties` ya contiene configuraciones de timeout

## Próximos Pasos

1. Aplica la modificación manual al archivo `android/build.gradle`
2. Ejecuta `cd android && ./gradlew clean && cd ..`
3. Intenta el build nuevamente con `eas build --platform android --profile production`
4. Si el build es exitoso, verifica que la app funcione correctamente
5. Si el build falla, revisa la sección de Troubleshooting

## Referencias

- [Stripe Android SDK en Maven Central](https://mvnrepository.com/artifact/com.stripe/stripe-android)
- [Gradle Dependency Resolution](https://docs.gradle.org/current/userguide/dependency_resolution.html)
- [EAS Build Configuration](https://docs.expo.dev/build/eas-json/)
