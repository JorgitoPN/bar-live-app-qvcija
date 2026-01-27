
# ✅ VERIFICACIÓN DE IMPLEMENTACIÓN V11.0

## 🎯 LISTA DE VERIFICACIÓN COMPLETA

Este documento te ayudará a verificar que todas las características implementadas funcionan correctamente.

---

## 1. 🔔 NOTIFICACIONES - REDIRECCIÓN CORRECTA

### Cómo probar:
1. Crea una notificación de prueba (like, comentario, seguidor)
2. Ve a la página de notificaciones
3. Haz clic en la notificación

### ✅ Debe funcionar:
- [ ] Notificación de like → Abre la publicación
- [ ] Notificación de comentario → Abre la publicación con el comentario
- [ ] Notificación de seguidor → Abre el perfil del usuario
- [ ] Notificación de mención → Abre la publicación
- [ ] No se queda en pantalla vacía
- [ ] La notificación se marca como leída

### 🐛 Si no funciona:
- Revisa los logs de la consola
- Verifica que la notificación tenga `post_id`, `comentario_id`, etc.
- Comprueba que el contenido existe en la base de datos

---

## 2. 💬 ICONO DE MENSAJE NO LEÍDO - PERSISTENCIA

### Cómo probar:
1. Envía un mensaje a otro usuario
2. Con el otro usuario, ve a la lista de chats
3. Verifica que aparece el icono de no leído
4. Abre el chat
5. El icono debe desaparecer
6. **IMPORTANTE:** Refresca la página (F5 o pull-to-refresh)
7. El icono NO debe reaparecer

### ✅ Debe funcionar:
- [ ] Icono aparece cuando hay mensajes no leídos
- [ ] Icono desaparece al abrir el chat
- [ ] Icono NO reaparece después de refrescar
- [ ] Contador de mensajes no leídos es correcto

### 🐛 Si no funciona:
- Verifica que `leido_at` se está guardando en la base de datos
- Comprueba la query SQL que cuenta mensajes no leídos
- Revisa los logs de la consola

---

## 3. ⚡ ACTUALIZACIONES EN TIEMPO REAL

### Cómo probar:
1. Abre la misma publicación en dos dispositivos/navegadores
2. En el dispositivo 1, da "me gusta"
3. En el dispositivo 2, observa

### ✅ Debe funcionar:
- [ ] El corazón se llena automáticamente en dispositivo 2
- [ ] El contador de likes se actualiza automáticamente
- [ ] Los miniavatares se actualizan automáticamente
- [ ] No es necesario refrescar la página
- [ ] La actualización es instantánea (< 1 segundo)

### 🐛 Si no funciona:
- Verifica que Supabase Realtime esté habilitado
- Comprueba los logs de la consola para ver si la suscripción está activa
- Revisa que no haya errores en la suscripción

---

## 4. 📸 COMPARTIR MOMENTOS CON CAPTURA AUTOMÁTICA

### Cómo probar:
1. Crea un momento (foto/video)
2. Abre el visor de momentos
3. Haz clic en "Mensaje"
4. Selecciona un destinatario
5. Envía el mensaje

### ✅ Debe funcionar:
- [ ] Se captura automáticamente una imagen del momento
- [ ] El mensaje incluye la captura
- [ ] La captura se ve en el chat
- [ ] No es necesario tomar screenshot manualmente

### 🐛 Si no funciona:
- Verifica que el bucket `momentos` existe en Supabase Storage
- Comprueba las políticas de acceso del bucket
- Revisa los logs de la consola para errores de captura

---

## 5. 🖼️ CAPTURAS DE MOMENTOS CLICABLES

### Cómo probar:
1. Abre un chat que contenga una captura de momento
2. Haz clic en la captura

### ✅ Debe funcionar:
- [ ] Se abre el visor de momentos
- [ ] Se muestra el momento original (si no ha caducado)
- [ ] La navegación es correcta

### 🐛 Si no funciona:
- Verifica que `momento_id` está guardado en el mensaje
- Comprueba que el momento aún existe en la base de datos
- Revisa los logs de navegación

---

## 6. ⏰ MOMENTOS CADUCADOS EN MENSAJES

### Cómo probar:
1. Crea un momento
2. Comparte el momento en un mensaje
3. Espera 24 horas (o elimina el momento manualmente)
4. Abre el chat

### ✅ Debe funcionar:
- [ ] La captura desaparece
- [ ] Se muestra el texto: "El momento ya no está disponible."
- [ ] Se muestra un icono de reloj
- [ ] Se muestra texto explicativo

### 🐛 Si no funciona:
- Verifica la lógica de expiración en `MomentoMessageBubble.tsx`
- Comprueba que la suscripción en tiempo real está activa
- Revisa los logs de la consola

---

## 7. 📋 TARJETA DE PERFIL COMPACTA

### Cómo probar:
1. Haz check-in en un local
2. Ve a tu perfil
3. Observa la sección "Estado actual"

### ✅ Debe funcionar:
- [ ] Se muestra una tarjeta compacta con gradiente verde
- [ ] Muestra "Estado actual" como título
- [ ] Muestra información de visibilidad (ej: "Compartido con mis seguidores")
- [ ] Muestra badge "EN VIVO"
- [ ] Muestra imagen del local
- [ ] Muestra nombre y dirección del local
- [ ] Muestra botón "Salir del local" en rojo
- [ ] Todo está en un solo bloque compacto

### 🐛 Si no funciona:
- Verifica que el check-in existe en la base de datos
- Comprueba que la información del local se carga correctamente
- Revisa los estilos CSS

---

## 8. 🔄 SELECTOR DE PERFIL SINCRONIZADO

### Cómo probar:
1. Usuario @jorge que antes era propietario de "Momo"
2. Elimina a @jorge como propietario de "Momo" en la base de datos
3. @jorge abre el selector de perfil

### ✅ Debe funcionar:
- [ ] "Momo" NO aparece en "Mis Locales"
- [ ] Solo aparecen locales que @jorge posee actualmente
- [ ] La lista se actualiza al abrir el modal
- [ ] No hay locales obsoletos

### 🐛 Si no funciona:
- Verifica la tabla `propietarios_locales`
- Comprueba que `loadOwnedLocals()` se ejecuta al abrir el modal
- Revisa los logs de la consola

---

## 9. 🖼️ ICONOS ELIMINADOS DE PUBLICACIONES

### Cómo probar:
1. Ve a tu perfil o al perfil de otro usuario
2. Observa la cuadrícula de publicaciones
3. Haz clic en una publicación para abrirla

### ✅ Debe funcionar:
- [ ] NO hay icono de dos usuarios en la esquina superior derecha de las publicaciones en la cuadrícula
- [ ] Solo se muestra el indicador de múltiples imágenes (si aplica)
- [ ] Al abrir la publicación, NO aparece el icono de opciones (tres puntos)
- [ ] La cuadrícula se ve limpia y minimalista

### 🐛 Si no funciona:
- Verifica que `hideTagIcon={true}` se pasa a PostViewerModal
- Comprueba que el renderizado de la cuadrícula no incluye el icono de etiquetas
- Revisa los estilos

---

## 10. 🗺️ MAPA - FILTRO POR DEFECTO "ABIERTOS"

### Cómo probar:
1. Abre la página del mapa
2. Observa el selector de estado

### ✅ Debe funcionar:
- [ ] El selector muestra "Abiertos" seleccionado por defecto
- [ ] Solo se muestran locales abiertos en el mapa
- [ ] El toggle switch tiene diseño moderno (tipo interruptor)
- [ ] Puedes cambiar a "Todos" haciendo clic
- [ ] El filtro se aplica correctamente

### 🐛 Si no funciona:
- Verifica que `filtroEstado` se inicializa como 'abiertos'
- Comprueba la lógica de filtrado
- Revisa los estilos del toggle switch

---

## 11. 🚪 EXPULSIÓN AUTOMÁTICA DE LOCALES CERRADOS

### Cómo probar:
1. Haz check-in en un local que está abierto
2. Cambia el horario del local para que esté cerrado
3. Espera 15 minutos (o ejecuta el Edge Function manualmente)

### ✅ Debe funcionar:
- [ ] El usuario es eliminado del check-in automáticamente
- [ ] El usuario recibe una notificación
- [ ] El perfil del usuario se actualiza
- [ ] Ya no muestra que está en el local

### 🐛 Si no funciona:
- Verifica que el cron job está activo
- Comprueba los logs de la Edge Function
- Revisa que los horarios del local están correctos
- Ejecuta manualmente la función para probar

### Ejecutar manualmente:
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

---

## 🔍 VERIFICACIÓN DE LOGS

### Logs que debes ver en la consola:

#### Notificaciones
```
[Notificaciones] ✅ Redirecting to post: abc123
[Notificaciones] ✅ Redirecting to user profile: def456
```

#### Mensajes
```
[Chats] ✅ Messages marked as read in database
[Chats] ✅ UI updated optimistically
```

#### Likes
```
[InstagramPostCard] 🔄 Real-time like change detected
[InstagramPostCard] ✅ Updated likes count: 5
[PostLikesAvatars] 🔄 Real-time like update detected
[PostLikesAvatars] ✅ Updated likes count: 5
```

#### Momentos
```
[MomentoViewer] 📸 Capturing momento screenshot...
[MomentoViewer] ✅ Screenshot captured: file://...
[MomentoViewer] ✅ Screenshot uploaded: https://...
[MomentoViewer] ✅ Momento message sent with screenshot
```

#### Auto-Checkout
```
🔄 [AUTO-CHECKOUT] Starting auto-checkout process...
✅ [AUTO-CHECKOUT] Found 5 active check-ins
🚪 [AUTO-CHECKOUT] Local "Bar San Roque" is CLOSED, removing user abc123
✅ [AUTO-CHECKOUT] Check-outs completed: 1 successful, 0 failed
```

---

## 📊 VERIFICACIÓN DE BASE DE DATOS

### Verificar mensajes leídos:
```sql
SELECT id, contenido, leido, leido_at
FROM mensajes
WHERE chat_id = 'tu-chat-id'
ORDER BY created_at DESC;
```

**Esperado:**
- `leido = true` para mensajes leídos
- `leido_at` tiene timestamp para mensajes leídos

### Verificar notificaciones leídas:
```sql
SELECT id, mensaje, leida, leida_at
FROM notificaciones
WHERE usuario_id = 'tu-usuario-id'
ORDER BY created_at DESC;
```

**Esperado:**
- `leida = true` para notificaciones leídas
- `leida_at` tiene timestamp para notificaciones leídas

### Verificar capturas de momentos:
```sql
SELECT id, contenido, tipo_mensaje, momento_id, momento_screenshot_url
FROM mensajes
WHERE tipo_mensaje = 'momento'
ORDER BY created_at DESC;
```

**Esperado:**
- `momento_id` está presente
- `momento_screenshot_url` tiene URL de Supabase Storage

### Verificar propietarios de locales:
```sql
SELECT pl.*, l.nombre as local_nombre, u.nombre as propietario_nombre
FROM propietarios_locales pl
JOIN locales l ON l.id = pl.local_id
JOIN usuarios u ON u.id = pl.propietario_id
WHERE pl.activo = true
ORDER BY pl.created_at DESC;
```

**Esperado:**
- Solo aparecen relaciones activas
- @jorge NO aparece como propietario de "Momo" si ya no lo es

### Verificar check-ins:
```sql
SELECT c.*, u.nombre as usuario_nombre, l.nombre as local_nombre
FROM check_ins c
JOIN usuarios u ON u.id = c.usuario_id
JOIN locales l ON l.id = c.local_id
ORDER BY c.created_at DESC;
```

**Esperado:**
- No hay usuarios en locales cerrados
- Todos los check-ins son de locales abiertos

---

## 🔄 VERIFICACIÓN DE REAL-TIME

### Probar suscripciones:
1. Abre la consola del navegador
2. Busca logs que digan "Setting up real-time subscription"
3. Realiza una acción (like, mensaje, etc.)
4. Busca logs que digan "Real-time update detected"

### ✅ Logs esperados:
```
[InstagramPostCard] 🔄 Setting up real-time like subscription for post: abc123
[InstagramPostCard] 🔄 Real-time like change detected: {...}
[InstagramPostCard] ✅ Updated likes count: 5
```

```
[Chats] 🔄 Setting up real-time subscription for message updates
[Chats] 🔄 Message update detected: {...}
[Chats] ✅ Messages marked as read in database
```

```
[PostLikesAvatars] 🔄 Setting up real-time subscription for post: abc123
[PostLikesAvatars] 🔄 Real-time like update detected: {...}
[PostLikesAvatars] ✅ Updated likes count: 5
```

---

## 🎨 VERIFICACIÓN VISUAL

### Tarjeta de Estado Actual
- [ ] Gradiente verde en el header
- [ ] Icono de ubicación con pulso animado
- [ ] Badge "EN VIVO" visible
- [ ] Texto de visibilidad correcto
- [ ] Tarjeta blanca con borde verde
- [ ] Imagen del local visible
- [ ] Nombre y dirección del local
- [ ] Botón "Salir del local" en rojo

### Toggle Switch del Mapa
- [ ] Diseño tipo interruptor
- [ ] Fondo blanco/gris claro
- [ ] Opción activa con fondo del color primario
- [ ] Texto blanco en opción activa
- [ ] Sombra y elevación visible
- [ ] Animación suave al cambiar

### Cuadrícula de Perfil
- [ ] Sin icono de etiquetas en publicaciones
- [ ] Solo indicador de múltiples imágenes
- [ ] Diseño limpio y ordenado

---

## 🔧 VERIFICACIÓN DE EDGE FUNCTION

### Verificar que está desplegada:
1. Ve a Supabase Dashboard
2. Edge Functions → `auto-checkout-closed-locals`
3. Verifica que el estado es "ACTIVE"

### Verificar logs:
1. En la misma página, ve a la pestaña "Logs"
2. Busca ejecuciones recientes

### ✅ Logs esperados:
```
🔄 [AUTO-CHECKOUT] Starting auto-checkout process...
⏰ [AUTO-CHECKOUT] Current time: 2025-01-20T08:15:00.000Z
✅ [AUTO-CHECKOUT] Found 5 active check-ins
🔍 [AUTO-CHECKOUT] Checking 3 unique locals
✅ [AUTO-CHECKOUT] Loaded 3 locals
🚪 [AUTO-CHECKOUT] Local "Bar San Roque" is CLOSED, removing user abc123
✅ [AUTO-CHECKOUT] Check-outs completed: 1 successful, 0 failed
📬 [AUTO-CHECKOUT] Sent 1 notifications
```

### Ejecutar manualmente:
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

---

## 📋 CHECKLIST FINAL

### Funcionalidades Básicas
- [ ] Notificaciones redirigen correctamente
- [ ] Mensajes no leídos persisten después de refrescar
- [ ] Likes se actualizan en tiempo real
- [ ] Contador de likes se actualiza en tiempo real
- [ ] Miniavatares se actualizan en tiempo real

### Momentos
- [ ] Captura automática al compartir
- [ ] Capturas clicables en mensajes
- [ ] Mensaje de caducidad cuando expira

### Perfil
- [ ] Tarjeta de estado actual compacta
- [ ] Selector de perfil sincronizado
- [ ] Sin iconos en cuadrícula de publicaciones

### Mapa
- [ ] Filtro por defecto "Abiertos"
- [ ] Toggle switch funciona correctamente

### Auto-Checkout
- [ ] Cron job activo
- [ ] Edge Function ejecutándose
- [ ] Usuarios expulsados de locales cerrados
- [ ] Notificaciones enviadas

---

## 🎯 ESCENARIOS DE PRUEBA COMPLETOS

### Escenario A: Flujo Completo de Notificaciones
1. Usuario A da like a publicación de Usuario B
2. Usuario B recibe notificación
3. Usuario B hace clic en notificación
4. ✅ Se abre la publicación correcta
5. Usuario B refresca la página
6. ✅ La notificación sigue marcada como leída

### Escenario B: Flujo Completo de Mensajes
1. Usuario A envía mensaje a Usuario B
2. Usuario B ve icono de no leído
3. Usuario B abre el chat
4. ✅ Icono desaparece
5. Usuario B refresca la página
6. ✅ Icono NO reaparece

### Escenario C: Flujo Completo de Momentos
1. Usuario A crea un momento
2. Usuario A comparte el momento con Usuario B
3. ✅ Se captura automáticamente
4. Usuario B recibe el mensaje con captura
5. Usuario B hace clic en la captura
6. ✅ Se abre el visor de momentos
7. Pasan 24 horas
8. ✅ La captura desaparece y se muestra mensaje de caducidad

### Escenario D: Flujo Completo de Auto-Checkout
1. Usuario hace check-in en "Bar San Roque" a las 20:00
2. El bar cierra a las 23:00
3. Son las 23:15
4. ✅ Cron job se ejecuta
5. ✅ Usuario es expulsado automáticamente
6. ✅ Usuario recibe notificación
7. ✅ Perfil se actualiza en tiempo real

---

## 🎉 CONFIRMACIÓN FINAL

Si todos los checkboxes están marcados, la implementación está completa y funcionando correctamente.

### Estado de Implementación:
- ✅ Código implementado
- ✅ Edge Function desplegada
- ⏳ Cron job pendiente de activar (ver `SETUP_AUTO_CHECKOUT_CRON.md`)

### Próximo Paso:
**Activar el cron job para auto-checkout**

---

**Fecha de Verificación:** 20 de Enero de 2025
**Versión:** 11.0
**Estado:** ✅ LISTO PARA VERIFICAR
