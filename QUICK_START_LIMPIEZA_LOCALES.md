
# 🚀 Quick Start: Sistema de Limpieza de Locales

## ⚡ Inicio Rápido (5 minutos)

### Paso 1: Acceder al Sistema
```
Admin → Sistema de Limpieza Automática
```

### Paso 2: Ejecutar Simulación
```
✅ Modo Simulación: ON
✅ Incluir Duplicados: ON
✅ Incluir Inválidos: ON

[Ejecutar Simulación]
```

### Paso 3: Revisar Resultados
```
Resultados:
- Locales que serían eliminados: XX
- Locales que serían excluidos: XX
```

### Paso 4: Ejecutar Limpieza Real
```
❌ Modo Simulación: OFF

[Ejecutar Limpieza Real] → [Confirmar]
```

### Paso 5: Verificar
```
Admin → Locales Excluidos
(Revisar y restaurar si hay errores)
```

---

## 🎯 Qué Hace el Sistema

### Detecta y Elimina

- ❌ **Duplicados** (mismo nombre + ubicación)
- ❌ **Inválidos** (sin ubicación, cerrados, tipos prohibidos)
- ❌ **Fuera de España**
- ❌ **Tipos prohibidos** (gimnasios, hoteles, etc.)

### Previene

- 🚫 Re-enriquecimiento de locales excluidos
- 🚫 Re-importación desde OSM
- 🚫 Creación de nuevos duplicados

### Ahorra

- 💰 ~$3.50 por ejecución
- 💰 ~$1,277.50 al año (si se ejecuta diariamente)

---

## 📱 Páginas Disponibles

| Página | Ruta | Función |
|--------|------|---------|
| **Sistema de Limpieza** | `/admin/sistema-limpieza-automatica` | Ejecutar limpieza completa |
| **Locales Inválidos** | `/admin/revisar-locales-invalidos` | Revisar y excluir inválidos |
| **Locales Excluidos** | `/admin/locales-excluidos` | Ver y restaurar excluidos |
| **Gestionar Duplicados** | `/admin/gestionar-duplicados` | Eliminar duplicados manualmente |

---

## ⚠️ Importante

### Modo Simulación vs Real

- **Simulación (ON):** No hace cambios, solo muestra qué haría
- **Real (OFF):** Hace cambios permanentes, no se puede deshacer

### Eliminación vs Exclusión

- **Duplicados:** Se ELIMINAN permanentemente (no se pueden recuperar)
- **Inválidos:** Se EXCLUYEN (se pueden restaurar)

### Siempre

1. ✅ Ejecuta primero en modo simulación
2. ✅ Revisa los resultados cuidadosamente
3. ✅ Verifica que los duplicados sean realmente duplicados
4. ✅ Ejecuta en modo real solo si estás seguro

---

## 🔄 Flujo Recomendado

```
1. Importar locales desde OSM
   ↓
2. Ejecutar limpieza automática (simulación)
   ↓
3. Revisar resultados
   ↓
4. Ejecutar limpieza automática (real)
   ↓
5. Verificar locales excluidos
   ↓
6. Enriquecer locales válidos con Google
   ↓
7. Repetir semanalmente o después de importaciones
```

---

## 💡 Tips

- 📅 Ejecuta limpieza después de cada importación masiva
- 📅 Revisa locales excluidos mensualmente
- 📅 Configura cron job para limpieza automática diaria
- 💾 Siempre haz backup antes de limpieza masiva
- 🔍 Usa modo simulación para probar cambios

---

## 📞 ¿Necesitas Ayuda?

- 📖 Documentación completa: `SISTEMA_LIMPIEZA_AUTOMATICA.md`
- 📖 Guía de usuario: `GUIA_RAPIDA_LIMPIEZA_AUTOMATICA.md`
- 📖 Implementación técnica: `SISTEMA_LIMPIEZA_IMPLEMENTACION_COMPLETA.md`

---

## ✅ Checklist Rápido

- [ ] Acceder a sistema de limpieza
- [ ] Ejecutar simulación
- [ ] Revisar resultados
- [ ] Ejecutar limpieza real
- [ ] Verificar locales excluidos
- [ ] Restaurar falsos positivos
- [ ] Configurar cron job (opcional)

---

**¡Listo en 5 minutos!** 🎉
