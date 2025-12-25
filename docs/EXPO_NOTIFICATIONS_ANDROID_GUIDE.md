
# Guía de Notificaciones Push en Android

## 🎯 Resumen

Las notificaciones push en Android requieren un **development build** cuando usas Expo SDK 53+. 
Expo Go ya no soporta notificaciones push en Android por limitaciones técnicas.

## ✅ Estado Actual

### En Expo Go (Android):
- ✅ La app funciona perfectamente
- ✅ Todas las funciones están disponibles
- ⚠️ Notificaciones push deshabilitadas (esperado)
- ℹ️ Mensajes claros explican la limitación

### En iOS:
- ✅ Todo funciona normalmente en Expo Go
- ✅ Notificaciones push disponibles

## 📱 Cómo Habilitar Notificaciones Push en Android

### Opción 1: Development Build (Recomendado para Desarrollo)

```bash
# 1. Instalar EAS CLI
npm install -g eas-cli

# 2. Iniciar sesión
eas login

# 3. Inicializar proyecto EAS (si no está hecho)
eas project:init

# 4. Crear development build
npx eas build --profile development --platform android

# 5. Descargar e instalar el APK en tu dispositivo
```

### Opción 2: Production Build (Para Publicación)

```bash
# Crear build de producción
npx eas build --profile production --platform android

# Subir a Google Play Store
npx eas submit --platform android
```

## 🔧 Configuración Necesaria

### 1. Configurar EAS en app.json

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

### 2. Configurar eas.json

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## 📋 Checklist de Verificación

### Antes de Crear el Build:

- [ ] EAS CLI instalado
- [ ] Sesión iniciada en Expo
- [ ] Project ID configurado en app.json
- [ ] eas.json configurado correctamente
- [ ] Cuenta de Expo activa

### Después de Instalar el Build:

- [ ] App instalada en dispositivo físico
- [ ] Permisos de notificaciones otorgados
- [ ] Token de push registrado
- [ ] Notificación de prueba funciona

## 🎯 Diferencias: Expo Go vs Development Build

| Característica | Expo Go | Development Build |
|---------------|---------|-------------------|
| Instalación | Rápida (desde store) | Requiere build (~10-15 min) |
| Notificaciones Push | ❌ No (Android) | ✅ Sí |
| Módulos Nativos | Limitados | Todos disponibles |
| Tamaño | Pequeño | Mayor (incluye dependencias) |
| Actualización | Automática | Manual |
| Desarrollo | Muy rápido | Rápido |

## 💡 Consejos

### Para Desarrollo:

1. **Usa Expo Go** para desarrollo rápido de UI y lógica
2. **Crea un development build** cuando necesites probar notificaciones
3. **Mantén ambos** para diferentes etapas de desarrollo

### Para Producción:

1. **Siempre usa production build** para la app final
2. **Prueba exhaustivamente** en development build primero
3. **Configura Firebase** para notificaciones en producción

## 🔍 Solución de Problemas

### Error: "Push notifications not available"

**Causa**: Estás usando Expo Go en Android

**Solución**: Crea un development build

### Error: "Project ID not configured"

**Causa**: Falta configurar el project ID en app.json

**Solución**:
```bash
eas project:init
```

### Error: "Build failed"

**Causas comunes**:
- Dependencias incompatibles
- Configuración incorrecta en app.json
- Problemas de red

**Solución**:
```bash
# Limpiar caché
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules
npm install

# Intentar de nuevo
npx eas build --profile development --platform android --clear-cache
```

## 📚 Recursos Adicionales

### Documentación Oficial:

- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

### Tutoriales:

- [Creating Your First Development Build](https://docs.expo.dev/develop/development-builds/create-a-build/)
- [Push Notifications Setup](https://docs.expo.dev/push-notifications/overview/)
- [Testing Push Notifications](https://docs.expo.dev/push-notifications/testing/)

## 🎉 Ventajas del Development Build

1. **Funcionalidad Completa**: Todas las features nativas disponibles
2. **Notificaciones Push**: Funcionan perfectamente
3. **Módulos Nativos**: Puedes usar cualquier módulo
4. **Debugging**: Mejor experiencia de debugging
5. **Producción-Like**: Comportamiento similar a la app final

## ⚡ Comandos Rápidos

```bash
# Ver builds existentes
eas build:list

# Ver detalles de un build
eas build:view [build-id]

# Cancelar un build
eas build:cancel [build-id]

# Ver logs de un build
eas build:logs [build-id]

# Configurar credenciales
eas credentials

# Ver estado del proyecto
eas project:info
```

## 🔐 Seguridad

### Permisos Necesarios:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Configuración de Notificaciones:

```typescript
// Ya configurado en utils/notifications.ts
await Notifications.setNotificationChannelAsync('default', {
  name: 'BarLive Notificaciones',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#14B8A6',
  sound: 'default',
});
```

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs del build: `eas build:logs [build-id]`
2. Consulta la documentación oficial
3. Busca en el foro de Expo
4. Contacta con soporte técnico

## ✅ Conclusión

Las notificaciones push en Android requieren un development build, pero el proceso es sencillo:

1. Instala EAS CLI
2. Configura tu proyecto
3. Crea el build
4. Instala en tu dispositivo
5. ¡Disfruta de las notificaciones push!

La app está configurada para manejar gracefully la ausencia de notificaciones push en Expo Go, 
así que puedes seguir desarrollando sin problemas mientras decides cuándo crear el development build.
