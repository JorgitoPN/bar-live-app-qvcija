
# 🧠 Sistema de Validaciones y Categorización Inteligente

Este documento explica el sistema de validaciones inteligentes, mapeo de tipos y categorización por horarios implementado en BarLive.

## 📋 Tabla de Contenidos

1. [Validaciones Inteligentes](#validaciones-inteligentes)
2. [Mapeo de Tipos](#mapeo-de-tipos)
3. [Categorización por Horarios](#categorización-por-horarios)
4. [Ejemplos Reales](#ejemplos-reales)

---

## 🛡️ Validaciones Inteligentes

### Filtros para Evitar Basura

El sistema implementa múltiples capas de validación para asegurar que solo se importen locales de ocio y hostelería válidos.

### 1️⃣ Tipos Prohibidos (120+ tipos)

```typescript
const TIPOS_PROHIBIDOS = [
  // Salud y medicina
  'photographer', 'beauty_salon', 'hospital', 'dentist',
  'pharmacy', 'veterinary_care', 'health',
  
  // Servicios financieros
  'bank', 'atm', 'insurance_agency', 'lawyer',
  
  // Educación
  'school', 'university', 'library',
  
  // Religión
  'church', 'mosque', 'synagogue', 'cemetery',
  
  // Alojamiento
  'hotel', 'lodging', 'campground',
  
  // Comercio general
  'supermarket', 'convenience_store', 'shopping_mall',
  'clothing_store', 'electronics_store',
  
  // Servicios automotrices
  'gas_station', 'car_repair', 'car_dealer', 'parking',
  
  // Servicios públicos
  'post_office', 'police', 'fire_station',
  
  // Gimnasios y deportes
  'gym', 'stadium', 'bowling_alley',
  
  // ... y muchos más
];
```

### 2️⃣ Palabras Prohibidas en Nombres

```typescript
const PALABRAS_PROHIBIDAS = [
  'fotograf', 'peluquer', 'gimnasio', 'hospital',
  'hotel', 'supermercado', 'farmacia', 'taller',
  'lavanderia', 'cerrajeria', 'escuela', 'iglesia',
  // ... y más
];
```

### 3️⃣ Validación Completa

```typescript
function esLocalValido(place) {
  const types = place.types || [];
  const nombre = place.name.toLowerCase();
  const direccion = place.formatted_address.toLowerCase();
  
  // 1. Verificar que esté en España
  if (!direccion.includes('españa') && !direccion.includes('spain')) {
    return { valido: false, razon: 'Fuera de España' };
  }
  
  // 2. Verificar tipos prohibidos
  if (types.some(t => TIPOS_PROHIBIDOS.includes(t))) {
    return { valido: false, razon: 'Tipo prohibido' };
  }
  
  // 3. Verificar palabras prohibidas en nombre
  if (PALABRAS_PROHIBIDAS.some(p => nombre.includes(p))) {
    return { valido: false, razon: 'Nombre indica negocio no válido' };
  }
  
  // 4. Verificar que tenga tipos válidos de hostelería
  const tiposValidos = ['bar', 'restaurant', 'cafe', 'night_club', 'pub'];
  if (!types.some(t => tiposValidos.includes(t))) {
    return { valido: false, razon: 'Sin tipos válidos de hostelería' };
  }
  
  return { valido: true };
}
```

---

## 🗺️ Mapeo Inteligente de Tipos

### Google Types → BarLive Types

```typescript
const GOOGLE_TO_BARLIVE_TYPES = {
  'bar': ['bar'],
  'night_club': ['discoteca'],
  'restaurant': ['restaurante'],
  'cafe': ['cafe'],
  'pub': ['pub', 'bar'],
  'cocktail_bar': ['cocteleria', 'bar'],
  'wine_bar': ['cocteleria', 'bar'],
  'beer_garden': ['terraza', 'pub'],
  'lounge': ['lounge'],
  'rooftop_bar': ['rooftop', 'bar']
};
```

### Ejemplo de Mapeo

**Entrada (Google):**
```json
{
  "types": ["bar", "night_club", "restaurant"]
}
```

**Salida (BarLive):**
```json
{
  "barlive_types": ["bar", "discoteca", "restaurante"]
}
```

---

## ⏰ Categorización por Horarios

El sistema analiza los horarios de apertura y cierre para categorizar inteligentemente el tipo de local.

### Reglas de Categorización

#### 1️⃣ Cafés
- **Apertura:** 05:00 - 10:00
- **Cierre:** ≤ 02:00
- **Categoría:** `['cafe', 'bar']`

```typescript
if (aperturaMedia >= 5 && aperturaMedia <= 10 && cierreMedia <= 2) {
  return ['cafe', 'bar'];
}
```

#### 2️⃣ Restaurantes
- **Apertura:** 08:00 - 14:00
- **Cierre:** ≤ 03:00
- **Categoría:** `['restaurante', 'bar']`

```typescript
if (aperturaMedia >= 8 && aperturaMedia <= 14 && cierreMedia <= 3) {
  return ['restaurante', 'bar'];
}
```

#### 3️⃣ Pubs/Coctelerías
- **Apertura:** 16:00 - 22:00
- **Cierre:** 03:00 - 05:00
- **Categoría:** `['pub', 'cocteleria', 'lounge']`

```typescript
if (aperturaMedia >= 16 && aperturaMedia <= 22 && 
    cierreMedia >= 3 && cierreMedia <= 5) {
  return ['pub', 'cocteleria', 'lounge'];
}
```

#### 4️⃣ Discotecas
- **Apertura:** 20:00 - 00:00 (o medianoche)
- **Cierre:** 04:00 - 06:30
- **Categoría:** `['discoteca', 'lounge', 'beach_club']`

```typescript
if ((aperturaMedia >= 20 || aperturaMedia === 0) && 
    cierreMedia >= 4 && cierreMedia <= 7) {
  return ['discoteca', 'lounge', 'beach_club'];
}
```

---

## 🎯 Ejemplos Reales

### Ejemplo 1: Kapital Madrid (Discoteca)

**Datos de entrada:**
```json
{
  "name": "Kapital Madrid",
  "types": ["night_club", "bar"],
  "opening_hours": {
    "weekday_text": [
      "lunes: Cerrado",
      "martes: Cerrado",
      "miércoles: Cerrado",
      "jueves: 00:00–06:00",
      "viernes: 00:00–06:00",
      "sábado: 00:00–06:00",
      "domingo: Cerrado"
    ]
  }
}
```

**Proceso:**

1. **Validación:** ✅ Pasa (tipos válidos, en España)
2. **Mapeo inicial:** `['discoteca', 'bar']`
3. **Análisis de horarios:**
   - Apertura media: 00:00 (medianoche)
   - Cierre media: 06:00 (madrugada)
   - Patrón detectado: DISCOTECA
4. **Categorización final:** `['discoteca', 'lounge']`

**Resultado:**
```json
{
  "barlive_types": ["discoteca", "lounge"],
  "categoria_detectada": "Discoteca (por horarios nocturnos)"
}
```

---

### Ejemplo 2: Café Central (Café)

**Datos de entrada:**
```json
{
  "name": "Café Central",
  "types": ["cafe", "bar"],
  "opening_hours": {
    "weekday_text": [
      "lunes: 07:00–22:00",
      "martes: 07:00–22:00",
      "miércoles: 07:00–22:00",
      "jueves: 07:00–22:00",
      "viernes: 07:00–00:00",
      "sábado: 08:00–00:00",
      "domingo: 08:00–22:00"
    ]
  }
}
```

**Proceso:**

1. **Validación:** ✅ Pasa
2. **Mapeo inicial:** `['cafe']`
3. **Análisis de horarios:**
   - Apertura media: 07:20
   - Cierre media: 22:30
   - Patrón detectado: CAFÉ
4. **Categorización final:** `['cafe', 'bar']`

**Resultado:**
```json
{
  "barlive_types": ["cafe", "bar"],
  "categoria_detectada": "Café (abre temprano, cierra temprano)"
}
```

---

### Ejemplo 3: La Catrina (Pub/Coctelería)

**Datos de entrada:**
```json
{
  "name": "La Catrina",
  "types": ["bar", "cocktail_bar"],
  "opening_hours": {
    "weekday_text": [
      "lunes: Cerrado",
      "martes: Cerrado",
      "miércoles: 18:00–03:00",
      "jueves: 18:00–03:00",
      "viernes: 18:00–04:00",
      "sábado: 18:00–04:00",
      "domingo: Cerrado"
    ]
  }
}
```

**Proceso:**

1. **Validación:** ✅ Pasa
2. **Mapeo inicial:** `['bar', 'cocteleria']`
3. **Análisis de horarios:**
   - Apertura media: 18:00
   - Cierre media: 03:30
   - Patrón detectado: PUB/COCTELERÍA
4. **Categorización final:** `['bar', 'cocteleria', 'pub', 'lounge']`

**Resultado:**
```json
{
  "barlive_types": ["bar", "cocteleria", "pub", "lounge"],
  "categoria_detectada": "Pub/Coctelería (horario nocturno)"
}
```

---

### Ejemplo 4: Rechazado - Peluquería

**Datos de entrada:**
```json
{
  "name": "Peluquería Moderna",
  "types": ["beauty_salon", "hair_care"],
  "formatted_address": "Calle Mayor 10, Madrid, España"
}
```

**Proceso:**

1. **Validación:** ❌ Falla
   - Razón: Palabra prohibida en nombre ("peluquer")
   - Tipo prohibido: "beauty_salon"

**Resultado:**
```json
{
  "success": false,
  "razon": "Nombre indica negocio no válido: peluquer"
}
```

---

### Ejemplo 5: Rechazado - Hotel con Restaurante

**Datos de entrada:**
```json
{
  "name": "Hotel Ritz Restaurant",
  "types": ["hotel", "restaurant", "lodging"],
  "formatted_address": "Plaza de la Lealtad, Madrid, España"
}
```

**Proceso:**

1. **Validación:** ❌ Falla
   - Razón: Tipo prohibido ("hotel")
   - Aunque tiene "restaurant", el tipo "hotel" lo descalifica

**Resultado:**
```json
{
  "success": false,
  "razon": "Tipo prohibido: hotel"
}
```

---

## 📊 Estadísticas de Validación

En un lote típico de 100 locales:

- ✅ **Válidos:** 65-75 locales
  - Bares: 30%
  - Restaurantes: 25%
  - Cafés: 15%
  - Discotecas: 10%
  - Pubs/Coctelerías: 20%

- ❌ **Rechazados:** 25-35 locales
  - Tipos prohibidos: 60%
  - Palabras prohibidas: 25%
  - Fuera de España: 10%
  - Sin tipos válidos: 5%

---

## 🔧 Configuración

### Ajustar Tolerancia de Horarios

Si necesitas ajustar las reglas de categorización por horarios:

```typescript
// En enrichmentMapping.ts

// Ejemplo: Hacer más estricta la detección de discotecas
if ((aperturaMedia >= 22 || aperturaMedia === 0) && // Cambiar de 20 a 22
    cierreMedia >= 5 && cierreMedia <= 7) { // Cambiar de 4 a 5
  return ['discoteca', 'lounge', 'beach_club'];
}
```

### Añadir Nuevos Tipos Prohibidos

```typescript
// En enrichmentValidation.ts

const TIPOS_PROHIBIDOS = [
  // ... tipos existentes
  'nuevo_tipo_prohibido',
  'otro_tipo_prohibido',
];
```

### Añadir Nuevas Palabras Prohibidas

```typescript
// En enrichmentValidation.ts

const PALABRAS_PROHIBIDAS = [
  // ... palabras existentes
  'nueva_palabra',
  'otra_palabra',
];
```

---

## 🎓 Mejores Prácticas

1. **Revisar logs:** Los logs detallados muestran cada paso del proceso de validación y categorización.

2. **Ajustar tolerancias:** Si recibes muchos falsos positivos/negativos, ajusta las reglas de horarios.

3. **Monitorear rechazos:** Revisa periódicamente los locales rechazados para identificar patrones.

4. **Actualizar listas:** Mantén actualizadas las listas de tipos y palabras prohibidas.

5. **Validar distancias:** Usa la validación de distancia para asegurar que el resultado de Google coincide con OSM.

---

## 📝 Notas Técnicas

- El sistema procesa horarios en formato 24h y 12h (AM/PM)
- Los horarios que cruzan medianoche se manejan correctamente
- La categorización por horarios es complementaria al mapeo de tipos
- Los tipos base nunca se eliminan, solo se añaden nuevos tipos
- La validación de España es case-insensitive y acepta "España" o "Spain"

---

## 🚀 Próximas Mejoras

- [ ] Machine Learning para mejorar la categorización
- [ ] Análisis de reviews para detectar tipo de local
- [ ] Validación de fotos (detectar si son de comida, bebidas, ambiente)
- [ ] Integración con datos de redes sociales
- [ ] Sistema de puntuación de confianza (0-100%)
