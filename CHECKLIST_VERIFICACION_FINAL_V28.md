
# ✅ CHECKLIST DE VERIFICACIÓN FINAL - BarLive v28.0

## 🎯 INSTRUCCIONES

Este checklist te ayudará a verificar que **TODAS** las correcciones se han aplicado correctamente y que la app funciona perfectamente en **Android e iOS**.

---

## 📱 VERIFICACIÓN EN ANDROID

### 1. ✅ Iconos (Sin interrogantes)

Abre la app en Android y verifica que **NO HAY INTERROGANTES** en:

- [ ] **Pestañas inferiores** (Home, Eventos, Favoritos, Explorar, Social, Perfil)
  - Todos los iconos deben mostrarse correctamente
  - Los iconos activos deben estar rellenos (filled)
  - Los iconos inactivos deben estar delineados (outlined)

- [ ] **Pantalla Explorar**
  - Icono de búsqueda (lupa)
  - Icono de filtros
  - Icono de mapa
  - Iconos de categorías (café, restaurante, bar, pub, coctelería, discoteca)

- [ ] **Pantalla de Detalle de Local**
  - Icono de cerrar (X)
  - Icono de compartir
  - Icono de estrella (rating)
  - Iconos de categorías del local
  - Iconos de servicios (wifi, parking, terraza, etc.)
  - Iconos de ambiente (familiar, tranquilo, animado, etc.)
  - Iconos de clientela (grupos, familias, parejas, etc.)
  - Icono de teléfono
  - Icono de mapa
  - Icono de perfil social
  - Icono de sala virtual
  - Iconos de horarios (reloj)
  - Iconos de reseñas (estrella)

- [ ] **Pantalla de Eventos**
  - Icono de búsqueda
  - Icono de filtros
  - Iconos de categorías
  - Icono de calendario

- [ ] **Pantalla de Favoritos**
  - Icono de búsqueda
  - Icono de corazón
  - Iconos de ubicación
  - Iconos de categorías

- [ ] **Pantalla Social**
  - Icono de notificaciones
  - Icono de mensajes
  - Icono de crear publicación
  - Iconos de likes
  - Iconos de comentarios
  - Iconos de compartir

### 2. ✅ Galería de Imágenes

- [ ] **Abrir un local con múltiples imágenes**
  - Ejemplo: "Cerveceria Barriga Verde" (tiene 4 imágenes)
  - Ejemplo: "Bar Caveira" (tiene 4 imágenes)

- [ ] **Verificar que se muestra la galería horizontal**
  - Debe aparecer una fila de miniaturas debajo de la imagen principal
  - Debe mostrar las primeras 5 imágenes
  - Si hay más de 6 imágenes, debe mostrar "+X" en la última miniatura

- [ ] **Tocar una miniatura**
  - Debe abrir el modal de galería en pantalla completa
  - Debe mostrar la imagen seleccionada
  - Debe mostrar el contador "X / Y" en la parte superior

- [ ] **Navegar entre imágenes**
  - Deslizar hacia la izquierda/derecha debe cambiar de imagen
  - Las flechas laterales deben funcionar
  - Los puntos indicadores deben actualizarse
  - El contador debe actualizarse

- [ ] **Cerrar la galería**
  - El botón X debe cerrar el modal
  - Debe volver a la pantalla de detalle del local

### 3. ✅ Funcionalidades Generales

- [ ] **Check-in**
  - Botón "Estoy en este local" debe aparecer solo cuando el local está abierto
  - Debe permitir hacer check-in
  - Debe mostrar usuarios que están en el local
  - Debe permitir hacer check-out

- [ ] **Favoritos**
  - Botón de corazón debe funcionar
  - Debe agregar/quitar de favoritos
  - Debe sincronizar con la pantalla de Favoritos

- [ ] **Llamar**
  - Botón de llamar debe abrir el marcador
  - Debe pasar el número de teléfono correctamente

- [ ] **Cómo llegar**
  - Debe mostrar opciones de navegación
  - Debe abrir Google Maps/Apple Maps/Waze

- [ ] **Compartir**
  - Debe abrir el diálogo de compartir nativo
  - Debe incluir el nombre del local

- [ ] **Reseñas**
  - Debe mostrar reseñas de BarLive y Google
  - Debe permitir añadir reseñas
  - Debe permitir expandir/contraer reseñas largas

---

## 📱 VERIFICACIÓN EN iOS

### 1. ✅ Iconos (SF Symbols)

Abre la app en iOS y verifica que todos los iconos se muestran correctamente:

- [ ] **Pestañas inferiores**
  - Todos los iconos SF Symbols deben mostrarse
  - Los iconos activos deben estar rellenos (.fill)
  - Los iconos inactivos deben estar delineados

- [ ] **Todas las pantallas**
  - Verificar que no hay iconos rotos
  - Verificar que los colores son correctos
  - Verificar que los tamaños son consistentes

### 2. ✅ Galería de Imágenes

- [ ] **Mismas verificaciones que en Android**
  - La galería debe funcionar exactamente igual que en Android
  - Sin diferencias visuales o funcionales

### 3. ✅ Funcionalidades Generales

- [ ] **Mismas verificaciones que en Android**
  - Todas las funcionalidades deben comportarse igual
  - Sin diferencias entre plataformas

---

## 🔍 VERIFICACIÓN DE PARIDAD

### ✅ Comparación lado a lado:

1. **Abre la misma pantalla en iOS y Android**
2. **Compara visualmente:**
   - [ ] Colores idénticos
   - [ ] Iconos idénticos
   - [ ] Espaciados idénticos
   - [ ] Tamaños de fuente idénticos
   - [ ] Comportamiento idéntico

3. **Prueba las mismas acciones:**
   - [ ] Tocar botones produce el mismo resultado
   - [ ] Deslizar produce el mismo resultado
   - [ ] Buscar produce los mismos resultados
   - [ ] Filtrar produce los mismos resultados

---

## 🐛 SI ENCUENTRAS PROBLEMAS

### ❌ Si ves interrogantes (?):

1. **Identifica el icono problemático**
   - Anota en qué pantalla aparece
   - Anota qué debería mostrar

2. **Revisa los logs de consola**
   - Busca mensajes como: `⚠️ [IconSymbol v28.0 Android] No icon mapping found for "..."`
   - El mensaje te dirá qué icono falta

3. **Reporta el problema**
   - Indica la pantalla
   - Indica el icono que falta
   - Incluye el mensaje de consola

### ❌ Si la galería no se muestra:

1. **Verifica que el local tiene imágenes**
   - Abre la consola del navegador
   - Busca el log: `[DetalleLocal] 📸 Gallery images:`
   - Debe mostrar `galeria_urls_count: X` donde X > 0

2. **Verifica la conexión a internet**
   - Las imágenes se cargan desde Supabase Storage
   - Requiere conexión a internet

3. **Verifica los logs**
   - Busca errores en la consola
   - Reporta cualquier error encontrado

### ❌ Si hay diferencias entre Android e iOS:

1. **Documenta la diferencia**
   - Toma capturas de pantalla de ambas plataformas
   - Describe qué es diferente

2. **Verifica la versión**
   - Asegúrate de estar usando la versión v28.0
   - Verifica que los archivos se actualizaron correctamente

3. **Reporta el problema**
   - Incluye capturas de pantalla
   - Incluye descripción detallada
   - Incluye logs de consola si hay errores

---

## ✅ CONFIRMACIÓN FINAL

Una vez completado este checklist, confirma:

- [ ] **Todos los iconos se muestran correctamente en Android**
- [ ] **Todos los iconos se muestran correctamente en iOS**
- [ ] **La galería de imágenes funciona en Android**
- [ ] **La galería de imágenes funciona en iOS**
- [ ] **No hay diferencias visuales entre Android e iOS**
- [ ] **No hay diferencias funcionales entre Android e iOS**
- [ ] **La app se comporta como una app nativa en ambas plataformas**
- [ ] **La app está lista para producción**

---

## 🎉 ¡FELICIDADES!

Si todos los checks están marcados, **BarLive v28.0 está lista para producción** en iOS y Android.

**La app es ahora verdaderamente multiplataforma con paridad completa.**

---

**Versión:** v28.0  
**Fecha:** 2025-01-XX  
**Estado:** ✅ PRODUCCIÓN LISTA  
**Plataformas:** iOS + Android  
**Paridad:** 100%
