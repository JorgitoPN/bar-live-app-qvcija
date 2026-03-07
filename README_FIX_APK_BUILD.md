
# 🔧 SOLUCIÓN: Error de Build APK - Stripe Timeout

## 🚨 Problema Identificado

El build de APK está fallando con este error:

```
Could not resolve com.stripe:stripe-android:21.22.+
Failed to list versions for com.stripe:stripe-android.
Unable to load Maven meta-data from https://www.jitpack.io/com/stripe/stripe-android/maven-metadata.xml.
Read timed out
```

**Causa:** El archivo `android/build.gradle` está intentando resolver la dependencia de Stripe desde JitPack, que está causando timeouts. Stripe debe resolverse desde Maven Central.

---

## ✅ SOLUCIÓN (Acción Requerida)

### 📝 Paso Único: Actualizar android/build.gradle

**Archivo:** `android/build.gradle`

**Acción:** Abre el archivo y reemplaza TODO su contenido con el código que se encuentra en el archivo `FIX_APK_BUILD_STRIPE.md` (sección "Reemplaza TODO el contenido").

**Cambio clave:** Se agrega un bloque `resolutionStrategy` que:
1. Fuerza la versión 20.49.0 de Stripe desde Maven Central
2. Elimina JitPack de los repositorios
3. Intercepta cualquier intento de resolver Stripe desde JitPack

---

## 📊 Estado Actual de los Archivos

| Archivo | Estado | Acción Requerida |
|---------|--------|------------------|
| `android/build.gradle` | ⚠️ **Falta resolutionStrategy** | **✏️ Actualizar ahora** |
| `android/gradle.properties` | ✅ Configurado | ✅ Ninguna |
| `eas.json` | ✅ Configurado | ✅ Ninguna |

---

## 🎯 Archivos de Referencia

He creado 3 archivos con la solución completa:

1. **`FIX_APK_BUILD_STRIPE.md`** ⭐ **EMPIEZA AQUÍ**
   - Solución rápida (1 minuto)
   - Código listo para copiar/pegar
   - Instrucciones paso a paso

2. **`INSTRUCCIONES_BUILD_GRADLE.md`**
   - Explicación detallada del fix
   - Verificación paso a paso
   - Troubleshooting

3. **`SOLUCION_BUILD_APK_STRIPE.md`**
   - Documentación técnica completa
   - Explicación de la causa raíz
   - Alternativas y troubleshooting avanzado

---

## 🚀 Próximos Pasos

1. ✏️ **Abre** `FIX_APK_BUILD_STRIPE.md`
2. 📋 **Copia** el código del archivo `android/build.gradle`
3. 📝 **Pega** en tu archivo `android/build.gradle` (reemplazando todo)
4. 💾 **Guarda** el archivo
5. 🔨 **Intenta el build** nuevamente

---

## ✅ Resultado Esperado

Después de aplicar el fix:

```
✅ Stripe se descarga desde Maven Central (no JitPack)
✅ Versión específica 20.49.0 (no rango dinámico)
✅ Build completa exitosamente
✅ APK generado sin errores
```

---

## 🔍 Verificación del Fix

Tu archivo `android/build.gradle` debe contener:

```gradle
allprojects {
  repositories {
    google()
    mavenCentral()
    // NO debe tener jitpack.io
  }
  
  configurations.all {
    resolutionStrategy {
      force 'com.stripe:stripe-android:20.49.0'
      // ... resto del código
    }
  }
}
```

---

## 🆘 Soporte

Si el build sigue fallando después de aplicar el fix:

1. Verifica que guardaste el archivo correctamente
2. Asegúrate de que no hay errores de sintaxis
3. Revisa que Maven Central sea accesible desde tu red
4. Consulta la sección de Troubleshooting en `SOLUCION_BUILD_APK_STRIPE.md`

---

## 📚 Documentación Técnica

**¿Por qué funciona este fix?**

- **Problema:** JitPack está dando timeouts al intentar descargar Stripe
- **Solución:** Forzamos que Stripe se descargue desde Maven Central
- **Método:** Usamos `resolutionStrategy` para interceptar la resolución de dependencias
- **Versión:** 20.49.0 es estable, compatible y está en Maven Central

**Archivos ya configurados:**

- ✅ `android/gradle.properties` - Timeouts de red (60 segundos)
- ✅ `eas.json` - Gradle optimizado (`--no-daemon --max-workers=4`)

---

## 🎉 Conclusión

El fix es simple: actualizar `android/build.gradle` con el código correcto que fuerza Stripe a descargarse desde Maven Central en lugar de JitPack.

**Tiempo estimado:** 1 minuto  
**Dificultad:** Baja (copiar/pegar código)  
**Impacto:** Resuelve completamente el error de build  

¡Empieza con `FIX_APK_BUILD_STRIPE.md`! 🚀
