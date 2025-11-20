
# Implementación de Categoría PUB Automática

## Resumen

Se ha implementado la lógica para asignar automáticamente la categoría **PUB** a los locales que cierran después de las **2:00 AM (02:00)**, permitiendo que los locales tengan múltiples categorías como "Bar y Pub" o "Discoteca y Pub".

## Cambios Realizados

### 1. Actualización de `utils/categorizeLocal.ts`

#### Funciones Añadidas:

- **`shouldHavePubCategory(horarios_completos)`**: Verifica si un local debe tener la categoría PUB basándose en su hora de cierre.
  
- **`addPubCategoryIfNeeded(currentCategories, horarios_completos)`**: Añade la categoría PUB a las categorías existentes si el local cierra después de las 2:00 AM.

#### Lógica de Categorización Actualizada:

```typescript
// CASO 3: Cierra después de medianoche → Local nocturno
if (latestClose > 1440 || latestClose < 360) {
  if (latestClose >= 1620 || latestClose <= 360) {
    // Cierre muy tarde (después de 3 AM) → Discoteca, Pub, Coctelería
    categories.push('pub', 'cocteleria', 'discoteca');
  } else if (latestClose > 1560 || latestClose <= 120) {
    // Cierre después de 2:00 AM → Siempre añadir Pub
    categories.push('pub', 'bar', 'lounge');
  } else {
    // Cierre moderado (medianoche a 2 AM) → Bar, Lounge
    categories.push('bar', 'lounge');
  }
}
```

### 2. Actualización de `utils/enrichmentMapping.ts`

Se actualizó la función `categorizarPorHorarios()` para incluir la regla de PUB:

```typescript
// 4️⃣ PUB: Cierre después de 02:00 AM
if (cierreMedia > 2 && cierreMedia < 8) {
  console.log('[Categorization] 📋 Pattern detected: PUB (closes after 02:00)');
  if (!tiposFinales.includes('pub')) {
    tiposFinales.unshift('pub');
  }
}
```

### 3. Actualización de `utils/enrichmentService.ts`

Se integró la función `addPubCategoryIfNeeded()` en el proceso de enriquecimiento:

```typescript
// 🍺 AÑADIR CATEGORÍA PUB SI CIERRA DESPUÉS DE LAS 2:00 AM
console.log('[Enrichment] Checking if PUB category should be added...');
barliveTypes = addPubCategoryIfNeeded(barliveTypes as LocalCategory[], horarios) as string[];
console.log('[Enrichment] Final types after PUB check:', barliveTypes);
```

### 4. Nueva Página de Administración: `app/admin/recategorizar-locales.tsx`

Se creó una herramienta administrativa para recategorizar todos los locales existentes:

#### Características:

- **Interfaz visual** con información clara sobre el proceso
- **Barra de progreso** en tiempo real
- **Resultados detallados** mostrando qué locales fueron actualizados
- **Confirmación** antes de ejecutar la recategorización
- **Resumen** de actualizaciones, locales sin cambios y errores

#### Uso:

1. Navegar a `/admin/recategorizar-locales`
2. Leer la información sobre la recategorización
3. Hacer clic en "Iniciar Recategorización"
4. Confirmar la acción
5. Esperar a que se complete el proceso
6. Revisar los resultados detallados

## Reglas de Categorización

### Regla Principal: Categoría PUB

Un local recibe automáticamente la categoría **PUB** si:

- Cierra después de las **2:00 AM (02:00)** en cualquier día de la semana
- El horario de cierre se calcula como el cierre más tardío de todos los días

### Ejemplos:

| Local | Horario de Cierre | Categorías Originales | Categorías Finales |
|-------|-------------------|----------------------|-------------------|
| Bar Nocturno | 03:00 | Bar | **Pub**, Bar |
| Discoteca Central | 05:00 | Discoteca | **Pub**, Discoteca |
| Restaurante Familiar | 23:00 | Restaurante | Restaurante (sin cambios) |
| Café Bar | 01:30 | Café, Bar | Café, Bar (sin cambios) |
| Lounge Premium | 02:30 | Lounge | **Pub**, Lounge |

## Formato de Horarios

Los horarios se almacenan en el campo `horarios_completos` en formato JSON:

```json
{
  "lunes": ["09:30–16:00", "19:00–23:00"],
  "martes": ["09:30–16:00", "19:00–23:00"],
  "miercoles": ["09:30–16:00", "19:00–23:00"],
  "jueves": ["09:30–16:00", "19:00–23:00"],
  "viernes": ["09:30–16:00", "19:00–03:00"],
  "sabado": ["09:30–16:00", "19:00–03:00"],
  "domingo": ["Cerrado"]
}
```

### Conversión de Horarios:

- **Formato 24h**: `09:00–23:00`
- **Horarios nocturnos**: `22:00–03:00` (cierre a las 3 AM del día siguiente)
- **Cálculo**: Se convierte a minutos desde medianoche
  - `02:00` = 120 minutos
  - `26:00` (02:00 del día siguiente) = 1560 minutos

## Integración con el Sistema de Enriquecimiento

### Flujo de Enriquecimiento:

1. **Búsqueda en Google Places** → Obtener datos del local
2. **Mapeo de tipos** → Convertir tipos de Google a categorías BarLive
3. **Categorización por horarios** → Analizar horarios para refinar categorías
4. **Aplicación de regla PUB** → Añadir PUB si cierra después de 2:00 AM
5. **Guardado en base de datos** → Almacenar categorías finales

### Logs de Ejemplo:

```
[Enrichment] Mapping types...
[Enrichment] Categorizing by schedules...
[Enrichment] Checking if PUB category should be added...
[Enrichment] Final types after PUB check: ['pub', 'bar', 'lounge']
```

## Consideraciones Técnicas

### Manejo de Horarios Nocturnos:

- Los horarios que cruzan medianoche se manejan correctamente
- Ejemplo: `22:00–03:00` se interpreta como cierre a las 3 AM del día siguiente
- El sistema detecta automáticamente cuando `cierre < apertura`

### Límite de Categorías:

- Cada local puede tener hasta **3 categorías**
- La categoría PUB se añade al principio para darle prioridad
- Si ya hay 3 categorías, se mantienen las más relevantes

### Validación:

- Solo se procesan locales con `activo = true`
- Se valida que existan horarios antes de aplicar la regla
- Los locales sin horarios mantienen sus categorías originales

## Mantenimiento y Actualización

### Recategorización Manual:

Para recategorizar todos los locales existentes:

```typescript
// Desde la consola de administración
import { addPubCategoryIfNeeded } from '@/utils/categorizeLocal';

// Obtener todos los locales
const { data: locales } = await supabase
  .from('locales')
  .select('id, barlive_types, horarios_completos')
  .eq('activo', true);

// Actualizar cada local
for (const local of locales) {
  const updatedCategories = addPubCategoryIfNeeded(
    local.barlive_types,
    local.horarios_completos
  );
  
  await supabase
    .from('locales')
    .update({ barlive_types: updatedCategories })
    .eq('id', local.id);
}
```

### Recategorización Automática:

- Los nuevos locales se categorizan automáticamente durante el enriquecimiento
- Los locales existentes pueden recategorizarse usando la herramienta administrativa
- Se recomienda ejecutar la recategorización después de cambios en los horarios

## Testing

### Casos de Prueba:

1. **Local que cierra a las 03:00**
   - Entrada: `{ "viernes": ["20:00–03:00"] }`
   - Esperado: Categoría PUB añadida

2. **Local que cierra a las 01:30**
   - Entrada: `{ "sabado": ["18:00–01:30"] }`
   - Esperado: Sin cambios (cierra antes de 2:00)

3. **Local que cierra a las 02:30**
   - Entrada: `{ "viernes": ["22:00–02:30"] }`
   - Esperado: Categoría PUB añadida

4. **Local sin horarios**
   - Entrada: `null` o `{}`
   - Esperado: Sin cambios

## Beneficios

1. **Categorización más precisa**: Los locales nocturnos se identifican correctamente
2. **Múltiples categorías**: Permite combinaciones como "Bar y Pub" o "Discoteca y Pub"
3. **Automatización**: No requiere intervención manual para nuevos locales
4. **Flexibilidad**: Fácil de ajustar el umbral de tiempo (actualmente 2:00 AM)
5. **Retrocompatibilidad**: Los locales existentes mantienen sus categorías hasta la recategorización

## Próximos Pasos

1. Ejecutar la herramienta de recategorización en producción
2. Monitorear los resultados y ajustar si es necesario
3. Considerar añadir más reglas de categorización basadas en otros atributos
4. Implementar notificaciones para propietarios cuando sus locales sean recategorizados
