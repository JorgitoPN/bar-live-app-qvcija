
# 🚀 Guía Rápida: Validación de Nombres de Locales

## ⚡ Inicio Rápido (5 minutos)

### 1. Acceder a la Herramienta

```
Admin → Validar Nombres de Locales
```

O directamente: `/admin/validar-nombres-locales`

### 2. Ver Resumen

Al abrir la página verás:
- 📊 **Locales Válidos**: Número de locales con nombres correctos
- ❌ **Locales Inválidos**: Número de locales con nombres incorrectos

### 3. Revisar Locales Inválidos

1. El filtro "Inválidos" está activado por defecto
2. Verás la lista de locales con nombres problemáticos
3. Cada local muestra:
   - Nombre
   - Dirección
   - Tipo
   - Estado (Activo/Inactivo)

### 4. Excluir Locales Inválidos

```
1. Seleccionar locales (o "Seleccionar Todos")
2. Clic en "Excluir X Seleccionados"
3. Confirmar la acción
4. ¡Listo! Los locales se excluyen automáticamente
```

## ✅ Palabras Clave Válidas

Un local es válido si su nombre contiene:

| Palabra Clave | Ejemplo |
|--------------|---------|
| Bar | "Bar Farmacia" ✅ |
| Discoteca | "Discoteca Gymare" ✅ |
| Restaurante | "Restaurante El Faro" ✅ |
| Cafetería | "Cafetería Central" ✅ |
| Café | "Café de la Ópera" ✅ |
| Pub | "Pub The Irish" ✅ |
| Coctelería | "Coctelería Molecular" ✅ |

## ❌ Ejemplos de Nombres Inválidos

| Nombre | Motivo |
|--------|--------|
| "Farmacia" | No contiene palabras clave ❌ |
| "Peluquería Moderna" | No contiene palabras clave ❌ |
| "Gimnasio Fitness" | No contiene palabras clave ❌ |
| "Tienda de Ropa" | No contiene palabras clave ❌ |

## 🔄 Flujo de Trabajo Recomendado

### Opción 1: Revisión Manual (Recomendado)

```
1. Acceder a "Validar Nombres de Locales"
2. Revisar lista de inválidos
3. Seleccionar los que definitivamente no son válidos
4. Excluir seleccionados
5. Refrescar para verificar
```

### Opción 2: Exclusión Masiva (Rápido)

```
1. Acceder a "Validar Nombres de Locales"
2. Clic en "Seleccionar Todos"
3. Clic en "Excluir X Seleccionados"
4. Confirmar
5. ¡Todos los inválidos excluidos!
```

## 💡 Consejos Útiles

### 🔍 Búsqueda

Usa la barra de búsqueda para encontrar locales específicos:
```
"Farmacia" → Encuentra todos los locales con "Farmacia" en el nombre
"Calle Mayor" → Encuentra locales en esa dirección
```

### 🔄 Refresh

Si haces cambios en otros sistemas, usa el botón de refresh (↻) para actualizar la lista.

### ✅ Verificar Válidos

Cambia al filtro "Válidos" para ver locales con nombres correctos y verificar que el sistema funciona bien.

## 💰 Ahorro de Costes

Cada local inválido filtrado ahorra:
- **0.017€** en llamadas a Google Places API
- **Tiempo de procesamiento**
- **Espacio en base de datos**

### Ejemplo Real

Con 100 locales inválidos:
```
Sin validación: 100 × 0.017€ = 1.70€ gastados
Con validación: 0€ gastados
Ahorro: 1.70€
```

## 🚨 Casos Especiales

### Nombres con Acentos

El sistema normaliza automáticamente:
```
"Café" → "cafe" → ✅ Válido
"Cafetería" → "cafeteria" → ✅ Válido
```

### Mayúsculas/Minúsculas

No importa el formato:
```
"BAR CENTRAL" → ✅ Válido
"Bar Central" → ✅ Válido
"bar central" → ✅ Válido
```

### Nombres Compuestos

Solo necesita UNA palabra clave:
```
"Bar Farmacia" → Contiene "Bar" → ✅ Válido
"Farmacia Bar" → Contiene "Bar" → ✅ Válido
```

## 🔧 Integración Automática

El sistema se aplica automáticamente en:

### ✅ Enriquecimiento con Google Places
```
Antes de enriquecer → Valida nombre → Si inválido → No enriquece
```

### ✅ Importación desde OSM
```
Antes de importar → Valida nombre → Si inválido → No importa
```

### ✅ Limpieza Automática
```
Durante limpieza → Valida nombre → Si inválido → Excluye
```

## 📊 Monitoreo

### Ver Locales Excluidos

```
Admin → Locales Excluidos
```

Aquí verás todos los locales excluidos, incluyendo:
- Motivo de exclusión
- Fecha de exclusión
- Opción para restaurar

### Logs del Sistema

Los logs muestran:
```
[NameValidation] ✅ Nombre válido: "Bar Farmacia"
[NameValidation] ❌ Nombre inválido: "Farmacia"
[ExclusionCheck] ❌ Local excluido por nombre inválido
```

## ⚠️ Importante

1. **Los locales excluidos se pueden restaurar**
   - Ve a "Locales Excluidos"
   - Busca el local
   - Clic en "Restaurar Local"

2. **La validación es automática**
   - No necesitas hacer nada manualmente
   - El sistema filtra automáticamente

3. **Ahorra dinero**
   - Cada local filtrado ahorra 0.017€
   - Multiplica por cientos de locales = ahorro significativo

## 🆘 Solución de Problemas

### Problema: No veo locales inválidos

**Solución:**
1. Verifica que hay locales en la base de datos
2. Usa el botón de refresh (↻)
3. Cambia al filtro "Válidos" para verificar que hay datos

### Problema: Un local válido aparece como inválido

**Solución:**
1. Verifica que el nombre contiene una palabra clave
2. Revisa la lista de palabras clave válidas
3. Si es un error, contacta al administrador

### Problema: No puedo excluir locales

**Solución:**
1. Verifica que has seleccionado al menos un local
2. Asegúrate de tener permisos de administrador
3. Revisa los logs para ver errores

## 📞 Soporte

Si necesitas ayuda:

1. **Documentación completa**: `VALIDACION_NOMBRES_LOCALES.md`
2. **Implementación técnica**: `IMPLEMENTACION_VALIDACION_NOMBRES.md`
3. **Logs del sistema**: Consola del navegador
4. **Página de admin**: `/admin/validar-nombres-locales`

## ✅ Checklist Rápido

- [ ] Acceder a "Validar Nombres de Locales"
- [ ] Revisar resumen de válidos/inválidos
- [ ] Filtrar por "Inválidos"
- [ ] Revisar lista de locales
- [ ] Seleccionar locales a excluir
- [ ] Clic en "Excluir Seleccionados"
- [ ] Confirmar exclusión
- [ ] Refrescar para verificar
- [ ] Revisar "Locales Excluidos" para confirmar

## 🎉 ¡Listo!

Ahora tienes un sistema completo para validar nombres de locales y mantener tu base de datos limpia y relevante.

**Tiempo estimado**: 5-10 minutos para revisar y excluir locales inválidos.

**Ahorro estimado**: 0.017€ por cada local inválido filtrado.

**Resultado**: Base de datos limpia con solo locales de hostelería relevantes.
