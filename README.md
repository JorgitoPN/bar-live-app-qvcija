
# BarLive - Social Nightlife App

Una aplicación social para descubrir y compartir experiencias en bares y locales nocturnos.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev

# Iniciar en Android
npm run android

# Iniciar en iOS
npm run ios
```

## 📱 Notificaciones Push (Importante)

### ⚠️ Cambio en Expo SDK 53+

A partir de Expo SDK 53, las notificaciones push en Android **no funcionan en Expo Go**. Esto es una limitación de Expo, no de la app.

### ✅ Solución

La app funciona perfectamente en Expo Go con todas las funciones **excepto** notificaciones push remotas:

- ✅ Todas las funciones principales
- ✅ Notificaciones locales
- ✅ Notificaciones en la app
- ✅ Actualizaciones en tiempo real
- ❌ Notificaciones push remotas (solo en Expo Go)

### 🔧 Para Habilitar Notificaciones Push

Si necesitas probar notificaciones push, crea un development build:

```bash
# Configurar EAS
npm install -g eas-cli
eas login
eas project:init

# Crear development build para Android
eas build --profile development --platform android

# Instalar el .apk en tu dispositivo
# Las notificaciones push funcionarán completamente
```

**Documentación completa:** Ver `docs/EXPO_NOTIFICATIONS_SDK53.md`

## 🏗️ Estructura del Proyecto

```
├── app/                    # Rutas de la aplicación (Expo Router)
│   ├── (tabs)/            # Navegación principal con tabs
│   ├── auth/              # Pantallas de autenticación
│   ├── social/            # Red social
│   └── perfil/            # Perfil y configuración
├── components/            # Componentes reutilizables
├── contexts/              # Contextos de React
├── utils/                 # Utilidades y helpers
├── styles/                # Estilos globales
└── supabase/             # Configuración de Supabase
    ├── functions/         # Edge Functions
    └── migrations/        # Migraciones de base de datos
```

## 🔑 Características Principales

- 🗺️ Mapa interactivo de locales
- 📱 Red social con publicaciones y momentos
- 💬 Sistema de mensajería en tiempo real
- 🎉 Sala virtual con interacciones
- 📊 Panel de gestión para propietarios
- 👤 Perfiles de usuario y locales
- 🔔 Sistema de notificaciones
- 🎨 Soporte para modo claro/oscuro

## 🛠️ Tecnologías

- **Framework:** React Native + Expo 54
- **Navegación:** Expo Router
- **Backend:** Supabase
- **Base de Datos:** PostgreSQL
- **Autenticación:** Supabase Auth
- **Storage:** Supabase Storage
- **Notificaciones:** Expo Notifications
- **Mapas:** React Native Maps

## 📦 Dependencias Principales

```json
{
  "expo": "~54.0.1",
  "react": "19.1.0",
  "react-native": "0.81.4",
  "@supabase/supabase-js": "^2.78.0",
  "expo-router": "^6.0.0",
  "expo-notifications": "^0.32.12"
}
```

## 🔐 Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta las migraciones en `supabase/migrations/`
3. Configura las Edge Functions en `supabase/functions/`

### 3. Notificaciones Push (Opcional)

Para habilitar notificaciones push en producción:

```bash
# Configurar EAS
eas project:init

# Configurar credenciales de push
eas credentials
```

## 🧪 Testing

```bash
# Ejecutar linter
npm run lint

# Verificar tipos
npx tsc --noEmit
```

## 📱 Builds

### Development Build

```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios
```

### Production Build

```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

## 🐛 Solución de Problemas

### Notificaciones Push No Funcionan

Si ves el error de notificaciones push en Expo Go:

1. **Opción 1 (Recomendada):** Continúa usando Expo Go - la app funciona perfectamente sin push notifications remotas
2. **Opción 2:** Crea un development build siguiendo las instrucciones en `docs/EXPO_NOTIFICATIONS_SDK53.md`

### Error de Supabase

Verifica que las variables de entorno estén configuradas correctamente en `.env`

### Problemas de Navegación

Limpia el caché de Metro:

```bash
npx expo start --clear
```

## 📚 Documentación Adicional

- [Expo Notifications SDK 53+](docs/EXPO_NOTIFICATIONS_SDK53.md)
- [Sistema de Autenticación](docs/AUTH_V6_SYSTEM_COMPLETE.md)
- [Guía de Desarrollo](docs/DEVELOPER_GUIDE.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Equipo

Desarrollado por el equipo de BarLive

## 📞 Soporte

Para soporte, contacta a: support@barliveapp.es

---

**Nota Importante sobre Notificaciones Push:**

Las notificaciones push en Android requieren un development build en Expo SDK 53+. 
La app funciona perfectamente en Expo Go sin notificaciones push remotas.
Ver `docs/EXPO_NOTIFICATIONS_SDK53.md` para más información.
