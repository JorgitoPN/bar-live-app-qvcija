
# Sistema de Destacados - Duración 24 Horas

## Resumen de Cambios

Este documento describe las actualizaciones realizadas al sistema de destacados de locales y al sistema de menciones.

## 1. Duración de Destacados: 24 Horas

### Cambios Implementados

- **Duración anterior**: 30 días
- **Duración nueva**: 24 horas
- **Fecha de implementación**: 20 de noviembre de 2025

### Funcionalidad

Cuando un propietario activa el destacado de su local:

1. El local se marca como destacado (`destacado_activo = true`)
2. Se establece la fecha de inicio (`destacado_fecha_inicio = NOW()`)
3. Se establece la fecha de fin (`destacado_fecha_fin = NOW() + 24 horas`)
4. Se descuenta 1 crédito de los créditos disponibles
5. El local aparece en la parte superior de los resultados de búsqueda

### Expiración Automática

Se ha implementado un sistema de expiración automática:

- **Función**: `expirar_destacados_vencidos()`
- **Frecuencia**: Se debe ejecutar cada hora (mediante cron job o manualmente)
- **Acción**: Desactiva automáticamente los destacados que han superado las 24 horas

### Uso desde la Aplicación

```typescript
import { 
  activateLocalHighlight, 
  checkLocalHighlightStatus,
  deactivateLocalHighlight,
  getTimeRemaining,
  expireOldHighlights
} from '@/utils/highlightManager';

// Activar destacado (24 horas)
const result = await activateLocalHighlight(localId);
if (result.success) {
  console.log(result.message);
  console.log('Créditos restantes:', result.creditsRemaining);
}

// Verificar estado del destacado
const status = await checkLocalHighlightStatus(localId);
if (status.isHighlighted) {
  console.log('Expira en:', getTimeRemaining(status.expiresAt));
  console.log('Créditos restantes:', status.creditsRemaining);
}

// Desactivar destacado manualmente
const deactivateResult = await deactivateLocalHighlight(localId);

// Expirar destacados vencidos (ejecutar periódicamente)
const expiredCount = await expireOldHighlights();
console.log('Destacados expirados:', expiredCount);
```

### Base de Datos

#### Función: `activar_destacado_local(p_local_id UUID)`

Activa el destacado de un local por 24 horas.

**Validaciones**:
- Verifica que el local tenga una suscripción activa
- Verifica que haya créditos disponibles
- Descuenta 1 crédito al activar

**Ejemplo SQL**:
```sql
SELECT activar_destacado_local('local-uuid-here');
```

#### Función: `expirar_destacados_vencidos()`

Expira automáticamente los destacados que han superado las 24 horas.

**Retorna**: Número de destacados expirados

**Ejemplo SQL**:
```sql
SELECT expirar_destacados_vencidos();
```

### Índices Creados

Para optimizar el rendimiento:

```sql
CREATE INDEX idx_suscripciones_destacado_activo_fecha_fin 
ON suscripciones_locales(destacado_activo, destacado_fecha_fin) 
WHERE destacado_activo = true;
```

## 2. Filtrado de Menciones por Suscripción

### Cambios Implementados

Los locales ahora solo aparecen en el autocompletado de menciones si tienen una suscripción activa de tipo **Estándar** o **Premium**.

### Archivos Modificados

- `components/social/MentionAutocomplete.tsx`
- `app/crear/publicacion.tsx`

### Lógica de Filtrado

```typescript
// 1. Buscar locales por nombre
const { data: locals } = await supabase
  .from('locales')
  .select('id, nombre, imagen_url')
  .eq('activo', true)
  .ilike('nombre', `%${query}%`);

// 2. Filtrar por suscripciones activas (estandar o premium)
const { data: subscriptions } = await supabase
  .from('suscripciones_locales')
  .select(`
    local_id,
    estado,
    planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)
  `)
  .in('local_id', localIds)
  .eq('estado', 'activa');

// 3. Solo incluir locales con planes estandar o premium
const validLocalIds = subscriptions
  .filter(sub => {
    const planName = sub.planes_suscripcion?.nombre;
    return planName === 'estandar' || planName === 'premium';
  })
  .map(sub => sub.local_id);

const filteredLocals = locals.filter(local => 
  validLocalIds.includes(local.id)
);
```

### Comportamiento

**Antes**:
- Todos los locales activos aparecían en las menciones

**Ahora**:
- Solo aparecen locales con suscripción activa de tipo:
  - ✅ **Estándar**
  - ✅ **Premium**
  - ❌ **Básico** (no aparece)
  - ❌ **Sin suscripción** (no aparece)

### Ejemplo de Uso

Cuando un usuario escribe `@` en un post o comentario:

1. Se muestra el autocompletado
2. Se buscan usuarios activos que permitan etiquetas
3. Se buscan locales activos con suscripción estandar/premium
4. Los resultados se ordenan por relevancia
5. Se muestran hasta 5 usuarios y 5 locales

## 3. Planes de Suscripción

### Planes Disponibles

| Plan | Destacados/Mes | Aparece en Menciones |
|------|----------------|---------------------|
| Básico | 0 | ❌ No |
| Estándar | Variable | ✅ Sí |
| Premium | Variable | ✅ Sí |

### Créditos de Destacados

Los créditos se renuevan mensualmente según el plan contratado. Cada vez que se activa un destacado:

1. Se consume 1 crédito
2. El destacado dura 24 horas
3. Al expirar, el crédito NO se devuelve
4. Los créditos se renuevan en la fecha de renovación mensual

## 4. Mantenimiento

### Tareas Periódicas

**Cada hora** (recomendado):
```typescript
// En el servidor o mediante cron job
await expireOldHighlights();
```

**Al iniciar la aplicación**:
```typescript
// En App.tsx o _layout.tsx
useEffect(() => {
  expireOldHighlights();
}, []);
```

### Monitoreo

Para verificar el estado de los destacados:

```sql
-- Ver todos los destacados activos
SELECT 
  l.nombre,
  sl.destacado_fecha_inicio,
  sl.destacado_fecha_fin,
  sl.creditos_destacados_restantes,
  EXTRACT(EPOCH FROM (sl.destacado_fecha_fin - NOW())) / 3600 as horas_restantes
FROM suscripciones_locales sl
JOIN locales l ON sl.local_id = l.id
WHERE sl.destacado_activo = true
ORDER BY sl.destacado_fecha_fin;

-- Ver destacados que deberían expirar
SELECT 
  l.nombre,
  sl.destacado_fecha_fin,
  NOW() - sl.destacado_fecha_fin as tiempo_expirado
FROM suscripciones_locales sl
JOIN locales l ON sl.local_id = l.id
WHERE 
  sl.destacado_activo = true 
  AND sl.destacado_fecha_fin < NOW();
```

## 5. Consideraciones de Seguridad

### RLS (Row Level Security)

Las funciones están marcadas como `SECURITY DEFINER` para permitir que los usuarios ejecuten las operaciones necesarias sin necesidad de permisos directos en las tablas.

### Validaciones

- Solo se pueden activar destacados si hay créditos disponibles
- Solo se pueden activar destacados con suscripción activa
- La expiración es automática y no puede ser manipulada por el usuario

## 6. Troubleshooting

### Problema: Los destacados no expiran automáticamente

**Solución**: Ejecutar manualmente la función de expiración:
```sql
SELECT expirar_destacados_vencidos();
```

### Problema: No puedo activar un destacado

**Verificar**:
1. ¿Tiene el local una suscripción activa?
2. ¿Tiene créditos disponibles?
3. ¿El plan es Estándar o Premium?

```sql
SELECT 
  l.nombre,
  ps.nombre as plan,
  sl.estado,
  sl.creditos_destacados_restantes
FROM suscripciones_locales sl
JOIN locales l ON sl.local_id = l.id
JOIN planes_suscripcion ps ON sl.plan_id = ps.id
WHERE l.id = 'local-uuid-here';
```

### Problema: Un local sin suscripción aparece en menciones

**Verificar**: La lógica de filtrado en `MentionAutocomplete.tsx` y `app/crear/publicacion.tsx`

```typescript
// Debe incluir esta validación
const validLocalIds = subscriptionsData
  .filter(sub => {
    const planName = (sub.planes_suscripcion as any)?.nombre;
    return planName === 'estandar' || planName === 'premium';
  })
  .map(sub => sub.local_id);
```

## 7. Testing

### Test Manual: Activar Destacado

1. Ir a la gestión del local
2. Hacer clic en "Destacar Local"
3. Verificar que se muestra el mensaje de éxito
4. Verificar que aparece el contador de 24 horas
5. Esperar 24 horas o ejecutar `expirar_destacados_vencidos()`
6. Verificar que el destacado se desactiva automáticamente

### Test Manual: Menciones

1. Crear un nuevo post
2. Escribir `@` para activar el autocompletado
3. Buscar un local con plan básico → No debe aparecer
4. Buscar un local con plan estándar/premium → Debe aparecer
5. Seleccionar el local y verificar que se inserta correctamente

## 8. Migración de Datos Existentes

Los destacados existentes con duración de 30 días se han actualizado automáticamente a 24 horas desde el momento de la migración. Si necesitas mantener algún destacado específico, deberás reactivarlo manualmente.

## 9. Futuras Mejoras

- [ ] Notificación push cuando un destacado está por expirar (2 horas antes)
- [ ] Historial de destacados utilizados
- [ ] Estadísticas de rendimiento durante el período destacado
- [ ] Opción de programar destacados para fechas futuras
- [ ] Paquetes de créditos adicionales para compra
