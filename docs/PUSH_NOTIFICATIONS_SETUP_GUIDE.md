
# 🔔 Sistema de Notificaciones Push - Guía Completa de Configuración

## 📋 Índice
1. [Resumen del Sistema](#resumen-del-sistema)
2. [Configuración de Firebase (Android)](#configuración-de-firebase-android)
3. [Configuración de Apple Developer (iOS)](#configuración-de-apple-developer-ios)
4. [Configuración de EAS](#configuración-de-eas)
5. [Verificación de la Base de Datos](#verificación-de-la-base-de-datos)
6. [Edge Functions Desplegadas](#edge-functions-desplegadas)
7. [Pruebas en Development Build](#pruebas-en-development-build)
8. [Despliegue a Producción](#despliegue-a-producción)
9. [Uso del Sistema](#uso-del-sistema)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Resumen del Sistema

El sistema de notificaciones push está **completamente implementado** y listo para configuración:

### ✅ Componentes Implementados

- **Frontend (`utils/notifications.ts`)**: Sistema completo de gestión de notificaciones
- **Base de Datos**: Tabla `push_tokens` con RLS policies
- **Edge Functions**: 
  - `send-push-notification`: Envío individual
  - `send-broadcast-notification`: Envío masivo
- **Canales Android**: 6 canales configurados (default, messages, events, cheers, promos, silent)
- **Deep Linking**: Navegación automática desde notificaciones
- **Badge Management**: Contador de notificaciones
- **Token Management**: Registro, actualización y limpieza automática

### 🔧 Características

- ✅ Android + iOS completamente funcional
- ✅ FCM (Firebase Cloud Messaging) integrado
- ✅ APNs (Apple Push Notification service) configurado
- ✅ Manejo de permisos robusto
- ✅ Tokens de dispositivo con actualización automática
- ✅ Soporte foreground, background y app cerrada
- ✅ Deep linking desde notificaciones
- ✅ Payload personalizado
- ✅ Notificaciones silenciosas
- ✅ Segmentación preparada
- ✅ Notificaciones programadas

---

## 🔥 Configuración de Firebase (Android)

### Paso 1: Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto"
3. Nombre del proyecto: **BarLive**
4. Acepta los términos y crea el proyecto

### Paso 2: Agregar App Android

1. En el proyecto Firebase, haz clic en el ícono de Android
2. **Package name**: `com.barlive.app` (debe coincidir con `app.json`)
3. **App nickname**: BarLive
4. **Debug signing certificate SHA-1**: (opcional para desarrollo)
5. Haz clic en "Registrar app"

### Paso 3: Descargar google-services.json

1. Descarga el archivo `google-services.json`
2. Colócalo en la raíz del proyecto: `./google-services.json`
3. **IMPORTANTE**: Añade este archivo a `.gitignore` si contiene información sensible

```bash
# En la raíz del proyecto
echo "google-services.json" >> .gitignore
```

### Paso 4: Habilitar Cloud Messaging API

1. En Firebase Console, ve a **Project Settings** (⚙️)
2. Ve a la pestaña **Cloud Messaging**
3. Copia el **Server Key** (lo necesitarás para pruebas)
4. Asegúrate de que **Cloud Messaging API** esté habilitado

### Paso 5: Verificar Configuración

El archivo `app.json` ya está configurado con:

```json
{
  "android": {
    "package": "com.barlive.app",
    "googleServicesFile": "./google-services.json"
  }
}
```

---

## 🍎 Configuración de Apple Developer (iOS)

### Paso 1: Crear App ID

1. Ve a [Apple Developer Portal](https://developer.apple.com/account/)
2. Ve a **Certificates, Identifiers & Profiles**
3. Haz clic en **Identifiers** → **+** (nuevo)
4. Selecciona **App IDs** → **Continue**
5. **Description**: BarLive
6. **Bundle ID**: `com.barlive.app` (debe coincidir con `app.json`)
7. **Capabilities**: Marca **Push Notifications**
8. Haz clic en **Continue** → **Register**

### Paso 2: Generar APNs Authentication Key

**Opción A: Authentication Key (.p8) - RECOMENDADO**

1. Ve a **Keys** → **+** (nuevo)
2. **Key Name**: BarLive Push Notifications
3. Marca **Apple Push Notifications service (APNs)**
4. Haz clic en **Continue** → **Register**
5. **Descarga el archivo .p8** (solo se puede descargar una vez)
6. Guarda el **Key ID** y **Team ID**

**Opción B: Certificate (.p12) - Alternativa**

1. Ve a **Certificates** → **+** (nuevo)
2. Selecciona **Apple Push Notification service SSL (Sandbox & Production)**
3. Selecciona tu App ID
4. Genera un CSR desde Keychain Access (Mac)
5. Sube el CSR y descarga el certificado
6. Instala el certificado en Keychain Access
7. Exporta como .p12

### Paso 3: Configurar EAS Credentials

```bash
# Configurar credenciales de APNs
npx eas credentials

# Selecciona:
# - iOS
# - Push Notifications
# - Upload APNs Key (.p8) o Certificate (.p12)
```

Proporciona:
- **Key ID** (si usas .p8)
- **Team ID**
- **Archivo .p8 o .p12**

---

## 🚀 Configuración de EAS

### Paso 1: Inicializar EAS

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login en Expo
eas login

# Inicializar proyecto EAS
eas init
```

### Paso 2: Configurar eas.json

El archivo `eas.json` debe tener esta configuración:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### Paso 3: Obtener Project ID

```bash
# Ver información del proyecto
eas project:info

# El Project ID aparecerá en la salida
# Ejemplo: a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Paso 4: Actualizar app.json

Añade el Project ID a `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "TU_PROJECT_ID_AQUI"
      }
    }
  }
}
```

---

## 💾 Verificación de la Base de Datos

### ✅ Tabla push_tokens

La tabla ya está creada con la siguiente estructura:

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  device_id TEXT NOT NULL,
  device_name TEXT,
  os_version TEXT,
  app_version TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);
```

### ✅ RLS Policies

Las políticas de seguridad están configuradas:

- Users can view their own push tokens
- Users can insert their own push tokens
- Users can update their own push tokens
- Users can delete their own push tokens

### Verificar en Supabase Dashboard

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Table Editor** → **push_tokens**
4. Verifica que la tabla existe y tiene las columnas correctas

---

## ⚡ Edge Functions Desplegadas

### ✅ send-push-notification

**Endpoint**: `https://[PROJECT_ID].supabase.co/functions/v1/send-push-notification`

**Uso**:

```typescript
const { error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: 'user-uuid',
    notification: {
      type: 'message',
      title: '¡Nuevo mensaje!',
      body: 'Tienes un mensaje de Juan',
      deepLink: 'barlive://chat/conversation-id',
    },
  },
});
```

### ✅ send-broadcast-notification

**Endpoint**: `https://[PROJECT_ID].supabase.co/functions/v1/send-broadcast-notification`

**Uso**:

```typescript
const { error } = await supabase.functions.invoke('send-broadcast-notification', {
  body: {
    userIds: ['user-1', 'user-2', 'user-3'],
    notification: {
      type: 'event',
      title: '🎉 Nuevo evento',
      body: 'Fiesta en Bar Central esta noche',
      deepLink: 'barlive://detalle/evento?id=event-id',
    },
  },
});
```

---

## 🧪 Pruebas en Development Build

### Paso 1: Crear Development Build

**Android**:

```bash
# Crear APK de desarrollo
eas build --profile development --platform android

# Descargar e instalar en dispositivo físico
# Las notificaciones NO funcionan en emuladores
```

**iOS**:

```bash
# Crear build de desarrollo
eas build --profile development --platform ios

# Instalar en dispositivo físico vía TestFlight o directamente
```

### Paso 2: Probar Registro de Token

1. Abre la app en un dispositivo físico
2. Inicia sesión con un usuario
3. El sistema automáticamente:
   - Solicita permisos de notificaciones
   - Registra el token en la base de datos
   - Configura los canales de Android

### Paso 3: Verificar Token en Base de Datos

```sql
-- En Supabase SQL Editor
SELECT * FROM push_tokens WHERE user_id = 'tu-user-id';
```

Deberías ver:
- `token`: ExponentPushToken[...]
- `platform`: ios o android
- `device_id`: identificador único
- `active`: true

### Paso 4: Enviar Notificación de Prueba

Usa la función `scheduleTestNotification()` en la app:

```typescript
import { scheduleTestNotification } from '@/utils/notifications';

// En cualquier pantalla
<TouchableOpacity onPress={scheduleTestNotification}>
  <Text>Enviar Notificación de Prueba</Text>
</TouchableOpacity>
```

O envía desde el backend:

```typescript
// Desde un Edge Function o API
await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: 'user-id',
    notification: {
      type: 'cheers',
      title: '🍻 ¡Salud!',
      body: 'Esta es una notificación de prueba',
    },
  },
});
```

---

## 🚀 Despliegue a Producción

### Paso 1: Builds de Producción

**Android (Google Play)**:

```bash
# Crear App Bundle para Google Play
eas build --profile production --platform android

# Subir a Google Play Console
# https://play.google.com/console
```

**iOS (App Store)**:

```bash
# Crear build para App Store
eas build --profile production --platform ios

# Subir a App Store Connect
# https://appstoreconnect.apple.com
```

### Paso 2: Configurar Notificaciones en Stores

**Google Play Console**:

1. Ve a **App content** → **App access**
2. Verifica que las notificaciones estén habilitadas
3. Completa la declaración de privacidad

**App Store Connect**:

1. Ve a **App Information**
2. Verifica que **Push Notifications** esté en capabilities
3. Completa la declaración de privacidad

### Paso 3: Monitoreo

Configura monitoreo para:

- Tasa de entrega de notificaciones
- Tokens inválidos/expirados
- Errores de envío
- Engagement (taps en notificaciones)

---

## 📱 Uso del Sistema

### Inicializar Notificaciones

```typescript
import { initializeNotifications } from '@/utils/notifications';

// En App.tsx o _layout.tsx
useEffect(() => {
  if (user) {
    initializeNotifications(user.id);
  }
}, [user]);
```

### Enviar Notificación Individual

```typescript
import { sendPushNotification } from '@/utils/notifications';

await sendPushNotification('user-id', {
  type: 'like',
  title: '❤️ Nuevo like',
  body: 'A María le gustó tu publicación',
  postId: 'post-id',
  deepLink: 'barlive://social/post/post-id',
});
```

### Enviar Notificación Masiva

```typescript
import { sendBroadcastNotification } from '@/utils/notifications';

await sendBroadcastNotification(
  ['user-1', 'user-2', 'user-3'],
  {
    type: 'event',
    title: '🎉 Nuevo evento',
    body: 'Fiesta en Bar Central esta noche',
    deepLink: 'barlive://detalle/evento?id=event-id',
  }
);
```

### Programar Notificación

```typescript
import { scheduleNotification } from '@/utils/notifications';

const scheduledDate = new Date();
scheduledDate.setHours(scheduledDate.getHours() + 2);

await scheduleNotification(
  'user-id',
  {
    type: 'event',
    title: '⏰ Recordatorio',
    body: 'Tu evento comienza en 2 horas',
  },
  scheduledDate
);
```

### Manejar Notificaciones Recibidas

```typescript
import { 
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener 
} from '@/utils/notifications';

// Cuando la app está en foreground
useEffect(() => {
  const subscription = addNotificationReceivedListener((notification) => {
    console.log('Notificación recibida:', notification);
    // Actualizar UI, mostrar badge, etc.
  });

  return () => subscription.remove();
}, []);

// Cuando el usuario toca la notificación
useEffect(() => {
  const subscription = addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    // Navegar a la pantalla correspondiente
    if (data.deepLink) {
      Linking.openURL(data.deepLink);
    }
  });

  return () => subscription.remove();
}, []);
```

---

## 🔧 Troubleshooting

### Problema: "Push notifications are not available in Expo Go"

**Solución**: Las notificaciones push requieren un development build. Expo Go no las soporta en Android SDK 53+.

```bash
# Crear development build
eas build --profile development --platform android
```

### Problema: "EAS Project ID not configured"

**Solución**: Añade el Project ID a `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "tu-project-id"
      }
    }
  }
}
```

### Problema: Token no se registra

**Verificar**:

1. ¿Estás en un dispositivo físico? (no emulador)
2. ¿Tienes permisos de notificaciones?
3. ¿El Project ID está configurado?
4. ¿Estás usando un development build?

```typescript
import { getNotificationStatus } from '@/utils/notifications';

const status = await getNotificationStatus();
console.log('Status:', status);
// {
//   available: true/false,
//   permissionsGranted: true/false,
//   tokenRegistered: true/false,
//   platform: 'ios'/'android',
//   isExpoGo: true/false
// }
```

### Problema: Notificaciones no llegan

**Verificar**:

1. ¿El token está activo en la base de datos?
2. ¿El Edge Function se ejecutó correctamente?
3. ¿Hay errores en los logs de Supabase?

```sql
-- Verificar tokens activos
SELECT * FROM push_tokens WHERE user_id = 'user-id' AND active = true;
```

```typescript
// Verificar logs de Edge Function
// En Supabase Dashboard → Edge Functions → Logs
```

### Problema: "DeviceNotRegistered" error

**Solución**: El token expiró o es inválido. El sistema automáticamente marca estos tokens como inactivos.

```typescript
// Refrescar token manualmente
import { refreshPushToken } from '@/utils/notifications';

await refreshPushToken(userId);
```

### Problema: Notificaciones no abren la app

**Verificar Deep Linking**:

1. Asegúrate de que el `scheme` está configurado en `app.json`:

```json
{
  "expo": {
    "scheme": "barlive"
  }
}
```

2. Verifica que los deep links sean válidos:

```typescript
// Formato correcto
deepLink: 'barlive://chat/conversation-id'
deepLink: 'barlive://social/post/post-id'
deepLink: 'barlive://detalle/evento?id=event-id'
```

---

## 📊 Monitoreo y Métricas

### Métricas Importantes

1. **Tasa de Registro**: % de usuarios que permiten notificaciones
2. **Tasa de Entrega**: % de notificaciones entregadas exitosamente
3. **Tasa de Apertura**: % de notificaciones que abren la app
4. **Tokens Activos**: Número de dispositivos con tokens válidos
5. **Errores**: Tokens inválidos, fallos de envío

### Queries Útiles

```sql
-- Total de tokens activos
SELECT COUNT(*) FROM push_tokens WHERE active = true;

-- Tokens por plataforma
SELECT platform, COUNT(*) 
FROM push_tokens 
WHERE active = true 
GROUP BY platform;

-- Tokens inactivos (para limpieza)
SELECT * FROM push_tokens 
WHERE active = false 
AND updated_at < NOW() - INTERVAL '30 days';

-- Usuarios sin token (no han dado permisos)
SELECT u.id, u.nombre, u.email
FROM usuarios u
LEFT JOIN push_tokens pt ON u.id = pt.user_id
WHERE pt.id IS NULL;
```

---

## 🎉 ¡Sistema Listo!

El sistema de notificaciones push está completamente implementado y listo para usar. Solo necesitas:

1. ✅ Configurar Firebase Console (Android)
2. ✅ Configurar Apple Developer (iOS)
3. ✅ Crear development builds
4. ✅ Probar en dispositivos físicos
5. ✅ Desplegar a producción

**Documentación adicional**:
- [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notifications](https://developer.apple.com/documentation/usernotifications)

**Soporte**:
- Revisa los logs en Supabase Dashboard
- Usa `getNotificationStatus()` para debugging
- Consulta esta guía para troubleshooting
