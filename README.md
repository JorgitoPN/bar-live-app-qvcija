
# BarLive - Plataforma Social para Bares y Discotecas

Aplicación móvil desarrollada con React Native + Expo 54 y Supabase.

---

## 🚀 Inicio Rápido

### Configuración Inicial

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env con tus credenciales de Supabase
   ```

3. **Iniciar la aplicación**:
   ```bash
   npm run dev
   ```

---

## 📧 Configuración de Emails (IMPORTANTE)

El sistema de emails está casi completamente configurado. Solo necesitas:

### ⚡ Configuración Rápida (10 minutos)

1. **Obtener API Key de Resend**:
   - Ve a: https://resend.com
   - Crea cuenta y obtén tu API Key

2. **Configurar en Supabase**:
   ```bash
   supabase secrets set RESEND_API_KEY=re_tu_key --project-ref embntaqwlwmgazvrglaf
   ```

3. **¡Listo!** Los correos comenzarán a enviarse automáticamente.

### 📚 Documentación Completa

- **[RESEND_SETUP_SUMMARY.md](docs/RESEND_SETUP_SUMMARY.md)** - Resumen y estado actual
- **[RESEND_QUICK_SETUP.md](docs/RESEND_QUICK_SETUP.md)** - Configuración en 3 pasos
- **[RESEND_CONFIGURATION_COMPLETE.md](docs/RESEND_CONFIGURATION_COMPLETE.md)** - Guía completa
- **[RESEND_VISUAL_GUIDE.md](docs/RESEND_VISUAL_GUIDE.md)** - Guía visual paso a paso
- **[RESEND_TROUBLESHOOTING.md](docs/RESEND_TROUBLESHOOTING.md)** - Solución de problemas

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend**: React Native 0.81.4 + Expo 54
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage
- **Emails**: Resend API
- **Navegación**: Expo Router (file-based routing)

### Estructura del Proyecto

```
├── app/                    # Pantallas (file-based routing)
│   ├── (tabs)/            # Navegación con tabs
│   ├── auth/              # Flujo de autenticación
│   ├── admin/             # Panel de administración
│   └── ...
├── components/            # Componentes reutilizables
├── contexts/              # Context providers
├── hooks/                 # Custom hooks
├── utils/                 # Utilidades y helpers
├── supabase/             # Configuración de Supabase
│   ├── functions/        # Edge Functions
│   └── migrations/       # Migraciones SQL
├── docs/                 # Documentación
└── styles/               # Estilos globales
```

---

## 🔐 Autenticación

### Flujos Implementados

1. **Registro con Email**:
   - Ingreso de email
   - Verificación con código OTP (6 dígitos)
   - Datos básicos (nombre, fecha de nacimiento)
   - Creación de usuario y contraseña
   - Perfil opcional

2. **Inicio de Sesión**:
   - Email + contraseña
   - Google Sign-In
   - Face ID / Touch ID (opcional)

3. **Recuperación de Contraseña**:
   - Código OTP por email
   - Restablecimiento de contraseña

### Documentación de Auth

- **[AUTHENTICATION_FIXES_SUMMARY.md](docs/AUTHENTICATION_FIXES_SUMMARY.md)** - Resumen de correcciones
- **[AUTH_FLOW_IMPLEMENTATION.md](docs/AUTH_FLOW_IMPLEMENTATION.md)** - Implementación del flujo
- **[FACE_ID_AND_EMAIL_SETUP.md](docs/FACE_ID_AND_EMAIL_SETUP.md)** - Configuración de Face ID
- **[LOGIN_TROUBLESHOOTING.md](docs/LOGIN_TROUBLESHOOTING.md)** - Solución de problemas

---

## 📱 Características Principales

### Social

- Feed de publicaciones estilo Instagram
- Historias (24 horas)
- Comentarios y likes
- Menciones y hashtags
- Perfiles de usuario y locales

### Locales

- Catálogo de bares y discotecas
- Fichas detalladas con fotos
- Horarios y servicios
- Ubicación en mapa
- Reseñas y valoraciones

### Eventos

- Creación y gestión de eventos
- Calendario de eventos
- Notificaciones y recordatorios
- Check-in en eventos

### Empleo

- Ofertas de trabajo
- Perfiles profesionales
- Aplicación a ofertas

### Gestión (Propietarios)

- Panel de análisis
- Gestión de locales
- Gestión de eventos
- Planes de suscripción

### Administración

- Gestión de usuarios
- Gestión de locales
- Gestión de contenido
- Importación masiva
- Sincronización con Google Places

---

## 🗄️ Base de Datos

### Tablas Principales

- `usuarios` - Usuarios de la aplicación
- `locales` - Bares y discotecas
- `eventos` - Eventos y fiestas
- `publicaciones` - Posts del feed social
- `historias` - Historias temporales
- `comentarios` - Comentarios en publicaciones
- `ofertas_trabajo` - Ofertas de empleo
- `perfiles_profesionales` - Perfiles de trabajadores

### Migraciones

Las migraciones se encuentran en `supabase/migrations/` y se aplican automáticamente.

Para crear una nueva migración:

```bash
supabase migration new nombre_de_la_migracion
```

---

## 🔧 Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar Expo dev server
npm run android      # Iniciar en Android
npm run ios          # Iniciar en iOS
npm run web          # Iniciar en web

# Linting
npm run lint         # Ejecutar ESLint

# Build
npm run build:web    # Build para web
npm run build:android # Prebuild para Android
```

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```env
# Supabase
SUPABASE_URL=https://embntaqwlwmgazvrglaf.supabase.co
SUPABASE_ANON_KEY=tu_anon_key

# Expo
EXPO_TOKEN=tu_expo_token
```

### Supabase Local Development

```bash
# Iniciar Supabase localmente
supabase start

# Detener Supabase
supabase stop

# Ver estado
supabase status

# Ver logs
supabase functions logs nombre-funcion --tail
```

---

## 📦 Edge Functions

### Funciones Disponibles

1. **send-verification-email**
   - Envía códigos de verificación por email
   - Usa Resend API
   - Templates HTML profesionales

2. **generate-analytics-recommendations**
   - Genera recomendaciones basadas en analytics
   - Usa IA para análisis

3. **cleanup-expired-events**
   - Limpia eventos expirados automáticamente
   - Se ejecuta periódicamente

### Desplegar Edge Functions

```bash
# Desplegar una función
supabase functions deploy nombre-funcion --project-ref embntaqwlwmgazvrglaf

# Ver logs
supabase functions logs nombre-funcion --tail --project-ref embntaqwlwmgazvrglaf
```

---

## 🎨 Estilos y Diseño

### Tema

Los colores y estilos globales están en `styles/commonStyles.ts`:

```typescript
export const colors = {
  primary: '#14B8A6',      // Teal
  secondary: '#06B6D4',    // Cyan
  background: '#000000',   // Negro
  surface: '#1A1A1A',      // Gris oscuro
  text: '#FFFFFF',         // Blanco
  textSecondary: '#A0A0A0', // Gris
  // ...
};
```

### Componentes Comunes

- `FloatingTabBar` - Barra de navegación inferior
- `IconSymbol` - Iconos multiplataforma
- `OptimizedImage` - Imágenes optimizadas
- `LoadingStates` - Estados de carga
- `ErrorBoundary` - Manejo de errores

---

## 🧪 Testing

### Probar Emails

```bash
# Probar Edge Function de emails
curl -X POST \
  'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/send-verification-email' \
  -H 'Authorization: Bearer TU_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "verification"
  }'
```

### Probar Autenticación

1. Abre la app
2. Ve a "Crear cuenta"
3. Completa el flujo de registro
4. Verifica que recibes el email
5. Ingresa el código
6. Completa el perfil

---

## 📊 Monitoreo

### Logs de Supabase

```bash
# Ver logs de Edge Functions
supabase functions logs send-verification-email --tail

# Ver logs de Auth
# Dashboard → Authentication → Logs

# Ver logs de Database
# Dashboard → Database → Logs
```

### Resend Dashboard

- **Emails enviados**: https://resend.com/emails
- **API Keys**: https://resend.com/api-keys
- **Dominios**: https://resend.com/domains
- **Analytics**: https://resend.com/analytics

---

## 🚀 Despliegue

### Producción

1. **Configurar variables de entorno**:
   - Supabase URL y Keys
   - Resend API Key
   - Expo tokens

2. **Build para Android**:
   ```bash
   npm run build:android
   eas build --platform android
   ```

3. **Build para iOS**:
   ```bash
   eas build --platform ios
   ```

4. **Build para Web**:
   ```bash
   npm run build:web
   ```

### Checklist Pre-Producción

- [ ] API Key de Resend configurada
- [ ] Dominio de email verificado
- [ ] Variables de entorno configuradas
- [ ] Migraciones aplicadas
- [ ] Edge Functions desplegadas
- [ ] RLS policies verificadas
- [ ] Testing completo realizado
- [ ] Monitoreo configurado

---

## 📚 Documentación Adicional

### Guías de Configuración

- **[START_HERE.md](docs/START_HERE.md)** - Punto de inicio
- **[QUICK_START.md](docs/QUICK_START.md)** - Inicio rápido
- **[SETUP_CHECKLIST.md](docs/SETUP_CHECKLIST.md)** - Checklist de configuración
- **[DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)** - Guía para desarrolladores

### Guías de Características

- **[EMPLOYMENT_SYSTEM_IMPLEMENTATION.md](docs/EMPLOYMENT_SYSTEM_IMPLEMENTATION.md)** - Sistema de empleo
- **[LOCAL_PROFILES_SYSTEM.md](docs/LOCAL_PROFILES_SYSTEM.md)** - Perfiles de locales
- **[NEW_STORY_SYSTEM_2025.md](docs/NEW_STORY_SYSTEM_2025.md)** - Sistema de historias

### Guías de Performance

- **[PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md)** - Optimización
- **[PERFORMANCE_BEST_PRACTICES.md](docs/PERFORMANCE_BEST_PRACTICES.md)** - Mejores prácticas
- **[INSTAGRAM_PERFORMANCE_OPTIMIZATIONS.md](docs/INSTAGRAM_PERFORMANCE_OPTIMIZATIONS.md)** - Optimizaciones estilo Instagram

---

## 🆘 Soporte

### Problemas Comunes

1. **No llegan los emails**:
   - Consulta: [RESEND_TROUBLESHOOTING.md](docs/RESEND_TROUBLESHOOTING.md)

2. **Error de autenticación**:
   - Consulta: [LOGIN_TROUBLESHOOTING.md](docs/LOGIN_TROUBLESHOOTING.md)

3. **Problemas de performance**:
   - Consulta: [PERFORMANCE_OPTIMIZATION.md](docs/PERFORMANCE_OPTIMIZATION.md)

### Contacto

- **Documentación**: Consulta la carpeta `docs/`
- **Issues**: Crea un issue en el repositorio
- **Supabase Support**: https://supabase.com/dashboard/support
- **Resend Support**: support@resend.com

---

## 📄 Licencia

Privado - Todos los derechos reservados © 2025 BarLive

---

## 🎯 Roadmap

### En Progreso

- [x] Sistema de autenticación completo
- [x] Sistema de emails con Resend
- [x] Feed social estilo Instagram
- [x] Sistema de historias
- [x] Gestión de locales
- [x] Sistema de eventos

### Próximas Características

- [ ] Chat en tiempo real
- [ ] Notificaciones push
- [ ] Pagos integrados
- [ ] Sistema de reservas
- [ ] Programa de fidelización
- [ ] Analytics avanzados

---

**Versión**: 1.0.0  
**Última actualización**: Enero 2025  
**Estado**: En desarrollo activo 🚀
