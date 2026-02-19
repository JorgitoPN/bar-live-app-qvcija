
# 📊 DIAGRAMA: SISTEMA DE LIMPIEZA OSM ENRIQUECIDOS

## 🔄 FLUJO COMPLETO DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPORTACIÓN DESDE OSM                         │
│                                                                  │
│  OpenStreetMap → Importar Locales → Base de Datos               │
│                                                                  │
│  Resultado: Locales con source_type = 'osm'                     │
│             activo = false (pendientes)                          │
│             enriquecido = false                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  ENRIQUECIMIENTO CON GOOGLE PLACES               │
│                                                                  │
│  Local OSM → Google Places API → Datos Completos                │
│                                                                  │
│  Resultado: Local con:                                           │
│             - Fotos de Google                                    │
│             - Horarios completos                                 │
│             - Reviews y ratings                                  │
│             - Información detallada                              │
│             - enriquecido = true                                 │
│             - activo = true                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              🗑️ LIMPIEZA AUTOMÁTICA (NUEVO v131.0)              │
│                                                                  │
│  Sistema detecta:                                                │
│  - source_type = 'osm'                                          │
│  - enriquecido = true                                           │
│  - activo = true                                                │
│                                                                  │
│  Si limpieza automática está activada:                          │
│  → Elimina el local del catálogo OSM                            │
│                                                                  │
│  Resultado: Local eliminado de OSM                              │
│             PERO sigue visible en la app                         │
│             (tiene datos de Google Places)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    VISIBILIDAD EN LA APP                         │
│                                                                  │
│  "Explorar" y "Mapa" muestran:                                  │
│  - TODOS los locales con activo = true                          │
│  - Independientemente de source_type                             │
│                                                                  │
│  Resultado: Locales visibles con datos de Google Places         │
│             Sin datos redundantes de OSM                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 ESTADOS DE UN LOCAL OSM

```
┌──────────────────────────────────────────────────────────────────┐
│                         CICLO DE VIDA                             │
└──────────────────────────────────────────────────────────────────┘

1. IMPORTADO DESDE OSM
   ├─ source_type: 'osm'
   ├─ activo: false
   ├─ enriquecido: false
   └─ Estado: PENDIENTE DE ENRIQUECER
   
                    ↓ Enriquecimiento con Google Places
   
2. ENRIQUECIDO Y ACTIVADO
   ├─ source_type: 'osm'
   ├─ activo: true
   ├─ enriquecido: true
   ├─ Datos completos de Google Places
   └─ Estado: PUBLICADO EN LA APP
   
                    ↓ Limpieza Automática (si está activada)
   
3. ELIMINADO DEL CATÁLOGO OSM
   ├─ Registro OSM eliminado de la base de datos
   ├─ Local sigue visible en "Explorar" y "Mapa"
   ├─ Datos de Google Places intactos
   └─ Estado: PUBLICADO (sin redundancia OSM)
```

## 🔍 COMPARACIÓN: ANTES vs DESPUÉS

### ANTES (Sin Limpieza)

```
BASE DE DATOS:
┌─────────────────────────────────────────────────────────────┐
│  LOCALES OSM (5000 registros)                               │
│  ├─ 3000 enriquecidos y activos (REDUNDANTES ❌)            │
│  │  ├─ Ocupan espacio innecesario                           │
│  │  ├─ Ralentizan consultas                                 │
│  │  └─ Ya tienen datos de Google Places                     │
│  └─ 2000 pendientes de enriquecer (ÚTILES ✅)               │
│                                                              │
│  ESPACIO TOTAL: ~25 MB                                       │
│  RENDIMIENTO: Lento (1-2 segundos)                          │
└─────────────────────────────────────────────────────────────┘

APP (Explorar y Mapa):
┌─────────────────────────────────────────────────────────────┐
│  3000 locales visibles                                       │
│  (con datos de Google Places)                                │
└─────────────────────────────────────────────────────────────┘
```

### DESPUÉS (Con Limpieza)

```
BASE DE DATOS:
┌─────────────────────────────────────────────────────────────┐
│  LOCALES OSM (2000 registros)                               │
│  ├─ 0 enriquecidos y activos (ELIMINADOS ✅)                │
│  └─ 2000 pendientes de enriquecer (ÚTILES ✅)               │
│                                                              │
│  ESPACIO TOTAL: ~10 MB                                       │
│  ESPACIO LIBERADO: ~15 MB                                    │
│  RENDIMIENTO: Rápido (<500ms)                                │
└─────────────────────────────────────────────────────────────┘

APP (Explorar y Mapa):
┌─────────────────────────────────────────────────────────────┐
│  3000 locales visibles                                       │
│  (con datos de Google Places)                                │
│  IGUAL QUE ANTES ✅                                          │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 CRITERIOS DE ELIMINACIÓN

```
┌──────────────────────────────────────────────────────────────┐
│              ¿SE ELIMINA ESTE LOCAL?                          │
└──────────────────────────────────────────────────────────────┘

Local OSM Enriquecido y Activo:
├─ source_type = 'osm' ✅
├─ enriquecido = true ✅
├─ activo = true ✅
└─ RESULTADO: SÍ, SE ELIMINA 🗑️

Local OSM Pendiente:
├─ source_type = 'osm' ✅
├─ enriquecido = false ❌
├─ activo = false ❌
└─ RESULTADO: NO, SE MANTIENE ✅

Local Manual:
├─ source_type = 'manual' ❌
└─ RESULTADO: NO, SE MANTIENE ✅

Local Google Places:
├─ source_type = 'google' ❌
└─ RESULTADO: NO, SE MANTIENE ✅
```

## 🔄 FLUJO DE LIMPIEZA AUTOMÁTICA

```
┌──────────────────────────────────────────────────────────────┐
│                  DURANTE ENRIQUECIMIENTO                      │
└──────────────────────────────────────────────────────────────┘

1. Admin enriquece local OSM
   ↓
2. Sistema busca en Google Places
   ↓
3. Sistema obtiene datos completos
   ↓
4. Sistema actualiza local:
   - enriquecido = true
   - activo = true
   - Datos de Google Places
   ↓
5. ¿Limpieza automática activada?
   ├─ SÍ → Eliminar local OSM del catálogo
   │        ├─ Log: "🗑️ Eliminando del catálogo OSM..."
   │        └─ Log: "✅ Eliminado del catálogo OSM"
   └─ NO → Mantener local OSM en la base de datos
   ↓
6. Local visible en "Explorar" y "Mapa"
   (con datos de Google Places)
```

## 📍 UBICACIONES EN LA APP

```
Panel de Administración
├─ Limpieza OSM Enriquecidos (NUEVO)
│  ├─ Estadísticas en tiempo real
│  ├─ Limpieza manual
│  ├─ Configuración de limpieza automática
│  └─ Desglose por provincia
│
├─ Enriquecimiento con Google (ACTUALIZADO v131.0)
│  ├─ Proceso de enriquecimiento normal
│  └─ Limpieza automática integrada
│
└─ Sistema de Limpieza (EXISTENTE)
   └─ Limpieza de duplicados e inválidos
```

## 🎯 CASOS DE USO

### Caso 1: Primera Limpieza

```
Situación: Tienes 3000 locales OSM enriquecidos ocupando espacio

Acción:
1. Ir a "Limpieza OSM Enriquecidos"
2. Ver: "3000 OSM Enriquecidos"
3. Ver: "Espacio a liberar: 15 MB"
4. Ejecutar simulación
5. Ejecutar limpieza real

Resultado:
- 3000 locales OSM eliminados
- 15 MB liberados
- Locales siguen en "Explorar" y "Mapa"
- App más rápida
```

### Caso 2: Mantenimiento Automático

```
Situación: Enriqueces 100 locales nuevos cada semana

Acción:
1. Activar limpieza automática (una vez)
2. Enriquecer locales normalmente

Resultado:
- Cada local se elimina automáticamente después de enriquecerse
- Catálogo OSM siempre limpio
- Sin intervención manual
- Rendimiento óptimo constante
```

### Caso 3: Monitoreo Periódico

```
Situación: Quieres verificar que el sistema funciona

Acción:
1. Ir a "Limpieza OSM Enriquecidos" semanalmente
2. Ver estadísticas
3. Confirmar que "OSM Enriquecidos" es bajo (0-10)

Resultado:
- Sistema funcionando correctamente
- Catálogo limpio
- Rendimiento óptimo
```

## ✅ CHECKLIST DE VERIFICACIÓN

Después de implementar, verifica:

- [ ] Pantalla "Limpieza OSM Enriquecidos" accesible desde Panel de Administración
- [ ] Estadísticas se cargan correctamente
- [ ] Modo simulación funciona
- [ ] Limpieza real funciona
- [ ] Locales siguen visibles en "Explorar" después de limpieza
- [ ] Locales siguen visibles en "Mapa" después de limpieza
- [ ] Switch de limpieza automática funciona
- [ ] Logs aparecen durante enriquecimiento
- [ ] Edge Function desplegada correctamente

## 🎉 ¡LISTO PARA USAR!

El sistema está completamente implementado. Solo necesitas:

1. ✅ Ejecutar limpieza inicial
2. ✅ Activar limpieza automática
3. ✅ Disfrutar de una app más rápida

**¡Eso es todo!** 🚀
