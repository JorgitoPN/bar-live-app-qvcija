
# Sistema de Momentos - Checklist de Despliegue

## ✅ Pre-Despliegue

### Base de Datos
- [ ] Verificar que las tablas existen:
  - [ ] `momentos`
  - [ ] `momento_views`
  - [ ] `momento_likes`
  - [ ] `momento_messages`
- [ ] Verificar funciones SQL:
  - [ ] `increment_momento_views()`
  - [ ] `increment_momento_likes()`
  - [ ] `decrement_momento_likes()`
  - [ ] `delete_expired_momentos()`
- [ ] Verificar políticas RLS en todas las tablas
- [ ] Verificar índices para optimización

### Storage
- [ ] Bucket `momentos` creado
- [ ] Bucket configurado como público
- [ ] Políticas de storage aplicadas:
  - [ ] Lectura pública
  - [ ] Escritura autenticada
  - [ ] Eliminación solo por propietario
- [ ] Límites de tamaño configurados (5MB recomendado)

### Componentes
- [ ] `MomentoCarousel.tsx` compilando sin errores
- [ ] `MomentoViewer.tsx` compilando sin errores
- [ ] `MomentoUpload.tsx` compilando sin errores
- [ ] `MiniAvatarWithMomento.tsx` compilando sin errores
- [ ] Integración en `app/(tabs)/social/index.tsx` completa

### Permisos
- [ ] Permisos de cámara configurados en `app.json`:
  ```json
  {
    "expo": {
      "plugins": [
        [
          "expo-image-picker",
          {
            "photosPermission": "La app necesita acceso a tus fotos para subir Momentos",
            "cameraPermission": "La app necesita acceso a tu cámara para tomar fotos"
          }
        ]
      ]
    }
  }
  ```
- [ ] Permisos de galería configurados
- [ ] Mensajes de permisos personalizados

## 🧪 Testing

### Funcionalidad Básica
- [ ] Carousel se muestra correctamente
- [ ] Avatares tienen borde verde neón cuando hay Momentos no vistos
- [ ] Tap en avatar abre el visor
- [ ] Botón "+" abre modal de subida
- [ ] Visor muestra imágenes correctamente
- [ ] Progress bar funciona
- [ ] Autoplay avanza automáticamente

### Navegación
- [ ] Tap izquierda/derecha cambia Momento
- [ ] Swipe horizontal cambia de autor
- [ ] Swipe vertical abajo cierra visor
- [ ] Tap prolongado pausa con efecto glow
- [ ] Botón X cierra visor

### Interacciones
- [ ] Mensaje directo crea chat correctamente
- [ ] Like toggle funciona
- [ ] Contador de likes se actualiza
- [ ] Estadísticas muestran vistas y likes (solo autor)
- [ ] Eliminar funciona (solo autor)
- [ ] Confirmación de eliminación aparece

### Upload
- [ ] Cámara se abre correctamente
- [ ] Galería se abre correctamente
- [ ] Preview muestra imagen seleccionada
- [ ] Botón "Cambiar" permite seleccionar otra imagen
- [ ] Botón "Publicar" sube el Momento
- [ ] Loading state se muestra durante subida
- [ ] Mensaje de éxito aparece
- [ ] Carousel se actualiza con nuevo Momento

### Sincronización
- [ ] Borde neón desaparece al visualizar
- [ ] Cambios se reflejan en tiempo real
- [ ] Mini-avatares se actualizan automáticamente
- [ ] Contadores se sincronizan

### Expiración
- [ ] Momentos de más de 24h no aparecen
- [ ] Query filtra correctamente por `expires_at`
- [ ] Función de limpieza elimina Momentos expirados

## 🔒 Seguridad

### RLS Policies
- [ ] Solo usuarios autenticados pueden subir Momentos
- [ ] Solo el autor puede eliminar sus Momentos
- [ ] Solo el autor puede ver estadísticas detalladas
- [ ] Vistas y likes son públicos
- [ ] Storage protegido por RLS

### Validaciones
- [ ] Tamaño máximo de imagen (5MB)
- [ ] Formato de imagen válido (JPEG, PNG)
- [ ] Usuario autenticado antes de subir
- [ ] Verificación de permisos antes de acciones

## 📊 Monitoreo

### Métricas a Trackear
- [ ] Número de Momentos subidos por día
- [ ] Tasa de visualización
- [ ] Engagement rate (likes/views)
- [ ] Tiempo promedio de visualización
- [ ] Tasa de respuesta (mensajes directos)
- [ ] Errores en uploads
- [ ] Latencia de carga

### Logs
- [ ] Logs de errores configurados
- [ ] Logs de uploads exitosos
- [ ] Logs de interacciones importantes
- [ ] Logs de sincronización real-time

## 🚀 Despliegue

### Pre-Producción
- [ ] Todas las pruebas pasadas
- [ ] Documentación completa
- [ ] Código revisado
- [ ] Performance optimizado
- [ ] Error handling robusto

### Producción
- [ ] Deploy a staging primero
- [ ] Pruebas en staging exitosas
- [ ] Backup de base de datos
- [ ] Deploy a producción
- [ ] Verificación post-deploy
- [ ] Monitoreo activo primeras 24h

### Post-Despliegue
- [ ] Configurar cron job para limpieza:
  ```sql
  -- Ejecutar diariamente a las 3 AM
  SELECT delete_expired_momentos();
  ```
- [ ] Configurar alertas de errores
- [ ] Configurar alertas de performance
- [ ] Documentar issues conocidos
- [ ] Plan de rollback preparado

## 📱 Compatibilidad

### Plataformas
- [ ] iOS probado
- [ ] Android probado
- [ ] Web probado (si aplica)
- [ ] Diferentes tamaños de pantalla
- [ ] Diferentes versiones de OS

### Dispositivos
- [ ] iPhone (varios modelos)
- [ ] iPad
- [ ] Android phones (varios modelos)
- [ ] Android tablets

## 🎨 UX/UI

### Diseño
- [ ] Borde neón visible y atractivo
- [ ] Animaciones suaves
- [ ] Loading states claros
- [ ] Error messages informativos
- [ ] Confirmaciones apropiadas

### Accesibilidad
- [ ] Contraste adecuado
- [ ] Tamaños de fuente legibles
- [ ] Áreas táctiles suficientemente grandes
- [ ] Labels descriptivos
- [ ] Soporte para lectores de pantalla

## 📚 Documentación

### Para Desarrolladores
- [ ] `MOMENTO_SYSTEM_COMPLETE.md` actualizado
- [ ] `MOMENTO_IMPLEMENTATION_SUMMARY.md` actualizado
- [ ] `MOMENTO_USAGE_EXAMPLES.md` actualizado
- [ ] `MOMENTO_DEPLOYMENT_CHECKLIST.md` (este archivo)
- [ ] Comentarios en código
- [ ] README actualizado

### Para Usuarios
- [ ] Guía de uso de Momentos
- [ ] FAQ sobre Momentos
- [ ] Tutorial in-app (opcional)
- [ ] Tooltips en primera vez

## 🔧 Mantenimiento

### Rutinas Diarias
- [ ] Verificar logs de errores
- [ ] Revisar métricas de uso
- [ ] Ejecutar limpieza de Momentos expirados

### Rutinas Semanales
- [ ] Análisis de engagement
- [ ] Revisión de feedback de usuarios
- [ ] Optimización de queries lentas
- [ ] Limpieza de storage

### Rutinas Mensuales
- [ ] Análisis de tendencias
- [ ] Planificación de mejoras
- [ ] Revisión de costos de storage
- [ ] Actualización de documentación

## 🐛 Troubleshooting

### Problemas Comunes

#### Momentos no se cargan
- [ ] Verificar conexión a Supabase
- [ ] Verificar políticas RLS
- [ ] Verificar query de expiración
- [ ] Revisar logs de errores

#### Borde neón no aparece
- [ ] Verificar query de vistas
- [ ] Verificar sincronización real-time
- [ ] Verificar estado local del componente
- [ ] Revisar animaciones

#### Upload falla
- [ ] Verificar permisos de cámara/galería
- [ ] Verificar tamaño de imagen
- [ ] Verificar políticas de storage
- [ ] Verificar conexión de red

#### Visor no abre
- [ ] Verificar estado del modal
- [ ] Verificar datos del autor
- [ ] Verificar Momentos disponibles
- [ ] Revisar logs de consola

## ✅ Sign-Off

### Equipo de Desarrollo
- [ ] Desarrollador principal: _______________
- [ ] Code review: _______________
- [ ] QA: _______________
- [ ] Product Owner: _______________

### Fecha de Despliegue
- [ ] Staging: _______________
- [ ] Producción: _______________

### Notas Adicionales
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Última actualización**: 2025  
**Versión del sistema**: 1.0.0  
**Estado**: ✅ Ready for Production
