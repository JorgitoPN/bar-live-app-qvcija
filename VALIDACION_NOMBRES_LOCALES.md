
# 🏷️ Sistema de Validación de Nombres de Locales

## 📋 Descripción General

Sistema automático para validar nombres de locales según palabras clave específicas. Solo los locales cuyos nombres contengan al menos una de las palabras clave permitidas serán considerados válidos para enriquecimiento e importación.

## ✅ Palabras Clave Válidas

Un local será considerado **VÁLIDO** si su nombre contiene alguna de las siguientes palabras:

- **Bar**
- **Discoteca**
- **Restaurante**
- **Cafetería**
- **Café**
- **Pub**
- **Coctelería**

### Ejemplos de Nombres Válidos

✅ **"Bar Farmacia"** - Contiene "Bar"
✅ **"Discoteca Gymare"** - Contiene "Discoteca"
✅ **"Restaurante El Faro"** - Contiene "Restaurante"
✅ **"Cafetería Central"** - Contiene "Cafetería"
✅ **"Café de la Ópera"** - Contiene "Café"
✅ **"Pub The Irish"** - Contiene "Pub"
✅ **"Coctelería Molecular"** - Contiene "Coctelería"

### Ejemplos de Nombres Inválidos

❌ **"Farmacia"** - No contiene ninguna palabra clave
❌ **"Peluquería Moderna"** - No contiene ninguna palabra clave
❌ **"Gimnasio Fitness"** - No contiene ninguna palabra clave
❌ **"Tienda de Ropa"** - No contiene ninguna palabra clave

## 🔧 Implementación Técnica

### 1. Función de Validación

La función `esNombreLocalValido()` en `utils/enrichmentExclusionCheck.ts` realiza la validación:

```typescript
export function esNombreLocalValido(nombre: string): { valido: boolean; razon?: string } {
  // Normaliza el nombre (sin acentos, minúsculas)
  const nombreNormalizado = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Verifica si contiene alguna palabra clave
  const contieneKeyword = PALABRAS_CLAVE_VALIDAS.some(keyword => {
    const keywordNormalizada = keyword
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    
    return nombreNormalizado.includes(keywordNormalizada);
  });

  if (!contieneKeyword) {
    return {
      valido: false,
      razon: 'El nombre no contiene ninguna palabra clave válida',
    };
  }

  return { valido: true };
}
```

### 2. Integración en el Sistema de Exclusión

La validación se integra automáticamente en `verificarLocalExcluido()`:

```typescript
export async function verificarLocalExcluido(
  params: ExclusionCheckParams
): Promise<ExclusionCheckResult> {
  // 🔍 VALIDACIÓN DE NOMBRE PRIMERO
  if (params.nombre) {
    const validacionNombre = esNombreLocalValido(params.nombre);
    if (!validacionNombre.valido) {
      return {
        excluido: true,
        motivo: validacionNombre.razon,
      };
    }
  }

  // Continúa con otras verificaciones...
}
```

### 3. Integración en Enriquecimiento

El sistema de enriquecimiento (`enrichmentService.ts`) verifica automáticamente:

```typescript
export async function buscarYEnriquecerLocal(
  localCatalogo: LocalCatalogo
): Promise<EnrichmentResult> {
  // 🚫 VERIFICAR SI EL LOCAL ESTÁ EXCLUIDO
  const exclusionCheck = await verificarLocalExcluido({
    nombre: localCatalogo.nombre,
    latitud: localCatalogo.latitud,
    longitud: localCatalogo.longitud,
    osm_id: localCatalogo.osm_id,
  });

  if (exclusionCheck.excluido) {
    return {
      success: false,
      notas: `Local excluido: ${exclusionCheck.motivo}`,
    };
  }

  // Continúa con el enriquecimiento...
}
```

### 4. Integración en Importación OSM

La importación desde OpenStreetMap también valida nombres:

```typescript
async function guardarLocalEnSupabase(localCatalogo: LocalCatalogo): Promise<boolean> {
  // 🚫 VERIFICAR SI EL LOCAL ESTÁ EXCLUIDO
  const exclusionCheck = await verificarLocalExcluido({
    nombre: localCatalogo.nombre,
    latitud: localCatalogo.latitud,
    longitud: localCatalogo.longitud,
    osm_id: localCatalogo.osm_id,
  });

  if (exclusionCheck.excluido) {
    console.log(`[OSM Import] ❌ Local is excluded, skipping: ${localCatalogo.nombre}`);
    return false;
  }

  // Continúa con la importación...
}
```

## 🎯 Página de Administración

### Acceso

Navega a: **Admin → Validar Nombres de Locales**

O directamente: `/admin/validar-nombres-locales`

### Funcionalidades

#### 1. **Resumen de Validación**
- Muestra el total de locales válidos e inválidos
- Tarjetas visuales con iconos de estado

#### 2. **Filtros**
- **Inválidos**: Muestra solo locales con nombres inválidos
- **Válidos**: Muestra solo locales con nombres válidos
- **Búsqueda**: Buscar por nombre o dirección

#### 3. **Selección Masiva**
- Seleccionar todos los locales inválidos
- Deseleccionar todos
- Contador de seleccionados

#### 4. **Exclusión de Locales**
- Excluir locales seleccionados con un clic
- Confirmación antes de excluir
- Los locales excluidos:
  - Se marcan como inactivos
  - Se agregan a `locales_excluidos`
  - No aparecen en futuros enriquecimientos
  - No se pueden importar desde OSM

#### 5. **Información Detallada**
Para cada local se muestra:
- Nombre
- Dirección
- Tipo
- Estado (Activo/Inactivo)
- Enriquecido (Sí/No)

## 📊 Flujo de Trabajo

### 1. Revisión Inicial

```
1. Acceder a "Validar Nombres de Locales"
2. Ver resumen de locales válidos e inválidos
3. Revisar la lista de locales inválidos
```

### 2. Filtrado y Búsqueda

```
1. Usar el filtro "Inválidos" para ver solo nombres problemáticos
2. Buscar locales específicos por nombre
3. Revisar cada local individualmente
```

### 3. Exclusión Masiva

```
1. Seleccionar locales inválidos
2. Hacer clic en "Excluir X Seleccionados"
3. Confirmar la exclusión
4. Los locales se marcan como inactivos y se excluyen
```

### 4. Verificación

```
1. Refrescar la lista
2. Verificar que los locales excluidos ya no aparecen
3. Revisar en "Locales Excluidos" para confirmar
```

## 🔄 Integración con Otros Sistemas

### Sistema de Limpieza Automática

El sistema de limpieza automática (`sistema-limpieza-automatica.tsx`) también utiliza la validación de nombres:

```typescript
// Detecta automáticamente locales con nombres inválidos
const { data: localesInvalidos } = await supabase.rpc('detectar_locales_invalidos');

// Los excluye automáticamente
for (const local of localesInvalidos) {
  if (!esNombreLocalValido(local.nombre).valido) {
    // Excluir local
  }
}
```

### Sistema de Enriquecimiento

Antes de enriquecer un local con Google Places:

```typescript
// Verifica el nombre antes de gastar créditos de API
const validacion = esNombreLocalValido(local.nombre);
if (!validacion.valido) {
  // No enriquecer, ahorrar costes
  return { success: false, notas: validacion.razon };
}
```

### Importación OSM

Durante la importación desde OpenStreetMap:

```typescript
// Filtra locales antes de importar
const localesValidos = localesOSM.filter(local => 
  esNombreLocalValido(local.nombre).valido
);

// Solo importa los válidos
for (const local of localesValidos) {
  await guardarLocalEnSupabase(local);
}
```

## 💰 Ahorro de Costes

### Antes de la Validación

```
❌ Enriquecer "Farmacia" → 0.017€ gastados → Local rechazado
❌ Enriquecer "Peluquería" → 0.017€ gastados → Local rechazado
❌ Enriquecer "Gimnasio" → 0.017€ gastados → Local rechazado

Total gastado: 0.051€ en locales inválidos
```

### Después de la Validación

```
✅ Validar "Farmacia" → 0€ → Rechazado antes de enriquecer
✅ Validar "Peluquería" → 0€ → Rechazado antes de enriquecer
✅ Validar "Gimnasio" → 0€ → Rechazado antes de enriquecer

Total gastado: 0€
Ahorro: 0.051€ por cada 3 locales inválidos
```

### Ahorro Estimado

Con 1000 locales inválidos:
- **Sin validación**: 1000 × 0.017€ = **17€ gastados**
- **Con validación**: **0€ gastados**
- **Ahorro total**: **17€**

## 🔍 Casos Especiales

### Nombres con Acentos

El sistema normaliza automáticamente los acentos:

```typescript
✅ "Café" → "cafe" → Válido
✅ "Cafetería" → "cafeteria" → Válido
✅ "Coctelería" → "cocteleria" → Válido
```

### Nombres con Mayúsculas/Minúsculas

La validación es case-insensitive:

```typescript
✅ "BAR CENTRAL" → "bar central" → Válido
✅ "Bar Central" → "bar central" → Válido
✅ "bar central" → "bar central" → Válido
```

### Nombres Compuestos

Solo necesita contener UNA palabra clave:

```typescript
✅ "Bar Farmacia" → Contiene "Bar" → Válido
✅ "Restaurante La Farmacia" → Contiene "Restaurante" → Válido
❌ "Farmacia Bar" → Contiene "Bar" → Válido (aunque empiece con Farmacia)
```

## 📝 Logs y Debugging

El sistema genera logs detallados:

```typescript
[NameValidation] ✅ Nombre válido: "Bar Farmacia"
[NameValidation] ❌ Nombre inválido: "Farmacia" - No contiene palabras clave válidas
[ExclusionCheck] ❌ Local excluido por nombre inválido
[ExclusionCheck] Reason: El nombre no contiene ninguna palabra clave válida
```

## 🚀 Próximos Pasos

1. **Revisar locales existentes**
   - Acceder a "Validar Nombres de Locales"
   - Revisar la lista de inválidos
   - Excluir los que no sean válidos

2. **Configurar limpieza automática**
   - El sistema ya valida automáticamente
   - Los nuevos locales se filtran en tiempo real
   - No se gastan créditos en locales inválidos

3. **Monitorear resultados**
   - Revisar "Locales Excluidos" periódicamente
   - Verificar que no se enriquecen locales inválidos
   - Comprobar el ahorro de costes

## ⚠️ Notas Importantes

1. **La validación es automática**: No necesitas hacer nada manualmente, el sistema filtra automáticamente durante:
   - Enriquecimiento con Google Places
   - Importación desde OSM
   - Limpieza automática

2. **Los locales excluidos se pueden restaurar**: Si un local fue excluido por error, puedes restaurarlo desde "Locales Excluidos"

3. **La validación ahorra dinero**: Cada local inválido filtrado ahorra 0.017€ en llamadas a Google Places API

4. **Es case-insensitive y normaliza acentos**: No importa si el nombre está en mayúsculas, minúsculas o tiene acentos

## 📞 Soporte

Si tienes dudas sobre la validación de nombres:

1. Revisa los ejemplos en esta documentación
2. Verifica los logs en la consola
3. Consulta la página de administración "Validar Nombres de Locales"
4. Revisa "Locales Excluidos" para ver los motivos de exclusión
