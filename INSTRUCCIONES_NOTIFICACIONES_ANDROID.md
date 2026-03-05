
# 🔔 SOLUCIÓN: NOTIFICACIONES PUSH EN ANDROID

## 🚨 PROBLEMA
Las notificaciones push NO funcionan en la APK actual porque necesitas un **build nativo con EAS Build**.

## ✅ SOLUCIÓN PASO A PASO

### 1️⃣ INSTALAR EAS CLI (si no lo tienes)
```bash
npm install -g eas-cli
```

### 2️⃣ LOGIN EN EXPO
```bash
eas login
```

### 3️⃣ GENERAR APK DE DESARROLLO CON EAS BUILD
```bash
eas build --profile development --platform android
```

**IMPORTANTE:** Este comando:
- ✅ Compila la app con soporte nativo para notificaciones push
- ✅ Incluye Firebase Cloud Messaging (FCM)
- ✅ Incluye el sonido personalizado `brindis.wav`
- ✅ Configura todos los permisos necesarios
- ⏱️ Tarda aproximadamente 10-15 minutos

### 4️⃣ DESCARGAR E INSTALAR LA APK
Una vez que el build termine:
1. Recibirás un link para descargar la APK
2. Descarga la APK en tu teléfono
3. Instala la APK (permite instalación de fuentes desconocidas si es necesario)

### 5️⃣ PROBAR LAS NOTIFICACIONES
Una vez instalada la nueva APK:
1. Abre la app
2. Acepta los permisos de notificaciones cuando se soliciten
3. Las notificaciones deberían funcionar con:
   - ✅ Sonido de brindis 🍻
   - ✅ Vibración
   - ✅ Heads-up notification (aparece en la parte superior)
   - ✅ Badge en el icono de la app

## 🔍 VERIFICAR QUE FUNCIONA

### Opción 1: Notificación de Prueba desde la App
Si tienes una pantalla de configuración o perfil, puedes agregar un botón de prueba:

```typescript
import { scheduleTestNotification } from '@/utils/notifications';

// En tu componente:
<TouchableOpacity onPress={scheduleTestNotification}>
  <Text>🔔 Probar Notificación</Text>
</TouchableOpacity>
```

### Opción 2: Enviar Notificación desde el Backend
Si tienes acceso al backend, puedes enviar una notificación de prueba usando el token del dispositivo.

## ❓ PREGUNTAS FRECUENTES

### ¿Por qué no funciona con la APK actual?
Las notificaciones push requieren configuración nativa que solo se incluye cuando compilas con EAS Build. Una APK generada con `expo build` o instalada directamente NO incluye esta configuración.

### ¿Cuánto tarda el build?
Aproximadamente 10-15 minutos la primera vez. Los builds posteriores son más rápidos.

### ¿Tengo que pagar por EAS Build?
Expo ofrece builds gratuitos limitados cada mes. Para más builds, necesitas un plan de pago.

### ¿Funcionará en producción?
Sí, una vez que funcione con el build de desarrollo, funcionará igual en producción. Solo necesitas cambiar el perfil:
```bash
eas build --profile production --platform android
```

## 🎯 RESUMEN

**ANTES (APK actual):**
- ❌ Notificaciones NO funcionan
- ❌ Sin sonido
- ❌ Sin vibración
- ❌ Sin heads-up

**DESPUÉS (APK con EAS Build):**
- ✅ Notificaciones funcionan perfectamente
- ✅ Sonido de brindis 🍻
- ✅ Vibración
- ✅ Heads-up notification
- ✅ Badge en el icono

## 📞 SOPORTE

Si después de instalar la nueva APK las notificaciones siguen sin funcionar:
1. Verifica que aceptaste los permisos de notificaciones
2. Revisa la configuración de notificaciones en Ajustes > Aplicaciones > BarLive
3. Asegúrate de que el sonido `brindis.wav` esté en `assets/sounds/brindis.wav`
4. Revisa los logs de la app para ver si hay errores

---

**NOTA IMPORTANTE:** Este es el único camino para que las notificaciones funcionen en Android. No hay atajos ni soluciones alternativas. Necesitas hacer el build con EAS.
