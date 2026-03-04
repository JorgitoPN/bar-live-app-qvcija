
# 📊 PRESUPUESTO DE RENDIMIENTO (PERFORMANCE BUDGET)

## 🎯 OBJETIVO

Mantener el Time To Interactive (TTI) por debajo de **1 segundo** en todas las condiciones de red y dispositivos.

---

## 📈 MÉTRICAS CLAVE

### 1. Time To Interactive (TTI)
**Objetivo:** < 500ms  
**Máximo aceptable:** < 1000ms  
**Crítico:** > 1500ms (requiere acción inmediata)

**Cómo medir:**
```typescript
import { PerformanceTracker } from '@/utils/performanceTracker';

// Al inicio de la app
PerformanceTracker.start('app_initialization');

// Cuando la UI es interactiva
PerformanceTracker.end('app_initialization');
PerformanceTracker.recordTTI();

// Ver métricas
console.log('TTI:', PerformanceTracker.getTTI(), 'ms');
```

### 2. Time To First Byte (TTFB)
**Objetivo:** < 200ms  
**Máximo aceptable:** < 500ms  
**Crítico:** > 1000ms

**Cómo medir:**
```typescript
PerformanceTracker.start('fetch_locales');
// ... hacer petición
PerformanceTracker.end('fetch_locales');
```

### 3. Tamaño de Payload
**Objetivo:** < 50KB por página  
**Máximo aceptable:** < 100KB  
**Crítico:** > 200KB

**Cómo optimizar:**
- Reducir número de items por página (actualmente 10)
- Comprimir imágenes
- Eliminar campos innecesarios en queries

### 4. Memoria
**Objetivo:** < 100MB para 200 items  
**Máximo aceptable:** < 150MB  
**Crítico:** > 200MB

**Cómo medir:**
- Android: Usar Android Studio Profiler
- iOS: Usar Xcode Instruments

---

## 🚀 OPTIMIZACIONES IMPLEMENTADAS

### ✅ FASE 1-2: Paralelización y UI Optimista
- **Impacto:** TTI reducido de 3000ms a <500ms (83% mejora)
- **Técnicas:**
  - MMKV síncrono para sesión
  - Promise.allSettled para carga paralela
  - Skeleton loaders para feedback inmediato
  - Transiciones suaves (fade-in 300ms)

### ✅ FASE 6: Circuit Breaker
- **Impacto:** Previene cascadas de fallos
- **Configuración:**
  - Threshold: 3 fallos consecutivos
  - Timeout: 30 segundos antes de reintentar
  - Reset: 60 segundos sin fallos

### ✅ FASE 7: AbortController
- **Impacto:** Ahorra batería y datos
- **Implementación:**
  - Cancelación automática al desmontar
  - Timeout de 8 segundos en queries
  - Cleanup en useEffect

### ✅ FASE 8: Observabilidad
- **Impacto:** Visibilidad del rendimiento real
- **Métricas enviadas:**
  - TTI
  - TTFB
  - Platform (iOS/Android/Web)
  - Device type
  - Timestamp

---

## 🎯 REGLAS DE ORO

### 1. NO BLOQUEAR EL MAIN THREAD
❌ **MAL:**
```typescript
const data = await fetchData(); // Bloquea renderizado
return <View>{data.map(...)}</View>;
```

✅ **BIEN:**
```typescript
// Renderizar skeleton inmediatamente
if (isLoading) return <SkeletonLoader />;

// Datos llegan en background
return <View>{data.map(...)}</View>;
```

### 2. USAR CACHÉ AGRESIVAMENTE
❌ **MAL:**
```typescript
// Siempre fetch de red
const { data } = useQuery({ staleTime: 0 });
```

✅ **BIEN:**
```typescript
// Caché de 15 minutos
const { data } = useQuery({ 
  staleTime: 1000 * 60 * 15,
  gcTime: 1000 * 60 * 60 * 24,
});
```

### 3. CANCELAR PETICIONES INNECESARIAS
❌ **MAL:**
```typescript
// Petición continúa aunque el usuario navegó
useEffect(() => {
  fetchData();
}, []);
```

✅ **BIEN:**
```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  
  return () => controller.abort();
}, []);
```

### 4. LIMITAR LOGS EN PRODUCCIÓN
❌ **MAL:**
```typescript
console.log('[Component] Rendering with data:', data);
```

✅ **BIEN:**
```typescript
if (__DEV__) {
  console.log('[Component] Rendering with data:', data);
}
```

---

## 📊 MONITOREO CONTINUO

### Herramientas

1. **PerformanceTracker** (Interno)
   - Mide TTI, TTFB, duración de operaciones
   - Envía métricas a Supabase en producción

2. **React Query DevTools** (Desarrollo)
   - Visualiza estado de caché
   - Identifica queries lentas

3. **Flipper** (Desarrollo)
   - Network inspector
   - Performance monitor

### Alertas

Configurar alertas cuando:
- TTI > 1000ms en más del 10% de usuarios
- TTFB > 500ms en más del 20% de peticiones
- Circuit Breaker se abre más de 5 veces/día
- Memoria > 150MB en dispositivos de gama baja

---

## 🔧 MANTENIMIENTO

### Checklist Semanal
- [ ] Revisar métricas de TTI en Supabase
- [ ] Verificar que Circuit Breaker no se abre frecuentemente
- [ ] Comprobar tamaño de payloads (< 100KB)
- [ ] Revisar logs de producción para errores

### Checklist Mensual
- [ ] Auditoría de dependencias (bundle size)
- [ ] Profiling de memoria en dispositivos reales
- [ ] Test de rendimiento en red 3G
- [ ] Revisión de queries lentas (> 500ms)

### Checklist Trimestral
- [ ] Benchmark completo vs. competencia
- [ ] Actualización de presupuesto de rendimiento
- [ ] Revisión de arquitectura de caché
- [ ] Plan de optimización para próximo trimestre

---

## 🚨 ACCIONES CORRECTIVAS

### Si TTI > 1000ms

1. **Identificar cuello de botella:**
   ```typescript
   PerformanceTracker.getSummary();
   ```

2. **Verificar Circuit Breaker:**
   ```typescript
   const circuitBreaker = useGlobalDataStore(state => state.circuitBreaker);
   console.log('Circuit Breaker:', circuitBreaker);
   ```

3. **Revisar logs de backend:**
   - Queries lentas (> 500ms)
   - Errores 500
   - Timeouts

4. **Optimizar:**
   - Reducir tamaño de página
   - Añadir índices en BD
   - Implementar CDN para assets

### Si Circuit Breaker se abre frecuentemente

1. **Revisar logs de Supabase:**
   - Errores de conexión
   - Rate limiting
   - Queries que fallan

2. **Aumentar timeout si es necesario:**
   ```typescript
   const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto
   ```

3. **Implementar retry con backoff exponencial:**
   ```typescript
   retry: 3,
   retryDelay: (attemptIndex) => 
     Math.min(1000 * Math.pow(2, attemptIndex), 30000),
   ```

---

## 📚 RECURSOS

- [Web Vitals](https://web.dev/vitals/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [TanStack Query Performance](https://tanstack.com/query/latest/docs/react/guides/performance)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## 🎯 RESUMEN

**Objetivo principal:** TTI < 500ms en el 90% de los casos

**Estrategias clave:**
1. ✅ Paralelización total (Promise.allSettled)
2. ✅ UI optimista (skeleton loaders)
3. ✅ Caché agresivo (MMKV + TanStack Query)
4. ✅ Circuit Breaker (protección contra fallos)
5. ✅ AbortController (cancelación de peticiones)
6. ✅ Observabilidad (métricas en Supabase)

**Mantenimiento:**
- Revisar métricas semanalmente
- Auditoría mensual de rendimiento
- Benchmark trimestral

---

**Última actualización:** Fase 6-8 completada  
**Próxima revisión:** Trimestre Q2 2025
