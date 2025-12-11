
# Sistema de Momentos - Documentación Completa

## 📋 Resumen

El sistema de **Momentos** es una funcionalidad de contenido efímero (24 horas) similar a Instagram Stories, diseñado específicamente para la app de hostelería y ocio. Permite a usuarios y locales compartir fotos que desaparecen automáticamente después de 24 horas.

## ✨ Características Principales

### 1. **Carrousel Circular en Página Social**
- ✅ Miniaturas circulares de usuarios y locales con Momentos activos
- ✅ **Borde verde neón dinámico**:
  - Brillante y pulsante = Momentos no vistos
  - Tenue/desaparecido = Todos los Momentos vistos
- ✅ Sincronizado con avatar de perfil
- ✅ Icono "+" para subir nuevos Momentos
- ✅ Tap en círculo → abre visor fullscreen

### 2. **Mini-avatares con Borde Neón**
- ✅ Componente `MiniAvatarWithMomento` para usar en:
  - Feeds de publicaciones
  - Comentarios
  - Mensajes
  - Cualquier lugar donde se muestre un avatar
- ✅ Borde verde neón automático si hay Momentos no vistos
- ✅ Sincronización en tiempo real

### 3. **Visor Fullscreen**
- ✅ Imagen centrada a pantalla completa
- ✅ Fondo oscuro minimalista (#000)
- ✅ Barra de progreso circular con autoplay (6 segundos)
- ✅ **Navegación táctil**:
  - Tap izquierda/derecha: Momento anterior/siguiente
  - Swipe lateral: Cambiar entre usuarios/locales
  - Swipe abajo: Cerrar visor
  - Tap prolongado: Pausar con efecto glow
- ✅ **Funciones interactivas**:
  1. **Mensaje directo**: Crea conversación automáticamente
  2. **Me gusta**: Toggle con animación
  3. **Estadísticas** (solo autor): Lista de vistas y likes
  4. **Eliminar** (solo autor): Con confirmación
  5. **Cerrar**: Botón X en esquina superior

### 4. **Subir Momentos**
- ✅ Modal elegante con dos opciones:
  - Tomar foto con cámara
  - Seleccionar de galería
- ✅ Editor con preview y confirmación
- ✅ Subida a Supabase Storage
- ✅ Expiración automática a 24 horas
- ✅ Feedback visual con animaciones

### 5. **Sincronización de Estado**
- ✅ Real-time con Supabase Realtime
- ✅ Borde verde neón sincronizado en todos los lugares
- ✅ Actualización automática al visualizar
- ✅ Contador de vistas y likes en tiempo real

### 6. **Expiración 24h**
- ✅ Campo `expires_at` con timestamp automático
- ✅ Función SQL para eliminar Momentos expirados
- ✅ Filtrado automático en queries

## 🗂️ Estructura de Archivos

```
components/momento/
├── MomentoCarousel.tsx          # Carrousel horizontal con avatares
├── MomentoViewer.tsx            # Visor fullscreen con todas las interacciones
├── MomentoUpload.tsx            # Modal para subir nuevos Momentos
└── MiniAvatarWithMomento.tsx    # Avatar con borde neón para feeds/comentarios

app/(tabs)/social/
└── index-with-momentos.tsx      # Página social integrada con Momentos

docs/
└── MOMENTO_SYSTEM_COMPLETE.md   # Esta documentación
```

## 🎨 Diseño y Estética

### Colores
- **Borde verde neón**: `#00FF88`, `#00CC6A` (gradiente)
- **Fondo visor**: `#000` (negro puro)
- **Overlays**: `rgba(0,0,0,0.6)` para gradientes
- **Texto**: `#fff` (blanco) sobre fondos oscuros

### Animaciones
- **Pulsación**: Borde neón pulsa suavemente (1s ciclo)
- **Fade in**: Entrada suave del visor (300ms)
- **Glow effect**: Efecto de brillo al pausar con tap prolongado
- **Progress bar**: Animación lineal de 6 segundos

### Dimensiones
- **Avatar carousel**: 72px + 3px border
- **Mini-avatar**: 40px (configurable)
- **Progress bar**: 3px altura
- **Border width**: 7.5% del tamaño del avatar

## 🔧 Uso e Integración

### 1. Integrar en Página Social

```typescript
import MomentoCarousel from '@/components/momento/MomentoCarousel';
import MomentoViewer from '@/components/momento/MomentoViewer';
import MomentoUpload from '@/components/momento/MomentoUpload';

// En tu componente:
const [showViewer, setShowViewer] = useState(false);
const [showUpload, setShowUpload] = useState(false);
const [selectedAuthor, setSelectedAuthor] = useState({ id: '', tipo: 'usuario' });

// En el render:
<MomentoCarousel
  onOpenViewer={(id, tipo) => {
    setSelectedAuthor({ id, tipo });
    setShowViewer(true);
  }}
  onUploadMomento={() => setShowUpload(true)}
/>

<MomentoViewer
  visible={showViewer}
  authorId={selectedAuthor.id}
  authorType={selectedAuthor.tipo}
  onClose={() => setShowViewer(false)}
/>

<MomentoUpload
  visible={showUpload}
  onClose={() => setShowUpload(false)}
  onSuccess={() => {
    // Refresh data
  }}
/>
```

### 2. Usar Mini-Avatar con Borde Neón

```typescript
import MiniAvatarWithMomento from '@/components/momento/MiniAvatarWithMomento';

// En posts, comentarios, etc:
<MiniAvatarWithMomento
  userId={post.autor_id}
  imageUrl={post.autor_avatar}
  size={40}
  onPress={() => handleOpenProfile(post.autor_id)}
  showMomentoBorder={true}
/>

// Para locales:
<MiniAvatarWithMomento
  localId={local.id}
  imageUrl={local.imagen_url}
  size={40}
  showMomentoBorder={true}
/>
```

## 🗄️ Base de Datos

### Tablas Existentes

#### `momentos`
```sql
- id: uuid (PK)
- autor_id: uuid (FK → usuarios)
- tipo: 'usuario' | 'local'
- local_id: uuid (FK → locales, nullable)
- imagen_url: text
- categoria: text (nullable)
- likes_count: integer (default 0)
- vistas_count: integer (default 0)
- created_at: timestamptz
- expires_at: timestamptz (default NOW() + 24 hours)
```

#### `momento_views`
```sql
- id: uuid (PK)
- momento_id: uuid (FK → momentos)
- usuario_id: uuid (FK → usuarios)
- local_id: uuid (FK → locales, nullable)
- tipo_viewer: 'usuario' | 'local'
- viewed_at: timestamptz
```

#### `momento_likes`
```sql
- id: uuid (PK)
- momento_id: uuid (FK → momentos)
- usuario_id: uuid (FK → usuarios)
- local_id: uuid (FK → locales, nullable)
- tipo_liker: 'usuario' | 'local'
- created_at: timestamptz
```

#### `momento_messages`
```sql
- id: uuid (PK)
- momento_id: uuid (FK → momentos)
- chat_id: uuid (FK → chats)
- remitente_id: uuid (FK → usuarios)
- mensaje: text
- momento_screenshot_url: text (nullable)
- created_at: timestamptz
```

### Funciones SQL

```sql
-- Incrementar vistas
CREATE FUNCTION increment_momento_views(momento_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE momentos SET vistas_count = vistas_count + 1
  WHERE id = momento_id;
END;
$$ LANGUAGE plpgsql;

-- Incrementar likes
CREATE FUNCTION increment_momento_likes(momento_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE momentos SET likes_count = likes_count + 1
  WHERE id = momento_id;
END;
$$ LANGUAGE plpgsql;

-- Decrementar likes
CREATE FUNCTION decrement_momento_likes(momento_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE momentos SET likes_count = GREATEST(likes_count - 1, 0)
  WHERE id = momento_id;
END;
$$ LANGUAGE plpgsql;

-- Eliminar Momentos expirados
CREATE FUNCTION delete_expired_momentos()
RETURNS void AS $$
BEGIN
  DELETE FROM momentos WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

### Storage Bucket

- **Bucket**: `momentos`
- **Público**: Sí
- **Estructura**: `momentos/{user_id}/{filename}.jpg`
- **Políticas RLS**: Configuradas para lectura pública y escritura autenticada

## 🔄 Flujo de Datos

### 1. Cargar Momentos en Carousel
```
1. Query momentos no expirados (expires_at > NOW())
2. Agrupar por autor (usuario o local)
3. Verificar vistas del usuario actual
4. Marcar hasUnviewed si hay Momentos sin ver
5. Ordenar: no vistos primero, luego por recencia
6. Renderizar con borde neón si hasUnviewed
```

### 2. Abrir Visor
```
1. Cargar todos los Momentos del autor
2. Verificar likes y vistas del usuario
3. Marcar primer Momento como visto
4. Iniciar autoplay con progress bar
5. Escuchar gestos táctiles
6. Actualizar contadores en tiempo real
```

### 3. Subir Momento
```
1. Seleccionar imagen (cámara o galería)
2. Mostrar preview
3. Convertir a base64
4. Subir a Supabase Storage
5. Crear registro en tabla momentos
6. Actualizar carousel automáticamente
```

### 4. Sincronización Real-time
```
1. Suscribirse a cambios en tabla momentos
2. Suscribirse a cambios en momento_views
3. Actualizar UI automáticamente
4. Refrescar contadores y bordes
```

## 📱 Experiencia de Usuario

### Navegación Intuitiva
- **Tap corto**: Avanzar/retroceder Momentos
- **Tap prolongado**: Pausar con efecto visual
- **Swipe horizontal**: Cambiar de autor
- **Swipe vertical**: Cerrar visor

### Feedback Visual
- ✅ Animaciones suaves y fluidas
- ✅ Haptic feedback en acciones importantes
- ✅ Progress bar circular para cada Momento
- ✅ Glow effect al pausar
- ✅ Gradientes elegantes en botones

### Accesibilidad
- ✅ Iconos claros y reconocibles
- ✅ Textos legibles con buen contraste
- ✅ Áreas táctiles amplias
- ✅ Confirmaciones para acciones destructivas

## 🚀 Características Avanzadas

### 1. Estadísticas (Solo Autor)
- Lista completa de usuarios que vieron el Momento
- Lista completa de usuarios que dieron like
- Timestamps de visualización
- Modal deslizable desde abajo

### 2. Mensajes Directos
- Creación automática de chat si no existe
- Referencia al Momento en el mensaje
- Posibilidad de incluir screenshot (futuro)

### 3. Optimizaciones de Rendimiento
- Lazy loading de imágenes
- Preloading del siguiente Momento
- Memoización de componentes
- Debouncing de actualizaciones

### 4. Seguridad
- RLS policies en todas las tablas
- Validación de permisos para eliminar
- Solo el autor puede ver estadísticas
- Storage con políticas de acceso

## 🔮 Futuras Mejoras

### Fase 2
- [ ] Soporte para videos cortos (15s)
- [ ] Filtros y stickers
- [ ] Texto sobre imágenes
- [ ] Música de fondo
- [ ] Respuestas rápidas con emojis

### Fase 3
- [ ] Momentos destacados (guardados permanentemente)
- [ ] Compartir Momentos en posts
- [ ] Menciones en Momentos
- [ ] Encuestas y preguntas interactivas
- [ ] Análisis avanzados para locales

### Fase 4
- [ ] Momentos colaborativos
- [ ] Transmisiones en vivo
- [ ] Integración con eventos
- [ ] Promociones exclusivas en Momentos
- [ ] Gamificación (badges por visualizaciones)

## 📊 Métricas y Analytics

### Métricas Clave
- Número de Momentos subidos por día
- Tasa de visualización (views/followers)
- Engagement rate (likes/views)
- Tiempo promedio de visualización
- Tasa de respuesta (mensajes directos)

### Queries Útiles

```sql
-- Momentos más populares (últimas 24h)
SELECT m.*, COUNT(mv.id) as views, COUNT(ml.id) as likes
FROM momentos m
LEFT JOIN momento_views mv ON m.id = mv.momento_id
LEFT JOIN momento_likes ml ON m.id = ml.momento_id
WHERE m.created_at > NOW() - INTERVAL '24 hours'
GROUP BY m.id
ORDER BY views DESC, likes DESC
LIMIT 10;

-- Usuarios más activos en Momentos
SELECT u.id, u.nombre, COUNT(m.id) as momentos_count
FROM usuarios u
JOIN momentos m ON u.id = m.autor_id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.nombre
ORDER BY momentos_count DESC
LIMIT 20;

-- Tasa de engagement por local
SELECT 
  l.id,
  l.nombre,
  COUNT(DISTINCT m.id) as momentos,
  COUNT(DISTINCT mv.usuario_id) as unique_viewers,
  COUNT(DISTINCT ml.usuario_id) as unique_likers,
  ROUND(COUNT(DISTINCT ml.usuario_id)::numeric / NULLIF(COUNT(DISTINCT mv.usuario_id), 0) * 100, 2) as engagement_rate
FROM locales l
JOIN momentos m ON l.id = m.local_id
LEFT JOIN momento_views mv ON m.id = mv.momento_id
LEFT JOIN momento_likes ml ON m.id = ml.momento_id
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY l.id, l.nombre
ORDER BY engagement_rate DESC;
```

## 🛠️ Mantenimiento

### Limpieza Automática
Configurar un cron job para ejecutar diariamente:

```sql
SELECT delete_expired_momentos();
```

### Monitoreo
- Verificar tamaño del bucket de storage
- Revisar logs de errores en uploads
- Monitorear latencia de carga de Momentos
- Alertas si la tasa de error supera 5%

## 📞 Soporte

Para dudas o problemas con el sistema de Momentos:
1. Revisar esta documentación
2. Verificar logs en Supabase Dashboard
3. Comprobar políticas RLS
4. Validar permisos de storage

---

**Versión**: 1.0.0  
**Última actualización**: 2025  
**Estado**: ✅ Producción Ready
