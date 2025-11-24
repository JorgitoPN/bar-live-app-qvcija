
# Performance Testing Guide

## 🧪 Cómo Verificar las Optimizaciones

Esta guía te ayudará a verificar que todas las optimizaciones están funcionando correctamente.

## 1. ⚡ Verificar Precarga Inteligente

### Test: Abrir Historias
1. Abre la app
2. Ve a la sección Social
3. Observa los logs en consola:
   ```
   [IntelligentPreloader] 🚀 Preloading X story images...
   [IntelligentPreloader] ✅ Story images preloaded
   ```
4. Toca una historia
5. **Resultado esperado:** La historia se abre INSTANTÁNEAMENTE (< 100ms)

### Test: Scroll en Feed
1. Scroll por el feed de publicaciones
2. Observa los logs:
   ```
   [IntelligentPreloader] 🚀 Preloading X post images...
   ```
3. **Resultado esperado:** Las imágenes aparecen instantáneamente al hacer scroll

## 2. 💾 Verificar Caché Multi-Capa

### Test: Inicio de App
1. Cierra la app completamente
2. Abre la app de nuevo
3. Observa los logs:
   ```
   [GlobalData] 📦 Loading from cache...
   [GlobalData] ⚡ INSTANT posts from cache: X
   [GlobalData] ⚡ INSTANT stories from cache: X
   ```
4. **Resultado esperado:** El feed aparece INSTANTÁNEAMENTE (< 1 segundo)

### Test: Navegación
1. Ve a Social → Perfil → Social
2. Observa los logs:
   ```
   [AdvancedCache] ⚡ INSTANT from memory: posts:feed
   ```
3. **Resultado esperado:** Navegación instantánea sin recargas

### Verificar Estadísticas de Caché
```typescript
// En cualquier componente
const stats = await advancedCache.getStats();
console.log('Cache Stats:', {
  memorySize: stats.memorySize,
  diskSize: stats.diskSize,
  hotKeys: stats.hotKeys,
});
```

## 3. ⚡ Verificar Optimistic UI

### Test: Dar Like
1. Toca el botón de like en una publicación
2. **Resultado esperado:** 
   - El corazón se pone rojo INSTANTÁNEAMENTE (< 50ms)
   - El contador aumenta INSTANTÁNEAMENTE
   - No hay delay ni loading
3. Observa los logs:
   ```
   [OptimisticUI] ✅ Like confirmed: post-id
   ```

### Test: Guardar Publicación
1. Toca el botón de guardar
2. **Resultado esperado:**
   - El icono cambia INSTANTÁNEAMENTE
   - No hay delay
3. Observa los logs:
   ```
   [OptimisticUI] ✅ Save confirmed: post-id
   ```

### Test: Seguir Usuario
1. Ve a un perfil de usuario
2. Toca "Seguir"
3. **Resultado esperado:**
   - El botón cambia a "Siguiendo" INSTANTÁNEAMENTE
   - El contador de seguidores aumenta INSTANTÁNEAMENTE

## 4. 📡 Verificar WebSockets (Real-time)

### Test: Mensajes Instantáneos
1. Abre un chat
2. Envía un mensaje desde otro dispositivo/navegador
3. **Resultado esperado:**
   - El mensaje aparece INSTANTÁNEAMENTE sin refrescar
4. Observa los logs:
   ```
   [RealtimeMessaging] 📨 New message received
   ```

### Test: Notificaciones
1. Haz que alguien te dé like o comente
2. **Resultado esperado:**
   - La notificación aparece INSTANTÁNEAMENTE
   - El badge se actualiza sin refrescar

## 5. 🔄 Verificar Background Sync

### Test: Tareas en Background
1. Observa los logs después de 10 segundos de usar la app:
   ```
   [BackgroundSync] 🔄 Scheduling periodic sync...
   [BackgroundSync] ⚙️ Executing task: cleanup
   [BackgroundSync] ✅ Task completed: cleanup
   ```
2. **Resultado esperado:**
   - Las tareas se ejecutan sin bloquear la UI
   - La app sigue respondiendo mientras se ejecutan

### Verificar Cola de Tareas
```typescript
const stats = backgroundSync.getStats();
console.log('Background Sync:', {
  queueLength: stats.queueLength,
  isProcessing: stats.isProcessing,
  byType: stats.byType,
});
```

## 6. 🚫 Verificar Request Deduplication

### Test: Múltiples Requests
1. Abre varios tabs/componentes que pidan los mismos datos
2. Observa los logs:
   ```
   [RequestDedup] 🚀 Creating new request: posts:feed
   [RequestDedup] ⚡ Reusing in-flight request: posts:feed
   [RequestDedup] ⚡ Reusing in-flight request: posts:feed
   ```
3. **Resultado esperado:**
   - Solo UNA llamada al servidor
   - Todos los componentes reciben los mismos datos

### Verificar Estadísticas
```typescript
const stats = requestDeduplicator.getStats();
console.log('Request Dedup:', {
  pendingCount: stats.pendingCount,
  oldestRequest: stats.oldestRequest,
});
```

## 7. 🖼️ Verificar Optimización de Imágenes

### Test: Subir Historia
1. Crea una nueva historia con una imagen grande
2. Observa los logs:
   ```
   [ImageOptimization] 📸 Optimizing image
   [ImageOptimization] ✅ Image optimized successfully
   ```
3. **Resultado esperado:**
   - La imagen se sube rápidamente
   - El tamaño del archivo es menor

### Test: Subir Publicación
1. Crea una publicación con varias imágenes
2. Observa que las imágenes se optimizan antes de subir
3. **Resultado esperado:**
   - Upload rápido
   - Menor uso de datos

## 8. 🎯 Verificar Performance Manager

### Ver Estadísticas Completas
```typescript
const stats = await performanceManager.getStats();
console.log('Performance Stats:', JSON.stringify(stats, null, 2));
```

### Resultado Esperado:
```json
{
  "cache": {
    "advanced": {
      "memorySize": 50,
      "diskSize": 100,
      "hotKeys": [...]
    },
    "social": {
      "posts": 20,
      "stories": 15,
      "users": 30,
      "hasFeed": true
    }
  },
  "optimisticUI": {
    "enabled": true,
    "pending": 0,
    "byType": {}
  },
  "backgroundSync": {
    "enabled": true,
    "queueLength": 0,
    "isProcessing": false
  },
  "requestDedup": {
    "enabled": true,
    "pendingCount": 0
  }
}
```

## 9. 🎨 Verificar Animaciones Fluidas

### Test: Barra de Progreso de Historias
1. Abre una historia
2. Observa la barra de progreso
3. **Resultado esperado:**
   - Animación perfectamente fluida (60fps)
   - Sin saltos ni pausas
   - Progreso suave y continuo

### Test: Transiciones
1. Navega entre secciones
2. **Resultado esperado:**
   - Transiciones instantáneas
   - Sin pantallas blancas
   - Sin delays

## 10. 📊 Métricas de Rendimiento

### Medir Tiempos de Carga

#### Inicio de App
```typescript
const startTime = Date.now();
// App se carga
const loadTime = Date.now() - startTime;
console.log('App load time:', loadTime, 'ms');
// Esperado: < 1000ms
```

#### Abrir Historia
```typescript
const startTime = Date.now();
// Abrir historia
const openTime = Date.now() - startTime;
console.log('Story open time:', openTime, 'ms');
// Esperado: < 100ms
```

#### Dar Like
```typescript
const startTime = Date.now();
// Dar like
const likeTime = Date.now() - startTime;
console.log('Like time:', likeTime, 'ms');
// Esperado: < 50ms
```

## 🎯 Checklist de Verificación

### Precarga
- [ ] Historias se precargan al abrir Social
- [ ] Imágenes del feed se precargan al scroll
- [ ] Historia siguiente se precarga al ver una

### Caché
- [ ] App inicia con datos cacheados (< 1s)
- [ ] Navegación usa caché (instantánea)
- [ ] Datos se actualizan en background

### Optimistic UI
- [ ] Likes son instantáneos (< 50ms)
- [ ] Saves son instantáneos
- [ ] Follows son instantáneos
- [ ] Comentarios aparecen al instante

### Real-time
- [ ] Mensajes llegan sin refrescar
- [ ] Notificaciones aparecen al instante
- [ ] Likes se actualizan en tiempo real

### Background
- [ ] Tareas se ejecutan sin bloquear UI
- [ ] Limpieza automática funciona
- [ ] Sincronización periódica activa

### Imágenes
- [ ] Imágenes se optimizan antes de subir
- [ ] Carga de imágenes es rápida
- [ ] Menor uso de datos

### General
- [ ] No hay delays al tocar botones
- [ ] Navegación es instantánea
- [ ] Animaciones son fluidas (60fps)
- [ ] App responde inmediatamente

## 🐛 Troubleshooting

### Si algo no funciona:

1. **Verificar logs en consola**
   - Busca errores o warnings
   - Verifica que los sistemas se inicializan

2. **Limpiar caché**
   ```typescript
   await advancedCache.clearAll();
   socialCache.clearAll();
   ```

3. **Reiniciar Performance Manager**
   ```typescript
   await performanceManager.cleanup();
   await performanceManager.initialize(userId);
   ```

4. **Verificar configuración**
   ```typescript
   const config = performanceManager.getConfig();
   console.log('Config:', config);
   ```

## 📈 Benchmarks Esperados

### Tiempos de Respuesta
- **App Start:** < 1000ms (con caché)
- **Story Open:** < 100ms (con precarga)
- **Like Action:** < 50ms (optimistic)
- **Feed Load:** < 500ms (con caché)
- **Navigation:** < 100ms (instantánea)

### Uso de Memoria
- **Memory Cache:** ~50-100 items
- **Disk Cache:** ~100-200 items
- **Total:** < 50MB

### Red
- **Requests Deduplicados:** 50-70% menos llamadas
- **Imágenes Optimizadas:** 60-80% menos datos
- **WebSockets:** Conexión persistente

## ✅ Resultado Final

Si todos los tests pasan, la app está funcionando con:
- ⚡ Velocidad tipo Instagram
- 🚀 Respuestas instantáneas
- 💾 Caché eficiente
- 📡 Actualizaciones en tiempo real
- 🎨 Animaciones fluidas

**¡Tu app es INSTANTÁNEA! ⚡**
