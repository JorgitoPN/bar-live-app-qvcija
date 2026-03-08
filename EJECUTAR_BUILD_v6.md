
# 🚀 EJECUTAR BUILD APK - INSTRUCCIONES PASO A PASO (v6)

## ⚡ INICIO RÁPIDO (3 COMANDOS)

Si solo quieres ejecutar el build rápidamente:

```bash
rm -rf android && pnpm expo prebuild -p android --clean && cd android && ./gradlew assembleDebug --no-daemon --stacktrace
```

**Tiempo estimado**: 6-8 minutos

---

## 📝 INSTRUCCIONES DETALLADAS

### PASO 1: Limpieza Total
```bash
rm -rf android
```

**¿Por qué?** Elimina configuraciones antiguas que pueden causar conflictos.

**Salida esperada**: Ninguna (el comando no imprime nada si funciona).

---

### PASO 2: Regenerar Proyecto Android
```bash
pnpm expo prebuild -p android --clean
```

**¿Qué hace?**
- Regenera la carpeta `android/` desde cero
- Aplica automáticamente el plugin `withStripeFixed.js` (v6)
- Configura todas las dependencias nativas

**Salida esperada**:
```
✅ Stripe Repository Isolation + Dependency Fix applied (v6):
   - Repository Isolation: com.stripe → mavenCentral ONLY
   - Forcing stripe-android → 20.49.0
   - Forcing financial-connections → 20.49.0
   - Allowing stripe-3ds2-android to resolve naturally
   - ListenableFuture conflict resolution added (fixes Duplicate class error)

✔ Config synced
✔ Android project ready
```

**Tiempo estimado**: 1-2 minutos

---

### PASO 3: Verificar que el Fix se Aplicó (OPCIONAL)
```bash
grep -A 2 "capabilitiesResolution.withCapability" android/build.gradle
```

**Salida esperada**:
```groovy
capabilitiesResolution.withCapability('com.google.guava:listenablefuture') {
    select('com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava')
}
```

Si NO ves esta salida, el plugin no se aplicó. Verifica que `app.json` tenga `"./plugins/withStripeFixed"` en la lista de plugins.

---

### PASO 4: Build del APK
```bash
cd android
./gradlew assembleDebug --no-daemon --stacktrace
```

**¿Qué hace?**
- Compila el código Java/Kotlin
- Resuelve todas las dependencias
- Genera el APK de debug

**Flags importantes**:
- `--no-daemon`: Fuerza una instancia fresca de Gradle (evita cachés corruptos)
- `--stacktrace`: Muestra logs detallados si hay errores

**Salida esperada (si funciona)**:
```
> Task :app:assembleDebug
BUILD SUCCESSFUL in 6m 30s
142 actionable tasks: 142 executed
```

**Tiempo estimado**: 5-7 minutos

---

## ✅ VERIFICACIÓN DEL APK

Si el build fue exitoso, el APK estará en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Verifica que existe:
```bash
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
```

**Salida esperada**:
```
-rw-r--r-- 1 user user 45M Jan 15 10:30 app-debug.apk
```

---

## ❌ SI EL BUILD FALLA

### 1. Identifica el Tipo de Error

Busca en la salida del comando `./gradlew assembleDebug` las siguientes líneas:

#### Error de Timeout (ya debería estar resuelto)
```
Could not GET 'https://www.jitpack.io/...'
Read timed out
```
**Solución**: Verifica que JitPack NO esté en `app.json` → `extraMavenRepos`.

#### Error de Duplicate Class (debería estar resuelto en v6)
```
e: Duplicate class com.google.common.util.concurrent.ListenableFuture found in modules:
```
**Solución**: Verifica que el fix v6 se aplicó (Paso 3).

#### Otro Error de Compilación
```
e: /path/to/file.kt: (line, column): Error message
error: compilation failed
Execution failed for task ':app:compileDebugKotlin'
```
**Acción**: Guarda los logs completos y busca ayuda.

---

### 2. Obtén los Logs Completos

```bash
cd android
./gradlew assembleDebug --no-daemon --stacktrace 2>&1 | tee build_full.log
```

Esto guardará TODA la salida en `build_full.log`.

---

### 3. Extrae las Líneas Relevantes

```bash
# Buscar errores de Kotlin
grep "^e: " build_full.log

# Buscar errores de Java
grep "^error: " build_full.log

# Buscar tareas fallidas
grep "Execution failed for task" build_full.log

# Buscar duplicate class
grep -i "duplicate class" build_full.log
```

---

### 4. Proporciona Información para Soporte

Si necesitas ayuda, proporciona:
1. Las últimas 50-100 líneas de `build_full.log`
2. El contenido de `android/build.gradle` (primeras 50 líneas)
3. El mensaje de error exacto que aparece en rojo

---

## 🔧 TROUBLESHOOTING AVANZADO

### Limpiar Caché de Gradle
```bash
cd android
./gradlew clean --no-daemon
rm -rf ~/.gradle/caches/
```

### Verificar Versión de Gradle
```bash
cd android
./gradlew --version
```

**Versión esperada**: Gradle 8.x o superior

### Verificar Versión de Java
```bash
java -version
```

**Versión esperada**: Java 17 o superior

---

## 📊 CHECKLIST FINAL

Antes de ejecutar el build, verifica:

- [ ] Has ejecutado `rm -rf android`
- [ ] Has ejecutado `pnpm expo prebuild -p android --clean`
- [ ] El comando `expo prebuild` mostró el mensaje de v6
- [ ] `android/build.gradle` contiene `capabilitiesResolution.withCapability`
- [ ] Tienes conexión a internet estable
- [ ] Tienes al menos 2GB de espacio libre en disco

Si todos los checks están ✅, ejecuta:
```bash
cd android
./gradlew assembleDebug --no-daemon --stacktrace
```

---

## ✨ RESULTADO ESPERADO

```
BUILD SUCCESSFUL in 6m 30s
```

APK generado en:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**¡Listo para instalar en tu dispositivo Android!**

---

**Versión**: v6
**Fecha**: 2025-01-XX
**Soporte**: Proporciona los logs si el build falla
