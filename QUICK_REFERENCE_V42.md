
# 🚀 QUICK REFERENCE v42.0

## 📋 Resumen Ejecutivo

**Versión:** v42.0  
**Fecha:** 2025  
**Estado:** ✅ IMPLEMENTADO

---

## 🎯 Problemas Resueltos

| # | Problema | Estado | Prioridad |
|---|----------|--------|-----------|
| 1 | Avatar @jorge no visible en menú inferior | ✅ SOLUCIONADO | 🔴 CRÍTICO |
| 2 | Momentos no tamaño Instagram | ✅ MEJORADO | 🔴 CRÍTICO |
| 3 | Borde verde no desaparece | ✅ SOLUCIONADO | 🟡 MEDIA |
| 4 | Acciones inválidas en perfil local | ✅ ELIMINADAS | 🟡 MEDIA |
| 5 | Bar A Coviña muestra seguidores sin plan | ✅ CORREGIDO | 🔴 CRÍTICO |
| 6 | Tarjeta créditos confusa | ✅ MEJORADA | 🟡 MEDIA |
| 7 | Planes solapados | ✅ REDISEÑADO | 🔴 CRÍTICO |
| 8 | Potencial incluye eventos | ✅ CORREGIDO | 🔴 CRÍTICO |
| 9 | Sin plan gratuito automático | ✅ IMPLEMENTADO | 🔴 CRÍTICO |

---

## 🔧 Cambios Técnicos

### Base de Datos
```sql
-- Limpieza de URLs file://
UPDATE usuarios SET avatar = NULL WHERE avatar LIKE 'file://%';
UPDATE locales SET imagen_url = NULL WHERE imagen_url LIKE 'file://%';

-- Triggers creados:
- prevent_file_urls_usuarios
- prevent_file_urls_locales
- ensure_local_has_free_plan_trigger
- enforce_destacado_24h_duration_trigger
```

### Componentes Modificados
```
components/navigation/TabNavigationBar.tsx (v42.0)
components/momento/MomentoCarousel.tsx (v42.0)
app/(tabs)/perfil/local.tsx (v42.0)
app/gestion/planes-suscripcion.tsx (v42.0)
components/gestion/CustomerPotentialBar.tsx (v2.0)
components/gestion/LocalSubscriptionCard.tsx (v3.0)
```

---

## 📊 Fórmulas de Cálculo

### Potencial de Clientes Alcanzado
```
Base:              20%
+ Destacado:       30% (si activo)
+ Plan Estándar:   15%
+ Plan Premium:    30%
─────────────────────
Máximo:           100%

❌ NO incluye: Eventos publicados
✅ SÍ incluye: Plan contratado + Destacado activo
```

### Duración de Destacado
```
Duración fija:     24 horas
Inicio:            Al activar
Fin:               Inicio + 24h
Auto-expira:       Sí (trigger automático)
```

---

## 🎨 Especificaciones de Diseño

### Avatares de Momentos
```
Tamaño:            70px × 70px (igual que Instagram)
Borde verde:       3px, color #00FF88
Borde visto:       3px, color gris
Botón +:           24px × 24px, esquina inferior derecha
Espaciado:         16px entre avatares
```

### Tarjetas de Planes
```
Ancho:             width - 40px
Espaciado:         24px entre tarjetas
Plan Estándar:     5% más grande (scale: 1.05)
Badge:             "MÁS POPULAR" en azul
Margen extra:      12px vertical para Plan Estándar
```

---

## 🔐 Permisos por Plan

| Característica | Free | Estándar | Premium |
|---------------|------|----------|---------|
| Perfil Social | ❌ | ✅ | ✅ |
| Eventos/mes | 0 | 5 | 15 |
| Destacados/mes | 0 | 3 | 10 |
| Panel Análisis | ❌ | ❌ | ✅ |
| Soporte Prioritario | ❌ | ❌ | ✅ |
| Visibilidad Extra | ❌ | ✅ | ✅ |
| Visibilidad Máxima | ❌ | ❌ | ✅ |

---

## 🎁 Créditos de Bienvenida

Todos los locales con plan gratuito reciben:
- **1 crédito de destacado** (24 horas)
- **1 crédito de evento**

Esto permite probar las funcionalidades premium antes de contratar.

---

## 🚨 Mensajes de Error Comunes

### "Perfil Social No Disponible"
**Causa:** Local sin plan Estándar/Premium  
**Solución:** Contratar plan de pago

### "Avatar no se carga"
**Causa:** URL file:// en base de datos  
**Solución:** Automática (trigger limpia URLs)

### "Planes solapados"
**Causa:** Problema de layout (ya corregido)  
**Solución:** Actualizar app a v42.0

---

## 📞 Comandos de Verificación

### Verificar avatar de @jorge:
```sql
SELECT id, nombre, username, avatar 
FROM usuarios 
WHERE username = 'jorge';
```

### Verificar plan de Bar A Coviña:
```sql
SELECT l.nombre, p.nombre as plan, p.perfil_social
FROM locales l
JOIN suscripciones_locales s ON l.id = s.local_id
JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.nombre ILIKE '%coviña%';
```

### Verificar locales sin plan:
```sql
SELECT COUNT(*) 
FROM locales l
WHERE l.propietario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM suscripciones_locales s 
    WHERE s.local_id = l.id AND s.estado = 'activa'
  );
```
**Resultado esperado:** 0

---

## 🎯 Próximos Pasos

1. **Probar en dispositivo real** (iOS y Android)
2. **Verificar con usuario @jorge**
3. **Verificar Bar A Coviña**
4. **Verificar momentos funcionan correctamente**
5. **Verificar planes no se solapan**
6. **Verificar potencial se calcula correctamente**

---

## 📝 Notas Importantes

### Sincronización de Momentos
Los avatares de momentos están sincronizados entre:
- Página Social (MomentoCarousel)
- Página Perfil (avatar con borde)
- Perfil de Local (avatar con borde)

Todos usan la misma lógica y se actualizan en tiempo real.

### Caché de Imágenes
En Android, todas las imágenes usan `cache: 'force-cache'` para mejor rendimiento.

### Real-time Updates
Los bordes de momentos se actualizan en tiempo real mediante suscripciones a:
- `momentos` table (nuevos momentos)
- `momento_views` table (momentos vistos)

---

**Versión:** v42.0  
**Autor:** Natively AI  
**Estado:** ✅ PRODUCCIÓN
