
# 🗑️ Guía Rápida: Gestión de Locales Rechazados

## ¿Qué son los locales rechazados?

Los locales rechazados son aquellos que **no pasaron la validación** durante el proceso de enriquecimiento con Google Places.

## ¿Por qué se rechazan?

Los motivos más comunes son:

- ❌ **No encontrado en Google Places**
- ❌ **Sin detalles completos**
- ❌ **Fuera de España**
- ❌ **Cerrado permanentemente**
- ❌ **Tipo prohibido** (hoteles, tiendas, etc.)
- ❌ **Sin tipos válidos** para BarLive

## ¿Qué pasa cuando se rechaza un local?

### Automáticamente:

1. Se agrega a la tabla `locales_excluidos`
2. Se marca como `activo = false` en `locales`
3. Se registra el motivo en `notas_rechazo`

### Opcionalmente (manual):

4. Se puede eliminar de la tabla `locales` para liberar espacio

## ¿Cómo afecta esto al sistema?

### ✅ Beneficios:

- **No se vuelven a intentar enriquecer** → Ahorro de costes de API
- **No se vuelven a importar desde OSM** → Catálogo más limpio
- **No aparecen en listados** → Mejor experiencia de usuario

### 🔍 Verificación:

El sistema verifica automáticamente si un local está excluido:

- **Antes de importar** desde OSM
- **Antes de enriquecer** con Google Places
- **Durante la búsqueda** de duplicados

## 📱 Cómo gestionar locales rechazados

### Opción 1: Ver y gestionar individualmente

1. Ir a **Admin → Locales Rechazados**
2. Ver lista completa de rechazados
3. Filtrar por motivo
4. Buscar por nombre
5. Eliminar exclusiones individuales si es necesario

### Opción 2: Limpieza masiva

1. Ir a **Admin → Sistema de Limpieza Automática**
2. Ver sección "Locales Rechazados Pendientes"
3. Click en "Limpiar X Rechazados"
4. Confirmar eliminación

## 💡 Casos de Uso

### Caso 1: Local rechazado por error

Si un local fue rechazado incorrectamente:

1. Ir a **Admin → Locales Rechazados**
2. Buscar el local
3. Click en el icono de basura
4. Confirmar eliminación de la exclusión
5. El local podrá ser importado/enriquecido nuevamente

### Caso 2: Limpiar catálogo

Para mantener el catálogo limpio:

1. Ir a **Admin → Sistema de Limpieza Automática**
2. Revisar estadísticas de rechazados
3. Click en "Limpiar X Rechazados"
4. Los locales se eliminarán de `locales` pero permanecerán en `locales_excluidos`

### Caso 3: Verificar exclusiones

Para ver qué locales están excluidos:

```sql
SELECT nombre, descripcion_exclusion, fecha_exclusion
FROM locales_excluidos
ORDER BY fecha_exclusion DESC;
```

## 🔧 Funciones Disponibles

### Desde SQL:

```sql
-- Limpiar todos los rechazados
SELECT * FROM limpiar_locales_rechazados();

-- Ver estadísticas
SELECT * FROM obtener_estadisticas_limpieza();
```

### Desde TypeScript:

```typescript
import { limpiarLocalesRechazados } from '@/utils/rejectedLocalsCleanup';

// Limpiar rechazados
const result = await limpiarLocalesRechazados();
console.log(`Eliminados: ${result.localesEliminados}`);
```

## ⚠️ Advertencias

1. **La eliminación es permanente** - Los locales no se pueden recuperar de `locales`
2. **Los datos se mantienen** en `locales_excluidos` para referencia
3. **Las exclusiones son reversibles** - Se pueden eliminar de `locales_excluidos`
4. **Solo administradores** pueden gestionar exclusiones

## 📊 Estadísticas

El sistema proporciona:

- Total de locales rechazados pendientes
- Desglose por motivo de rechazo
- Desglose por provincia
- Historial completo de exclusiones

## 🎯 Mejores Prácticas

1. **Revisar semanalmente** los locales rechazados
2. **Limpiar mensualmente** los rechazados confirmados
3. **Verificar motivos** antes de eliminar exclusiones
4. **Mantener historial** en `locales_excluidos`
5. **Documentar** exclusiones manuales

## 🆘 Solución de Problemas

### Problema: Un local sigue apareciendo después de ser rechazado

**Solución:**
1. Verificar que esté en `locales_excluidos`
2. Ejecutar limpieza de rechazados
3. Refrescar caché del catálogo

### Problema: Un local fue rechazado incorrectamente

**Solución:**
1. Ir a Admin → Locales Rechazados
2. Eliminar la exclusión
3. Volver a importar/enriquecer el local

### Problema: Muchos locales rechazados

**Solución:**
1. Revisar criterios de validación
2. Ajustar filtros de importación OSM
3. Mejorar estrategias de búsqueda en Google

## 📞 Soporte

Para más información, consulta:

- `REJECTED_LOCALS_CLEANUP_SYSTEM.md` - Documentación completa
- `SISTEMA_LIMPIEZA_AUTOMATICA.md` - Sistema de limpieza general
- `utils/enrichmentExclusionCheck.ts` - Código de verificación

---

**Última actualización:** Enero 2025
