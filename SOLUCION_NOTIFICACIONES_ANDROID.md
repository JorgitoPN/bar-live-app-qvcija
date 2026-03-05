
# 🔔 SOLUCIÓN: NOTIFICACIONES PUSH NO FUNCIONAN EN ANDROID

## 🚨 PROBLEMA
Has generado una APK de desarrollo con EAS Build, pero las notificaciones push **NO funcionan** en Android.

## ✅ SOLUCIÓN COMPLETA (PASO A PASO)

### PASO 1: VERIFICAR FIREBASE CLOUD MESSAGING (CRÍTICO)

**⚠️ ESTE ES EL PASO MÁS IMPORTANTE**

Tu `google-services.json` está configurado, pero necesitas **habilitar FCM** en Firebase Console:

1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: **barlive-492b0**
3. En el menú lateral, ve a **"Cloud Messaging"**
4. **Habilita "Cloud Messaging API (V1)"**
5. Copia el **Server Key** (lo necesitarás en el siguiente paso)

### PASO 2: CONFIGURAR FCM EN EXPO (CRÍTICO)

**⚠️ SIN ESTE PASO, LAS NOTIFICACIONES NO FUNCIONARÁN**

Necesitas agregar tu FCM Server Key a Expo. Hay dos formas:

#### Opción A: Si tienes acceso a terminal

```bash
npx eas credentials:configure -p android
```

Selecciona:
- **"FCM Server Key"**
- Pega el Server Key que copiaste de Firebase Console

#### Opción B: Si NO tienes acceso a terminal

1. Ve a: https://expo.dev/accounts/[tu-cuenta]/projects/bar-live-app-qvcija/credentials
2. Selecciona **Android**
3. Agrega **"FCM Server Key"**
4. Pega el Server Key de Firebase Console

### PASO 3: REGENERAR LA APK

Después de configurar el FCM Server Key, **DEBES regenerar la APK**:

```bash
eas build --profile development --platform android
```

**⚠️ IMPORTANTE**: La APK anterior NO funcionará porque no tiene el FCM Server Key configurado.

### PASO 4: INSTALAR Y PROBAR

1. **Descarga e instala** la nueva APK en tu dispositivo Android
2. **Abre la app** y ve a **Perfil → Configuración**
3. **Habilita "Notificaciones Push"** (acepta los permisos)
4. **Presiona "Probar Notificaciones"**
5. **Presiona "Registrar para Notificaciones"**
6. **Presiona "Enviar Notificación de Prueba"**
7. **Deberías recibir una notificación en 2 segundos** con:
   - ✅ Sonido de brindis
   - ✅ Vibración
   - ✅ Heads-up notification (aparece en la parte superior)
   - ✅ Badge en el icono

## 🐛 SI AÚN NO FUNCIONA

### Verificación 1: FCM está habilitado

1. Ve a Firebase Console
2. Cloud Messaging
3. Verifica que el API esté **habilitado** (debe mostrar "API enabled")

### Verificación 2: Server Key está configurado

```bash
eas credentials:list -p android
```

Debe mostrar:
```
FCM Server Key: ****...****
```

### Verificación 3: Permisos en el dispositivo

1. Ve a **Configuración del dispositivo**
2. **Apps** → **BarLive** → **Notificaciones**
3. Verifica que las notificaciones estén **habilitadas**
4. Verifica que todos los canales estén **habilitados**

### Verificación 4: Logs del dispositivo

Si tienes acceso a `adb`:

```bash
adb logcat | grep -i "expo\|notifications\|fcm"
```

Busca errores relacionados con FCM o notificaciones.

## 📊 ESTADO ESPERADO

Cuando todo funcione correctamente, el **NotificationTester** debe mostrar:

```
📊 Estado del Sistema
✅ Disponible: Sí
✅ Permisos: Otorgados
✅ Token Registrado: Sí
✅ Plataforma: android
✅ Expo Go: No
```

## 🔐 ENVIAR NOTIFICACIONES DESDE EL BACKEND

Una vez que las notificaciones funcionen en el dispositivo, necesitas configurar el backend para enviar notificaciones cuando ocurran eventos.

Ver: `BACKEND_NOTIFICATION_TRIGGERS_NEEDED.md` para más detalles.

## ✅ CHECKLIST FINAL

- [ ] Firebase Cloud Messaging habilitado en Firebase Console
- [ ] FCM Server Key copiado de Firebase Console
- [ ] FCM Server Key configurado en Expo con `eas credentials:configure`
- [ ] APK regenerada con `eas build --profile development --platform android`
- [ ] APK instalada en dispositivo físico
- [ ] Permisos de notificaciones aceptados en el dispositivo
- [ ] NotificationTester muestra "Disponible: Sí" y "Permisos: Otorgados"
- [ ] Notificación de prueba se recibe correctamente con sonido y vibración
- [ ] Backend configurado para enviar notificaciones (ver `BACKEND_NOTIFICATION_TRIGGERS_NEEDED.md`)

## 🆘 SOPORTE

Si después de seguir todos los pasos las notificaciones aún no funcionan:

1. **Verifica los logs**: `adb logcat | grep -i "expo\|notifications\|fcm"`
2. **Verifica FCM**: Firebase Console → Cloud Messaging → API enabled
3. **Regenera la APK**: `eas build --profile development --platform android --clear-cache`
4. **Contacta soporte de Expo**: https://forums.expo.dev/

## 📞 RECURSOS

- Expo Push Notifications: https://docs.expo.dev/push-notifications/overview/
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- EAS Build: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
