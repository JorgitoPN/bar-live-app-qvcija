
# 🗑️ Sistema de Limpieza de Locales Rechazados

## 📋 Resumen

Se ha implementado un sistema completo para gestionar locales rechazados durante el proceso de enriquecimiento con Google Places, eliminándolos automáticamente del catálogo y evitando que se intenten procesar nuevamente.

## 🎯 Objetivos

1. **Eliminar locales rechazados** del catálogo de locales
2. **Prevenir re-enriquecimiento** de locales ya rechazados
3. **Prevenir re-importación** desde OSM de locales excluidos
4. **Reducir costes** de API evitando llamadas innecesarias
5. **Mantener el catálogo limpio** sin locales inválidos

## 🔧 Componentes Implementados

### 1. Migración de Base de Datos

**Archivo:** `supabase/migrations/auto_exclude_rejected_locals.sql`

#### Función: `auto_excluir_local_rechazado()`
- **Trigger:** Se ejecuta automáticamente cuando un local es marcado como rechazado
- **Condición:** `activo = false AND notas_rechazo IS NOT NULL`
- **Acción:** Agrega el local a `locales_excluidos` con todos sus datos

#### Función: `limpiar_locales_rechazados()`
- **Propósito:** Elimina todos los locales rechazados de la tabla `locales`
- **Retorna:** Número de locales eliminados y detalles
- **Uso:** Puede ejecutarse manualmente desde el admin panel

### 2. Actualización del Proceso de Enriquecimiento

**Archivo:** `app/admin/enriquecimiento-google.tsx`

#### Cambios principales:

1. **Función `excluirYEliminarLocalRechazado()`**
   - Agrega el local a `locales_excluidos`
   - Elimina el local de la tabla `locales`
   - Registra el motivo de rechazo

2. **Proceso de enriquecimiento mejorado**
   - Cuando un local es rechazado (no encontrado, sin detalles, validación fallida, fuera de España)
   - Se llama automáticamente a `excluirYEliminarLocalRechazado()`
   - El local se elimina del catálogo inmediatamente

3. **Estadísticas actualizadas**
   - Ahora muestran correctamente el número de locales rechazados
   - Solo cuentan locales activos para pendientes y enriquecidos

4. **Logs mejorados**
   - Informan cuando un local es excluido y eliminado
   - Muestran el motivo de rechazo

### 3. Servicio de Enriquecimiento

**Archivo:** `utils/enrichmentService.ts`

#### Cambios:

1. **Función `excluirYEliminarLocalRechazado()`**
   - Versión del servicio para uso programático
   - Maneja la exclusión y eliminación de locales

2. **Función `buscarYEnriquecerLocal()` actualizada**
   - Verifica exclusión antes de enriquecer
   - Si el local está excluido, lo elimina si aún existe
   - Rechaza locales no encontrados, sin detalles o inválidos
   - Llama a `excluirYEliminarLocalRechazado()` para cada rechazo

### 4. Utilidad de Limpieza

**Archivo:** `utils/rejectedLocalsCleanup.ts`

Funciones disponibles:

- `limpiarLocalesRechazados()`: Elimina todos los locales rechazados
- `obtenerEstadisticasRechazados()`: Obtiene estadísticas de rechazados
- `hayLocalesRechazadosPendientes()`: Verifica si hay rechazados pendientes
- `eliminarLocalRechazado(localId)`: Elimina un local rechazado específico

### 5. Página de Gestión de Rechazados

**Archivo:** `app/admin/locales-rechazados.tsx`

Nueva página administrativa que permite:

- Ver todos los locales en `locales_excluidos`
- Filtrar por motivo de exclusión
- Buscar por nombre o dirección
- Eliminar exclusiones individuales (para permitir re-procesamiento)
- Limpiar todas las exclusiones de una vez

### 6. Integración en Sistema de Limpieza

**Archivo:** `app/admin/sistema-limpieza-automatica.tsx`

Añadida sección para:

- Ver estadísticas de locales rechazados pendientes
- Ver desglose por motivo de rechazo
- Botón para limpiar todos los rechazados de una vez

## 🔄 Flujo de Trabajo

### Cuando un local es rechazado:

```
1. Enriquecimiento detecta rechazo
   ↓
2. Se llama a excluirYEliminarLocalRechazado()
   ↓
3. Se agrega a locales_excluidos
   ↓
4. Se elimina de locales
   ↓
5. No aparecerá en futuras importaciones/enriquecimientos
```

### Verificación de exclusión:

```
1. Antes de importar desde OSM
   ↓
2. verificarLocalExcluido() en enrichmentExclusionCheck.ts
   ↓
3. Si está excluido → NO se importa
   ↓
4. Si no está excluido → Se importa normalmente
```

## 📊 Motivos de Rechazo

Los locales pueden ser rechazados por:

- **No encontrado en Google Places**: No se pudo localizar en la API
- **Sin detalles**: La API no devolvió información completa
- **Validación fallida**: No cumple con los criterios de validación
- **Fuera de España**: Ubicación fuera del territorio español
- **Local cerrado permanentemente**: Business status = CLOSED_PERMANENTLY
- **Tipo prohibido**: Contiene tipos no permitidos (lodging, etc.)
- **Sin tipos válidos**: No tiene ningún tipo válido para BarLive

## 🛡️ Prevención de Re-procesamiento

### En Importación OSM:

**Archivo:** `utils/osmImportService.ts`

```typescript
// Antes de guardar cada local
const exclusionCheck = await verificarLocalExcluido({
  nombre: localCatalogo.nombre,
  latitud: localCatalogo.latitud,
  longitud: localCatalogo.longitud,
  osm_id: localCatalogo.osm_id,
  amenity_type: localCatalogo.tipo_osm,
});

if (exclusionCheck.excluido) {
  // NO se importa el local
  return false;
}
```

### En Enriquecimiento:

**Archivo:** `utils/enrichmentService.ts`

```typescript
// Al inicio del enriquecimiento
const exclusionCheck = await verificarLocalExcluido({
  nombre: localCatalogo.nombre,
  latitud: localCatalogo.latitud,
  longitud: localCatalogo.longitud,
  osm_id: localCatalogo.osm_id,
});

if (exclusionCheck.excluido) {
  // Eliminar si aún existe en locales
  await excluirYEliminarLocalRechazado(localCatalogo, ...);
  return { success: false, ... };
}
```

## 💰 Ahorro de Costes

### Antes:
- Locales rechazados permanecían en la tabla `locales`
- Se intentaban enriquecer repetidamente
- Cada intento costaba ~$0.10 (búsqueda + detalles + fotos)
- Ocupaban espacio en la base de datos

### Después:
- Locales rechazados se eliminan automáticamente
- No se vuelven a intentar enriquecer
- No se vuelven a importar desde OSM
- Ahorro estimado: **$0.10 por local rechazado** × número de intentos evitados

## 📱 Páginas Administrativas

### 1. Locales Rechazados
**Ruta:** `/admin/locales-rechazados`

Permite:
- Ver todos los locales en `locales_excluidos`
- Filtrar por motivo de exclusión
- Buscar por nombre/dirección
- Eliminar exclusiones individuales
- Limpiar todas las exclusiones

### 2. Sistema de Limpieza Automática
**Ruta:** `/admin/sistema-limpieza-automatica`

Incluye:
- Estadísticas de locales rechazados pendientes
- Desglose por motivo de rechazo
- Botón para limpiar todos los rechazados
- Integración con sistema de duplicados e inválidos

## 🔍 Verificación

### Verificar locales rechazados pendientes:

```sql
SELECT COUNT(*) 
FROM locales 
WHERE activo = false 
AND notas_rechazo IS NOT NULL;
```

### Verificar locales en tabla de exclusión:

```sql
SELECT COUNT(*) 
FROM locales_excluidos 
WHERE motivo_exclusion = 'invalido';
```

### Limpiar locales rechazados manualmente:

```sql
SELECT * FROM limpiar_locales_rechazados();
```

## 📈 Estadísticas

El sistema proporciona:

- **Total de locales rechazados** pendientes de limpiar
- **Desglose por motivo** de rechazo
- **Desglose por provincia**
- **Historial de exclusiones** en `locales_excluidos`

## ⚙️ Configuración

### Trigger Automático

El trigger `trigger_auto_excluir_rechazados` se ejecuta automáticamente cuando:
- Un local es actualizado
- `activo` cambia a `false`
- `notas_rechazo` no es NULL

### Función de Limpieza

La función `limpiar_locales_rechazados()` puede ejecutarse:
- Manualmente desde SQL
- Desde el admin panel
- Programáticamente con `rejectedLocalsCleanup.ts`

## 🚀 Uso

### Para Administradores:

1. **Ver locales rechazados:**
   - Ir a Admin → Locales Rechazados
   - Ver lista completa con motivos

2. **Limpiar rechazados:**
   - Ir a Admin → Sistema de Limpieza Automática
   - Click en "Limpiar X Rechazados"

3. **Eliminar exclusión individual:**
   - Ir a Admin → Locales Rechazados
   - Click en el icono de basura del local
   - Confirmar eliminación

### Para Desarrolladores:

```typescript
import { 
  limpiarLocalesRechazados, 
  obtenerEstadisticasRechazados 
} from '@/utils/rejectedLocalsCleanup';

// Limpiar todos los rechazados
const result = await limpiarLocalesRechazados();
console.log(`Eliminados: ${result.localesEliminados}`);

// Obtener estadísticas
const stats = await obtenerEstadisticasRechazados();
console.log(`Total rechazados: ${stats.totalRechazados}`);
```

## 🔐 Seguridad

- Solo administradores pueden acceder a estas funciones
- Las eliminaciones son permanentes (no se pueden deshacer)
- Se registra quién realizó cada exclusión (`excluido_por`)
- Se mantiene historial completo en `locales_excluidos`

## 📝 Notas Importantes

1. **Los locales eliminados NO se pueden recuperar** de la tabla `locales`
2. **Los datos se mantienen** en `locales_excluidos` para referencia
3. **Las exclusiones se pueden revertir** eliminando el registro de `locales_excluidos`
4. **El trigger es automático** - no requiere intervención manual
5. **La limpieza es opcional** - los locales rechazados pueden permanecer en `locales` si se desea

## 🎯 Beneficios

- ✅ **Ahorro de costes**: No se vuelven a intentar enriquecer locales rechazados
- ✅ **Catálogo limpio**: Solo locales válidos y activos
- ✅ **Prevención automática**: Sistema de exclusión integrado
- ✅ **Trazabilidad**: Historial completo de exclusiones
- ✅ **Flexibilidad**: Exclusiones reversibles si es necesario

## 🔄 Mantenimiento

### Limpieza Periódica Recomendada:

1. **Semanal**: Revisar locales rechazados en Admin Panel
2. **Mensual**: Ejecutar limpieza completa de rechazados
3. **Trimestral**: Revisar tabla `locales_excluidos` para posibles reversiones

### Monitoreo:

```sql
-- Ver locales rechazados recientes
SELECT nombre, notas_rechazo, fecha_actualizacion
FROM locales
WHERE activo = false AND notas_rechazo IS NOT NULL
ORDER BY fecha_actualizacion DESC
LIMIT 20;

-- Ver exclusiones recientes
SELECT nombre, descripcion_exclusion, fecha_exclusion
FROM locales_excluidos
ORDER BY fecha_exclusion DESC
LIMIT 20;
```

## 📚 Documentación Relacionada

- `SISTEMA_LIMPIEZA_AUTOMATICA.md` - Sistema general de limpieza
- `DUPLICATE_LOCAL_PREVENTION_SYSTEM.md` - Prevención de duplicados
- `VALIDACION_NOMBRES_LOCALES.md` - Validación de nombres
- `utils/enrichmentExclusionCheck.ts` - Verificación de exclusiones
- `utils/rejectedLocalsCleanup.ts` - Utilidades de limpieza

## ✅ Checklist de Implementación

- [x] Migración de base de datos con trigger automático
- [x] Función de limpieza de rechazados
- [x] Actualización del proceso de enriquecimiento
- [x] Actualización del servicio de enriquecimiento
- [x] Utilidad de limpieza de rechazados
- [x] Página de gestión de rechazados
- [x] Integración en sistema de limpieza automática
- [x] Actualización de navegación admin
- [x] Documentación completa

## 🎉 Resultado Final

El sistema ahora:

1. **Detecta automáticamente** locales rechazados durante el enriquecimiento
2. **Los agrega** a `locales_excluidos` con el motivo de rechazo
3. **Los elimina** de la tabla `locales` (opcionalmente)
4. **Previene** que se vuelvan a importar desde OSM
5. **Previene** que se vuelvan a intentar enriquecer
6. **Ahorra costes** de API evitando llamadas innecesarias
7. **Mantiene el catálogo limpio** sin locales inválidos

---

**Fecha de implementación:** Enero 2025
**Versión:** 1.0
**Estado:** ✅ Completado y probado
