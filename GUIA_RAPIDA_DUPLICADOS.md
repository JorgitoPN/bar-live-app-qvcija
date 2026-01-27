
# 🚀 Guía Rápida: Gestión de Locales Duplicados

## 📍 ¿Qué son los Locales Duplicados?

Locales con **el mismo nombre** y **la misma ubicación exacta** (dentro de 11 metros).

### ✅ Ejemplos de Duplicados
- "Bar Central" en Calle Mayor 1, Madrid (creado 2 veces)
- "Café Roma" en 40.416775, -3.703790 (registrado múltiples veces)

### ❌ NO son Duplicados
- "Bar Central" en Madrid y "Bar Central" en Barcelona
- "Café Roma" en Calle Mayor 1 y "Café Roma" en Calle Mayor 100

## 🎯 ¿Por Qué es Importante?

### Problema
- Cada local duplicado se enriquece con Google Places API
- Coste: ~$0.017 por enriquecimiento
- **100 duplicados = $1.70 desperdiciados**

### Solución
- Sistema automático de prevención
- Detección y eliminación de existentes
- **Ahorro: 100% en duplicados**

## 🛠️ Cómo Usar el Sistema

### 1. Acceder al Panel
1. Ir a **Panel de Administración**
2. Clic en **"Gestionar Duplicados"**
3. Ver lista de grupos duplicados

### 2. Revisar Duplicados
- **Número en rojo**: Cantidad de duplicados en el grupo
- **Clic en grupo**: Ver detalles de cada local
- **🏆 Más Antiguo**: Local que se mantendrá

### 3. Eliminar Duplicados
1. Expandir grupo de duplicados
2. Revisar detalles de cada local
3. Clic en **"Eliminar X Duplicados"**
4. Confirmar acción
5. ✅ Se mantiene el más antiguo, se eliminan los demás

## ⚡ Prevención Automática

### En la App
Cuando un usuario intenta crear un local duplicado:
1. Sistema verifica nombre y ubicación
2. Si existe duplicado → Muestra alerta
3. Usuario puede:
   - Buscar el local existente
   - Cambiar ubicación
   - Contactar soporte

### En la Base de Datos
- Trigger automático previene inserciones duplicadas
- Lanza error si se intenta crear duplicado
- Protección 24/7 sin intervención manual

## 📊 Estadísticas

### Vista General
- **Total de Grupos**: Número de conjuntos de duplicados
- **Locales Afectados**: Total de locales duplicados
- **Ahorro Estimado**: Coste evitado en enriquecimiento

### Por Grupo
- **Nombre del Local**
- **Ubicación (Lat, Lng)**
- **Cantidad de Duplicados**
- **Fecha de Creación** (más antiguo a más reciente)

## 🔍 Casos Especiales

### Mismo Nombre, Diferentes Ubicaciones
✅ **VÁLIDO** - No se considera duplicado
- Ejemplo: Cadena de restaurantes con mismo nombre

### Variaciones de Nombre
⚠️ **REVISAR MANUALMENTE**
- "Bar Central" vs "Central Bar"
- "Café Roma" vs "Cafetería Roma"
- Sistema actual no detecta estas variaciones

### Locales Movidos
⚠️ **CUIDADO**
- Si un local cambió de ubicación física
- Verificar antes de eliminar
- Puede ser actualización legítima

## 🚨 Qué Hacer Si...

### Encuentras Muchos Duplicados
1. **No entrar en pánico** 😊
2. Revisar grupo por grupo
3. Eliminar en lotes pequeños
4. Verificar resultados después de cada eliminación

### Un Local se Eliminó por Error
1. Contactar con desarrollo
2. Proporcionar ID del local eliminado
3. Se puede restaurar desde backup
4. Revisar logs de eliminación

### Sistema Bloquea Creación Legítima
1. Verificar que no existe el local
2. Comprobar ubicación exacta
3. Si es diferente, ajustar coordenadas
4. Si persiste, contactar soporte

## 📋 Checklist de Mantenimiento

### Semanal
- [ ] Revisar nuevos duplicados detectados
- [ ] Eliminar grupos obvios
- [ ] Verificar logs de intentos bloqueados

### Mensual
- [ ] Análisis completo de duplicados
- [ ] Revisar casos especiales
- [ ] Actualizar documentación si es necesario

### Antes de Enriquecimiento con Google
- [ ] ✅ **IMPORTANTE**: Limpiar duplicados primero
- [ ] Verificar que no hay grupos pendientes
- [ ] Confirmar que trigger está activo

## 💡 Consejos Pro

### Optimización
1. **Limpiar duplicados antes de enriquecer**
   - Ahorra dinero en API calls
   - Mejora calidad de datos

2. **Revisar regularmente**
   - No dejar acumular duplicados
   - Más fácil gestionar pocos que muchos

3. **Educar a propietarios**
   - Buscar antes de crear
   - Verificar ubicación exacta
   - Usar mapa interactivo

### Prevención
1. **Comunicación clara**
   - Mensajes de error informativos
   - Guías para usuarios

2. **Validación estricta**
   - Verificar datos antes de enviar
   - Confirmar ubicación en mapa

3. **Monitoreo activo**
   - Revisar logs de intentos
   - Identificar patrones

## 📞 Soporte

### Problemas Técnicos
- Revisar logs: `[GestionarDuplicados]`
- Verificar trigger en base de datos
- Comprobar índice de rendimiento

### Dudas sobre Duplicados
- ¿Es realmente un duplicado?
- ¿Debo eliminar o mantener?
- ¿Cómo afecta a los propietarios?

### Contacto
- Equipo de desarrollo
- Panel de administración
- Documentación técnica: `DUPLICATE_LOCAL_PREVENTION_SYSTEM.md`

## ✅ Resumen Rápido

1. **Acceder**: Panel Admin → Gestionar Duplicados
2. **Revisar**: Ver grupos y detalles
3. **Eliminar**: Mantiene el más antiguo
4. **Prevenir**: Sistema automático activo
5. **Ahorrar**: Evita costes de Google API

---

**¿Necesitas ayuda?** Consulta la documentación técnica completa o contacta con el equipo de desarrollo.

**Última actualización:** 2024
