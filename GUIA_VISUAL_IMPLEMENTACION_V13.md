
# 🎨 GUÍA VISUAL - VERIFICACIÓN DE IMPLEMENTACIÓN V13

## 📸 CAPTURAS Y VERIFICACIÓN VISUAL

Esta guía te ayudará a verificar visualmente que todas las funcionalidades están implementadas correctamente.

---

## 1️⃣ NOTIFICACIONES PERSISTENTES

### ✅ Cómo Verificar:

**Paso 1:** Abre la página de notificaciones
```
Perfil → Icono de campana (arriba derecha)
```

**Paso 2:** Marca una notificación como leída
```
Toca cualquier notificación → Se marca como leída
```

**Paso 3:** Refresca la app
```
Desliza hacia abajo para refrescar
```

**✅ Resultado Esperado:**
- La notificación debe seguir marcada como leída
- NO debe aparecer el punto azul de "no leída"
- El contador de notificaciones debe ser correcto

**❌ Si falla:**
- Revisa logs: `[Notificaciones]`
- Verifica tabla `notificaciones` en DB
- Verifica que `leida_at` tiene timestamp

---

## 2️⃣ LIKES EN TIEMPO REAL

### ✅ Cómo Verificar:

**Paso 1:** Abre la página social
```
Tab "Social" → Ver publicaciones
```

**Paso 2:** Da like a una publicación
```
Toca el corazón
```

**✅ Resultado Esperado (INMEDIATO):**
- ❤️ El corazón se pone ROJO
- 🔢 El contador aumenta (ej: 5 → 6)
- 👤 Tu avatar aparece en los miniavatares
- ⚡ TODO sin refrescar la página

**Paso 3:** Quita el like
```
Toca el corazón de nuevo
```

**✅ Resultado Esperado (INMEDIATO):**
- 🤍 El corazón se pone BLANCO
- 🔢 El contador disminuye (ej: 6 → 5)
- 👤 Tu avatar desaparece de los miniavatares
- ⚡ TODO sin refrescar la página

**❌ Si falla:**
- Revisa logs: `[InstagramPostCard]` y `[PostLikesAvatars]`
- Verifica suscripción en tiempo real
- Verifica tabla `likes` en DB

---

## 3️⃣ MOMENTOS CON CAPTURA AUTOMÁTICA

### ✅ Cómo Verificar:

**Paso 1:** Abre un momento
```
Perfil → Toca avatar con borde verde → Se abre visor
```

**Paso 2:** Abre input de mensaje
```
Toca botón "Mensaje" (abajo)
```

**✅ Resultado Esperado:**
- ⏸️ El momento se PAUSA
- ⌨️ Aparece campo de texto
- ❌ Botón X para cerrar

**Paso 3:** Escribe y envía mensaje
```
Escribe "Hola" → Toca botón enviar
```

**✅ Resultado Esperado:**
- 📸 Se captura screenshot automáticamente
- 💬 Se envía mensaje con captura Y texto
- 📱 Se abre la conversación

**Paso 4:** Verifica en la conversación
```
Ve a Mensajes → Abre la conversación
```

**✅ Resultado Esperado:**
- 🖼️ Ves la imagen del momento
- 💬 Ves el texto "Hola"
- 👆 La imagen es CLICABLE

**Paso 5:** Haz clic en la imagen
```
Toca la imagen del momento
```

**✅ Resultado Esperado:**
- 🎬 Se abre el VISOR de momentos
- ❌ NO se abre la página social

**❌ Si falla:**
- Revisa logs: `[MomentoViewer]` y `[MomentoMessageBubble]`
- Verifica tabla `mensajes` en DB
- Verifica campo `momento_screenshot_url`

---

## 4️⃣ TARJETA COMPACTA DE ESTADO

### ✅ Cómo Verificar:

**Paso 1:** Haz check-in en un local
```
Detalles del local → "Estoy en este local"
```

**Paso 2:** Ve a tu perfil
```
Tab "Perfil"
```

**✅ Resultado Esperado:**

Debes ver una tarjeta verde con:

```
┌─────────────────────────────────────┐
│ 📍 Estado actual      [EN VIVO]     │
├─────────────────────────────────────┤
│ 🏢 [Imagen] Nombre del Local    →  │
│            Dirección completa       │
│            Compartido con...        │
├─────────────────────────────────────┤
│      🚫 Salir del local             │
└─────────────────────────────────────┘
```

**Elementos visuales:**
- ✅ Gradiente verde (#10B981 → #059669)
- ✅ Badge "EN VIVO" con punto blanco
- ✅ Icono de ubicación con pulso
- ✅ Imagen del local (50x50px)
- ✅ Nombre, dirección y visibilidad
- ✅ Botón rojo "Salir del local"

**❌ Si falla:**
- Revisa logs: `[Perfil]`
- Verifica tabla `check_ins` en DB
- Verifica que `currentLocal` se carga correctamente

---

## 5️⃣ SELECTOR DE PERFIL SINCRONIZADO

### ✅ Cómo Verificar:

**Paso 1:** Abre el selector
```
Perfil → Icono de flechas circulares (arriba derecha)
```

**✅ Resultado Esperado:**

```
┌─────────────────────────────────────┐
│ Cambiar Perfil                    ✕ │
├─────────────────────────────────────┤
│ 👤 [Avatar] Tu Nombre          ✓   │
│            Perfil Personal          │
├─────────────────────────────────────┤
│ Mis Locales                         │
│ 2 locales                           │
├─────────────────────────────────────┤
│ 🏢 [Imagen] Local 1                │
│            Tipo de local            │
├─────────────────────────────────────┤
│ 🏢 [Imagen] Local 2                │
│            Tipo de local            │
└─────────────────────────────────────┘
```

**Verificaciones:**
- ✅ Solo aparecen locales que REALMENTE posees
- ✅ NO aparecen locales de los que renunciaste
- ✅ Checkmark (✓) en el perfil activo
- ✅ Borde verde en el perfil activo

**❌ Si falla:**
- Revisa logs: `[ProfileSwitcher]`
- Verifica tabla `propietarios_locales` en DB
- Verifica que `activo=true`

---

## 6️⃣ DETALLES DEL LOCAL - SIN TEXTO EXTRA

### ✅ Cómo Verificar:

**Paso 1:** Abre detalles de un local
```
Explorar → Selecciona un local → Ver detalles
```

**✅ Resultado Esperado:**

```
┌─────────────────────────────────────┐
│ [Imagen del local]                  │
├─────────────────────────────────────┤
│ Nombre del Local                    │
│ 🏷️ CATEGORÍA                        │
│ 📍 Dirección                        │
├─────────────────────────────────────┤
│ ✅ Estoy en este local              │
├─────────────────────────────────────┤
│ ❌ SIN TEXTO AQUÍ ❌                │
├─────────────────────────────────────┤
│ 📞 Llamar    🗺️ Cómo llegar        │
└─────────────────────────────────────┘
```

**Verificación:**
- ✅ NO debe aparecer "Casa Adolfo" ni ningún otro texto
- ✅ Directamente de "Estoy en este local" a "Llamar/Cómo llegar"

**❌ Si falla:**
- Revisa archivo `app/detalle/local.tsx`
- Busca texto hardcodeado entre botones

---

## 7️⃣ CONTROL DE HORARIOS

### ✅ Cómo Verificar:

**Paso 1:** Configura el cron job
```
Ver archivo: SETUP_AUTO_CHECKOUT_CRON_V3.md
```

**Paso 2:** Haz check-in en un local
```
Detalles del local → "Estoy en este local"
```

**Paso 3:** Verifica horario del local
```
Detalles del local → Sección "Horarios"
```

**Paso 4:** Espera a que cierre
```
Ejemplo: Si cierra a las 23:00, espera hasta las 23:01
```

**Paso 5:** Espera 5 minutos
```
El cron job se ejecuta cada 5 minutos
```

**✅ Resultado Esperado:**
- 🚫 Serás expulsado automáticamente
- 📱 Ya no aparecerás en "Personas en este local"
- ✅ El check-in se elimina de la DB

**Verificación en DB:**
```sql
SELECT * FROM check_ins WHERE usuario_id = 'tu-id';
-- Debe estar vacío
```

**❌ Si falla:**
- Verifica que el cron job está configurado
- Revisa logs de Edge Function
- Verifica horarios del local en DB

---

## 8️⃣ RESEÑAS CON PAGINACIÓN

### ✅ Cómo Verificar:

**Paso 1:** Abre modal de reseñas
```
Detalles del local → "Añadir Reseña"
```

**✅ Resultado Esperado:**

```
┌─────────────────────────────────────┐
│ ← Reseñas de Barlive              │
│   X reseñas                         │
├─────────────────────────────────────┤
│ 👤 Usuario 1        ⭐⭐⭐⭐⭐      │
│    Texto de la reseña...            │
├─────────────────────────────────────┤
│ 👤 Usuario 2        ⭐⭐⭐⭐        │
│    Texto de la reseña...            │
├─────────────────────────────────────┤
│ ... (hasta 5 reseñas)               │
├─────────────────────────────────────┤
│        Ver más ⌄                    │
└─────────────────────────────────────┘
```

**Paso 2:** Haz clic en "Ver más"
```
Toca el botón "Ver más"
```

**✅ Resultado Esperado:**
- ✅ Se cargan 10 reseñas más
- ✅ El botón desaparece si no hay más reseñas

**Paso 3:** Añade una reseña
```
Selecciona estrellas → Escribe texto → Enviar
```

**✅ Resultado Esperado:**
- ✅ La reseña aparece INMEDIATAMENTE
- ✅ El rating del local se actualiza
- ✅ Aparece en la lista de reseñas

**❌ Si falla:**
- Revisa logs: `[ReviewsModal]`
- Verifica tabla `reviews_barlive` en DB
- Verifica que `rating` del local se actualiza

---

## 9️⃣ MAPA CON SELECTOR CORRECTO

### ✅ Cómo Verificar:

**Paso 1:** Abre el mapa
```
Tab "Explorar" → "Mapa"
```

**✅ Resultado Esperado:**

```
┌─────────────────────────────────────┐
│ [Categorías: Todos, Cafés, etc.]    │
├─────────────────────────────────────┤
│                                     │
│         [MAPA CON MARCADORES]       │
│                                     │
│  ┌─────────────────┐                │
│  │ Todos │ Abiertos│ ← Selector     │
│  └─────────────────┘                │
│                                     │
└─────────────────────────────────────┘
```

**Verificaciones:**
- ✅ El selector debe estar en **"Abiertos"** (fondo verde)
- ✅ Solo se muestran marcadores verdes (locales abiertos)
- ✅ Diseño de toggle switch moderno

**Paso 2:** Cambia a "Todos"
```
Toca "Todos" en el selector
```

**✅ Resultado Esperado:**
- ✅ Se muestran TODOS los marcadores (verdes, rojos, grises)
- ✅ El selector cambia a "Todos" (fondo verde)

**❌ Si falla:**
- Revisa logs: `[MAP]`
- Verifica estado inicial: `filtroEstado = 'abiertos'`

---

## 🎨 ELEMENTOS VISUALES NUEVOS

### Tarjeta de Estado Actual:

**Colores:**
- Gradiente: `#10B981` → `#059669` (verde)
- Badge "EN VIVO": Fondo blanco semi-transparente
- Punto pulsante: Blanco
- Botón salir: `#EF4444` (rojo)

**Animaciones:**
- Pulso en icono de ubicación
- Punto pulsante en badge "EN VIVO"

### Toggle Switch en Mapa:

**Colores:**
- Fondo: `colors.cardBackground`
- Borde: `colors.primary + '30'`
- Opción activa: `colors.primary` (verde)
- Texto activo: Blanco
- Texto inactivo: Gris

### Botón "Ver más":

**Colores:**
- Texto: `colors.primary` (verde)
- Borde: `colors.primary + '30'`
- Fondo: `colors.cardBackground`

**Icono:**
- Chevron hacia abajo
- Color: `colors.primary`

---

## 🔍 VERIFICACIÓN DE LOGS

### Logs Importantes:

#### Notificaciones:
```
[Notificaciones] ✅ Loaded X notifications
[Notificaciones] 🔄 Notification update detected, reloading...
```

#### Likes:
```
[InstagramPostCard] 🔄 Real-time like change detected
[InstagramPostCard] ✅ Updated likes count: X
[PostLikesAvatars] 🔄 Real-time like update detected
[PostLikesAvatars] ✅ Updated likes count: X
```

#### Momentos:
```
[MomentoViewer] 📝 Opening message input, pausing momento
[MomentoViewer] 📸 Capturing momento screenshot...
[MomentoViewer] ✅ Screenshot captured
[MomentoViewer] ✅ Momento message sent with screenshot and text
```

#### Mensajes:
```
[Chats] ✅ Messages marked as read in database
[Chats] 🔄 Message update detected
```

#### Perfil:
```
[Perfil] ✅ User is checked in to: [Local Name]
[Perfil] 🔄 Check-in update detected, reloading...
```

#### Selector:
```
[ProfileSwitcher] 🔄 Loading owned locals for user: [ID]
[ProfileSwitcher] ✅ Loaded X active owned locals
```

#### Auto-Checkout:
```
[AUTO-CHECKOUT] Starting automatic checkout process...
[AUTO-CHECKOUT] ✅ Found X active check-ins
[AUTO-CHECKOUT] 🔒 Local [Name] is CLOSED, checking out user
[AUTO-CHECKOUT] ✅ Successfully checked out X users
```

---

## 📊 VERIFICACIÓN EN BASE DE DATOS

### Queries Útiles:

#### Verificar notificaciones leídas:
```sql
SELECT id, tipo, leida, leida_at 
FROM notificaciones 
WHERE usuario_id = 'tu-id' 
ORDER BY created_at DESC;
```

#### Verificar likes:
```sql
SELECT COUNT(*) as total_likes 
FROM likes 
WHERE post_id = 'post-id';
```

#### Verificar mensajes con momentos:
```sql
SELECT id, contenido, tipo_mensaje, momento_id, momento_screenshot_url 
FROM mensajes 
WHERE tipo_mensaje = 'momento' 
ORDER BY created_at DESC;
```

#### Verificar check-ins:
```sql
SELECT u.nombre, l.nombre as local, c.created_at 
FROM check_ins c
JOIN usuarios u ON c.usuario_id = u.id
JOIN locales l ON c.local_id = l.id;
```

#### Verificar locales propios:
```sql
SELECT l.nombre, pl.activo 
FROM propietarios_locales pl
JOIN locales l ON pl.local_id = l.id
WHERE pl.propietario_id = 'tu-id';
```

#### Verificar reseñas:
```sql
SELECT COUNT(*) as total_reviews, AVG(rating) as avg_rating 
FROM reviews_barlive 
WHERE local_id = 'local-id';
```

---

## ✅ CHECKLIST FINAL

### Funcionalidades:
- [ ] Notificaciones persistentes ✅
- [ ] Likes en tiempo real ✅
- [ ] Momentos con captura automática ✅
- [ ] Pausa de momento al escribir ✅
- [ ] Imagen clicable en mensajes ✅
- [ ] Gestión de vencimiento ✅
- [ ] Tarjeta compacta de estado ✅
- [ ] Selector sincronizado ✅
- [ ] Sin texto "Casa Adolfo" ✅
- [ ] Control de horarios ✅
- [ ] Reseñas con paginación ✅
- [ ] Mapa con selector correcto ✅

### Configuración:
- [ ] Cron job configurado ⚠️

### Verificación:
- [ ] Logs sin errores ✅
- [ ] Base de datos sincronizada ✅
- [ ] UI actualizada correctamente ✅

---

## 🎉 CONCLUSIÓN

Si todos los checkboxes están marcados, **¡la implementación está completa!**

**Único paso pendiente:**
- ⚠️ Configurar cron job (5 minutos) - Ver `SETUP_AUTO_CHECKOUT_CRON_V3.md`

---

**Fecha:** 2025-01-20
**Versión:** 13.0.0
**Estado:** LISTO PARA USAR ✅
