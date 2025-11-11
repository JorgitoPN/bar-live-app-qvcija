
# 📋 Actualización del Sistema de Validación de Tipos

## 🎯 Objetivo

Actualizar el sistema de validación de tipos para usar la lista oficial de tipos de Google Places API, asegurando que solo se enriquezcan locales relevantes para BarLive (restauración, bares y ocio nocturno).

## ✅ Tipos Válidos Actualizados

### Restauración y Comida (Food & Drink)
- `restaurant` - Restaurante general
- `cafe` - Cafetería
- `coffee_shop` - Tienda de café
- `bakery` - Panadería
- `meal_takeaway` - Comida para llevar
- `meal_delivery` - Entrega de comida
- `food` - Comida general
- `fast_food` - Comida rápida
- `pizza_restaurant` - Pizzería
- `hamburger_restaurant` - Hamburguesería

### Bares y Copas (Food & Drink / Nightlife)
- `bar` - Bar general
- `pub` - Pub/Taberna
- `cocktail_bar` - Bar de cócteles
- `wine_bar` - Bar de vinos
- `sports_bar` - Bar deportivo
- `tapas_bar` - Bar de tapas
- `beer_garden` - Cervecería al aire libre
- `brewery` - Cervecería
- `winery` - Bodega
- `tavern` - Taberna

### Ocio Nocturno (Nightlife)
- `night_club` - Discoteca/Club nocturno
- `dance_club` - Club de baile
- `disco` - Discoteca
- `nightclub` - Club nocturno
- `dance_hall` - Sala de baile
- `pub` - Pub (también en nightlife)

### Entretenimiento (Entertainment)
- `concert_hall` - Sala de conciertos
- `music_venue` - Lugar de música
- `amphitheatre` - Anfiteatro

### Lounges y Coctelerías
- `lounge` - Lounge
- `cocktail_lounge` - Lounge de cócteles
- `rooftop_bar` - Bar en azotea

## ❌ Tipos Prohibidos

Los siguientes tipos se rechazan automáticamente:

### Tiendas y Comercios
- `store`, `shop`, `supermarket`, `convenience_store`
- `clothing_store`, `shoe_store`, `electronics_store`
- `shopping_mall`, `grocery_store`, etc.

### Servicios de Salud
- `pharmacy`, `hospital`, `doctor`, `dentist`
- `clinic`, `medical_lab`, `dental_clinic`

### Servicios Financieros
- `bank`, `atm`, `insurance_agency`

### Automoción
- `gas_station`, `car_repair`, `car_wash`, `car_rental`

### Alojamiento
- `lodging`, `hotel`, `motel`, `campground`

### Gimnasios y Belleza
- `gym`, `spa`, `beauty_salon`, `hair_care`

### Otros
- `church`, `school`, `library`, `parking`, etc.

## 🔍 Lógica de Validación

### Paso 1: Verificar business_status
```javascript
// Solo aceptar locales operativos
if (business_status === 'OPERATIONAL' || business_status === 'OPEN') {
  // ✅ Continuar validación
}

// Rechazar locales cerrados
if (business_status === 'CLOSED_PERMANENTLY' || business_status === 'CLOSED_TEMPORARILY') {
  // ❌ Rechazar
}
```

### Paso 2: Verificar tipos válidos
```javascript
// Si tiene al menos un tipo válido → ACEPTAR
const tiposValidos = types.filter(t => TIPOS_VALIDOS.includes(t));
if (tiposValidos.length > 0) {
  // ✅ Local válido
}
```

### Paso 3: Verificar tipos prohibidos
```javascript
// Si NO tiene tipos válidos pero SÍ tiene tipos prohibidos → RECHAZAR
const tiposProhibidos = types.filter(t => TIPOS_PROHIBIDOS.includes(t));
if (tiposProhibidos.length > 0 && tiposValidos.length === 0) {
  // ❌ Rechazar
}
```

### Paso 4: Verificar ubicación
```javascript
// Debe estar en España
if (!estaEnEspana(formatted_address, plus_code)) {
  // ❌ Rechazar
}
```

## 🎯 Casos Especiales

### Tipos Ambiguos
Algunos tipos como `university` o `school` NO se rechazan automáticamente porque pueden ser discotecas con nombres engañosos:

- **Facultad Sdc** (Rúa de Alfredo Brañas, 6, Santiago de Compostela) → Es una discoteca
- **The Capital Latin Bar** (Rúa de Alfredo Brañas, 2, Santiago de Compostela) → Es un bar/discoteca

Estos locales se aceptan si tienen al menos un tipo válido adicional.

### Tipos Genéricos
Los siguientes tipos se ignoran en la validación porque son demasiado genéricos:
- `establishment`
- `point_of_interest`
- `premise`
- `tourist_attraction`

## 📊 Flujo de Enriquecimiento

```
1. Importar locales desde OSM
   ↓
2. Buscar en Google Places
   ↓
3. Obtener detalles completos
   ↓
4. VALIDAR TIPOS ✅
   ├─ ✅ Tiene tipos válidos → Continuar
   └─ ❌ No tiene tipos válidos → Rechazar
   ↓
5. VALIDAR BUSINESS_STATUS ✅
   ├─ ✅ OPERATIONAL/OPEN → Continuar
   └─ ❌ CLOSED → Rechazar
   ↓
6. VALIDAR UBICACIÓN ✅
   ├─ ✅ En España → Continuar
   └─ ❌ Fuera de España → Rechazar
   ↓
7. Descargar fotos y subir a Supabase
   ↓
8. Guardar en base de datos
   ├─ enriquecido: true
   ├─ activo: true
   └─ notas_rechazo: null
```

## 🔧 Archivos Modificados

### `utils/localTypesBackend.ts`
- ✅ Actualizada lista de `TIPOS_VALIDOS` con nuevos tipos de Google Places
- ✅ Mejorada validación de `business_status`
- ✅ Añadidos tipos de entretenimiento (`concert_hall`, `music_venue`, `amphitheatre`)
- ✅ Añadidos tipos de comida rápida (`pizza_restaurant`, `hamburger_restaurant`)

### `utils/enrichmentMapping.ts`
- ✅ Actualizado mapeo de tipos de Google a tipos de BarLive
- ✅ Añadido soporte para nuevos tipos (`dance_hall`, `concert_hall`, `music_venue`)
- ✅ Mejorada categorización por horarios

## 📈 Estadísticas Esperadas

Con la nueva validación, se espera:

- **Más locales aceptados**: Los nuevos tipos (`concert_hall`, `music_venue`, etc.) permitirán enriquecer más locales relevantes
- **Menos falsos negativos**: Locales como "Facultad Sdc" y "The Capital Latin Bar" ahora se aceptarán correctamente
- **Mejor precisión**: La validación de `business_status` asegura que solo se enriquezcan locales operativos

## 🚀 Próximos Pasos

1. **Probar la validación** con los locales problemáticos mencionados:
   - Facultad Sdc (Santiago de Compostela)
   - The Capital Latin Bar (Santiago de Compostela)

2. **Monitorear logs** para verificar que los locales se aceptan correctamente

3. **Ajustar tipos** si se detectan más casos especiales

## 📝 Notas Importantes

- Los locales rechazados se marcan en la base de datos con `activo: false` y `notas_rechazo` con el motivo
- Las fotos se descargan de Google Places y se suben a Supabase Storage
- El bucket `locales` debe existir en Supabase Storage antes de iniciar el enriquecimiento
- Cada enriquecimiento hace 2 llamadas a la API de Google (búsqueda + detalles) + hasta 4 llamadas para fotos

## 🔗 Referencias

- [Google Places API - Place Types](https://developers.google.com/maps/documentation/places/web-service/supported_types)
- [Supabase Storage Setup](./SUPABASE_STORAGE_SETUP.md)
- [Enrichment Strategy](./ENRICHMENT_STRATEGY.md)
