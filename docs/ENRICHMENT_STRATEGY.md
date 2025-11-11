
# 🎯 ESTRATEGIA DE ENRIQUECIMIENTO GRATUITO EN BARLIVE

## 📋 RESUMEN EJECUTIVO

BarLive utiliza una estrategia de dos fuentes para construir su catálogo de locales:

1. **OpenStreetMap (OSM)** - 100% GRATIS para importación masiva
2. **Google Places API** - DE PAGO para enriquecimiento selectivo

## 🔄 FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: IMPORTACIÓN OSM (GRATIS)                           │
├─────────────────────────────────────────────────────────────┤
│ • Importar 50,000+ locales de España                       │
│ • Datos básicos: nombre, dirección, coordenadas            │
│ • Coste: $0                                                 │
│ • Estado: activo = false, enriquecido = false              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: FILTRADO PRE-ENRIQUECIMIENTO                       │
├─────────────────────────────────────────────────────────────┤
│ ✅ Solo locales con tipo válido (bar, restaurante, etc.)   │
│ ✅ Solo ciudades > 5,000 habitantes                         │
│ ✅ Priorizar zonas urbanas (Madrid, Barcelona, Valencia)   │
│ ❌ Descartar zonas rurales                                  │
│ ❌ Descartar tipos prohibidos                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: ENRIQUECIMIENTO GOOGLE PLACES (SELECTIVO)          │
├─────────────────────────────────────────────────────────────┤
│ • Solo locales filtrados (candidatos)                      │
│ • Obtener: fotos, horarios, reviews, estado                │
│ • Coste: $0.017 por local (una vez)                        │
│ • Límite mensual: 1,000 locales                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 4: VALIDACIÓN POST-GOOGLE                             │
├─────────────────────────────────────────────────────────────┤
│ ✅ Verificar tipos válidos (prioridad sobre prohibidos)    │
│ ✅ Verificar ubicación en España                            │
│ ✅ Verificar estado operativo                               │
│ ❌ Rechazar si cerrado permanentemente                      │
│ ❌ Rechazar si tipos prohibidos son mayoría                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ FASE 5: PUBLICACIÓN                                         │
├─────────────────────────────────────────────────────────────┤
│ • Marcar como enriquecido = true                           │
│ • Activar local: activo = true                             │
│ • Descargar y subir fotos a Supabase Storage               │
│ • Local visible en la app                                  │
└─────────────────────────────────────────────────────────────┘
```

## ✅ TIPOS VÁLIDOS

Locales que SÍ se aceptan en BarLive:

### Bares y Copas
- `bar`, `pub`, `tavern`, `tapas_bar`, `sports_bar`
- `cocktail_bar`, `wine_bar`, `beer_garden`
- `brewery`, `winery`

### Restauración
- `restaurant`, `cafe`, `coffee_shop`
- `bakery`, `meal_takeaway`, `meal_delivery`
- `fast_food_restaurant`, `food`

### Ocio Nocturno
- `night_club`, `dance_club`, `disco`, `nightclub`

### Lounges y Coctelerías
- `lounge`, `cocktail_lounge`, `rooftop_bar`

## ❌ TIPOS PROHIBIDOS

Locales que NO se aceptan en BarLive:

### Belleza y Salud
- `beauty_salon`, `hair_care`, `spa`, `gym`
- `nail_salon`, `massage`, `tattoo_shop`, `barber_shop`

### Tiendas
- `store`, `clothing_store`, `shoe_store`
- `hardware_store`, `furniture_store`, `electronics_store`
- `supermarket`, `grocery_store`, `convenience_store`

### Servicios Financieros
- `bank`, `atm`, `insurance_agency`, `accounting`
- `real_estate_agency`

### Salud
- `pharmacy`, `hospital`, `doctor`, `dentist`
- `veterinary_care`

### Automoción
- `car_repair`, `gas_station`, `car_wash`, `car_dealer`

### Alojamiento
- `lodging`, `hotel`, `motel`, `campground`

### Educación
- `school`, `university`, `library`

### Religión
- `church`, `mosque`, `synagogue`

### Administración
- `police`, `fire_station`, `city_hall`, `courthouse`

## 🔍 LÓGICA DE VALIDACIÓN MEJORADA

### Priorización de Tipos Válidos

La nueva lógica de validación prioriza los tipos válidos sobre los prohibidos:

```typescript
// ANTES (demasiado estricto):
if (tieneAlgunTipoProhibido(types)) {
  return { valido: false }; // ❌ Rechazaba inmediatamente
}

// AHORA (más inteligente):
if (tieneAlgunTipoValido(types)) {
  // ✅ Tiene tipos válidos
  
  if (tieneAlgunTipoProhibido(types)) {
    // ⚠️ También tiene tipos prohibidos
    
    const ratioValidos = tiposValidos.length / tiposRelevantes.length;
    
    if (ratioValidos >= 0.5) {
      // ✅ Los tipos válidos son mayoría (≥50%)
      return { valido: true };
    } else {
      // ❌ Los tipos prohibidos son mayoría
      return { valido: false };
    }
  }
  
  // ✅ Solo tiene tipos válidos
  return { valido: true };
}
```

### Filtrado de Tipos Genéricos

Los siguientes tipos se ignoran en la validación por ser demasiado genéricos:

- `establishment`
- `point_of_interest`
- `premise`
- `tourist_attraction`

### Ejemplo de Validación

**Caso 1: Discoteca con tipos mixtos**
```
Types: ['night_club', 'bar', 'establishment', 'point_of_interest']
Tipos relevantes: ['night_club', 'bar']
Tipos válidos: ['night_club', 'bar']
Tipos prohibidos: []
Ratio válidos: 2/2 = 100%
Resultado: ✅ VÁLIDO
```

**Caso 2: Local con tipos mixtos (válidos mayoría)**
```
Types: ['bar', 'restaurant', 'store', 'establishment']
Tipos relevantes: ['bar', 'restaurant', 'store']
Tipos válidos: ['bar', 'restaurant']
Tipos prohibidos: ['store']
Ratio válidos: 2/3 = 66%
Resultado: ✅ VÁLIDO (mayoría válidos)
```

**Caso 3: Tienda con tipo bar secundario**
```
Types: ['clothing_store', 'store', 'bar', 'establishment']
Tipos relevantes: ['clothing_store', 'store', 'bar']
Tipos válidos: ['bar']
Tipos prohibidos: ['clothing_store', 'store']
Ratio válidos: 1/3 = 33%
Resultado: ❌ RECHAZADO (mayoría prohibidos)
```

## 💸 CONTROL DE COSTES

### Configuración de Límites

```typescript
interface ConfiguracionAPIs {
  google_places_contador_mes: number;
  limite_mensual_places: number;
  google_places_activa: boolean;
  pausar_automaticamente: boolean;
}
```

### Verificación Antes de Enriquecer

```typescript
const config = await supabase
  .from('configuracion_apis')
  .select('*')
  .single();

if (config.google_places_contador_mes >= config.limite_mensual_places) {
  throw new Error('Límite mensual alcanzado');
}
```

### Estimación de Costes

```typescript
// Cada enriquecimiento hace:
// - 1 llamada de búsqueda (Text Search)
// - 1 llamada de detalles (Place Details)
// - 4 llamadas de fotos (máximo)
// Total: 6 llamadas × $0.017 = $0.102 por local

const costeEstimado = numLocales * 6 * 0.017;
```

## 📸 ALMACENAMIENTO DE FOTOS

### Estrategia

1. **Descargar** fotos de Google Places API
2. **Subir** a Supabase Storage (bucket `locales`)
3. **Guardar** URLs de Supabase en la base de datos
4. **Eliminar** dependencia de Google Places API para visualización

### Ventajas

- ✅ Sin llamadas continuas a Google Places API
- ✅ Control total sobre las imágenes
- ✅ Mayor rendimiento
- ✅ Menor coste a largo plazo

### Implementación

```typescript
// Descargar y subir fotos
const galeriaUrls = await descargarYSubirFotosLocal(
  localId,
  placeDetails,
  4 // máximo 4 fotos
);

// Guardar en base de datos
await supabase
  .from('locales')
  .update({
    imagen_url: galeriaUrls[0],
    galeria_urls: galeriaUrls,
    fotos_google: metadatos, // referencia
  })
  .eq('id', localId);
```

## 📊 ESTADÍSTICAS Y MÉTRICAS

### Por Provincia

- Total locales OSM importados
- Locales enriquecidos con Google
- Locales pendientes de enriquecer
- Locales rechazados (con motivo)

### Por Categoría

- Bar, Pub, Discoteca, Café, Restaurante, etc.
- Distribución por tipo
- Tasa de éxito de enriquecimiento

### Costes

- Llamadas API realizadas este mes
- Coste acumulado
- Límite mensual restante

## 🎯 CRITERIOS DE DESCARTE

### Fase OSM (Importación)

❌ Amenity no es bar/restaurante/cafe
❌ Sin nombre o nombre < 3 caracteres
❌ Sin coordenadas

### Fase Pre-Google (Filtrado)

❌ Sin provincia/coordenadas
❌ Población < 5,000 habitantes
❌ Zona rural
❌ Tipo no válido para BarLive

### Fase Post-Google (Validación)

❌ Sin horarios ni teléfono
❌ Tipos prohibidos son mayoría (>50%)
❌ Marcado como cerrado permanentemente
❌ Fuera de España

## 🚀 MEJORES PRÁCTICAS

### 1. Importar Primero, Enriquecer Después

```bash
1. Importar 50,000 locales de OSM (gratis)
2. Filtrar candidatos (solo válidos)
3. Enriquecer 1,000 locales/mes con Google
```

### 2. Priorizar Zonas Urbanas

```typescript
const prioridad = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla'];
```

### 3. Enriquecer en Lotes

```typescript
const localesPorLote = 25; // Procesar 25 a la vez
```

### 4. Monitorear Costes

```typescript
// Verificar límite antes de cada lote
if (contador + localesPorLote > limite) {
  Alert.alert('Límite alcanzado');
  return;
}
```

### 5. Validar Resultados

```typescript
// Revisar logs después de cada enriquecimiento
// Ajustar filtros según resultados
```

## 📈 RESULTADOS ESPERADOS

### Cobertura

- **50,000+** locales importados de OSM (gratis)
- **1,000** locales enriquecidos/mes con Google
- **12,000** locales enriquecidos/año

### Calidad

- **>90%** de locales válidos después de filtrado
- **<10%** de rechazos post-Google
- **100%** de locales con fotos en Supabase

### Costes

- **$0** para importación OSM
- **~$100/mes** para enriquecimiento Google (1,000 locales)
- **$0** para visualización (datos en BD)

## 🔧 TROUBLESHOOTING

### Problema: Muchos locales rechazados

**Solución:** Revisar tipos de Google Places devueltos y ajustar `TIPOS_VALIDOS`

### Problema: Locales fuera de España

**Solución:** Mejorar validación de ubicación en `estaEnEspana()`

### Problema: Fotos no se descargan

**Solución:** Verificar configuración de Supabase Storage y permisos

### Problema: Límite API alcanzado

**Solución:** Aumentar `limite_mensual_places` o esperar al siguiente mes

## 📚 REFERENCIAS

- [OpenStreetMap Overpass API](https://overpass-api.de/)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
