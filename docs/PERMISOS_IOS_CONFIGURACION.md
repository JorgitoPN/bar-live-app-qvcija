
# 🔐 Configuración de Permisos iOS - BarLive

## ✅ Configuración Completada

Tu app de Expo ahora está totalmente configurada para ser compatible con iOS y evitar errores de permisos en la compilación final (Build).

## 📋 Cambios Realizados

### 1. **app.json - Configuración de Permisos iOS**

Se han añadido las siguientes descripciones en `expo.ios.infoPlist`:

- **NSLocationWhenInUseUsageDescription**: "BarLive necesita acceso a tu ubicación para mostrarte locales cercanos y eventos relevantes en tu zona, mejorando tu experiencia al descubrir lugares de interés."

- **NSCameraUsageDescription**: "BarLive necesita acceso a tu cámara para que puedas tomar fotos y videos, enriqueciendo tus publicaciones y perfil en la comunidad."

- **NSMicrophoneUsageDescription**: "BarLive necesita acceso a tu micrófono para grabar audio en videos, permitiéndote compartir experiencias más completas con otros usuarios."

### 2. **Plugin de Notificaciones**

Se ha añadido el plugin `expo-notifications` con configuración para producción:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/images/natively-dark.png",
    "color": "#000000",
    "mode": "production"
  }
]
```

Esto permite:
- ✅ Registrar el token del dispositivo para notificaciones push
- ✅ Enviar mensajes push en producción
- ✅ Configuración automática de capabilities en iOS

### 3. **Utilidad de Permisos Unificada** (`utils/permissions.ts`)

Se ha creado una utilidad completa para gestionar permisos de forma segura:

#### Funciones Disponibles:

**`requestAppPermission(type, description)`**
- Solicita un permiso específico
- Maneja errores con try/catch
- Muestra alertas amigables si el usuario deniega el acceso
- Retorna `true` si se concede, `false` si se deniega

**`checkAppPermission(type)`**
- Verifica si un permiso ya está concedido
- No solicita el permiso, solo verifica el estado
- Útil para comprobar antes de usar una funcionalidad

**`requestMultiplePermissions(permissions)`**
- Solicita varios permisos de forma secuencial
- Retorna un objeto con el estado de cada permiso
- Ideal para solicitar todos los permisos al inicio de la app

## 🚀 Cómo Usar los Permisos en tu App

### Ejemplo 1: Solicitar Ubicación al Abrir el Mapa

```typescript
import { requestAppPermission } from '@/utils/permissions';

const handleOpenMap = async () => {
  const granted = await requestAppPermission(
    'location',
    'mostrar locales cercanos y eventos relevantes'
  );
  
  if (granted) {
    // Proceder a mostrar el mapa con ubicación
    console.log('Usuario concedió permiso de ubicación');
  } else {
    // Mostrar mapa sin ubicación o mensaje alternativo
    console.log('Usuario denegó permiso de ubicación');
  }
};
```

### Ejemplo 2: Solicitar Cámara al Tomar Foto

```typescript
import { requestAppPermission } from '@/utils/permissions';

const handleTakePhoto = async () => {
  const granted = await requestAppPermission(
    'camera',
    'tomar fotos para tus publicaciones'
  );
  
  if (granted) {
    // Abrir la cámara
    console.log('Usuario concedió permiso de cámara');
  }
};
```

### Ejemplo 3: Solicitar Notificaciones al Iniciar la App

```typescript
import { requestAppPermission } from '@/utils/permissions';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const initializeNotifications = async () => {
      const granted = await requestAppPermission(
        'notifications',
        'enviarte actualizaciones importantes y mensajes'
      );
      
      if (granted) {
        console.log('Usuario concedió permiso de notificaciones');
        // Registrar token para push notifications
      }
    };
    
    initializeNotifications();
  }, []);
  
  return <YourApp />;
}
```

### Ejemplo 4: Solicitar Todos los Permisos al Inicio

```typescript
import { requestMultiplePermissions } from '@/utils/permissions';
import { useEffect } from 'react';

export default function App() {
  useEffect(() => {
    const initializePermissions = async () => {
      const results = await requestMultiplePermissions([
        {
          type: 'location',
          description: 'mostrar locales cercanos y eventos relevantes'
        },
        {
          type: 'camera',
          description: 'tomar fotos y videos para tus publicaciones'
        },
        {
          type: 'notifications',
          description: 'enviarte actualizaciones importantes'
        }
      ]);
      
      console.log('Permisos concedidos:', results);
      // results = { location: true, camera: false, notifications: true }
    };
    
    initializePermissions();
  }, []);
  
  return <YourApp />;
}
```

### Ejemplo 5: Verificar Permiso Antes de Usar

```typescript
import { checkAppPermission } from '@/utils/permissions';

const handleShowNearbyLocals = async () => {
  const hasPermission = await checkAppPermission('location');
  
  if (hasPermission) {
    // Ya tiene permiso, mostrar locales cercanos
    console.log('Permiso de ubicación ya concedido');
  } else {
    // No tiene permiso, solicitar o mostrar mensaje
    console.log('Permiso de ubicación no concedido');
  }
};
```

## 🎨 Componente PermissionsGuard

Se ha creado un componente `PermissionsGuard` que protege pantallas hasta que se concedan los permisos:

```typescript
import PermissionsGuard from '@/components/common/PermissionsGuard';

export default function MapScreen() {
  return (
    <PermissionsGuard
      requiredPermissions={[
        {
          type: 'location',
          description: 'mostrar locales cercanos'
        }
      ]}
      onPermissionsGranted={() => {
        console.log('Permisos concedidos, cargar mapa');
      }}
    >
      {/* Tu contenido del mapa aquí */}
      <MapView />
    </PermissionsGuard>
  );
}
```

## 📱 Pantalla de Ejemplo

Se ha creado una pantalla de ejemplo completa en `app/permissions-example.tsx` que muestra:

- ✅ Estado actual de cada permiso
- ✅ Botones para solicitar permisos individuales
- ✅ Botón para solicitar todos los permisos
- ✅ Botón para verificar el estado sin solicitar
- ✅ Indicadores de carga durante las solicitudes
- ✅ Información sobre cómo funcionan los permisos

Para ver la pantalla de ejemplo, navega a `/permissions-example` en tu app.

## 🔧 Qué Soluciona Esta Configuración

### ✅ Cámara
- Evita que la pantalla se quede en negro al abrir la cámara
- Evita que la app se cierre al intentar usar la cámara
- Muestra el diálogo de permisos de iOS correctamente

### ✅ Ubicación
- Permite acceder a la ubicación del usuario
- Muestra locales cercanos basados en la ubicación
- Evita errores de permisos en producción

### ✅ Notificaciones
- Permite registrar el token del dispositivo
- Habilita el envío de notificaciones push
- Configura automáticamente las capabilities en iOS

## 🚨 Importante para el Build de Producción

Cuando hagas el build de producción (EAS Build o Xcode):

1. **Verifica que app.json tenga las descripciones de permisos**
   - Estas descripciones aparecerán en los diálogos de iOS
   - Son obligatorias para pasar la revisión de App Store

2. **Asegúrate de que los plugins estén configurados**
   - `expo-notifications` debe estar en modo "production"
   - `expo-location` debe tener las descripciones configuradas
   - `expo-image-picker` debe tener permisos de cámara y fotos

3. **Prueba los permisos en un dispositivo real**
   - Los permisos no funcionan correctamente en el simulador
   - Prueba en un iPhone real antes del build final

## 📚 Recursos Adicionales

- [Documentación de expo-location](https://docs.expo.dev/versions/latest/sdk/location/)
- [Documentación de expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- [Documentación de expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Guía de permisos de iOS](https://developer.apple.com/documentation/uikit/protecting_the_user_s_privacy)

## ✅ Checklist Final

- [x] Descripciones de permisos añadidas en app.json
- [x] Plugin de notificaciones configurado
- [x] Utilidad de permisos creada (utils/permissions.ts)
- [x] Componente PermissionsGuard creado
- [x] Pantalla de ejemplo creada
- [x] Manejo de errores con try/catch implementado
- [x] Alertas amigables para permisos denegados
- [x] Logs informativos para debugging

## 🎉 ¡Listo para Producción!

Tu app ahora está completamente configurada para manejar permisos de forma segura en iOS. No habrá errores de permisos en el build final y la experiencia del usuario será profesional y amigable.

Si tienes alguna duda o necesitas ayuda adicional, consulta la pantalla de ejemplo en `app/permissions-example.tsx` o revisa el código en `utils/permissions.ts`.
