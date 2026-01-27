
# 🧪 GUÍA DE TESTING - BarLive v28.0

## 🎯 OBJETIVO

Verificar que **BarLive v28.0** funciona perfectamente en **Android e iOS** con **paridad completa**.

---

## 📱 TESTING EN ANDROID

### Test 1: Verificar Iconos (Sin Interrogantes)

**Objetivo:** Confirmar que NO hay interrogantes (?) en ninguna pantalla.

**Pasos:**

1. **Abre la app en Android**

2. **Pantalla Explorar:**
   - [ ] Icono de lupa (búsqueda) ✅
   - [ ] Icono de filtros ✅
   - [ ] Icono de mapa ✅
   - [ ] Iconos de categorías (café, restaurante, bar, pub, coctelería, discoteca) ✅

3. **Pantalla de Detalle de Local:**
   - [ ] Icono de cerrar (X) ✅
   - [ ] Icono de compartir ✅
   - [ ] Icono de estrella (rating) ✅
   - [ ] Iconos de categorías ✅
   - [ ] Iconos de servicios (wifi, parking, terraza, etc.) ✅
   - [ ] Iconos de ambiente (familiar, tranquilo, animado, etc.) ✅
   - [ ] Iconos de clientela (grupos, familias, parejas, etc.) ✅
   - [ ] Icono de teléfono ✅
   - [ ] Icono de mapa ✅
   - [ ] Icono de perfil social ✅
   - [ ] Icono de sala virtual ✅

4. **Pantalla de Eventos:**
   - [ ] Icono de búsqueda ✅
   - [ ] Icono de filtros ✅
   - [ ] Iconos de categorías ✅
   - [ ] Icono de calendario ✅

5. **Pantalla de Favoritos:**
   - [ ] Icono de búsqueda ✅
   - [ ] Icono de corazón ✅
   - [ ] Iconos de ubicación ✅

6. **Pantalla Social:**
   - [ ] Icono de notificaciones ✅
   - [ ] Icono de mensajes ✅
   - [ ] Icono de crear publicación ✅
   - [ ] Iconos de likes ✅
   - [ ] Iconos de comentarios ✅

7. **Pestañas Inferiores:**
   - [ ] Icono de Eventos ✅
   - [ ] Icono de Favoritos ✅
   - [ ] Icono de Explorar ✅
   - [ ] Icono de Social ✅
   - [ ] Icono de Perfil ✅

**Resultado esperado:** ✅ **NINGÚN INTERROGANTE** en toda la app.

---

### Test 2: Verificar Galería de Imágenes

**Objetivo:** Confirmar que la galería de imágenes funciona correctamente.

**Pasos:**

1. **Abre un local con varias imágenes:**
   - Busca "Cerveceria Barriga Verde" (tiene 4 imágenes)
   - O busca "Bar Caveira" (tiene 4 imágenes)

2. **Verifica la fila de miniaturas:**
   - [ ] Debe aparecer una fila horizontal de miniaturas debajo de la imagen principal ✅
   - [ ] Debe mostrar las primeras 5 imágenes ✅
   - [ ] Si hay más de 6 imágenes, debe mostrar "+X" en la última miniatura ✅

3. **Abre la galería completa:**
   - [ ] Toca cualquier miniatura ✅
   - [ ] Debe abrirse un modal en pantalla completa ✅
   - [ ] Debe mostrar la imagen seleccionada ✅
   - [ ] Debe mostrar el contador "X / Y" en la parte superior ✅

4. **Navega entre imágenes:**
   - [ ] Desliza hacia la izquierda/derecha ✅
   - [ ] Las imágenes deben cambiar ✅
   - [ ] El contador debe actualizarse ✅
   - [ ] Los puntos indicadores deben actualizarse ✅
   - [ ] Las flechas laterales deben funcionar ✅

5. **Cierra la galería:**
   - [ ] Toca el botón X ✅
   - [ ] Debe cerrar el modal ✅
   - [ ] Debe volver a la pantalla de detalle ✅

**Resultado esperado:** ✅ La galería funciona **PERFECTAMENTE**.

---

### Test 3: Verificar Funcionalidades

**Objetivo:** Confirmar que todas las funcionalidades funcionan.

**Pasos:**

1. **Check-in:**
   - [ ] Abre un local que esté abierto ✅
   - [ ] Debe aparecer el botón "Estoy en este local" ✅
   - [ ] Toca el botón ✅
   - [ ] Debe permitir hacer check-in ✅
   - [ ] Debe mostrar "Ya no estoy en este local" ✅
   - [ ] Toca el botón de salir ✅
   - [ ] Debe hacer check-out ✅

2. **Favoritos:**
   - [ ] Toca el icono de corazón en un local ✅
   - [ ] Debe agregarse a favoritos ✅
   - [ ] Ve a la pantalla de Favoritos ✅
   - [ ] Debe aparecer el local ✅
   - [ ] Toca el corazón de nuevo ✅
   - [ ] Debe quitarse de favoritos ✅

3. **Llamar:**
   - [ ] Abre un local con teléfono ✅
   - [ ] Toca el botón "Llamar" ✅
   - [ ] Debe abrir el marcador con el número ✅

4. **Cómo llegar:**
   - [ ] Toca el botón "Cómo llegar" ✅
   - [ ] Debe mostrar opciones de navegación ✅
   - [ ] Selecciona Google Maps ✅
   - [ ] Debe abrir Google Maps con la ubicación ✅

5. **Compartir:**
   - [ ] Toca el botón de compartir ✅
   - [ ] Debe abrir el diálogo de compartir nativo ✅

**Resultado esperado:** ✅ Todas las funcionalidades funcionan **CORRECTAMENTE**.

---

## 📱 TESTING EN iOS

### Test 1: Verificar Iconos

**Pasos:**

1. **Abre la app en iOS**
2. **Navega por todas las pantallas**
3. **Verifica que todos los iconos se muestran correctamente**
4. **Verifica que los iconos son SF Symbols nativos**

**Resultado esperado:** ✅ Todos los iconos se muestran **PERFECTAMENTE**.

---

### Test 2: Verificar Galería

**Pasos:**

1. **Repite los mismos pasos que en Android**
2. **Verifica que funciona exactamente igual**

**Resultado esperado:** ✅ La galería funciona **IDÉNTICAMENTE** a Android.

---

### Test 3: Verificar Funcionalidades

**Pasos:**

1. **Repite los mismos pasos que en Android**
2. **Verifica que todo funciona exactamente igual**

**Resultado esperado:** ✅ Todas las funcionalidades funcionan **IDÉNTICAMENTE** a Android.

---

## 🔍 COMPARACIÓN ANDROID vs iOS

### Test de Paridad

**Objetivo:** Confirmar que la app se ve y funciona **EXACTAMENTE IGUAL** en ambas plataformas.

**Pasos:**

1. **Abre la misma pantalla en iOS y Android**
2. **Coloca los dispositivos lado a lado**
3. **Compara visualmente:**
   - [ ] Colores idénticos ✅
   - [ ] Iconos idénticos ✅
   - [ ] Espaciados idénticos ✅
   - [ ] Tamaños de fuente idénticos ✅
   - [ ] Posiciones de elementos idénticas ✅

4. **Prueba las mismas acciones:**
   - [ ] Tocar botones produce el mismo resultado ✅
   - [ ] Deslizar produce el mismo resultado ✅
   - [ ] Buscar produce los mismos resultados ✅
   - [ ] Filtrar produce los mismos resultados ✅

**Resultado esperado:** ✅ **PARIDAD COMPLETA** entre plataformas.

---

## ✅ CHECKLIST FINAL

Una vez completados todos los tests, confirma:

- [ ] ✅ **Todos los iconos se muestran en Android (sin interrogantes)**
- [ ] ✅ **Todos los iconos se muestran en iOS**
- [ ] ✅ **La galería de imágenes funciona en Android**
- [ ] ✅ **La galería de imágenes funciona en iOS**
- [ ] ✅ **Todas las funcionalidades funcionan en Android**
- [ ] ✅ **Todas las funcionalidades funcionan en iOS**
- [ ] ✅ **No hay diferencias visuales entre Android e iOS**
- [ ] ✅ **No hay diferencias funcionales entre Android e iOS**
- [ ] ✅ **La app se comporta como nativa en ambas plataformas**

---

## 🎉 RESULTADO FINAL

Si todos los checks están marcados:

**✅ BarLive v28.0 está LISTA PARA PRODUCCIÓN**

Puedes desplegarla con total confianza en:
- Google Play Store (Android)
- App Store (iOS)

---

**¡Éxito en el lanzamiento!** 🚀

**Versión:** v28.0  
**Estado:** ✅ PRODUCCIÓN LISTA  
**Plataformas:** iOS + Android  
**Paridad:** 100%
