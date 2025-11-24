
# Performance Best Practices

## 🎯 Guía de Mejores Prácticas para Desarrolladores

Esta guía te ayudará a mantener el alto rendimiento de la app al agregar nuevas funcionalidades.

## 1. ⚡ Siempre Usa Performance Manager

### ✅ CORRECTO
```typescript
import { performanceManager } from '@/utils/performanceManager';

// Obtener datos con caché y deduplicación
const posts = await performanceManager.getData(
  'posts:feed',
  () => fetchPostsFromAPI(),
  'high' // Prioridad alta para datos críticos
);
```

### ❌ INCORRECTO
```typescript
// NO hagas esto - sin caché ni optimizaciones
const posts = await fetchPostsFromAPI();
```

## 2. 💾 Usa Caché Apropiadamente

### Prioridades de Caché

#### High Priority (30 minutos)
- Datos del usuario actual
- Feed principal
- Historias activas
- Mensajes recientes

```typescript
await advancedCache.set('user:current', userData, 'high');
```

#### Medium Priority (15 minutos)
- Perfiles de otros usuarios
- Publicaciones individuales
- Comentarios

```typescript
await advancedCache.set('post:123', postData, 'medium');
```

#### Low Priority (5 minutos)
- Búsquedas
- Sugerencias
- Datos temporales

```typescript
await advancedCache.set('search:results', results, 'low');
```

### Invalidar Caché Cuando Sea Necesario

```typescript
// Después de crear/editar/eliminar
await advancedCache.invalidate('posts:'); // Invalida todos los posts
await socialCache.clearFeed(); // Limpia el feed
```

## 3. 🚀 Precarga Predictivamente

### Precarga en Eventos del Usuario

```typescript
// Cuando el usuario abre una sección
onSectionOpen(() => {
  // Precarga datos relacionados
  intelligentPreloader.preloadFeed(userId);
});

// Cuando hace scroll
onScroll((index) => {
  // Precarga siguiente contenido
  intelligentPreloader.preloadOnScroll('posts', index, items);
});

// Cuando pasa el dedo cerca de un botón
onHover(() => {
  // Precarga datos de esa sección
  intelligentPreloader.smartPreload(userId);
});
```

### Precarga de Imágenes

```typescript
// Precarga imágenes antes de mostrarlas
const imagesToPreload = posts.slice(0, 5).map(p => p.imagen);
await Promise.all(imagesToPreload.map(uri => Image.prefetch(uri)));
```

## 4. ⚡ Usa Optimistic UI

### Para Acciones del Usuario

```typescript
// Like optimista
const handleLike = async () => {
  await performanceManager.toggleLike(
    postId,
    userId,
    post.liked,
    post.likes,
    (liked, likes) => {
      // UI se actualiza INSTANTÁNEAMENTE
      setPost({ ...post, liked, likes });
    }
  );
  // Servidor confirma en background
};
```

### Para Crear Contenido

```typescript
// Comentario optimista
const handleComment = async () => {
  const tempId = await optimisticUI.addComment(
    postId,
    userId,
    userName,
    userAvatar,
    commentText,
    (comment) => {
      // Comentario aparece INSTANTÁNEAMENTE
      setComments([...comments, comment]);
    }
  );
  // Servidor confirma y reemplaza el ID temporal
};
```

## 5. 🔄 Usa Background Sync

### Para Operaciones Pesadas

```typescript
// NO bloquees la UI con operaciones pesadas
backgroundSync.scheduleTask({
  id: 'heavy-operation',
  type: 'sync',
  priority: 'low',
  maxRetries: 3,
  execute: async () => {
    // Operación pesada aquí
    await processLargeDataset();
  },
});
```

### Para Limpieza y Mantenimiento

```typescript
// Limpieza automática en background
backgroundSync.scheduleTask({
  id: 'cleanup',
  type: 'cleanup',
  priority: 'low',
  maxRetries: 1,
  execute: async () => {
    await cleanupOldCache();
    await deleteExpiredStories();
  },
});
```

## 6. 🖼️ Optimiza Imágenes

### Antes de Subir

```typescript
import { optimizeStoryImage, optimizePostImage } from '@/utils/imageOptimization';

// Para historias
const optimizedUri = await optimizeStoryImage(imageUri);

// Para publicaciones
const optimizedUri = await optimizePostImage(imageUri);

// Para avatares
const optimizedUri = await optimizeAvatarImage(imageUri);

// Luego sube la imagen optimizada
await uploadImage(optimizedUri);
```

### Carga Progresiva

```typescript
// Muestra placeholder mientras carga
<Image
  source={{ uri: imageUrl }}
  placeholder={blurhash}
  transition={200}
  contentFit="cover"
/>
```

## 7. 📡 Usa WebSockets Correctamente

### Suscribirse a Canales

```typescript
// Suscribirse cuando el componente se monta
useEffect(() => {
  const unsubscribe = realtimeMessaging.subscribeToChat(
    chatId,
    userId,
    (message) => {
      // Mensaje recibido instantáneamente
      addMessage(message);
    }
  );

  // Desuscribirse cuando se desmonta
  return () => unsubscribe();
}, [chatId, userId]);
```

### Enviar Mensajes

```typescript
// Envío instantáneo
await realtimeMessaging.sendMessage(chatId, userId, content);
// No esperes respuesta, el mensaje se envía en background
```

## 8. 🎨 Animaciones Fluidas

### Usa GPU

```typescript
// ✅ CORRECTO - Usa transform y opacity (GPU)
<Animated.View
  style={{
    transform: [{ translateY: animatedValue }],
    opacity: fadeValue,
  }}
/>

// ❌ INCORRECTO - Usa propiedades que no son GPU
<Animated.View
  style={{
    top: animatedValue, // ❌ No usa GPU
    backgroundColor: colorValue, // ❌ No usa GPU
  }}
/>
```

### Usa requestAnimationFrame

```typescript
// Para animaciones personalizadas
const animate = (timestamp) => {
  const progress = (timestamp - startTime) / duration;
  
  if (progress < 1) {
    setProgress(progress);
    requestAnimationFrame(animate);
  } else {
    setProgress(1);
    onComplete();
  }
};

requestAnimationFrame(animate);
```

## 9. 🗄️ Optimiza Queries

### Fetch Solo lo Necesario

```typescript
// ✅ CORRECTO - Solo columnas necesarias
const { data } = await supabase
  .from('posts')
  .select('id, autor_id, contenido, imagen, likes')
  .limit(20);

// ❌ INCORRECTO - Fetch todo
const { data } = await supabase
  .from('posts')
  .select('*');
```

### Usa Queries Paralelas

```typescript
// ✅ CORRECTO - Paralelo
const [posts, stories, users] = await Promise.all([
  fetchPosts(),
  fetchStories(),
  fetchUsers(),
]);

// ❌ INCORRECTO - Secuencial
const posts = await fetchPosts();
const stories = await fetchStories();
const users = await fetchUsers();
```

### Usa Paginación

```typescript
// ✅ CORRECTO - Paginación
const { data } = await supabase
  .from('posts')
  .select('*')
  .range(0, 19) // Primeros 20
  .order('created_at', { ascending: false });

// ❌ INCORRECTO - Todo de una vez
const { data } = await supabase
  .from('posts')
  .select('*');
```

## 10. 🔍 Evita Re-renders Innecesarios

### Usa useMemo y useCallback

```typescript
// Memoiza cálculos pesados
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoiza funciones
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Usa React.memo

```typescript
// Memoiza componentes
const PostCard = React.memo(({ post }) => {
  return <View>...</View>;
}, (prevProps, nextProps) => {
  // Solo re-render si el post cambió
  return prevProps.post.id === nextProps.post.id;
});
```

## 11. 📊 Monitorea el Rendimiento

### Logs de Performance

```typescript
// Mide tiempos de operaciones
const startTime = Date.now();
await someOperation();
const duration = Date.now() - startTime;
console.log('[Performance] Operation took:', duration, 'ms');
```

### Estadísticas Periódicas

```typescript
// Cada 5 minutos
setInterval(async () => {
  const stats = await performanceManager.getStats();
  console.log('[Performance] Stats:', stats);
}, 5 * 60 * 1000);
```

## 12. 🚫 Evita Anti-Patterns

### ❌ NO hagas esto:

```typescript
// ❌ Fetch en cada render
useEffect(() => {
  fetchData();
}); // Sin dependencias - se ejecuta en cada render

// ❌ Operaciones pesadas en el render
const Component = () => {
  const result = expensiveOperation(); // ❌ Se ejecuta en cada render
  return <View>{result}</View>;
};

// ❌ Múltiples setState seguidos
setData1(value1);
setData2(value2);
setData3(value3); // 3 re-renders

// ❌ Fetch sin caché
const data = await fetch(url); // Sin caché ni deduplicación
```

### ✅ HAZ esto:

```typescript
// ✅ Fetch con dependencias correctas
useEffect(() => {
  fetchData();
}, [userId]); // Solo cuando userId cambia

// ✅ Memoiza operaciones pesadas
const Component = () => {
  const result = useMemo(() => expensiveOperation(), [deps]);
  return <View>{result}</View>;
};

// ✅ Batch updates
setState(prev => ({
  ...prev,
  data1: value1,
  data2: value2,
  data3: value3,
})); // 1 solo re-render

// ✅ Fetch con Performance Manager
const data = await performanceManager.getData('key', () => fetch(url), 'high');
```

## 13. 🎯 Checklist para Nuevas Features

Antes de hacer commit, verifica:

- [ ] ¿Usas Performance Manager para fetch?
- [ ] ¿Implementaste caché apropiado?
- [ ] ¿Precargas datos cuando sea posible?
- [ ] ¿Usas Optimistic UI para acciones del usuario?
- [ ] ¿Operaciones pesadas van a background?
- [ ] ¿Optimizaste las imágenes?
- [ ] ¿Usas WebSockets para real-time?
- [ ] ¿Animaciones usan GPU?
- [ ] ¿Queries están optimizadas?
- [ ] ¿Evitaste re-renders innecesarios?
- [ ] ¿Agregaste logs de performance?
- [ ] ¿Testeaste en dispositivo real?

## 14. 📚 Recursos

### Documentación
- `docs/INSTAGRAM_PERFORMANCE_OPTIMIZATIONS.md` - Documentación completa
- `docs/PERFORMANCE_TESTING_GUIDE.md` - Guía de testing
- `docs/PERFORMANCE_IMPLEMENTATION_SUMMARY.md` - Resumen de implementación

### Utilidades
- `utils/performanceManager.ts` - Manager central
- `utils/advancedCache.ts` - Sistema de caché
- `utils/optimisticUI.ts` - UI optimista
- `utils/backgroundSync.ts` - Sync en background
- `utils/intelligentPreloader.ts` - Precarga inteligente

## 🎯 Objetivo

**Mantener la app TAN RÁPIDA COMO INSTAGRAM**

Cada nueva feature debe:
- ⚡ Responder instantáneamente
- 💾 Usar caché eficientemente
- 🚀 Precargar predictivamente
- 📡 Actualizar en tiempo real
- 🎨 Animar fluidamente

**¡Nunca comprometas el rendimiento! ⚡**
