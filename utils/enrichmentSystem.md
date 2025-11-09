
# 🎯 Sistema de Enriquecimiento Google Places - BarLive

## 📋 Descripción General

El sistema de enriquecimiento es el proceso mediante el cual los locales importados desde OpenStreetMap (OSM) se complementan con datos detallados de Google Places API.

## 🔄 Flujo Completo del Proceso

```
┌─────────────────────────────────────────────────────────────────┐
│                    FASE 1: IMPORTACIÓN OSM                      │
│  - Consulta a Overpass API                                      │
│  - Datos básicos: nombre, ubicación, tipo                       │
│  - Almacenamiento en LocalCatalogo                              │
│  - Estado: enriquecido = false                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              FASE 2: ENRIQUECIMIENTO GOOGLE PLACES              │
│                                                                  │
│  1️⃣ BÚSQUEDA MULTI-ESTRATEGIA                                   │
│     ├─ Estrategia 1: tipo + nombre + ubicación                 │
│     ├─ Estrategia 2: nombre + ubicación                         │
│     ├─ Estrategia 3: dirección completa                         │
│     └─ Estrategia 4: búsqueda por coordenadas                   │
│                                                                  │
│  2️⃣ OBTENCIÓN DE DETALLES                                       │
│     └─ Google Places Details API                                │
│                                                                  │
│  3️⃣ VALIDACIÓN                                                  │
│     ├─ Verificar estado del negocio                             │
│     ├─ Validar tipos de establecimiento                         │
│     └─ Verificar distancia geográfica                           │
│                                                                  │
│  4️⃣ MAPEO DE TIPOS                                              │
│     └─ Google types → BarLive types                             │
│                                                                  │
│  5️⃣ CATEGORIZACIÓN POR HORARIOS                                 │
│     └─ Análisis inteligente de horarios                         │
│                                                                  │
│  6️⃣ EXTRACCIÓN DE ATRIBUTOS                                     │
│     ├─ Servicios (cerveza, terraza, wifi, etc.)                │
│     ├─ Ambiente (animado, tranquilo, etc.)                      │
│     ├─ Clientela (turistas, locales, etc.)                      │
│     └─ Métodos de pago (efectivo, tarjetas, etc.)              │
│                                                                  │
│  7️⃣ CONVERSIÓN DE HORARIOS                                      │
│     └─ Formato Google → Formato BarLive                         │
│                                                                  │
│  8️⃣ DESCARGA DE FOTOS                                           │
│     └─ Máximo 4 fotos por local                                 │
│                                                                  │
│  9️⃣ CONSTRUCCIÓN DE DATOS ENRIQUECIDOS                          │
│     └─ Objeto LocalEnriquecido completo                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                FASE 3: ALMACENAMIENTO EN BD                     │
│  - Actualizar LocalCatalogo con datos enriquecidos             │
│  - Crear/actualizar registro en Local                          │
│  - Estado: enriquecido = true                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Estructura de Archivos

### Archivos Principales

- **`enrichmentService.ts`**: Orquestador principal del proceso
- **`enrichmentValidation.ts`**: Validación de locales
- **`enrichmentMapping.ts`**: Mapeo de tipos y categorización
- **`enrichmentExtraction.ts`**: Extracción de atributos
- **`enrichmentSchedules.ts`**: Conversión de horarios
- **`enrichmentPhotos.ts`**: Descarga de fotos
- **`googlePlacesApi.ts`**: Cliente de Google Places API

### Pantallas

- **`app/admin/enriquecimiento-google.tsx`**: Interfaz de enriquecimiento

## 🎯 Estrategias de Búsqueda

### Estrategia 1: Nombre + Tipo + Ubicación
```javascript
query = "bar La Catrina Madrid Comunidad de Madrid España"
```
**Ventaja**: Muy específica, reduce falsos positivos
**Desventaja**: Puede fallar si el tipo no coincide exactamente

### Estrategia 2: Nombre + Ubicación
```javascript
query = "La Catrina Madrid España"
```
**Ventaja**: Más flexible, no depende del tipo
**Desventaja**: Puede devolver resultados incorrectos en ciudades grandes

### Estrategia 3: Dirección Completa
```javascript
query = "La Catrina, Calle Argumosa 7, Madrid"
```
**Ventaja**: Muy precisa si la dirección es correcta
**Desventaja**: Requiere dirección completa en OSM

### Estrategia 4: Búsqueda por Coordenadas
```javascript
location = "40.4168,-3.7038"
radius = 50
keyword = "La Catrina"
```
**Ventaja**: Última opción, busca en un radio pequeño
**Desventaja**: Puede devolver locales cercanos pero diferentes

## ✅ Validación de Locales

### Criterios de Validación

1. **Nombre**: Debe tener nombre
2. **Estado del negocio**: No cerrado permanente/temporalmente
3. **Tipos**: Debe tener tipos válidos de hostelería/ocio
4. **Ubicación**: Debe tener coordenadas geográficas
5. **Distancia**: Máximo 200m de diferencia con OSM

### Tipos Válidos
- bar, restaurant, cafe, night_club, pub
- food, establishment, point_of_interest
- meal_takeaway, meal_delivery, bakery

### Tipos Excluidos
- hospital, pharmacy, bank, school, church
- gas_station, parking, etc.

## 🗺️ Mapeo de Tipos

### Google → BarLive

| Google Type | BarLive Types |
|------------|---------------|
| bar | bar |
| pub | pub |
| night_club | discoteca |
| cafe | cafe |
| restaurant | restaurante |
| brewery | cerveceria |
| wine_bar | vinoteca |
| cocktail_bar | cocteleria |
| tapas_bar | bar, tapas |

## 🕐 Conversión de Horarios

### Formato Google
```
"Monday: 9:00 AM – 11:00 PM"
"Tuesday: 9:00 AM – 2:00 PM, 5:00 PM – 11:00 PM"
"Wednesday: Closed"
```

### Formato BarLive
```javascript
{
  lunes: ["09:00-23:00"],
  martes: ["09:00-14:00", "17:00-23:00"],
  miercoles: ["Cerrado"]
}
```

## 🎨 Extracción de Atributos

### Servicios
- **Bebidas**: cerveza, vino, cocteles, cafe
- **Comida**: comida, tapas, desayuno, almuerzo, cena
- **Espacios**: terraza, interior, rooftop, jardin
- **Servicios**: wifi_gratis, reservas, delivery, takeaway, parking
- **Entretenimiento**: musica_en_vivo, dj, karaoke, deportes_tv

### Ambiente
- **Estilo**: animado, tranquilo, romantico, familiar, juvenil, elegante
- **Características**: ruidoso, silencioso, luminoso, oscuro, espacioso

### Clientela
- turistas, locales, estudiantes, profesionales, familias, parejas, grupos

### Métodos de Pago
- efectivo, tarjetas, contactless, bizum, paypal, crypto

## 📸 Descarga de Fotos

- **Máximo**: 4 fotos por local
- **Fuente**: Google Places Photos API
- **Formato**: URLs de Google (en producción, descargar y almacenar)
- **Tamaño**: 800px de ancho

## 📊 Resultado del Enriquecimiento

### LocalEnriquecido
```typescript
{
  google_place_id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  telefono?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  barlive_types: string[];
  google_types: string[];
  horarios: Record<string, string[]>;
  abierto_ahora?: boolean;
  servicios: Record<string, boolean>;
  ambiente: Record<string, boolean>;
  clientela: Record<string, boolean>;
  metodos_pago: Record<string, boolean>;
  fotos: string[];
  google_url?: string;
  business_status?: string;
  editorial_summary?: string;
}
```

## 🚀 Uso del Sistema

### Cargar Candidatos
```typescript
const candidatos = obtenerCandidatosEnriquecimiento(
  'Madrid',      // provincia
  undefined,     // comunidad
  ['bar'],       // tipos
  25             // límite
);
```

### Enriquecer un Local
```typescript
const resultado = await buscarYEnriquecerLocal(localCatalogo);

if (resultado.success) {
  console.log('Enriquecido:', resultado.datosEnriquecidos);
} else {
  console.log('Error:', resultado.notas);
}
```

### Enriquecer un Lote
```typescript
const resultados = await procesarLoteEnriquecimiento(
  candidatos,
  (actual, total, resultado) => {
    console.log(`Progreso: ${actual}/${total}`);
  }
);
```

## 💡 Mejores Prácticas

1. **Límite de API**: No procesar más de 100 locales por hora
2. **Pausa entre llamadas**: 300ms mínimo
3. **Validación**: Siempre validar antes de almacenar
4. **Logs**: Mantener logs detallados del proceso
5. **Reintentos**: Implementar reintentos para errores temporales
6. **Cache**: Cachear resultados de Google Places
7. **Fotos**: En producción, descargar y almacenar fotos propias

## 🔧 Configuración

### Variables de Entorno
```
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=tu_api_key_aqui
```

### Límites de Google Places API
- **Text Search**: $32 por 1000 llamadas
- **Nearby Search**: $32 por 1000 llamadas
- **Place Details**: $17 por 1000 llamadas
- **Place Photos**: $7 por 1000 llamadas

## 📈 Métricas de Éxito

- **Tasa de éxito**: >80% de locales enriquecidos
- **Precisión**: >90% de coincidencia geográfica
- **Completitud**: >70% con fotos
- **Calidad**: >4.0 rating promedio

## 🐛 Troubleshooting

### Local no encontrado
- Verificar nombre en OSM
- Probar búsqueda manual en Google Maps
- Verificar coordenadas

### Validación fallida
- Revisar tipos de Google
- Verificar estado del negocio
- Comprobar distancia geográfica

### Sin fotos
- Verificar que el local tenga fotos en Google
- Comprobar permisos de API
- Revisar límites de descarga

## 📚 Referencias

- [Google Places API Documentation](https://developers.google.com/maps/documentation/places/web-service)
- [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [BarLive Data Model](../types/index.ts)
