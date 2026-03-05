
# 🔔 GUÍA COMPLETA: NOTIFICACIONES PUSH EN ANDROID

## 🚨 PROBLEMA ACTUAL
Has generado una APK de desarrollo con EAS Build, pero las notificaciones push **NO funcionan** en Android.

## ✅ SOLUCIÓN PASO A PASO

### PASO 1: VERIFICAR FIREBASE CLOUD MESSAGING (FCM)

Tu `google-services.json` está configurado, pero necesitas habilitar FCM en Firebase Console:

1. **Ve a Firebase Console**: https://console.firebase.google.com/
2. **Selecciona tu proyecto**: `barlive-492b0`
3. **Ve a "Cloud Messaging"** en el menú lateral
4. **Habilita Cloud Messaging API (V1)**
5. **Copia el Server Key** (lo necesitarás para enviar notificaciones)

### PASO 2: CONFIGURAR EXPO PARA FCM

Necesitas agregar tu FCM Server Key a Expo:

```bash
# En tu terminal (si tienes acceso):
npx eas credentials:configure -p android

# Selecciona:
# - "FCM Server Key"
# - Pega el Server Key de Firebase Console
```

**⚠️ IMPORTANTE**: Si no tienes acceso a terminal, necesitas que alguien con acceso ejecute este comando.

### PASO 3: VERIFICAR PERMISOS EN ANDROID

Tu `app.json` ya tiene los permisos correctos:

```json
"permissions": [
  "POST_NOTIFICATIONS",        // ✅ Android 13+ (CRÍTICO)
  "VIBRATE",                   // ✅ Para vibración
  "USE_FULL_SCREEN_INTENT",    // ✅ Para heads-up notifications
  "RECEIVE_BOOT_COMPLETED",    // ✅ Para notificaciones después de reiniciar
  "SCHEDULE_EXACT_ALARM"       // ✅ Para notificaciones programadas
]
```

### PASO 4: VERIFICAR CONFIGURACIÓN DE EXPO NOTIFICATIONS

Tu `app.json` ya tiene la configuración correcta:

```json
"plugins": [
  [
    "expo-notifications",
    {
      "icon": "./assets/images/final_quest_240x240.png",
      "color": "#14B8A6",
      "sounds": ["./assets/sounds/brindis.wav"],
      "mode": "production",
      "androidMode": "default",
      "androidCollapsedTitle": "BarLive"
    }
  ]
]
```

### PASO 5: PROBAR NOTIFICACIONES

1. **Instala la APK** en tu dispositivo Android
2. **Abre la app** y ve a la pantalla de configuración
3. **Agrega el componente NotificationTester**:

```tsx
import NotificationTester from '@/components/NotificationTester';

// En tu pantalla de configuración:
<NotificationTester />
```

4. **Presiona "Registrar para Notificaciones"**
5. **Acepta los permisos** cuando se soliciten
6. **Presiona "Enviar Notificación de Prueba"**
7. **Deberías recibir una notificación en 2 segundos** con:
   - ✅ Sonido de brindis
   - ✅ Vibración
   - ✅ Heads-up notification (aparece en la parte superior)
   - ✅ Badge en el icono

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "No se pudo obtener el push token"

**Causa**: FCM no está configurado en Expo.

**Solución**:
```bash
npx eas credentials:configure -p android
# Agrega tu FCM Server Key
```

### Problema 2: "Notificación no aparece"

**Causa**: Permisos no otorgados o canales no configurados.

**Solución**:
1. Ve a Configuración del dispositivo → Apps → BarLive → Notificaciones
2. Verifica que las notificaciones estén habilitadas
3. Verifica que todos los canales estén habilitados

### Problema 3: "Notificación sin sonido"

**Causa**: El archivo de sonido no se incluyó en el build.

**Solución**:
1. Verifica que `assets/sounds/brindis.wav` existe
2. Verifica que está en `app.json` bajo `sounds`
3. Regenera la APK con `eas build`

### Problema 4: "Notificación no aparece en primer plano"

**Causa**: Configuración incorrecta del notification handler.

**Solución**: Ya está configurado correctamente en `utils/notifications.ts`:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,      // ✅ Mostrar alerta
    shouldPlaySound: true,       // ✅ Reproducir sonido
    shouldSetBadge: true,        // ✅ Mostrar badge
  }),
});
```

## 📊 VERIFICAR QUE TODO FUNCIONA

Usa el componente `NotificationTester` para verificar:

1. **Estado del Sistema**:
   - ✅ Disponible: Sí
   - ✅ Permisos: Otorgados
   - ✅ Token Registrado: Sí
   - ✅ Plataforma: android
   - ✅ Expo Go: No

2. **Enviar Notificación de Prueba**:
   - Presiona el botón "Enviar Notificación de Prueba 🍻"
   - Deberías recibir una notificación en 2 segundos
   - La notificación debe tener:
     - Título: "🍻 ¡Salud!"
     - Cuerpo: "Esta es una notificación de prueba de BarLive con sonido de brindis"
     - Sonido: Brindis
     - Vibración: Sí
     - Heads-up: Sí

## 🔐 ENVIAR NOTIFICACIONES DESDE EL BACKEND

Para enviar notificaciones desde tu backend, necesitas:

1. **Obtener el Expo Push Token** del usuario (se guarda automáticamente en `push_tokens` table)
2. **Enviar la notificación** usando la API de Expo:

```typescript
// Ejemplo de envío desde el backend:
const message = {
  to: expoPushToken,
  sound: 'brindis',
  title: '🍻 ¡Nuevo brindis!',
  body: 'Alguien te ha enviado un brindis',
  data: { type: 'cheers', localId: '123' },
  priority: 'high',
  channelId: 'default',
};

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});
```

## 📱 COMANDOS ÚTILES

```bash
# Generar nueva APK de desarrollo
eas build --profile development --platform android

# Configurar credenciales de FCM
eas credentials:configure -p android

# Ver logs de la APK instalada
adb logcat | grep -i "notifications"

# Verificar permisos de la app
adb shell dumpsys package com.barlive.app | grep -i "permission"
```

## ✅ CHECKLIST FINAL

- [ ] Firebase Cloud Messaging habilitado en Firebase Console
- [ ] FCM Server Key configurado en Expo con `eas credentials:configure`
- [ ] `google-services.json` en la raíz del proyecto
- [ ] Permisos correctos en `app.json`
- [ ] Sonido `brindis.wav` en `assets/sounds/`
- [ ] APK generada con `eas build --profile development --platform android`
- [ ] APK instalada en dispositivo físico (no emulador)
- [ ] Permisos de notificaciones aceptados en el dispositivo
- [ ] NotificationTester muestra "Disponible: Sí" y "Permisos: Otorgados"
- [ ] Notificación de prueba se recibe correctamente con sonido y vibración

## 🆘 SI NADA FUNCIONA

Si después de seguir todos los pasos las notificaciones aún no funcionan:

1. **Verifica los logs del dispositivo**:
   ```bash
   adb logcat | grep -i "expo\|notifications\|fcm"
   ```

2. **Verifica que FCM esté habilitado**:
   - Ve a Firebase Console
   - Cloud Messaging
   - Verifica que el API esté habilitado

3. **Regenera la APK**:
   ```bash
   eas build --profile development --platform android --clear-cache
   ```

4. **Verifica el Project ID**:
   - En `app.json`, verifica que `extra.eas.projectId` sea correcto
   - Debe coincidir con tu proyecto de Expo

## 📞 SOPORTE

Si necesitas ayuda adicional:
- Expo Docs: https://docs.expo.dev/push-notifications/overview/
- Firebase Docs: https://firebase.google.com/docs/cloud-messaging
- Expo Forums: https://forums.expo.dev/
