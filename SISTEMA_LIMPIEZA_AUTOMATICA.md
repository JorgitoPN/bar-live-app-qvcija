
# 🧹 Sistema de Limpieza Automática de Locales

## 📋 Descripción General

Sistema automático que identifica y elimina de la base de datos los locales que no son válidos para el proceso de enriquecimiento. Gestiona duplicados y locales inválidos, asegurando que no aparezcan en futuros procesos de enriquecimiento ni importaciones desde OSM.

## ✨ Características Principales

### 1. Detección de Locales Inválidos

El sistema detecta automáticamente locales que no cumplen los criterios de enriquecimiento:

- **Sin ubicación geográfica**: Locales sin latitud/longitud
- **Sin nombre**: Locales sin nombre válido
- **Cerrados permanentemente**: Locales con `google_business_status = 'CLOSED_PERMANENTLY'`
- **Fuera de España**: Locales cuya dirección no contiene "España" o "Spain"
- **Tipos prohibidos**: Gimnasios, hoteles, hospitales, escuelas, bancos, supermercados, etc.
- **Palabras prohibidas en nombre**: Gimnasio, hotel, farmacia, peluquería, etc.

### 2. Detección de Duplicados

El sistema detecta duplicados mediante tres métodos:

- **Por ubicación**: Mismo nombre + ubicación exacta (dentro de 11 metros)
- **Por Google Place ID**: Mismo `google_place_id`
- **Por OSM ID**: Mismo `source_id` con `source_type = 'osm'`

### 3. Exclusión Automática

Los locales detectados se:

- Marcan como `activo = false` en la tabla `locales`
- Agregan a la tabla `locales_excluidos` con motivo y metadata
- Excluyen de futuros procesos de enriquecimiento
- Excluyen de importaciones desde OSM

### 4. Prevención de Re-enriquecimiento

Antes de enriquecer un local, el sistema verifica:

```typescript
const exclusionCheck = await verificarLocalExcluido({
  nombre: local.nombre,
  latitud: local.latitud,
  longitud: local.longitud,
  google_place_id: local.google_place_id,
  osm_id: local.osm_id,
});

if (exclusionCheck.excluido) {
  // No enriquecer este local
  return { success: false, notas: exclusionCheck.motivo };
}
```

## 🗄️ Estructura de Base de Datos

### Tabla `locales_excluidos`

```sql
CREATE TABLE locales_excluidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID REFERENCES locales(id),
  nombre TEXT NOT NULL,
  direccion TEXT,
  latitud NUMERIC,
  longitud NUMERIC,
  google_place_id TEXT,
  osm_id TEXT,
  motivo_exclusion TEXT CHECK (motivo_exclusion IN (
    'duplicado',
    'invalido',
    'fuera_categoria',
    'datos_incorrectos',
    'cerrado_permanentemente',
    'no_existe'
  )),
  descripcion_exclusion TEXT,
  excluido_por UUID REFERENCES usuarios(id),
  fecha_exclusion TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices para Optimización

```sql
CREATE INDEX idx_locales_excluidos_google_place_id 
  ON locales_excluidos(google_place_id) 
  WHERE google_place_id IS NOT NULL;

CREATE INDEX idx_locales_excluidos_osm_id 
  ON locales_excluidos(osm_id) 
  WHERE osm_id IS NOT NULL;

CREATE INDEX idx_locales_excluidos_nombre_ubicacion 
  ON locales_excluidos(nombre, latitud, longitud) 
  WHERE nombre IS NOT NULL AND latitud IS NOT NULL AND longitud IS NOT NULL;
```

## 🔧 Funciones de Base de Datos

### 1. `detectar_locales_invalidos()`

Detecta todos los locales que no cumplen los criterios de enriquecimiento.

```sql
SELECT * FROM detectar_locales_invalidos();
```

**Retorna:**
- `local_id`: ID del local
- `nombre`: Nombre del local
- `direccion`: Dirección
- `tipo`: Tipo de local
- `motivo_invalido`: Razón por la que es inválido
- `google_place_id`: Google Place ID (si existe)
- `source_type`: Tipo de fuente (osm, manual, google)
- `source_id`: ID de la fuente

### 2. `excluir_locales_invalidos(p_admin_id, p_dry_run)`

Excluye automáticamente locales inválidos.

```sql
SELECT * FROM excluir_locales_invalidos(
  p_admin_id := 'uuid-del-admin',
  p_dry_run := true  -- false para ejecutar realmente
);
```

**Retorna:**
- `locales_procesados`: Número de locales procesados
- `locales_excluidos`: Número de locales excluidos
- `detalles`: JSONB con detalles de cada local

### 3. `ejecutar_limpieza_completa(p_admin_id, p_dry_run, p_incluir_duplicados, p_incluir_invalidos)`

Ejecuta limpieza completa de duplicados e inválidos.

```sql
SELECT * FROM ejecutar_limpieza_completa(
  p_admin_id := 'uuid-del-admin',
  p_dry_run := true,
  p_incluir_duplicados := true,
  p_incluir_invalidos := true
);
```

**Retorna:**
- `tipo_limpieza`: Tipo de limpieza ejecutada
- `grupos_procesados`: Grupos de duplicados procesados
- `locales_eliminados`: Locales eliminados
- `locales_excluidos`: Locales excluidos
- `detalles`: JSONB con detalles

### 4. `esta_local_excluido(p_nombre, p_latitud, p_longitud, p_google_place_id, p_osm_id)`

Verifica si un local está excluido.

```sql
SELECT esta_local_excluido(
  p_nombre := 'Bar Example',
  p_latitud := 40.4168,
  p_longitud := -3.7038,
  p_google_place_id := 'ChIJ...',
  p_osm_id := 'node/123456'
);
```

**Retorna:** `BOOLEAN` (true si está excluido)

### 5. `obtener_estadisticas_limpieza()`

Obtiene estadísticas completas del sistema.

```sql
SELECT * FROM obtener_estadisticas_limpieza();
```

**Retorna:**
- `total_locales_activos`: Total de locales activos
- `total_locales_excluidos`: Total de locales excluidos
- `duplicados_ubicacion`: Duplicados por ubicación
- `duplicados_google`: Duplicados por Google Place ID
- `duplicados_osm`: Duplicados por OSM ID
- `invalidos`: Locales inválidos
- `fuera_categoria`: Locales fuera de categoría
- `cerrados_permanentemente`: Locales cerrados permanentemente

## 🖥️ Interfaces de Administración

### 1. Sistema de Limpieza Automática
**Ruta:** `/admin/sistema-limpieza-automatica`

Panel principal para ejecutar limpieza automática:
- Ver estadísticas en tiempo real
- Configurar opciones de limpieza
- Ejecutar en modo simulación o real
- Ver resultados de última ejecución

### 2. Revisar Locales Inválidos
**Ruta:** `/admin/revisar-locales-invalidos`

Revisar locales inválidos antes de excluirlos:
- Lista de todos los locales inválidos detectados
- Selección múltiple para exclusión
- Ver motivo de invalidez
- Excluir locales seleccionados

### 3. Locales Excluidos
**Ruta:** `/admin/locales-excluidos`

Ver y gestionar locales excluidos:
- Lista completa de locales excluidos
- Búsqueda y filtros por motivo
- Restaurar locales excluidos
- Ver metadata de exclusión

### 4. Gestionar Duplicados
**Ruta:** `/admin/gestionar-duplicados`

Gestión manual de duplicados:
- Ver grupos de duplicados
- Detalles de cada duplicado
- Eliminar duplicados manualmente

## 🔄 Integración con Enriquecimiento

### Verificación Automática en `enrichmentService.ts`

```typescript
// Antes de enriquecer, verificar si está excluido
const exclusionCheck = await verificarLocalExcluido({
  nombre: localCatalogo.nombre,
  latitud: localCatalogo.latitud,
  longitud: localCatalogo.longitud,
  osm_id: localCatalogo.osm_id,
});

if (exclusionCheck.excluido) {
  console.log('[Enrichment] ❌ Local is excluded from enrichment');
  return {
    success: false,
    notas: `Local excluido: ${exclusionCheck.motivo}`,
  };
}
```

### Verificación en Importación OSM

```typescript
// Antes de importar desde OSM, verificar si está excluido
const exclusionCheck = await verificarLocalExcluido({
  nombre: localCatalogo.nombre,
  latitud: localCatalogo.latitud,
  longitud: localCatalogo.longitud,
  osm_id: localCatalogo.osm_id,
});

if (exclusionCheck.excluido) {
  console.log('[OSM Import] ❌ Local is excluded, skipping');
  return false;
}
```

## ⚙️ Configuración de Cron Job

Para ejecutar limpieza automática diariamente, configura un cron job en Supabase:

1. Ve a **Edge Functions** en el dashboard de Supabase
2. Despliega la función `automatic-cleanup`
3. Configura un cron job:
   - **Frecuencia:** Diaria a las 3:00 AM
   - **Payload:** `{ "dryRun": false, "incluirDuplicados": true, "incluirInvalidos": true }`

## 📊 Flujo de Trabajo

### Limpieza Manual

1. Admin accede a `/admin/sistema-limpieza-automatica`
2. Revisa estadísticas de problemas detectados
3. Configura opciones (simulación/real, duplicados/inválidos)
4. Ejecuta limpieza
5. Revisa resultados

### Limpieza Automática (Cron)

1. Cron job ejecuta Edge Function a las 3:00 AM
2. Edge Function llama a `ejecutar_limpieza_completa()`
3. Sistema detecta y procesa duplicados e inválidos
4. Locales se marcan como inactivos y se agregan a `locales_excluidos`
5. Resultados se registran en logs

### Prevención en Tiempo Real

1. Usuario intenta importar local desde OSM
2. Sistema verifica si está excluido con `esta_local_excluido()`
3. Si está excluido, se rechaza la importación
4. Si no está excluido, se permite la importación

## 🎯 Beneficios

### Ahorro de Costes

- **Evita enriquecimientos duplicados**: No se enriquece el mismo local múltiples veces
- **Evita enriquecimientos inválidos**: No se gastan créditos de Google Places en locales que no son válidos
- **Previene importaciones duplicadas**: No se importan locales que ya están excluidos

### Calidad de Datos

- **Base de datos limpia**: Solo locales válidos y únicos
- **Mejor experiencia de usuario**: No se muestran duplicados ni locales inválidos
- **Datos consistentes**: Información precisa y actualizada

### Automatización

- **Sin intervención manual**: El sistema se ejecuta automáticamente
- **Detección proactiva**: Identifica problemas antes de que afecten a usuarios
- **Trazabilidad completa**: Todos los cambios se registran con metadata

## 🔐 Seguridad

- Solo administradores pueden ejecutar limpieza manual
- Limpieza automática se ejecuta con permisos de sistema
- Todas las exclusiones se registran con ID de admin (si aplica)
- Modo simulación permite revisar cambios antes de aplicarlos

## 📈 Monitoreo

### Estadísticas Disponibles

```typescript
const stats = await obtenerEstadisticasLimpieza();

console.log('Locales activos:', stats.total_locales_activos);
console.log('Locales excluidos:', stats.total_locales_excluidos);
console.log('Duplicados por ubicación:', stats.duplicados_ubicacion);
console.log('Duplicados por Google:', stats.duplicados_google);
console.log('Duplicados por OSM:', stats.duplicados_osm);
console.log('Locales inválidos:', stats.invalidos);
console.log('Cerrados permanentemente:', stats.cerrados_permanentemente);
```

## 🚀 Uso

### Desde el Panel de Admin

1. Navega a **Admin** → **Sistema de Limpieza Automática**
2. Revisa las estadísticas de problemas detectados
3. Configura las opciones:
   - **Modo Simulación**: ON para ver qué se eliminaría sin hacer cambios
   - **Incluir Duplicados**: ON para eliminar duplicados
   - **Incluir Inválidos**: ON para excluir inválidos
4. Haz clic en **Ejecutar Simulación** o **Ejecutar Limpieza Real**
5. Revisa los resultados

### Desde Código

```typescript
import { ejecutarLimpiezaAutomatica } from '@/utils/automaticCleanupService';

// Ejecutar limpieza en modo simulación
const summary = await ejecutarLimpiezaAutomatica({
  dryRun: true,
  incluirDuplicados: true,
  incluirInvalidos: true,
  adminId: user.id,
});

console.log('Total eliminados:', summary.totalEliminados);
console.log('Total excluidos:', summary.totalExcluidos);
```

### Desde Edge Function (Cron)

```bash
# Configurar cron job en Supabase
# Frecuencia: 0 3 * * * (diariamente a las 3:00 AM)
# Payload:
{
  "dryRun": false,
  "incluirDuplicados": true,
  "incluirInvalidos": true
}
```

## 📝 Notas Importantes

### Duplicados

- Al eliminar duplicados, se mantiene el local **más antiguo** por defecto
- Los demás duplicados se eliminan permanentemente
- Se registra qué local se mantuvo en la metadata

### Inválidos

- Los locales inválidos se marcan como inactivos pero **no se eliminan**
- Se agregan a `locales_excluidos` para prevenir re-enriquecimiento
- Pueden ser restaurados manualmente si fue un error

### Restauración

- Los locales excluidos pueden ser restaurados desde `/admin/locales-excluidos`
- Al restaurar, se eliminan de `locales_excluidos` y se reactivan en `locales`
- Vuelven a estar disponibles para enriquecimiento e importación

## ⚠️ Advertencias

- **Modo Real**: La limpieza en modo real **NO se puede deshacer**
- **Duplicados**: Los duplicados eliminados se borran permanentemente
- **Cascada**: La eliminación de locales puede afectar a tablas relacionadas (eventos, posts, etc.)
- **Simulación**: Siempre ejecuta primero en modo simulación para revisar cambios

## 🔍 Troubleshooting

### "No se detectan duplicados"

- Verifica que los locales tengan `latitud` y `longitud`
- Los duplicados deben tener el mismo nombre (case-insensitive)
- La ubicación debe ser exacta (dentro de 11 metros)

### "Local no se excluye"

- Verifica que el local esté activo (`activo = true`)
- Revisa los logs de la función para ver el motivo
- Asegúrate de ejecutar en modo real (`dryRun = false`)

### "Local excluido sigue apareciendo"

- Verifica que la verificación de exclusión esté implementada en el código
- Revisa que `esta_local_excluido()` se llame antes de enriquecer/importar
- Limpia la caché de la aplicación

## 📚 Referencias

### Archivos Relacionados

- `utils/enrichmentExclusionCheck.ts`: Verificación de exclusión
- `utils/automaticCleanupService.ts`: Servicio de limpieza automática
- `app/admin/sistema-limpieza-automatica.tsx`: Panel de admin
- `app/admin/revisar-locales-invalidos.tsx`: Revisar inválidos
- `app/admin/locales-excluidos.tsx`: Ver excluidos
- `app/admin/gestionar-duplicados.tsx`: Gestionar duplicados
- `supabase/functions/automatic-cleanup/index.ts`: Edge Function

### Funciones SQL

- `detectar_locales_invalidos()`
- `excluir_locales_invalidos(p_admin_id, p_dry_run)`
- `ejecutar_limpieza_completa(p_admin_id, p_dry_run, p_incluir_duplicados, p_incluir_invalidos)`
- `esta_local_excluido(p_nombre, p_latitud, p_longitud, p_google_place_id, p_osm_id)`
- `obtener_estadisticas_limpieza()`
- `detectar_duplicados_por_ubicacion()`
- `detectar_duplicados_por_google_place_id()`
- `detectar_duplicados_por_osm_id()`
- `eliminar_duplicados_automatico(p_tipo_deteccion, p_admin_id, p_dry_run)`

## ✅ Checklist de Implementación

- [x] Crear tabla `locales_excluidos`
- [x] Crear función `detectar_locales_invalidos()`
- [x] Crear función `excluir_locales_invalidos()`
- [x] Crear función `ejecutar_limpieza_completa()`
- [x] Crear función `esta_local_excluido()`
- [x] Crear función `obtener_estadisticas_limpieza()`
- [x] Crear índices de optimización
- [x] Integrar verificación en `enrichmentService.ts`
- [x] Integrar verificación en `osmImportService.ts`
- [x] Crear panel de admin `sistema-limpieza-automatica.tsx`
- [x] Crear panel de admin `revisar-locales-invalidos.tsx`
- [x] Crear panel de admin `locales-excluidos.tsx`
- [x] Crear Edge Function `automatic-cleanup`
- [x] Actualizar navegación de admin
- [ ] Configurar cron job en Supabase (manual)
- [ ] Probar en modo simulación
- [ ] Ejecutar limpieza inicial en producción

## 🎓 Guía de Uso Rápida

### Para Administradores

1. **Primera vez:**
   - Ve a `/admin/sistema-limpieza-automatica`
   - Activa **Modo Simulación**
   - Ejecuta para ver qué se eliminaría
   - Revisa los resultados
   - Desactiva **Modo Simulación**
   - Ejecuta limpieza real

2. **Mantenimiento regular:**
   - Revisa `/admin/locales-excluidos` periódicamente
   - Verifica que no haya falsos positivos
   - Restaura locales si es necesario

3. **Después de importaciones:**
   - Ejecuta limpieza automática
   - Revisa duplicados detectados
   - Excluye inválidos

### Para Desarrolladores

1. **Antes de enriquecer:**
   ```typescript
   const excluido = await verificarLocalExcluido(params);
   if (excluido.excluido) return;
   ```

2. **Antes de importar:**
   ```typescript
   const excluido = await verificarLocalExcluido(params);
   if (excluido.excluido) return;
   ```

3. **Ejecutar limpieza:**
   ```typescript
   const summary = await ejecutarLimpiezaAutomatica(options);
   ```

## 🎉 Resultado Final

Después de implementar este sistema:

- ✅ No se enriquecen locales duplicados
- ✅ No se enriquecen locales inválidos
- ✅ No se importan locales excluidos desde OSM
- ✅ Base de datos limpia y optimizada
- ✅ Ahorro significativo en costes de API
- ✅ Mejor experiencia de usuario
