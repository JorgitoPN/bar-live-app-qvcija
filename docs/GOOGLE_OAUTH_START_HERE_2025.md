
# 🚀 Google OAuth Setup - EMPIEZA AQUÍ

## 👋 Bienvenido

Esta es tu guía de inicio para configurar Google OAuth en BarLive para Android e iOS. 

**📍 Estás aquí porque necesitas:**
- Configurar Google Sign-In para Android (Debug y Release)
- Configurar Google Sign-In para iOS
- Mantener la compatibilidad con Web y Supabase
- Tener todo listo para producción

---

## 📚 Documentación Disponible

Tenemos 4 guías principales. Elige la que mejor se adapte a tus necesidades:

### 1️⃣ [GOOGLE_OAUTH_SETUP_COMPLETO.md](./GOOGLE_OAUTH_SETUP_COMPLETO.md) ⭐ RECOMENDADO
**Para: Primera vez configurando o necesitas todos los detalles**

✅ Guía paso a paso completa
✅ Comandos específicos para tu proyecto
✅ Explicaciones detalladas
✅ Solución de problemas incluida
✅ Checklist de verificación

**Tiempo estimado: 30-45 minutos**

---

### 2️⃣ [GOOGLE_OAUTH_IOS_ANDROID_SETUP.md](./GOOGLE_OAUTH_IOS_ANDROID_SETUP.md)
**Para: Resumen rápido de los pasos principales**

✅ Pasos resumidos
✅ Comandos esenciales
✅ FAQ básico

**Tiempo estimado: 15-20 minutos**

---

### 3️⃣ [GOOGLE_OAUTH_CHECKLIST.md](./GOOGLE_OAUTH_CHECKLIST.md)
**Para: Verificar que todo esté configurado correctamente**

✅ Checklist interactivo
✅ Espacios para anotar tus Client IDs
✅ Verificación paso a paso

**Tiempo estimado: 10 minutos**

---

### 4️⃣ [GOOGLE_OAUTH_FLOW_DIAGRAM.md](./GOOGLE_OAUTH_FLOW_DIAGRAM.md)
**Para: Entender cómo funciona todo**

✅ Diagramas visuales
✅ Flujo de autenticación explicado
✅ Arquitectura del sistema

**Tiempo estimado: 15 minutos (lectura)**

---

### 5️⃣ [GOOGLE_OAUTH_TROUBLESHOOTING.md](./GOOGLE_OAUTH_TROUBLESHOOTING.md)
**Para: Cuando algo no funciona**

✅ Errores comunes y soluciones
✅ Comandos de debugging
✅ Guía de diagnóstico

**Tiempo estimado: Variable según el problema**

---

## 🎯 Ruta Recomendada

### Si es tu primera vez:

```
1. Lee GOOGLE_OAUTH_SETUP_COMPLETO.md (30-45 min)
   ↓
2. Sigue los pasos uno por uno
   ↓
3. Usa GOOGLE_OAUTH_CHECKLIST.md para verificar (10 min)
   ↓
4. Si hay problemas, consulta GOOGLE_OAUTH_TROUBLESHOOTING.md
   ↓
5. ¡Listo! 🎉
```

### Si ya tienes experiencia con OAuth:

```
1. Lee GOOGLE_OAUTH_IOS_ANDROID_SETUP.md (15-20 min)
   ↓
2. Usa GOOGLE_OAUTH_CHECKLIST.md como referencia
   ↓
3. Si hay problemas, consulta GOOGLE_OAUTH_TROUBLESHOOTING.md
   ↓
4. ¡Listo! 🎉
```

### Si algo no funciona:

```
1. Ve directamente a GOOGLE_OAUTH_TROUBLESHOOTING.md
   ↓
2. Busca tu error específico
   ↓
3. Sigue la solución paso a paso
   ↓
4. Si persiste, revisa GOOGLE_OAUTH_FLOW_DIAGRAM.md para entender el flujo
   ↓
5. ¡Listo! 🎉
```

---

## 📋 Información de Tu Proyecto

Guarda esta información, la necesitarás:

```
Proyecto: BarLive
Package Name (Android): com.barlive.app
Bundle ID (iOS): com.barlive.app
Supabase Project ID: embntaqwlwmgazvrglaf
Supabase URL: https://embntaqwlwmgazvrglaf.supabase.co
```

---

## ⚡ Quick Start (5 minutos)

Si solo quieres saber qué hacer ahora mismo:

### 1. Genera SHA-1 Fingerprints

```bash
# Debug
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

### 2. Crea Credenciales en Google Cloud Console

- Web (ya existe, NO borrar)
- Android Debug (con SHA-1 debug)
- Android Release (con SHA-1 release)
- iOS (con Bundle ID: com.barlive.app)

### 3. Configura Supabase

Agrega TODOS los Client IDs a "Authorized Client IDs":
```
WEB_ID,ANDROID_DEBUG_ID,ANDROID_RELEASE_ID,IOS_ID
```

### 4. Rebuild

```bash
npx expo start --clear
npx expo prebuild --clean
npx expo run:android
npx expo run:ios
```

### 5. Prueba

Abre la app e intenta iniciar sesión con Google.

**¿Funcionó? ¡Genial! 🎉**

**¿No funcionó?** Ve a [GOOGLE_OAUTH_TROUBLESHOOTING.md](./GOOGLE_OAUTH_TROUBLESHOOTING.md)

---

## ❓ Preguntas Frecuentes Rápidas

### ¿Tengo que borrar la credencial Web?
**NO.** La credencial Web es necesaria para Supabase. Solo agregas credenciales adicionales.

### ¿Por qué necesito dos credenciales Android?
Una para desarrollo (debug) y otra para producción (release). Cada una tiene un SHA-1 diferente.

### ¿Cuánto tiempo toma configurar todo?
- Primera vez: 30-45 minutos
- Con experiencia: 15-20 minutos

### ¿Qué pasa si algo no funciona?
Consulta [GOOGLE_OAUTH_TROUBLESHOOTING.md](./GOOGLE_OAUTH_TROUBLESHOOTING.md) - tiene soluciones para todos los errores comunes.

### ¿Necesito hacer esto para cada build?
No. Una vez configurado, funciona para todos los builds. Solo necesitas reconstruir la app después de cambios en `app.json`.

---

## 🎯 Objetivos de Esta Configuración

Al completar esta configuración, tendrás:

✅ Google Sign-In funcionando en Web
✅ Google Sign-In funcionando en Android (desarrollo)
✅ Google Sign-In funcionando en Android (producción)
✅ Google Sign-In funcionando en iOS
✅ Integración completa con Supabase
✅ Experiencia de usuario nativa y fluida
✅ Todo listo para producción

---

## 🔧 Herramientas Necesarias

Asegúrate de tener instalado:

- [ ] Node.js y npm
- [ ] Expo CLI (`npm install -g expo-cli`)
- [ ] Android Studio (para Android)
- [ ] Xcode (para iOS, solo en Mac)
- [ ] Java JDK (para keytool)
- [ ] Cuenta de Google Cloud Platform
- [ ] Acceso a Supabase Dashboard

---

## 📊 Estado de Tu Configuración

Usa este espacio para anotar tu progreso:

### Google Cloud Console
- [ ] Credencial Web verificada
- [ ] Credencial Android Debug creada
- [ ] Credencial Android Release creada
- [ ] Credencial iOS creada
- [ ] Redirect URIs configuradas

### Supabase
- [ ] Google Provider habilitado
- [ ] Client IDs configurados
- [ ] Authorized Client IDs agregados

### Aplicación
- [ ] app.json configurado
- [ ] App rebuildeada
- [ ] Probado en desarrollo
- [ ] Probado en producción

---

## 💡 Consejos Antes de Empezar

1. **Lee primero, actúa después**: Tómate 5 minutos para leer la guía completa antes de empezar
2. **Guarda tus Client IDs**: Anótalos en un lugar seguro
3. **No borres nada**: Solo agregas credenciales, no borres las existentes
4. **Espera después de cambios**: Google Cloud Console puede tardar 5-10 minutos en propagar cambios
5. **Usa logs**: Agrega console.log para ver qué está pasando

---

## 🚀 ¡Empecemos!

Ahora que tienes una visión general, elige tu ruta:

### 🎓 Primera vez o quieres todos los detalles
→ Ve a [GOOGLE_OAUTH_SETUP_COMPLETO.md](./GOOGLE_OAUTH_SETUP_COMPLETO.md)

### ⚡ Ya tienes experiencia con OAuth
→ Ve a [GOOGLE_OAUTH_IOS_ANDROID_SETUP.md](./GOOGLE_OAUTH_IOS_ANDROID_SETUP.md)

### ✅ Solo quieres verificar tu configuración
→ Ve a [GOOGLE_OAUTH_CHECKLIST.md](./GOOGLE_OAUTH_CHECKLIST.md)

### 🐛 Algo no está funcionando
→ Ve a [GOOGLE_OAUTH_TROUBLESHOOTING.md](./GOOGLE_OAUTH_TROUBLESHOOTING.md)

### 📊 Quieres entender cómo funciona
→ Ve a [GOOGLE_OAUTH_FLOW_DIAGRAM.md](./GOOGLE_OAUTH_FLOW_DIAGRAM.md)

---

## 🆘 ¿Necesitas Ayuda?

Si te quedas atascado:

1. Revisa [GOOGLE_OAUTH_TROUBLESHOOTING.md](./GOOGLE_OAUTH_TROUBLESHOOTING.md)
2. Verifica [GOOGLE_OAUTH_CHECKLIST.md](./GOOGLE_OAUTH_CHECKLIST.md)
3. Lee [GOOGLE_OAUTH_FLOW_DIAGRAM.md](./GOOGLE_OAUTH_FLOW_DIAGRAM.md) para entender el flujo
4. Revisa los logs de tu aplicación
5. Verifica los logs de Supabase Dashboard

---

## 🎉 ¡Éxito!

Una vez que todo funcione, tendrás una experiencia de autenticación de Google de nivel profesional en tu app BarLive.

**¡Buena suerte! 🚀**

---

## 📅 Última Actualización

**Fecha**: Enero 2025
**Versión**: 2.0
**Proyecto**: BarLive
**Supabase Project**: embntaqwlwmgazvrglaf

---

## 📝 Notas

Usa este espacio para tus notas personales:

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```
