
# ✅ Lista de Verificación para Producción - BarLive

## 📱 Configuración de la Aplicación

### OAuth y Autenticación
- [x] Credencial Web configurada en Google Cloud Console
- [ ] Credencial Android (Debug) creada con SHA-1 correcto
- [ ] Credencial Android (Release) creada con SHA-1 correcto
- [ ] Credencial iOS creada con Bundle ID correcto (`com.barlive.app`)
- [ ] Todos los Client IDs agregados a "Authorized Client IDs" en Supabase
- [ ] Redirect URLs configuradas en credencial Web:
  - `https://embntaqwlwmgazvrglaf.supabase.co/auth/v1/callback`
  - `natively://auth/callback`
  - `com.barlive.app://auth/callback`
  - `http://localhost:19006/auth/callback`
- [x] Email verification implementado
- [x] Password reset implementado

### Seguridad
- [x] Row Level Security (RLS) habilitado en todas las tablas
- [x] Políticas RLS configuradas correctamente
- [x] Variables de entorno protegidas
- [x] API keys no expuestas en el código
- [x] Validación de entrada de usuario implementada
- [x] Protección contra inyección SQL
- [x] Autenticación requerida para operaciones sensibles

### Base de Datos
- [x] Todas las migraciones aplicadas
- [x] Índices creados para consultas frecuentes
- [x] Relaciones de clave foránea configuradas
- [x] Triggers para actualización automática de timestamps
- [x] Limpieza automática de datos expirados (stories, eventos)
- [x] Backup automático configurado

### UI/UX
- [x] Tabs del header ocultos en todas las páginas
- [x] Página de detalle del local no se puede cerrar arrastrando
- [x] Página de detalle del local llega hasta arriba
- [x] FloatingTabBar visible solo en páginas principales
- [x] Navegación fluida sin animaciones innecesarias
- [x] Loading states implementados
- [x] Error handling con mensajes claros
- [x] Soporte para modo oscuro
- [x] Responsive design para diferentes tamaños de pantalla

### Performance
- [x] Caché implementado para datos frecuentes
- [x] Imágenes optimizadas
- [x] Lazy loading de componentes
- [x] Virtualización de listas largas
- [x] Preloading inteligente de datos
- [x] Optimistic UI updates
- [x] Background sync para operaciones offline

### Funcionalidades Principales
- [x] Sistema de autenticación completo
- [x] Exploración de locales con filtros
- [x] Mapa interactivo
- [x] Feed social con posts e historias
- [x] Sistema de eventos
- [x] Chat privado entre usuarios
- [x] Sala virtual por local
- [x] Sistema de favoritos
- [x] Notificaciones push
- [x] Perfil de usuario editable
- [x] Perfiles de locales
- [x] Sistema de suscripciones para propietarios
- [x] Panel de análisis para propietarios
- [x] Panel de administración

### Testing
- [ ] Tests unitarios para funciones críticas
- [ ] Tests de integración para flujos principales
- [ ] Tests E2E para user journeys
- [ ] Testing en dispositivos iOS reales
- [ ] Testing en dispositivos Android reales
- [ ] Testing de performance
- [ ] Testing de seguridad

### Deployment
- [ ] Build de producción para iOS
- [ ] Build de producción para Android
- [ ] App Store listing preparado
- [ ] Google Play Store listing preparado
- [ ] Screenshots y videos promocionales
- [ ] Política de privacidad publicada
- [ ] Términos de servicio publicados
- [ ] Documentación de API
- [ ] Monitoring y analytics configurados

## 🔧 Comandos Útiles

### Obtener SHA-1 para Android

**Debug:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Release:**
```bash
keytool -list -v -keystore /ruta/a/tu/release.keystore -alias tu-alias
```

### Rebuild de la App

```bash
# Limpiar caché
npx expo start --clear

# Android
npx expo prebuild --platform android --clean
npx expo run:android

# iOS
npx expo prebuild --platform ios --clean
npx expo run:ios
```

### Build para Producción

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## 📊 Métricas de Producción

### Performance Targets
- [ ] Tiempo de carga inicial < 3 segundos
- [ ] Tiempo de navegación entre pantallas < 300ms
- [ ] Tiempo de carga de imágenes < 1 segundo
- [ ] FPS constante a 60fps
- [ ] Uso de memoria < 200MB
- [ ] Tamaño de la app < 50MB

### Disponibilidad
- [ ] Uptime > 99.9%
- [ ] Tiempo de respuesta de API < 500ms
- [ ] Rate limiting configurado
- [ ] CDN para assets estáticos
- [ ] Backup automático diario

## 🚨 Problemas Conocidos Resueltos

### ✅ Tabs visibles en todas las páginas
**Solución:** Configurado `headerShown: false` en todas las pantallas del Stack y ocultado el tabBar nativo.

### ✅ Página de detalle del local se podía cerrar arrastrando
**Solución:** Cambiado `presentation: 'modal'` a `presentation: 'card'` y agregado `gestureEnabled: false`.

### ✅ OAuth con credencial Web en lugar de nativa
**Solución:** Documentación completa en `docs/GOOGLE_OAUTH_IOS_ANDROID_SETUP.md` con pasos para crear credenciales nativas.

## 📝 Notas Importantes

1. **NO borrar la credencial Web** - Es necesaria para Supabase
2. **Crear DOS credenciales Android** - Una para debug y otra para release
3. **Todos los Client IDs** deben estar en "Authorized Client IDs" en Supabase
4. **Rebuild obligatorio** después de cambios en OAuth
5. **Esperar 5-10 minutos** después de cambios en Google Cloud Console

## 🎯 Próximos Pasos

1. Crear credenciales OAuth nativas para iOS y Android
2. Configurar todos los Client IDs en Supabase
3. Hacer rebuild de la app
4. Testing exhaustivo en dispositivos reales
5. Preparar assets para las tiendas
6. Submit a App Store y Google Play Store

## 📞 Contacto de Soporte

- **Email:** soporte@barlive.app
- **Documentación:** https://docs.barlive.app
- **Status Page:** https://status.barlive.app
