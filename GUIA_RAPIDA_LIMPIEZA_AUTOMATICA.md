
# 🚀 Guía Rápida: Sistema de Limpieza Automática

## ¿Qué hace este sistema?

El sistema identifica y elimina automáticamente:

1. **Locales duplicados** - Mismo nombre y ubicación
2. **Locales inválidos** - No cumplen criterios de enriquecimiento
3. **Previene re-enriquecimiento** - Locales excluidos no se vuelven a procesar

## 🎯 Pasos para Ejecutar la Limpieza

### 1️⃣ Primera Ejecución (Simulación)

1. Ve a **Admin** → **Sistema de Limpieza Automática**
2. Verás las estadísticas:
   - Locales activos
   - Locales excluidos
   - Duplicados detectados (por ubicación, Google, OSM)
   - Locales inválidos
   - Cerrados permanentemente

3. Configura las opciones:
   - ✅ **Modo Simulación**: ACTIVADO (para ver qué se eliminaría)
   - ✅ **Incluir Duplicados**: ACTIVADO
   - ✅ **Incluir Inválidos**: ACTIVADO

4. Haz clic en **Ejecutar Simulación**

5. Revisa los resultados:
   - Cuántos locales se eliminarían
   - Cuántos se excluirían
   - Detalles por tipo de limpieza

### 2️⃣ Ejecución Real

1. Si los resultados de la simulación son correctos:
   - ❌ **Modo Simulación**: DESACTIVADO
   - ✅ **Incluir Duplicados**: ACTIVADO
   - ✅ **Incluir Inválidos**: ACTIVADO

2. Haz clic en **Ejecutar Limpieza Real**

3. Confirma la acción (⚠️ no se puede deshacer)

4. Espera a que termine el proceso

5. Revisa los resultados finales

### 3️⃣ Revisar Locales Excluidos

1. Ve a **Admin** → **Locales Excluidos**

2. Verás todos los locales que han sido excluidos

3. Puedes:
   - Buscar por nombre o dirección
   - Filtrar por motivo de exclusión
   - Restaurar locales si fue un error

## 📋 Tipos de Problemas Detectados

### Duplicados

- **Por ubicación**: Mismo nombre + ubicación exacta (±11 metros)
- **Por Google Place ID**: Mismo `google_place_id`
- **Por OSM ID**: Mismo `source_id` de OpenStreetMap

**Acción:** Se mantiene el local más antiguo, los demás se eliminan

### Inválidos

- Sin ubicación geográfica
- Sin nombre
- Cerrados permanentemente
- Fuera de España
- Tipos prohibidos (gimnasios, hoteles, hospitales, etc.)
- Palabras prohibidas en nombre (gimnasio, hotel, farmacia, etc.)

**Acción:** Se marcan como inactivos y se excluyen del sistema

## 🔍 Revisar Locales Inválidos Manualmente

Si prefieres revisar antes de excluir:

1. Ve a **Admin** → **Revisar Locales Inválidos**

2. Verás la lista de locales inválidos con:
   - Nombre y dirección
   - Motivo de invalidez
   - Tipo y fuente

3. Selecciona los locales que quieres excluir

4. Haz clic en **Excluir Seleccionados**

5. Confirma la acción

## ⚙️ Configuración Automática (Opcional)

Para que la limpieza se ejecute automáticamente cada día:

1. Ve al dashboard de Supabase
2. Navega a **Edge Functions**
3. Despliega la función `automatic-cleanup`
4. Configura un cron job:
   - **Nombre:** `daily-cleanup`
   - **Frecuencia:** `0 3 * * *` (3:00 AM diariamente)
   - **Payload:**
     ```json
     {
       "dryRun": false,
       "incluirDuplicados": true,
       "incluirInvalidos": true
     }
     ```

## 💡 Consejos

### Antes de Ejecutar

- ✅ Ejecuta siempre primero en **modo simulación**
- ✅ Revisa los resultados cuidadosamente
- ✅ Verifica que los duplicados sean realmente duplicados
- ✅ Asegúrate de que los inválidos sean realmente inválidos

### Después de Ejecutar

- ✅ Revisa la lista de locales excluidos
- ✅ Verifica que no haya falsos positivos
- ✅ Restaura locales si fue un error
- ✅ Actualiza las estadísticas

### Mantenimiento Regular

- 📅 Ejecuta limpieza después de importaciones masivas
- 📅 Revisa locales excluidos mensualmente
- 📅 Verifica estadísticas semanalmente

## 🆘 Solución de Problemas

### "No se detectan duplicados"

**Causa:** Los locales no tienen ubicación o nombres diferentes

**Solución:** Verifica que los locales tengan `latitud`, `longitud` y nombres similares

### "Local excluido sigue apareciendo"

**Causa:** Caché de la aplicación

**Solución:** Refresca la página o reinicia la app

### "Quiero restaurar un local excluido"

**Solución:**
1. Ve a **Admin** → **Locales Excluidos**
2. Busca el local
3. Haz clic en **Restaurar Local**
4. Confirma la acción

## 📊 Ejemplo de Resultados

```
Resultados de Limpieza:

✅ Locales Inválidos
   - Procesados: 15
   - Excluidos: 15

✅ Duplicados por Ubicación
   - Grupos: 8
   - Eliminados: 12
   - Excluidos: 12

✅ Duplicados por Google
   - Grupos: 3
   - Eliminados: 5
   - Excluidos: 5

✅ Duplicados por OSM
   - Grupos: 2
   - Eliminados: 3
   - Excluidos: 3

TOTAL:
- Locales eliminados: 20
- Locales excluidos: 35
- Ahorro estimado: ~70€ en costes de API
```

## 🎓 Preguntas Frecuentes

### ¿Se pueden recuperar los locales eliminados?

**No.** Los duplicados se eliminan permanentemente. Por eso es importante ejecutar primero en modo simulación.

### ¿Se pueden restaurar los locales excluidos?

**Sí.** Los locales inválidos se marcan como inactivos pero no se eliminan. Pueden restaurarse desde `/admin/locales-excluidos`.

### ¿Qué pasa con los datos relacionados?

Los datos relacionados (eventos, posts, check-ins) se eliminan en cascada cuando se elimina un local duplicado.

### ¿Cuánto ahorro en costes de API?

Cada enriquecimiento con Google Places cuesta aproximadamente 3.5€. Si eliminas 20 duplicados, ahorras ~70€.

### ¿Con qué frecuencia debo ejecutar la limpieza?

- **Después de importaciones masivas:** Siempre
- **Mantenimiento regular:** Semanal o mensual
- **Automático:** Diariamente a las 3:00 AM (con cron job)

## ✅ Checklist de Primera Ejecución

- [ ] Acceder a `/admin/sistema-limpieza-automatica`
- [ ] Revisar estadísticas de problemas
- [ ] Ejecutar en modo simulación
- [ ] Revisar resultados de simulación
- [ ] Verificar que los duplicados sean correctos
- [ ] Verificar que los inválidos sean correctos
- [ ] Ejecutar en modo real
- [ ] Revisar locales excluidos
- [ ] Restaurar si hay falsos positivos
- [ ] Configurar cron job (opcional)

## 🎉 ¡Listo!

Tu base de datos ahora está limpia y optimizada. Los locales duplicados e inválidos no volverán a aparecer en futuros procesos de enriquecimiento ni importaciones.
