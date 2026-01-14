
# Sistema de Continuación Automática de Importación OSM

## 📋 Resumen

Se ha implementado un sistema de seguimiento de posición para las importaciones desde OpenStreetMap (OSM) que permite:

1. **Guardar el progreso automáticamente** - El sistema guarda el estado cada 10 locales procesados
2. **Continuar desde donde se quedó** - Si hay un error o timeout, puedes continuar la importación más tarde
3. **Evitar re-leer locales ya importados** - El sistema mantiene la última posición procesada
4. **Procesar en lotes pequeños** - Importa 50 locales a la vez para evitar timeouts
5. **Reintentos automáticos** - Si falla un endpoint, intenta con otros automáticamente

## 🗄️ Base de Datos

### Tabla: `osm_import_state`

```sql
CREATE TABLE osm_import_state (
  id UUID PRIMARY KEY,
  provincia TEXT NOT NULL,
  tipos TEXT[] NOT NULL,
  limite_total INTEGER NOT NULL,
  locales_procesados INTEGER DEFAULT 0,
  locales_importados INTEGER DEFAULT 0,
  locales_duplicados INTEGER DEFAULT 0,
  locales_excluidos INTEGER DEFAULT 0,
  ultima_posicion INTEGER DEFAULT 0,
  completada BOOLEAN DEFAULT FALSE,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_ultima_actualizacion TIMESTAMPTZ NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos importantes:**
- `provincia` - Provincia de la importación
- `tipos` - Array de tipos OSM (bar, restaurant, cafe, etc.)
- `limite_total` - Número total de locales a importar
- `locales_procesados` - Número de locales procesados hasta ahora
- `ultima_posicion` - Última posición procesada en el catálogo OSM
- `completada` - Indica si la importación está completada

## 🔄 Flujo de Importación

### 1. Inicio de Importación

Cuando inicias una importación:

1. El sistema busca si ya existe una importación en progreso para esa provincia y tipos
2. Si existe y no está completada, te pregunta si quieres continuar
3. Si no existe, crea un nuevo registro de estado

### 2. Procesamiento en Lotes

La importación se procesa en lotes de 50 locales:

```
Lote 1: Locales 0-49
Lote 2: Locales 50-99
Lote 3: Locales 100-149
...
```

Cada lote:
- Consulta la API de Overpass con offset
- Procesa los locales recibidos
- Guarda el progreso cada 10 locales
- Espera 30 segundos antes del siguiente lote (rate limiting)

### 3. Guardado de Progreso

El progreso se guarda automáticamente:
- Cada 10 locales procesados
- Al final de cada lote
- Cuando hay un error

### 4. Continuación

Si la importación se interrumpe:

1. El estado queda guardado con `completada = false`
2. La próxima vez que inicies la importación, el sistema detecta el estado existente
3. Te pregunta si quieres continuar
4. Si continúas, empieza desde `ultima_posicion`

## 🎯 Ventajas del Sistema

### ✅ Evita Timeouts

- **Antes**: Intentaba importar 1000 locales de una vez → Timeout 504
- **Ahora**: Importa 50 locales a la vez → Sin timeouts

### ✅ Evita Re-lectura

- **Antes**: Cada importación empezaba desde el inicio del catálogo
- **Ahora**: Continúa desde la última posición procesada

### ✅ Progreso Visible

- **Antes**: No sabías cuántos locales se habían procesado
- **Ahora**: Ves el progreso en tiempo real y puedes continuar más tarde

### ✅ Manejo de Errores

- **Antes**: Un error perdía todo el progreso
- **Ahora**: El progreso se guarda y puedes continuar después del error

## 📊 Estadísticas

El sistema rastrea:

- **Locales procesados** - Total de locales revisados
- **Locales importados** - Locales nuevos guardados en la base de datos
- **Locales duplicados** - Locales que ya existían (se saltan)
- **Locales excluidos** - Locales filtrados por el sistema de exclusión

## 🔧 Configuración

### Tamaño de Lote

```typescript
const PAGINATION_CONFIG = {
  batchSize: 50, // Procesar 50 locales a la vez
  maxBatchesPerSession: 20, // Máximo 20 lotes por sesión (1000 locales)
};
```

### Rate Limiting

```typescript
const RATE_LIMIT_CONFIG = {
  requestsPerMinute: 2,
  delayBetweenRequestsMs: 30000, // 30 segundos entre requests
};
```

### Reintentos

```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};
```

## 🚀 Uso

### Iniciar Nueva Importación

1. Ve a **Admin → Importación OSM**
2. Selecciona provincia y tipos
3. Establece el límite (ej: 1000)
4. Haz clic en "Iniciar Importación"

### Continuar Importación Existente

1. Ve a **Admin → Importación OSM**
2. Si hay una importación en progreso, verás una tarjeta azul con el estado
3. Haz clic en "Continuar" para reanudar
4. O haz clic en "Cancelar" para cancelar la importación

### Cancelar Importación

1. Haz clic en "Cancelar" en la tarjeta de importación existente
2. El progreso se marca como completado con error "Cancelada por el usuario"
3. Puedes iniciar una nueva importación

## 📝 Logs

El sistema genera logs detallados:

```
[19:23:45] 🚀 Iniciando nueva importación desde OpenStreetMap...
[19:23:45] 📍 Provincia: Madrid
[19:23:45] 🏷️ Tipos: bar, restaurant
[19:23:45] 🔢 Límite: 1000 locales
[19:23:45] ⏳ Esto puede tardar varios minutos...
[19:23:45] 🔄 Sistema de reintentos automático activado
[19:23:45] 💾 El progreso se guarda automáticamente
[19:23:46] 📦 Processing batch 1/20...
[19:23:50] ✅ Importado: Bar El Tigre
[19:23:51] ✅ Importado: Restaurante Casa Paco
[19:23:52] ⚠️ Duplicate: Café Central
...
```

## ⚠️ Errores Comunes

### Error 504 (Timeout)

**Causa**: El servidor de Overpass está sobrecargado

**Solución**: 
- El progreso se guarda automáticamente
- Espera 1-2 minutos
- Continúa la importación

### Error 429 (Rate Limit)

**Causa**: Demasiadas solicitudes

**Solución**:
- El progreso se guarda automáticamente
- Espera 1-2 minutos
- Continúa la importación

### No se encuentran locales

**Causa**: La provincia o tipos no tienen locales en OSM

**Solución**:
- Verifica que la provincia esté bien escrita
- Prueba con otros tipos de locales
- Verifica en OpenStreetMap.org que existan locales

## 🔍 Verificación

Para verificar el estado de una importación:

```sql
SELECT 
  provincia,
  tipos,
  locales_procesados,
  locales_importados,
  locales_duplicados,
  locales_excluidos,
  ultima_posicion,
  completada,
  fecha_inicio,
  fecha_ultima_actualizacion
FROM osm_import_state
WHERE completada = false
ORDER BY fecha_inicio DESC;
```

## 📈 Rendimiento

### Antes del Sistema de Continuación

- ❌ Timeouts frecuentes con >100 locales
- ❌ Re-lectura de locales ya importados
- ❌ Pérdida de progreso en errores
- ❌ Proceso muy lento

### Después del Sistema de Continuación

- ✅ Sin timeouts (lotes de 50)
- ✅ No re-lee locales ya procesados
- ✅ Progreso guardado automáticamente
- ✅ Proceso más rápido y confiable

## 🎯 Próximos Pasos

Después de importar desde OSM:

1. Ve a **Admin → Enriquecimiento Google**
2. Enriquece los locales con datos de Google Places
3. Los locales enriquecidos se activan automáticamente
4. Los locales OSM sin enriquecer se eliminan automáticamente

## 💡 Consejos

1. **Empieza con límites pequeños** (100-200) para probar
2. **Usa el sistema de continuación** si hay errores
3. **Espera entre sesiones** si hay muchos timeouts
4. **Verifica el estado de la API** antes de importar
5. **Revisa los logs** para entender qué está pasando

## 🔗 Archivos Relacionados

- `utils/osmImportService.ts` - Lógica de importación
- `app/admin/importacion-osm.tsx` - Interfaz de usuario
- `supabase/migrations/20240115_create_osm_import_state.sql` - Migración de base de datos
