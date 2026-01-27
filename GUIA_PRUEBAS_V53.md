
# 🧪 Guía de Pruebas v53.0

**Fecha:** 29 de Diciembre de 2024  
**Versión:** 53.0

---

## 📋 Checklist de Pruebas

### ✅ 1. Correos de Factura

**Objetivo:** Verificar que los correos de factura se envían y llegan correctamente.

**Pasos:**

1. **Acceder al panel de facturación:**
   - Ir a **Admin** > **Facturación**
   - Verificar que la página carga correctamente

2. **Crear factura de prueba:**
   - Hacer clic en "Crear Factura de Prueba"
   - Ingresar tu email personal
   - Hacer clic en "Enviar"

3. **Verificar envío:**
   - ✅ Debe mostrar mensaje: "Correo enviado con éxito"
   - ✅ Revisar bandeja de entrada (puede tardar 1-2 minutos)
   - ✅ Verificar que el correo llegó
   - ✅ Abrir el correo y verificar que se ve correctamente

4. **Verificar contenido del correo:**
   - ✅ Logo de BarLive visible
   - ✅ Número de factura correcto
   - ✅ Datos del cliente correctos
   - ✅ Datos de la empresa correctos
   - ✅ Tabla de conceptos e importes
   - ✅ Total calculado correctamente
   - ✅ Botón "Ver Factura Completa" funciona

**Resultado esperado:**
- ✅ Correo llega en menos de 2 minutos
- ✅ Plantilla HTML se ve profesional
- ✅ Todos los datos son correctos

**Si falla:**
- Revisar logs del Edge Function
- Verificar configuración de datos fiscales
- Comprobar bandeja de spam

---

### ✅ 2. Modo Propietario - Asignación Automática

**Objetivo:** Verificar que el modo Propietario asigna automáticamente el primer local.

**Pasos:**

1. **Preparación:**
   - Asegurarse de tener al menos un local asociado
   - Estar en modo Cliente inicialmente

2. **Cambiar a Modo Propietario:**
   - Ir a **Explorar**
   - Hacer clic en el selector de modo (arriba a la derecha)
   - Seleccionar **"Modo Propietario"**

3. **Verificar asignación automática:**
   - ✅ Debe asignarse automáticamente el primer local
   - ✅ El nombre del local debe aparecer en el selector
   - ✅ El modo debe cambiar a "Propietario"

4. **Verificar botones ocultos:**
   - Ir al **Mapa**
   - Abrir un local (cualquiera)
   - ✅ NO debe aparecer "Estoy en este local"
   - ✅ NO debe aparecer "Sala Virtual"

5. **Cambiar a Perfil de Usuario:**
   - Abrir el selector de perfil (icono de usuario)
   - Seleccionar **"Perfil de Usuario"**

6. **Verificar cambio automático a Cliente:**
   - ✅ El modo debe cambiar automáticamente a "Cliente"
   - ✅ El selector debe mostrar "Modo Cliente"

7. **Verificar botones visibles:**
   - Ir al **Mapa**
   - Abrir un local (cualquiera)
   - ✅ SÍ debe aparecer "Estoy en este local"
   - ✅ SÍ debe aparecer "Sala Virtual"

**Resultado esperado:**
- ✅ Asignación automática funciona
- ✅ Botones se ocultan/muestran correctamente
- ✅ Cambio de modo es automático

**Si falla:**
- Verificar que tienes locales asociados
- Revisar logs de ModeContext
- Comprobar permisos de usuario

---

### ✅ 3. Valoraciones Sincronizadas

**Objetivo:** Verificar que las valoraciones son consistentes en toda la plataforma.

**Pasos:**

1. **Identificar local con reseñas:**
   - Usar "Bar A Coviña" (tiene 2 reseñas con rating 5.0)
   - O cualquier local que tenga reseñas

2. **Verificar en popup del mapa:**
   - Ir a **Explorar** > **Mapa**
   - Buscar el local
   - Hacer clic en el marcador
   - ✅ Verificar que muestra: **5.0 ⭐ (2)**
   - ✅ NO debe mostrar: **0.0 ⭐**

3. **Verificar en página de detalles:**
   - Hacer clic en "Ver más detalles"
   - ✅ Verificar que muestra: **5.0 ⭐**
   - ✅ Verificar que coincide con el popup

4. **Verificar en tarjeta de explorar:**
   - Ir a **Explorar** > Vista de lista
   - Buscar el mismo local
   - ✅ Verificar que muestra la misma valoración

**Resultado esperado:**
- ✅ Valoración consistente en todos los puntos
- ✅ Número de reseñas visible
- ✅ No más 0.0 en ningún lugar

**Si falla:**
- Verificar que el local tiene reseñas en `reviews_barlive`
- Revisar logs de LocalDetailsModal
- Comprobar cálculo de promedio

---

### ✅ 4. Avatares de Momentos

**Objetivo:** Verificar que los avatares son más grandes y el borde más delgado.

**Pasos:**

1. **Ir a la página Social:**
   - Ir a **Social**
   - Observar la sección de Momentos en la parte superior

2. **Verificar tamaño de avatares:**
   - ✅ Los avatares deben ser notablemente más grandes
   - ✅ Comparar con versión anterior (si es posible)
   - ✅ Deben tener buen protagonismo visual

3. **Verificar grosor del borde:**
   - ✅ El borde verde neón debe ser más delgado
   - ✅ No debe cubrir la imagen
   - ✅ Debe verse elegante y equilibrado

4. **Verificar funcionalidad:**
   - ✅ Hacer clic en un avatar debe abrir el visor de momentos
   - ✅ El botón "+" debe permitir subir momentos
   - ✅ El borde verde debe indicar momentos no vistos

**Resultado esperado:**
- ✅ Avatares 14% más grandes (100px vs 88px)
- ✅ Borde 25% más delgado (1.5px vs 2px)
- ✅ Mejor estética general

**Si falla:**
- Verificar que MomentoCarousel usa AVATAR_SIZE = 100
- Verificar que UnifiedMomentoAvatar usa BORDER_WIDTH = 1.5
- Refrescar la aplicación

---

### ✅ 5. Página de Solicitudes

**Objetivo:** Verificar que la página tiene un diseño compacto y claro.

**Pasos:**

1. **Acceder a la página:**
   - Ir a **Admin** > **Solicitudes de Propietario**

2. **Verificar diseño compacto:**
   - ✅ Las tarjetas deben ser más pequeñas
   - ✅ La información debe estar bien organizada
   - ✅ Debe haber buena jerarquía visual

3. **Verificar secciones:**
   - ✅ Header con avatar y nombre de usuario
   - ✅ Sección de local bien diferenciada
   - ✅ Mensaje visible (si existe)
   - ✅ Metadata (fecha) clara
   - ✅ Botones de acción accesibles

4. **Verificar filtros:**
   - ✅ Filtros por estado funcionan
   - ✅ Búsqueda por nombre funciona
   - ✅ Contador de solicitudes correcto

**Resultado esperado:**
- ✅ Diseño más compacto y profesional
- ✅ Información clara y ordenada
- ✅ Mejor usabilidad

**Si falla:**
- Verificar que se usa el archivo actualizado
- Revisar estilos CSS
- Comprobar que hay solicitudes para mostrar

---

### ✅ 6. Configuración

**Objetivo:** Verificar que todas las funcionalidades están operativas.

**Pasos:**

1. **Acceder a Configuración:**
   - Ir a **Perfil** > **Configuración**

2. **Probar Notificaciones:**
   - ✅ Activar/desactivar notificaciones push
   - ✅ Activar/desactivar notificaciones email
   - ✅ Cambiar preferencias de notificaciones
   - ✅ Verificar que los cambios se guardan

3. **Probar Idioma:**
   - ✅ Hacer clic en "Idioma de la aplicación"
   - ✅ Seleccionar un idioma diferente
   - ✅ Verificar que se guarda

4. **Probar Privacidad:**
   - ✅ Hacer clic en "Usuarios bloqueados"
   - ✅ Verificar que abre la página
   - ✅ Hacer clic en "Cambiar contraseña"
   - ✅ Verificar que envía el correo

5. **Probar Datos:**
   - ✅ Hacer clic en "Limpiar caché"
   - ✅ Verificar que muestra el tamaño
   - ✅ Confirmar limpieza
   - ✅ Verificar que se limpia

6. **Probar Soporte:**
   - ✅ Hacer clic en "Centro de ayuda"
   - ✅ Verificar que abre la página
   - ✅ Hacer clic en "Reportar un problema"
   - ✅ Verificar que abre la página

7. **Probar Legal:**
   - ✅ Hacer clic en "Términos y condiciones"
   - ✅ Verificar que abre la página
   - ✅ Hacer clic en "Política de privacidad"
   - ✅ Verificar que abre la página

**Resultado esperado:**
- ✅ Todas las funciones operativas
- ✅ Navegación fluida
- ✅ Cambios se guardan correctamente

**Si falla:**
- Verificar que el usuario está autenticado
- Revisar logs de la aplicación
- Comprobar conexión a internet

---

## 🔍 Pruebas de Regresión

### Verificar que no se rompió nada:

1. **Login/Registro:**
   - ✅ Login con email funciona
   - ✅ Login con Google funciona
   - ✅ Registro funciona

2. **Explorar:**
   - ✅ Búsqueda de locales funciona
   - ✅ Filtros funcionan
   - ✅ Mapa funciona

3. **Social:**
   - ✅ Feed de publicaciones carga
   - ✅ Crear publicación funciona
   - ✅ Dar like funciona
   - ✅ Comentar funciona

4. **Perfil:**
   - ✅ Ver perfil propio funciona
   - ✅ Editar perfil funciona
   - ✅ Ver perfil de otros funciona

5. **Gestión (Propietarios):**
   - ✅ Mis locales carga
   - ✅ Crear evento funciona
   - ✅ Cambiar plan funciona

---

## 📊 Métricas de Éxito

### Correos de Factura
- **Tasa de entrega:** 100%
- **Tiempo de entrega:** < 2 minutos
- **Tasa de error:** 0%

### Modo Propietario
- **Asignación automática:** 100%
- **Cambio a Cliente:** 100%
- **Botones ocultos correctamente:** 100%

### Valoraciones
- **Sincronización:** 100%
- **Cálculo correcto:** 100%
- **Visibilidad:** 100%

### Avatares
- **Tamaño correcto:** 100%
- **Borde correcto:** 100%
- **Funcionalidad:** 100%

---

## 🐛 Problemas Conocidos (Ninguno)

**Todos los problemas reportados han sido resueltos.** ✅

---

## 📞 Reportar Problemas

Si encuentras algún problema durante las pruebas:

1. **Captura de pantalla:**
   - Tomar captura del error
   - Incluir toda la pantalla

2. **Logs:**
   - Abrir consola de desarrollo
   - Copiar logs relevantes
   - Buscar mensajes con `[v53.0]`

3. **Pasos para reproducir:**
   - Describir exactamente qué hiciste
   - Incluir datos de prueba usados
   - Mencionar dispositivo y versión de OS

4. **Contactar:**
   - Email: soporte@barlive.app
   - Asunto: "Error v53.0 - [Descripción breve]"
   - Adjuntar capturas y logs

---

## ✅ Checklist Final

- [ ] Correos de factura probados y funcionando
- [ ] Modo Propietario probado y funcionando
- [ ] Valoraciones verificadas y sincronizadas
- [ ] Avatares verificados (tamaño y borde)
- [ ] Página de solicitudes verificada
- [ ] Configuración probada completamente
- [ ] Pruebas de regresión pasadas
- [ ] Sin errores en consola
- [ ] Sin warnings críticos
- [ ] Rendimiento aceptable

---

**¡Listo para producción!** 🚀
