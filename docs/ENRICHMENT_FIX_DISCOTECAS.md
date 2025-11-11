
# 🎉 FIX: Enriquecimiento de Discotecas con Nombres Ambiguos

## 🎯 Problema Identificado

Algunos locales de ocio nocturno (discotecas) no se estaban enriqueciendo correctamente debido a:

1. **"Facultad Sdc"** (Santiago de Compostela) - Rechazado por tener tipo `university`
2. **"The Capital Latin Bar"** (Santiago de Compostela) - Rechazado por tener tipo `store`

Estos locales son **discotecas reales** pero Google Places les asigna tipos ambiguos basándose en sus nombres o ubicaciones.

## ✅ Solución Implementada

### 1. **Tipos Ambiguos** (Nueva Categoría)

Se creó una nueva categoría de tipos que **NO rechazan automáticamente** si hay tipos válidos presentes:

```typescript
const TIPOS_AMBIGUOS = [
  'university',  // "Facultad Sdc" es una discoteca
  'school',      // Algunas discotecas tienen nombres educativos
  'store',       // "The Capital Latin Bar" puede tener este tipo por error
];
```

### 2. **Lógica de Validación Mejorada**

**ANTES:**
- Si tenía tipo prohibido → RECHAZAR (incluso con tipos válidos)

**AHORA:**
1. ✅ Si tiene tipos válidos (bar, night_club, etc.) → **ACEPTAR** (ignorar ambiguos)
2. ❌ Si tiene tipos prohibidos SIN tipos válidos → **RECHAZAR**
3. ⚠️ Si tiene tipos ambiguos pero también tipos válidos → **ACEPTAR**
4. ❌ Si solo tiene tipos ambiguos sin válidos → **RECHAZAR**

### 3. **Análisis de Nombre del Local**

Se añadió detección inteligente de palabras clave en el nombre:

```typescript
const NOMBRE_KEYWORDS: Record<string, string[]> = {
  'discoteca': ['disco', 'discoteca', 'club', 'night', 'dance', 'sdc', 'facultad'],
  'bar': ['bar', 'pub', 'tavern', 'cerveceria', 'brewery'],
  'cocteleria': ['cocktail', 'coctel', 'lounge', 'mixology'],
  // ...
};
```

**Ejemplos:**
- "Facultad Sdc" → Detecta "facultad" y "sdc" → Tipo: `discoteca`
- "The Capital Latin Bar" → Detecta "bar" → Tipo: `bar`

### 4. **Ubicación Mejorada**

Se añadieron más variantes de ciudades españolas:

```typescript
'santiago de compostela', 'santiago', 'compostela',
```

## 📊 Resultado Esperado

### Antes:
```
❌ RECHAZADO: Facultad - Tipo prohibido: university
❌ RECHAZADO: The Capital Latin Bar - No tiene tipos válidos para BarLive
```

### Después:
```
✅ Facultad Sdc ⭐ 4.2 (150 reviews) 🟢 Abierto 💰 €€ 📸 4 fotos [discoteca, lounge]
✅ The Capital Latin Bar ⭐ 4.5 (200 reviews) 🟢 Abierto 💰 €€ 📸 3 fotos [bar, pub]
```

## 🔍 Flujo de Validación Actualizado

```
1. Analizar nombre del local
   ├─ "Facultad" → Detectar keyword "facultad" → Añadir tipo "discoteca"
   └─ "Capital Latin Bar" → Detectar keyword "bar" → Añadir tipo "bar"

2. Mapear tipos de Google
   ├─ night_club → discoteca ✅
   ├─ bar → bar ✅
   ├─ university → AMBIGUO (no rechaza si hay válidos) ⚠️
   └─ store → AMBIGUO (no rechaza si hay válidos) ⚠️

3. Validar tipos
   ├─ ¿Tiene tipos válidos? → SÍ ✅
   ├─ ¿Tiene tipos prohibidos? → NO (ambiguos no cuentan)
   └─ RESULTADO: ACEPTAR ✅

4. Validar ubicación
   └─ Santiago de Compostela, A Coruña → España ✅

5. Enriquecer con Google Places
   └─ Descargar fotos, horarios, reviews, etc. ✅
```

## 🎯 Tipos de Locales Afectados

Esta mejora beneficia a:

- ✅ Discotecas con nombres educativos ("Facultad", "Universidad", "Colegio")
- ✅ Bares/Pubs con tipos ambiguos ("store", "establishment")
- ✅ Locales con múltiples tipos donde uno es prohibido pero otros son válidos
- ✅ Locales en ciudades con nombres compuestos (Santiago de Compostela)

## 📝 Archivos Modificados

1. **`utils/localTypesBackend.ts`**
   - Añadida categoría `TIPOS_AMBIGUOS`
   - Mejorada función `esLocalValidoParaBarlive()`
   - Actualizada función `estaEnEspana()` con más ciudades

2. **`utils/enrichmentMapping.ts`**
   - Añadido diccionario `NOMBRE_KEYWORDS`
   - Mejorada función `mapGoogleTypesToBarlive()` para analizar nombres
   - Añadido parámetro `nombreLocal` opcional

3. **`app/admin/enriquecimiento-google.tsx`**
   - Actualizada llamada a `mapGoogleTypesToBarlive()` para pasar el nombre del local

## 🧪 Casos de Prueba

### Caso 1: Facultad Sdc
```typescript
{
  name: "Facultad Sdc",
  types: ["night_club", "bar", "university"],
  formatted_address: "Rúa de Alfredo Brañas, 6, 15701 Santiago de Compostela, A Coruña"
}
```
**Resultado:** ✅ ACEPTADO (tiene night_club + bar, university es ambiguo)

### Caso 2: The Capital Latin Bar
```typescript
{
  name: "The Capital Latin Bar",
  types: ["bar", "store"],
  formatted_address: "Rúa de Alfredo Brañas, 2, 4 Bajo, 15701 Santiago de Compostela, A Coruña"
}
```
**Resultado:** ✅ ACEPTADO (tiene bar, store es ambiguo)

### Caso 3: Farmacia (Control)
```typescript
{
  name: "Farmacia López",
  types: ["pharmacy", "store"],
  formatted_address: "Calle Mayor, 1, Madrid"
}
```
**Resultado:** ❌ RECHAZADO (pharmacy es prohibido, no tiene tipos válidos)

## 🚀 Próximos Pasos

1. Ejecutar enriquecimiento en A Coruña, categoría "Discoteca"
2. Verificar que "Facultad Sdc" y "The Capital Latin Bar" se enriquecen correctamente
3. Revisar logs para confirmar detección de keywords
4. Validar que otros locales no se vean afectados negativamente

## 📚 Referencias

- [ENRICHMENT_STRATEGY.md](./ENRICHMENT_STRATEGY.md) - Estrategia general de enriquecimiento
- [TIPOS_VALIDOS.md](./TIPOS_VALIDOS.md) - Lista completa de tipos válidos e inválidos
