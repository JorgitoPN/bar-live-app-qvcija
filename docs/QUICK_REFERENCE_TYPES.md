
# 🚀 Guía Rápida: Tipos Válidos para BarLive

## ✅ Tipos que SE ACEPTAN

### 🍽️ Restauración
```
restaurant, cafe, coffee_shop, bakery, meal_takeaway, 
meal_delivery, food, fast_food, pizza_restaurant, 
hamburger_restaurant
```

### 🍺 Bares
```
bar, pub, cocktail_bar, wine_bar, sports_bar, 
tapas_bar, beer_garden, brewery, winery, tavern
```

### 💃 Ocio Nocturno
```
night_club, dance_club, disco, nightclub, dance_hall
```

### 🎵 Entretenimiento
```
concert_hall, music_venue, amphitheatre
```

### 🛋️ Lounges
```
lounge, cocktail_lounge, rooftop_bar
```

## ❌ Tipos que SE RECHAZAN

### 🏪 Tiendas
```
store, shop, supermarket, convenience_store, 
shopping_mall, grocery_store
```

### 💊 Salud
```
pharmacy, hospital, doctor, dentist, clinic
```

### 🏦 Finanzas
```
bank, atm, insurance_agency
```

### ⛽ Automoción
```
gas_station, car_repair, car_wash, car_rental
```

### 🏨 Alojamiento
```
lodging, hotel, motel, campground
```

### 💪 Gimnasios y Belleza
```
gym, spa, beauty_salon, hair_care
```

## 🔍 Validación Completa

Un local se acepta si cumple **TODAS** estas condiciones:

1. ✅ Tiene al menos **1 tipo válido**
2. ✅ `business_status` es `OPERATIONAL` o `OPEN`
3. ✅ Está ubicado en **España**
4. ❌ NO tiene tipos prohibidos (o los tiene pero también tiene tipos válidos)

## 📊 Ejemplos Prácticos

### ✅ ACEPTADO
```json
{
  "name": "Facultad Sdc",
  "types": ["night_club", "bar", "university"],
  "business_status": "OPERATIONAL",
  "formatted_address": "Santiago de Compostela, España"
}
```
**Razón**: Tiene `night_club` y `bar` (tipos válidos), aunque también tenga `university`

### ✅ ACEPTADO
```json
{
  "name": "The Capital Latin Bar",
  "types": ["bar", "night_club", "store"],
  "business_status": "OPERATIONAL",
  "formatted_address": "Santiago de Compostela, España"
}
```
**Razón**: Tiene `bar` y `night_club` (tipos válidos), aunque también tenga `store`

### ❌ RECHAZADO
```json
{
  "name": "Farmacia Central",
  "types": ["pharmacy", "store"],
  "business_status": "OPERATIONAL",
  "formatted_address": "Madrid, España"
}
```
**Razón**: Solo tiene tipos prohibidos (`pharmacy`, `store`)

### ❌ RECHAZADO
```json
{
  "name": "Bar Cerrado",
  "types": ["bar", "pub"],
  "business_status": "CLOSED_PERMANENTLY",
  "formatted_address": "Barcelona, España"
}
```
**Razón**: Está cerrado permanentemente

## 🎯 Casos Especiales

### Tipos Ambiguos (NO se rechazan automáticamente)
- `university` - Puede ser una discoteca con nombre educativo
- `school` - Puede ser una discoteca con nombre educativo

Estos tipos se aceptan si el local también tiene tipos válidos.

### Tipos Genéricos (Se ignoran)
- `establishment`
- `point_of_interest`
- `premise`
- `tourist_attraction`

Estos tipos no se consideran en la validación.

## 💡 Consejos

1. **Siempre verifica los logs** durante el enriquecimiento para ver qué locales se aceptan/rechazan
2. **Copia los logs** usando el botón "Copiar" en la pantalla de enriquecimiento
3. **Revisa los locales rechazados** en la base de datos (campo `notas_rechazo`)
4. **Ajusta los tipos** si encuentras casos especiales que no se están manejando correctamente

## 🔗 Más Información

- [Documentación completa de actualización](./TYPE_VALIDATION_UPDATE.md)
- [Estrategia de enriquecimiento](./ENRICHMENT_STRATEGY.md)
- [Configuración de Supabase Storage](./SUPABASE_STORAGE_SETUP.md)
