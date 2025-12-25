
# 🔔 Notificaciones Push - Referencia Rápida

## ⚡ TL;DR

- ✅ **Expo Go:** Funciona todo excepto push notifications remotas
- ✅ **Development Build:** Funciona todo incluyendo push notifications
- ✅ **Production:** Funciona todo perfectamente

## 🚨 Error Común

```
expo-notifications: Android Push notifications functionality 
was removed from Expo Go with the release of SDK 53
```

**Solución:** Esto es normal. La app funciona perfectamente sin push remotas en Expo Go.

## 🎯 Decisión Rápida

### ¿Estás desarrollando features generales?
→ **Usa Expo Go** - Es más rápido

### ¿Necesitas probar notificaciones push?
→ **Crea un development build** - Solo una vez

### ¿Vas a producción?
→ **Usa EAS Build** - Todo funcionará

## 🔧 Comandos Rápidos

### Desarrollo Normal (Expo Go)
```bash
npx expo start
```

### Crear Development Build
```bash
# Primera vez
npm install -g eas-cli
eas login
eas project:init

# Crear build
eas build --profile development --platform android
```

### Probar Notificación Local
```typescript
import { scheduleTestNotification } from '@/utils/notifications';

// En cualquier componente
await scheduleTestNotification();
```

## ✅ Checklist de Funcionalidades

| Funcionalidad | Expo Go | Dev Build | Production |
|--------------|---------|-----------|------------|
| UI/UX | ✅ | ✅ | ✅ |
| Navegación | ✅ | ✅ | ✅ |
| Base de datos | ✅ | ✅ | ✅ |
| Autenticación | ✅ | ✅ | ✅ |
| Notificaciones locales | ✅ | ✅ | ✅ |
| Notificaciones push | ❌ | ✅ | ✅ |
| Todas las demás features | ✅ | ✅ | ✅ |

## 🔍 Verificar Estado

```typescript
import { arePushNotificationsAvailable } from '@/utils/notifications';

if (arePushNotificationsAvailable()) {
  console.log('✅ Push notifications disponibles');
} else {
  console.log('ℹ️ Push notifications no disponibles (probablemente Expo Go)');
}
```

## 📱 Para Usuarios

La app incluye una pantalla de información en:
**Perfil → Notificaciones → ℹ️ (botón de info)**

## 🆘 Ayuda Rápida

### "No recibo notificaciones push"
- ¿Estás en Expo Go? → Normal, usa development build
- ¿Estás en development build? → Verifica permisos
- ¿Estás en producción? → Verifica configuración de EAS

### "El build tarda mucho"
- Primer build: 10-20 minutos (normal)
- Builds siguientes: Más rápidos
- Solo rebuild cuando cambies dependencias nativas

### "¿Necesito rebuild para cada cambio?"
- ❌ Cambios en JS/TS → No, hot reload funciona
- ✅ Cambios en dependencias nativas → Sí
- ✅ Cambios en app.json → Sí

## 📚 Más Información

- Documentación completa: `docs/EXPO_NOTIFICATIONS_SDK53.md`
- Expo Docs: https://docs.expo.dev/develop/development-builds/
- Supabase Docs: https://supabase.com/docs

## 💡 Tips

1. **Desarrollo diario:** Usa Expo Go
2. **Testing push:** Crea un build, úsalo cuando necesites
3. **Producción:** Siempre EAS Build
4. **No te preocupes:** La app funciona perfectamente en Expo Go

---

**Recuerda:** Este es un cambio de Expo, no un bug de la app. 
La solución está implementada y la app funciona perfectamente en todos los escenarios.
