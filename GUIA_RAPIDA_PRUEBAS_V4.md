
# 🧪 GUÍA RÁPIDA DE PRUEBAS v4.0

## Pruebas Rápidas para Verificar Todas las Funcionalidades

---

## 🖼️ 1. EDITOR DE IMÁGENES (2 minutos)

### Pasos:
1. Ir a "Crear Publicación"
2. Seleccionar una foto
3. Tocar icono de edición (deslizadores)

### Verificar:
- ✅ Imagen se muestra (NO pantalla negra)
- ✅ Pellizcar acerca/aleja la imagen
- ✅ Arrastrar mueve la imagen
- ✅ Botón "Rotar" gira 90°
- ✅ Botón "Restablecer" resetea todo
- ✅ Filtros cambian apariencia
- ✅ Botón "Listo" guarda cambios

**Resultado esperado:** Editor funciona perfectamente sin pantalla negra.

---

## 🏪 2. MODAL DE DETALLES DEL LOCAL (1 minuto)

### Pasos:
1. Ir a lista de locales
2. Tocar un local

### Verificar:
- ✅ Modal se abre desde abajo
- ✅ Fondo oscurecido visible
- ✅ Puede cerrar deslizando hacia abajo
- ✅ Puede cerrar con botón X
- ✅ Animaciones suaves

**Resultado esperado:** Modal funciona con ambos métodos de cierre.

---

## 👤 3. USERNAMES AUTOMÁTICOS (3 minutos)

### Pasos:
1. Ir a perfil de "Casa Adolfo"
2. Verificar username

### Verificar:
- ✅ Username visible: @casa_adolfo
- ✅ Mostrado debajo del nombre
- ✅ Puede ser mencionado en posts

**Resultado esperado:** Todos los locales con plan tienen username.

---

## 🔒 4. VISIBILIDAD POR SUSCRIPCIÓN (5 minutos)

### Pasos:
1. Buscar local con plan activo
2. Verificar perfil visible
3. Buscar local sin plan
4. Verificar perfil oculto

### Verificar:
- ✅ Locales con plan: Perfil visible
- ✅ Locales sin plan: Perfil oculto
- ✅ No pueden publicar sin plan
- ✅ Mensaje de error claro

**Resultado esperado:** Visibilidad correcta según suscripción.

---

## 💚 5. BORDES VERDE NEÓN (2 minutos)

### Pasos:
1. Subir un momento
2. Ver perfil desde otra cuenta
3. Ver el momento
4. Volver a ver perfil

### Verificar:
- ✅ Borde verde neón antes de ver
- ✅ Borde gris después de ver
- ✅ Actualización en tiempo real

**Resultado esperado:** Bordes indican estado de momentos correctamente.

---

## 📝 6. MENÚ DE 3 PUNTOS (3 minutos)

### Pasos:
1. Ir a tu perfil
2. Tocar 3 puntos en un post
3. Probar cada opción

### Verificar:
- ✅ "Editar" abre editor de descripción
- ✅ "Gestionar etiquetas" muestra etiquetados
- ✅ "Eliminar" borra el post
- ✅ Etiquetas eliminadas no reaparecen

**Resultado esperado:** Todas las opciones funcionan correctamente.

---

## 📖 7. VER MÁS/VER MENOS (1 minuto)

### Pasos:
1. Crear post con >150 caracteres
2. Ver post en feed

### Verificar:
- ✅ Descripción truncada en 150 chars
- ✅ Botón "ver más" visible
- ✅ Tocar expande descripción completa
- ✅ Botón "ver menos" aparece
- ✅ Tocar colapsa descripción

**Resultado esperado:** Toggle funciona suavemente.

---

## ❤️ 8. DOBLE TOQUE PARA LIKE (30 segundos)

### Pasos:
1. Ver post con imagen
2. Hacer doble toque rápido en imagen

### Verificar:
- ✅ Corazón grande aparece
- ✅ Like se añade
- ✅ Contador aumenta
- ✅ Doble toque de nuevo quita like

**Resultado esperado:** Doble toque alterna like con animación.

---

## 🔔 9. BADGES SINCRONIZADOS (2 minutos)

### Pasos:
1. Abrir página Social
2. Notar número en badge de notificaciones
3. Ir a página Perfil
4. Comparar número en badge

### Verificar:
- ✅ Números idénticos en ambas páginas
- ✅ Badge rojo con número
- ✅ Actualización en tiempo real
- ✅ Mismo comportamiento para mensajes

**Resultado esperado:** Badges sincronizados perfectamente.

---

## 🏷️ 10. SISTEMA DE ETIQUETADO (3 minutos)

### Pasos:
1. Crear post y etiquetar usuario
2. Verificar notificación recibida
3. Eliminar etiqueta
4. Refrescar página

### Verificar:
- ✅ Notificación con nombre correcto (no "Usuario")
- ✅ Notificación con fecha correcta (no "Invalid Date")
- ✅ Usuario puede aprobar/rechazar
- ✅ Etiqueta eliminada no reaparece

**Resultado esperado:** Sistema de etiquetado robusto y confiable.

---

## 🎬 11. VISOR DE MOMENTOS (2 minutos)

### Pasos:
1. Ver momento propio
2. Tocar icono de ojo (estadísticas)
3. Cerrar modal

### Verificar:
- ✅ Momento se pausa al abrir stats
- ✅ Stats muestran datos de ESTE momento
- ✅ Momento se reanuda al cerrar stats
- ✅ Barra de progreso continúa suavemente

**Resultado esperado:** Pausa/reanudación perfecta.

---

## 🛒 12. CARRITO DE COMPRAS (3 minutos)

### Pasos:
1. Login como propietario
2. Ir a Perfil
3. Verificar icono de carrito
4. Tocar icono

### Verificar:
- ✅ Icono visible en header
- ✅ Badge muestra número de artículos
- ✅ Modal de carrito se abre
- ✅ Puede eliminar artículos
- ✅ Total calculado correctamente
- ✅ Botón "Proceder al Pago" visible

**Como cliente:**
- ✅ Icono de carrito NO visible

**Resultado esperado:** Carrito solo para propietarios.

---

## 🔍 13. FILTROS AVANZADOS (1 minuto)

### Pasos:
1. Ir a Explorar
2. Tocar "Filtros Avanzados"

### Verificar:
- ✅ NO hay sección de "Rango de Precios"
- ✅ Filtros de ubicación funcionan
- ✅ Filtros de tipo funcionan
- ✅ Filtros de servicios funcionan
- ✅ Filtros de ambiente funcionan

**Resultado esperado:** Filtro de precios completamente eliminado.

---

## ⚡ PRUEBAS RÁPIDAS (5 minutos total)

### Test 1: Flujo Completo de Post
```
1. Crear post con imagen larga descripción
2. Etiquetar usuario
3. Publicar
4. Verificar:
   - Descripción truncada con "ver más"
   - Usuario etiquetado recibe notificación válida
   - Doble toque en imagen da like
   - Puede editar/eliminar desde menú
```

### Test 2: Flujo de Suscripción
```
1. Local sin plan → Sin username, perfil oculto
2. Activar plan Estándar
3. Verificar:
   - Username asignado automáticamente
   - Perfil visible en red social
   - Puede publicar posts
```

### Test 3: Flujo de Momentos
```
1. Subir momento
2. Ver desde otra cuenta
3. Verificar:
   - Borde verde neón en avatar
   - Momento se reproduce
   - Puede pausar manteniendo presionado
   - Stats muestran datos individuales
```

---

## 🎯 CHECKLIST FINAL

Antes de dar por terminadas las pruebas, verificar:

- [ ] Editor de imágenes funciona sin pantalla negra
- [ ] Modal de local se puede cerrar de 2 formas
- [ ] Usernames asignados a locales con plan
- [ ] Perfiles ocultos sin suscripción
- [ ] Bordes verde neón funcionan
- [ ] Menú de 3 puntos completo
- [ ] Ver más/menos en descripciones
- [ ] Doble toque da like
- [ ] Badges sincronizados
- [ ] Etiquetado sin notificaciones inválidas
- [ ] Momentos pausan en stats
- [ ] Carrito solo para propietarios
- [ ] Filtros sin rango de precios

---

## 🐛 SI ENCUENTRAS PROBLEMAS

### Problema: Pantalla negra en editor
**Solución:** Ya solucionado en v4.0 con `useWindowDimensions()`

### Problema: Modal no se cierra
**Solución:** Verificar gestos habilitados, probar ambos métodos

### Problema: Username no asignado
**Solución:** Verificar que el local tenga plan activo (Estándar o Premium)

### Problema: Perfil visible sin plan
**Solución:** Verificar campo `perfil_visible` en tabla locales

### Problema: Badges no sincronizados
**Solución:** Verificar suscripciones en tiempo real de Supabase

---

## ✅ CONFIRMACIÓN

Una vez completadas todas las pruebas:

**Fecha de prueba:** _________________

**Probado por:** _________________

**Resultado:** 
- [ ] ✅ TODAS LAS FUNCIONALIDADES FUNCIONAN
- [ ] ⚠️ ALGUNAS FUNCIONALIDADES NECESITAN AJUSTES
- [ ] ❌ PROBLEMAS CRÍTICOS ENCONTRADOS

**Notas adicionales:**
_________________________________________________
_________________________________________________
_________________________________________________

---

**Versión:** 4.0.0  
**Última actualización:** 2025
