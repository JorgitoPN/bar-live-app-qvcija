
# 📊 Diagrama del Sistema de Limpieza Automática

## 🔄 Flujo General del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA DE LIMPIEZA                       │
│                         AUTOMÁTICA                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │     DETECCIÓN DE PROBLEMAS              │
        └─────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │   DUPLICADOS      │       │    INVÁLIDOS      │
    └───────────────────┘       └───────────────────┘
                │                           │
        ┌───────┴───────┐                   │
        │               │                   │
        ▼               ▼                   ▼
┌──────────┐    ┌──────────┐    ┌──────────────────┐
│Ubicación │    │ Google   │    │ Sin ubicación    │
│          │    │ Place ID │    │ Sin nombre       │
│Mismo     │    │          │    │ Cerrados         │
│nombre +  │    │Mismo ID  │    │ Fuera España     │
│ubicación │    │          │    │ Tipos prohibidos │
└──────────┘    └──────────┘    └──────────────────┘
        │               │                   │
        └───────┬───────┘                   │
                │                           │
                ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │   ELIMINACIÓN     │       │    EXCLUSIÓN      │
    │   (Permanente)    │       │   (Reversible)    │
    └───────────────────┘       └───────────────────┘
                │                           │
                │                           │
                ▼                           ▼
    ┌───────────────────┐       ┌───────────────────┐
    │ DELETE FROM       │       │ INSERT INTO       │
    │ locales           │       │ locales_excluidos │
    │                   │       │                   │
    │ Mantiene el más   │       │ UPDATE locales    │
    │ antiguo           │       │ SET activo=false  │
    └───────────────────┘       └───────────────────┘
                │                           │
                └───────────┬───────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   PREVENCIÓN FUTURA   │
                └───────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │  Enriquecimiento  │   │  Importación OSM  │
    │                   │   │                   │
    │  Verifica si      │   │  Verifica si      │
    │  está excluido    │   │  está excluido    │
    │                   │   │                   │
    │  Si SÍ → Skip     │   │  Si SÍ → Skip     │
    │  Si NO → Procesar │   │  Si NO → Importar │
    └───────────────────┘   └───────────────────┘
```

---

## 🎯 Detección de Duplicados

```
┌─────────────────────────────────────────────────────────┐
│              DETECCIÓN DE DUPLICADOS                     │
└─────────────────────────────────────────────────────────┘

Método 1: POR UBICACIÓN
┌──────────────────────────────────────────────────────┐
│ Local A: "Bar Manolo" (40.4168, -3.7038)            │
│ Local B: "Bar Manolo" (40.4169, -3.7039)            │
│                                                      │
│ Distancia: ~11 metros                                │
│ Nombre: Igual (case-insensitive)                    │
│                                                      │
│ ✅ DUPLICADO DETECTADO                               │
│ Acción: Mantener Local A (más antiguo)              │
│         Eliminar Local B                             │
└──────────────────────────────────────────────────────┘

Método 2: POR GOOGLE PLACE ID
┌──────────────────────────────────────────────────────┐
│ Local A: google_place_id = "ChIJXYZ123..."          │
│ Local B: google_place_id = "ChIJXYZ123..."          │
│                                                      │
│ ✅ DUPLICADO DETECTADO                               │
│ Acción: Mantener Local A (más antiguo)              │
│         Eliminar Local B                             │
└──────────────────────────────────────────────────────┘

Método 3: POR OSM ID
┌──────────────────────────────────────────────────────┐
│ Local A: source_id = "node/123456"                   │
│ Local B: source_id = "node/123456"                   │
│                                                      │
│ ✅ DUPLICADO DETECTADO                               │
│ Acción: Mantener Local A (más antiguo)              │
│         Eliminar Local B                             │
└──────────────────────────────────────────────────────┘
```

---

## 🚫 Detección de Inválidos

```
┌─────────────────────────────────────────────────────────┐
│              DETECCIÓN DE INVÁLIDOS                      │
└─────────────────────────────────────────────────────────┘

Criterio 1: SIN UBICACIÓN
┌──────────────────────────────────────────────────────┐
│ Local: "Bar Example"                                 │
│ Latitud: NULL                                        │
│ Longitud: NULL                                       │
│                                                      │
│ ❌ INVÁLIDO: Sin ubicación geográfica                │
│ Acción: Excluir (marcar inactivo)                   │
└──────────────────────────────────────────────────────┘

Criterio 2: CERRADO PERMANENTEMENTE
┌──────────────────────────────────────────────────────┐
│ Local: "Bar Cerrado"                                 │
│ google_business_status: "CLOSED_PERMANENTLY"         │
│                                                      │
│ ❌ INVÁLIDO: Cerrado permanentemente                 │
│ Acción: Excluir (marcar inactivo)                   │
└──────────────────────────────────────────────────────┘

Criterio 3: TIPO PROHIBIDO
┌──────────────────────────────────────────────────────┐
│ Local: "Gimnasio Fitness"                            │
│ Tipo: "gym"                                          │
│                                                      │
│ ❌ INVÁLIDO: Tipo de negocio no válido               │
│ Acción: Excluir (marcar inactivo)                   │
└──────────────────────────────────────────────────────┘

Criterio 4: FUERA DE ESPAÑA
┌──────────────────────────────────────────────────────┐
│ Local: "Bar Paris"                                   │
│ Dirección: "123 Rue de Paris, France"               │
│                                                      │
│ ❌ INVÁLIDO: Fuera de España                         │
│ Acción: Excluir (marcar inactivo)                   │
└──────────────────────────────────────────────────────┘
```

---

## 🔄 Prevención de Re-enriquecimiento

```
┌─────────────────────────────────────────────────────────┐
│           FLUJO DE ENRIQUECIMIENTO                       │
└─────────────────────────────────────────────────────────┘

Inicio: Enriquecer Local
         │
         ▼
┌────────────────────┐
│ Verificar si está  │
│ excluido           │
└────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐   ┌─────┐
│ SÍ  │   │ NO  │
└─────┘   └─────┘
    │         │
    │         ▼
    │   ┌──────────────┐
    │   │ Enriquecer   │
    │   │ con Google   │
    │   └──────────────┘
    │         │
    │         ▼
    │   ┌──────────────┐
    │   │ Actualizar   │
    │   │ base de datos│
    │   └──────────────┘
    │         │
    ▼         ▼
┌──────────────────┐
│ Skip (no         │
│ enriquecer)      │
│                  │
│ Ahorro: $0.10    │
└──────────────────┘
```

---

## 📊 Estadísticas del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                  DASHBOARD                               │
└─────────────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐
│   ACTIVOS    │  │  EXCLUIDOS   │
│              │  │              │
│     619      │  │      35      │
└──────────────┘  └──────────────┘

┌─────────────────────────────────────────────────────────┐
│              PROBLEMAS DETECTADOS                        │
├─────────────────────────────────────────────────────────┤
│ 📍 Duplicados por Ubicación:        8                   │
│ 🌐 Duplicados por Google:            3                   │
│ 🗺️  Duplicados por OSM:              2                   │
│ ❌ Locales Inválidos:                15                  │
│ 🚫 Cerrados Permanentemente:         5                   │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Casos de Uso

### Caso 1: Después de Importación OSM
```
1. Importar 500 locales desde OSM
2. Ejecutar limpieza automática
3. Sistema detecta 50 duplicados + 20 inválidos
4. Ahorro: ~$7.00 en costes de API
```

### Caso 2: Mantenimiento Diario
```
1. Cron job ejecuta limpieza a las 3:00 AM
2. Sistema detecta 5 nuevos duplicados
3. Excluye automáticamente
4. Ahorro: ~$0.50 diarios
```

### Caso 3: Revisión Manual
```
1. Admin revisa locales inválidos
2. Selecciona 10 para excluir
3. Confirma exclusión
4. Locales no se enriquecen
5. Ahorro: ~$1.00
```

---

## ✅ Resultado Final

```
ANTES:
├─ 654 locales activos
├─ 20 duplicados
├─ 15 inválidos
└─ Coste desperdiciado: ~$3.50/día

DESPUÉS:
├─ 619 locales activos (únicos y válidos)
├─ 35 locales excluidos
├─ 0 duplicados
├─ 0 inválidos
└─ Ahorro: ~$3.50/día = ~$1,277.50/año
```

---

**¡Sistema listo para usar!** 🚀
