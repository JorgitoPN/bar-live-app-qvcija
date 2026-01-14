
# 🚀 GUÍA RÁPIDA: LIMPIEZA DE LOCALES OSM ENRIQUECIDOS

## ⚡ INICIO RÁPIDO (5 MINUTOS)

### Paso 1: Limpieza Inicial

1. Abrir app → Panel de Administración
2. Seleccionar "Limpieza OSM Enriquecidos"
3. Ver estadísticas (cuántos locales OSM enriquecidos hay)
4. Presionar "Ejecutar Simulación" (modo simulación activado por defecto)
5. Revisar resultados de la simulación
6. Desactivar "Modo Simulación"
7. Presionar "Ejecutar Limpieza Real"
8. Confirmar y esperar

### Paso 2: Activar Limpieza Automática

1. En la misma pantalla, buscar "Limpieza Automática"
2. Activar el switch
3. ¡Listo! Ahora es automático

## 🎯 ¿QUÉ HACE ESTE SISTEMA?

### Problema

El catálogo de OSM ocupa mucho espacio y ralentiza la app.

### Solución

Elimina automáticamente los locales OSM que ya han sido enriquecidos con Google Places y están activos en la app.

### ¿Por qué es seguro?

- ✅ Los locales siguen visibles en "Explorar" y "Mapa"
- ✅ Tienen todos los datos de Google Places
- ✅ Solo se eliminan datos redundantes de OSM
- ✅ Los locales OSM pendientes NO se tocan

## 📊 ESTADÍSTICAS TÍPICAS

### Antes de la Limpieza

```
Total locales OSM: 5000
OSM enriquecidos y activos: 3000
OSM pendientes: 2000
Espacio ocupado: ~15 MB
```

### Después de la Limpieza

```
Total locales OSM: 2000
OSM enriquecidos y activos: 0
OSM pendientes: 2000
Espacio liberado: ~15 MB
```

### Resultado

- ⚡ App más rápida
- 💾 15 MB liberados
- ✅ 3000 locales siguen visibles en la app
- ✅ 2000 locales OSM listos para enriquecer

## 🔄 FLUJO AUTOMÁTICO

Con la limpieza automática activada:

```
1. Enriquecer local OSM con Google Places
   ↓
2. Local se marca como enriquecido = true
   ↓
3. Local se activa: activo = true
   ↓
4. Sistema detecta: OSM + enriquecido + activo
   ↓
5. Sistema elimina el local OSM automáticamente
   ↓
6. Local sigue visible en app (tiene datos de Google Places)
```

## ⚠️ IMPORTANTE

### Lo que SÍ se elimina

- ✅ Locales OSM enriquecidos y activos
- ✅ Datos redundantes del catálogo OSM
- ✅ Espacio innecesario en la base de datos

### Lo que NO se elimina

- ❌ Locales OSM pendientes de enriquecer
- ❌ Locales creados manualmente
- ❌ Locales de Google Places
- ❌ Datos de Google Places de los locales enriquecidos

### Lo que NO se afecta

- ❌ Visibilidad en "Explorar"
- ❌ Visibilidad en "Mapa"
- ❌ Funcionalidad de la app
- ❌ Datos de los usuarios

## 🎉 BENEFICIOS

1. **Rendimiento:** App más rápida en "Explorar" y "Mapa"
2. **Espacio:** Menos datos en la base de datos
3. **Mantenimiento:** Automático, sin intervención manual
4. **Costes:** Menos espacio = menos costes de almacenamiento

## 📞 ¿NECESITAS AYUDA?

### Verificar que Funciona

1. Ir a "Limpieza OSM Enriquecidos"
2. Ver estadísticas
3. Si "OSM Enriquecidos" es 0 → ✅ Funciona correctamente
4. Si "OSM Enriquecidos" es alto → Ejecutar limpieza manual

### Verificar Visibilidad

1. Abrir "Explorar"
2. Buscar un local que fue enriquecido
3. Si aparece → ✅ Todo correcto
4. Si no aparece → Verificar que `activo = true` en la base de datos

### Desactivar si es Necesario

1. Ir a "Limpieza OSM Enriquecidos"
2. Desactivar "Limpieza Automática"
3. Los locales OSM permanecerán en la base de datos

## 🔧 COMANDOS ÚTILES

### Ver Configuración

```sql
SELECT * FROM app_config WHERE key = 'auto_cleanup_osm_enriched';
```

### Ver Locales por Fuente

```sql
SELECT source_type, 
       COUNT(*) as total,
       SUM(CASE WHEN activo = true THEN 1 ELSE 0 END) as activos,
       SUM(CASE WHEN enriquecido = true THEN 1 ELSE 0 END) as enriquecidos
FROM locales 
GROUP BY source_type;
```

### Ejecutar Limpieza Manual

```sql
SELECT * FROM cleanup_enriched_osm_locales();
```

## ✅ TODO LISTO

El sistema está implementado y listo para usar. Solo necesitas:

1. ✅ Ejecutar limpieza inicial (una vez)
2. ✅ Activar limpieza automática
3. ✅ Disfrutar de una app más rápida

¡Eso es todo! 🎉
