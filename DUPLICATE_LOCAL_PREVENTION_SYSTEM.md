
# 🔒 Sistema de Prevención de Locales Duplicados

## 📋 Resumen

Sistema completo para prevenir y gestionar locales duplicados en la base de datos, ahorrando costes de enriquecimiento con Google Places API.

## ✅ Características Implementadas

### 1. **Detección de Duplicados**
- ✅ Verifica nombre exacto (case-insensitive, trimmed)
- ✅ Verifica ubicación exacta (dentro de ~11 metros)
- ✅ Permite mismo nombre en ubicaciones diferentes
- ✅ Índice optimizado para búsquedas rápidas

### 2. **Prevención en Tiempo Real**
- ✅ Trigger de base de datos que previene inserciones duplicadas
- ✅ Verificación en la app antes de crear local
- ✅ Mensaje claro al usuario si detecta duplicado
- ✅ Muestra información del local existente

### 3. **Gestión de Duplicados Existentes**
- ✅ Panel de administración para encontrar duplicados
- ✅ Vista detallada de cada grupo de duplicados
- ✅ Eliminación segura manteniendo el local más antiguo
- ✅ Estadísticas y contadores

## 🗄️ Funciones de Base de Datos

### `check_duplicate_local()`
```sql
-- Verifica si existe un local duplicado
SELECT * FROM check_duplicate_local(
  'Bar Central',           -- nombre
  40.416775,              -- latitud
  -3.703790,              -- longitud
  NULL                    -- exclude_id (opcional)
);
```

**Retorna:** Lista de locales con mismo nombre y ubicación exacta

### `find_all_duplicate_locals()`
```sql
-- Encuentra todos los grupos de duplicados
SELECT * FROM find_all_duplicate_locals();
```

**Retorna:** Grupos de duplicados con contadores y IDs

### `remove_duplicate_locals()`
```sql
-- Elimina duplicados manteniendo el más antiguo
SELECT * FROM remove_duplicate_locals(
  'Bar Central',           -- nombre
  40.416775,              -- latitud
  -3.703790,              -- longitud
  true                    -- keep_oldest
);
```

**Retorna:** Número de eliminados, ID mantenido, IDs eliminados

## 🎯 Criterios de Duplicación

Un local se considera duplicado cuando:

1. **Nombre exacto** (ignorando mayúsculas/minúsculas y espacios)
2. **Ubicación exacta** (diferencia < 0.0001 grados ≈ 11 metros)

### ✅ Casos Válidos (NO son duplicados)
- "Bar Central" en Madrid y "Bar Central" en Barcelona
- "Café Roma" en Calle Mayor 1 y "Café Roma" en Calle Mayor 100
- Mismo nombre con ubicaciones a más de 11 metros

### ❌ Casos Inválidos (SÍ son duplicados)
- "Bar Central" en 40.416775, -3.703790 (creado 2 veces)
- "bar central" y "BAR CENTRAL" en la misma ubicación
- " Bar Central " y "Bar Central" en la misma ubicación

## 🛡️ Protecciones Implementadas

### 1. **Trigger de Base de Datos**
```sql
CREATE TRIGGER trigger_prevent_duplicate_local
  BEFORE INSERT ON locales
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_local_insert();
```

- Previene inserciones duplicadas automáticamente
- Lanza excepción con mensaje claro
- No afecta a actualizaciones (UPDATE)

### 2. **Validación en la App**
```typescript
// En app/crear/local.tsx
const { data: duplicates } = await supabase.rpc('check_duplicate_local', {
  p_nombre: formData.nombre,
  p_latitud: formData.latitud,
  p_longitud: formData.longitud,
});

if (duplicates && duplicates.length > 0) {
  Alert.alert('Local Duplicado', '...');
  return;
}
```

### 3. **Índice de Rendimiento**
```sql
CREATE INDEX idx_locales_name_location 
ON locales (LOWER(TRIM(nombre)), latitud, longitud)
WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
```

## 📱 Panel de Administración

### Ruta
`/admin/gestionar-duplicados`

### Funcionalidades
1. **Vista General**
   - Contador de grupos duplicados
   - Lista de todos los grupos
   - Información de ubicación

2. **Detalles de Grupo**
   - Lista de todos los locales duplicados
   - Fecha de creación de cada uno
   - Estado de solicitud
   - ID del propietario

3. **Eliminación Segura**
   - Mantiene el local más antiguo
   - Elimina los demás automáticamente
   - Confirmación antes de eliminar
   - Feedback del resultado

## 💰 Ahorro de Costes

### Problema Anterior
- Locales duplicados se enriquecían múltiples veces con Google Places API
- Coste: ~$0.017 por enriquecimiento
- Con 100 duplicados: ~$1.70 desperdiciados

### Solución Actual
- Prevención automática de duplicados
- Detección y eliminación de existentes
- Enriquecimiento solo una vez por local único
- **Ahorro estimado: 100% en duplicados**

## 🔧 Uso para Desarrolladores

### Verificar Duplicados Manualmente
```typescript
const { data } = await supabase.rpc('check_duplicate_local', {
  p_nombre: 'Nombre del Local',
  p_latitud: 40.416775,
  p_longitud: -3.703790,
});

console.log('Duplicados encontrados:', data);
```

### Encontrar Todos los Duplicados
```typescript
const { data } = await supabase.rpc('find_all_duplicate_locals');
console.log('Grupos de duplicados:', data);
```

### Eliminar Duplicados Programáticamente
```typescript
const { data } = await supabase.rpc('remove_duplicate_locals', {
  p_nombre: 'Nombre del Local',
  p_latitud: 40.416775,
  p_longitud: -3.703790,
  p_keep_oldest: true,
});

console.log('Eliminados:', data[0].removed_count);
console.log('Mantenido:', data[0].kept_id);
```

## 📊 Monitoreo

### Consultas Útiles

**Contar duplicados totales:**
```sql
SELECT COUNT(*) FROM find_all_duplicate_locals();
```

**Ver locales con más duplicados:**
```sql
SELECT * FROM find_all_duplicate_locals()
ORDER BY duplicate_count DESC
LIMIT 10;
```

**Verificar trigger activo:**
```sql
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_prevent_duplicate_local';
```

## ⚠️ Consideraciones

### Limitaciones
- La detección de ubicación usa coordenadas simples (no PostGIS)
- Precisión de ~11 metros (0.0001 grados)
- No detecta variaciones de nombre (ej: "Bar Central" vs "Central Bar")

### Recomendaciones
1. Revisar duplicados existentes antes de enriquecer con Google
2. Educar a propietarios sobre búsqueda de locales existentes
3. Monitorear logs de intentos de duplicación
4. Considerar implementar búsqueda fuzzy para nombres similares

## 🚀 Próximas Mejoras

### Posibles Extensiones
1. **Detección de Nombres Similares**
   - Usar algoritmos de similitud (Levenshtein, Soundex)
   - Sugerir locales similares antes de crear

2. **Integración con PostGIS**
   - Usar ST_Distance para cálculos precisos
   - Soportar búsquedas geoespaciales avanzadas

3. **Fusión de Duplicados**
   - Combinar datos de múltiples duplicados
   - Mantener el mejor conjunto de información

4. **Notificaciones Automáticas**
   - Alertar a admins cuando se detectan duplicados
   - Email semanal con resumen de duplicados

## 📝 Changelog

### v1.0 (2024)
- ✅ Implementación inicial del sistema
- ✅ Funciones de base de datos
- ✅ Trigger de prevención
- ✅ Panel de administración
- ✅ Validación en app de creación
- ✅ Documentación completa

## 🤝 Soporte

Para problemas o preguntas sobre el sistema de prevención de duplicados:
1. Revisar logs de la app: `[CrearLocal v10.0]` y `[GestionarDuplicados]`
2. Verificar trigger activo en base de datos
3. Comprobar índice de rendimiento
4. Contactar con el equipo de desarrollo

---

**Última actualización:** 2024
**Versión:** 1.0
**Estado:** ✅ Producción
