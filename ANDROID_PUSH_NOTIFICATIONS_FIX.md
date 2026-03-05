
# 🔔 SOLUCIÓN COMPLETA: NOTIFICACIONES PUSH EN ANDROID

## 🚨 PROBLEMA ACTUAL

Has instalado la APK en tu teléfono Android pero las notificaciones push **NO funcionan**. Esto es porque:

1. ❌ Las notificaciones push **NO funcionan** con APKs generadas con `expo build`
2. ❌ Las notificaciones push **NO funcionan** con APKs instaladas directamente sin compilación nativa
3. ❌ Las notificaciones push **NO funcionan** en Expo Go (SDK 53+)

## ✅ SOLUCIÓN: EAS BUILD

Las notificaciones push en Android **REQUIEREN** un build nativo con EAS Build. No hay atajos ni soluciones alternativas.

### 📋 REQUISITOS PREVIOS

Antes de empezar, verifica que tienes:

- ✅ Node.js instalado (v16 o superior)
- ✅ Cuenta de Expo (gratis en expo.dev)
- ✅ Proyecto configurado con `app.json` y `google-services.json` (ya lo tienes)
- ✅ Conexión a internet estable

### 🛠️ PASO 1: INSTALAR EAS CLI

Abre tu terminal y ejecuta:

```bash
npm install -g eas-cli
```

Verifica la instalación:

```bash
eas --version
```

### 🔐 PASO 2: LOGIN EN EXPO

```bash
eas login
```

Ingresa tus credenciales de Expo. Si no tienes cuenta, créala en [expo.dev](https://expo.dev).

### 🏗️ PASO 3: GENERAR APK CON EAS BUILD

Este es el paso más importante. Ejecuta:

```bash
eas build --profile development --platform android
```

**¿Qué hace este comando?**
- ✅ Compila la app con soporte nativo para notificaciones push
- ✅ Incluye Firebase Cloud Messaging (FCM)
- ✅ Incluye el sonido personalizado `brindis.wav`
- ✅ Configura todos los permisos necesarios (POST_NOTIFICATIONS, VIBRATE, etc.)
- ✅ Genera una APK lista para instalar

**⏱️ Tiempo estimado:** 10-15 minutos la primera vez

**💰 Costo:** Expo ofrece builds gratuitos limitados cada mes. Si necesitas más, hay planes de pago.

### 📥 PASO 4: DESCARGAR LA APK

Una vez que el build termine:

1. Recibirás un link en la terminal (algo como: `https://expo.dev/artifacts/...`)
2. Copia ese link y ábrelo en tu navegador
3. Descarga la APK directamente en tu teléfono Android
4. O descárgala en tu computadora y transfiérela a tu teléfono

### 📱 PASO 5: INSTALAR LA APK

1. Abre el archivo APK en tu teléfono
2. Si es la primera vez, Android te pedirá permiso para instalar apps de fuentes desconocidas
3. Ve a **Ajustes > Seguridad > Fuentes desconocidas** y habilita la instalación
4. Vuelve al archivo APK e instálalo
5. Abre la app

### 🔔 PASO 6: ACEPTAR PERMISOS

Cuando abras la app por primera vez:

1. La app te pedirá permiso para enviar notificaciones
2. **IMPORTANTE:** Presiona **"Permitir"** o **"Aceptar"**
3. Si accidentalmente presionaste "Denegar", ve a:
   - **Ajustes > Aplicaciones > BarLive > Permisos > Notificaciones**
   - Activa el permiso manualmente

### ✅ PASO 7: PROBAR LAS NOTIFICACIONES

#### Opción A: Usar el Componente de Prueba

1. Agrega el componente `NotificationTester` a tu pantalla de configuración:

```typescript
import NotificationTester from '@/components/NotificationTester';

// En tu pantalla de configuración:
<NotificationTester />
```

2. Presiona "Registrar para Notificaciones"
3. Presiona "Enviar Notificación de Prueba"
4. Deberías recibir una notificación en 2 segundos con:
   - ✅ Sonido de brindis 🍻
   - ✅ Vibración
   - ✅ Heads-up notification (aparece en la parte superior)
   - ✅ Badge en el icono de la app

#### Opción B: Enviar Notificación desde el Backend

Si tienes acceso al backend, puedes enviar una notificación de prueba usando el token del dispositivo.

## 🔍 VERIFICACIÓN COMPLETA

### ✅ Checklist de Verificación

Marca cada punto a medida que lo completes:

- [ ] Instalé EAS CLI (`npm install -g eas-cli`)
- [ ] Hice login en Expo (`eas login`)
- [ ] Generé la APK con EAS Build (`eas build --profile development --platform android`)
- [ ] Descargué la APK del link proporcionado
- [ ] Instalé la APK en mi teléfono Android
- [ ] Abrí la app y acepté los permisos de notificaciones
- [ ] Probé enviar una notificación de prueba
- [ ] La notificación apareció con sonido, vibración y heads-up
- [ ] El badge se actualizó en el icono de la app

### 🎯 Resultado Esperado

Después de seguir todos los pasos, deberías tener:

- ✅ Notificaciones push funcionando perfectamente
- ✅ Sonido de brindis 🍻 en cada notificación
- ✅ Vibración al recibir notificaciones
- ✅ Heads-up notifications (aparecen en la parte superior de la pantalla)
- ✅ Badge count en el icono de la app
- ✅ Notificaciones visibles en la barra de notificaciones

## 🐛 TROUBLESHOOTING

### Problema 1: "Las notificaciones no aparecen"

**Solución:**
1. Verifica que aceptaste los permisos de notificaciones
2. Ve a **Ajustes > Aplicaciones > BarLive > Notificaciones**
3. Asegúrate de que todas las categorías estén habilitadas:
   - Notificaciones Generales
   - Mensajes
   - Eventos
   - Brindis
   - Promociones
   - Planes y Suscripciones

### Problema 2: "Las notificaciones aparecen pero sin sonido"

**Solución:**
1. Verifica que el archivo `brindis.wav` esté en `assets/sounds/brindis.wav`
2. Verifica que el volumen de notificaciones esté activado en tu teléfono
3. Ve a **Ajustes > Aplicaciones > BarLive > Notificaciones > [Categoría]**
4. Asegúrate de que el sonido esté habilitado para cada categoría

### Problema 3: "Las notificaciones no aparecen como heads-up"

**Solución:**
1. Ve a **Ajustes > Aplicaciones > BarLive > Notificaciones**
2. Asegúrate de que la prioridad esté en "Alta" o "Urgente"
3. Verifica que "Mostrar en pantalla" esté habilitado

### Problema 4: "El build falla con error de Firebase"

**Solución:**
1. Verifica que `google-services.json` esté en la raíz del proyecto
2. Verifica que el `package_name` en `google-services.json` coincida con el de `app.json`:
   - `google-services.json`: `"package_name": "com.barlive.app"`
   - `app.json`: `"package": "com.barlive.app"`

### Problema 5: "El build tarda mucho tiempo"

**Solución:**
- Es normal que el primer build tarde 10-15 minutos
- Los builds posteriores son más rápidos (5-10 minutos)
- Asegúrate de tener una conexión a internet estable

### Problema 6: "No tengo builds gratuitos disponibles"

**Solución:**
- Expo ofrece builds gratuitos limitados cada mes
- Si necesitas más builds, considera:
  1. Esperar al próximo mes para que se renueven los builds gratuitos
  2. Suscribirte a un plan de pago de Expo
  3. Usar un build local (más complejo, requiere Android Studio)

## 📊 COMPARACIÓN: ANTES vs DESPUÉS

### ANTES (APK actual sin EAS Build)
- ❌ Notificaciones NO funcionan
- ❌ Sin sonido
- ❌ Sin vibración
- ❌ Sin heads-up
- ❌ Sin badge
- ❌ Sin soporte para FCM

### DESPUÉS (APK con EAS Build)
- ✅ Notificaciones funcionan perfectamente
- ✅ Sonido de brindis 🍻
- ✅ Vibración
- ✅ Heads-up notification
- ✅ Badge en el icono
- ✅ Soporte completo para FCM
- ✅ Canales de notificación configurados
- ✅ Permisos nativos correctos

## 🚀 PARA PRODUCCIÓN

Una vez que las notificaciones funcionen en desarrollo, puedes generar una APK de producción:

```bash
eas build --profile production --platform android
```

Esta APK:
- ✅ Está optimizada para producción
- ✅ Tiene el mismo soporte de notificaciones
- ✅ Puede ser publicada en Google Play Store

## 📞 SOPORTE ADICIONAL

Si después de seguir todos estos pasos las notificaciones siguen sin funcionar:

1. Revisa los logs de la app:
   ```bash
   adb logcat | grep -i notification
   ```

2. Verifica el estado del sistema de notificaciones usando el componente `NotificationTester`

3. Asegúrate de que el token de push se esté guardando correctamente en la base de datos

4. Verifica que Firebase Cloud Messaging esté configurado correctamente en tu proyecto de Firebase

## 🎓 RECURSOS ADICIONALES

- [Documentación de Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Guía de EAS Build](https://docs.expo.dev/build/introduction/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Android Notification Channels](https://developer.android.com/develop/ui/views/notifications/channels)

---

## 📝 RESUMEN EJECUTIVO

**PROBLEMA:** Las notificaciones push no funcionan en la APK actual.

**CAUSA:** La APK no fue generada con EAS Build, por lo que no incluye el soporte nativo necesario para notificaciones push.

**SOLUCIÓN:** Generar una nueva APK con EAS Build:
```bash
eas build --profile development --platform android
```

**TIEMPO:** 10-15 minutos

**RESULTADO:** Notificaciones push funcionando con sonido de brindis, vibración, heads-up y badge.

---

**NOTA IMPORTANTE:** Este es el **ÚNICO** camino para que las notificaciones funcionen en Android. No hay atajos ni soluciones alternativas. Necesitas hacer el build con EAS.
