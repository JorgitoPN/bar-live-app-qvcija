
# ✅ CHECKLIST DE VERIFICACIÓN FINAL V12

## 🎯 OBJETIVO

Verificar que TODAS las funcionalidades están implementadas y funcionando correctamente.

---

## 📋 CHECKLIST GENERAL

### Configuración Inicial
- [ ] Cron job configurado (ver `CONFIGURAR_CRON_JOB_PASO_A_PASO.md`)
- [ ] Edge Function `auto-checkout-closed-locals` desplegada
- [ ] Variables de entorno configuradas en Supabase
- [ ] Base de datos con todas las tablas necesarias

---

## 1. NOTIFICACIONES 📬

### Redirección Correcta
- [ ] Notificación de like → Redirige al post
- [ ] Notificación de comentario → Redirige al post con comentario
- [ ] Notificación de seguidor → Redirige al perfil del usuario
- [ ] Notificación de local → Redirige al perfil del local
- [ ] Notificación de momento → Redirige al visor de momentos
- [ ] NO muestra pantallas vacías
- [ ] NO muestra contenido incorrecto

### Persistencia
- [ ] Notificación se marca como leída al hacer clic
- [ ] Campo `leida_at` se guarda con timestamp
- [ ] Al refrescar, sigue marcada como leída
- [ ] NO reaparece como no leída

### Verificación SQL
```sql
-- Ver notificaciones leídas con timestamp
SELECT id, tipo, leida, leida_at 
FROM notificaciones 
WHERE usuario_id = '[user_id]' 
AND leida = true 
ORDER BY leida_at DESC 
LIMIT 5;
```

**Resultado esperado:** Todas tienen `leida_at` con timestamp

---

## 2. MENSAJES 💬

### Persistencia del Estado Leído
- [ ] Mensaje se marca como leído al abrir el chat
- [ ] Campo `leido_at` se guarda con timestamp
- [ ] Icono de no leído desaparece
- [ ] Al refrescar, NO reaparece el icono
- [ ] Contador de mensajes no leídos es correcto

### Tiempo Real
- [ ] Nuevo mensaje aparece INMEDIATAMENTE
- [ ] Contador se actualiza sin refrescar
- [ ] Estado leído se sincroniza entre dispositivos

### Verificación SQL
```sql
-- Ver mensajes leídos con timestamp
SELECT id, contenido, leido, leido_at 
FROM mensajes 
WHERE chat_id = '[chat_id]' 
AND leido = true 
ORDER BY leido_at DESC 
LIMIT 5;
```

**Resultado esperado:** Todos tienen `leido_at` con timestamp

---

## 3. LIKES EN TIEMPO REAL ❤️

### Actualización Instantánea
- [ ] Al dar like, el icono cambia INMEDIATAMENTE
- [ ] Contador de likes se actualiza sin refrescar
- [ ] Miniavatares se actualizan automáticamente
- [ ] Texto "Le gusta a..." se actualiza
- [ ] Funciona en múltiples dispositivos simultáneamente

### Prueba con Dos Dispositivos
1. [ ] Abrir mismo post en dispositivo A y B
2. [ ] Dar like en dispositivo A
3. [ ] Verificar que se actualiza en dispositivo B en < 1 segundo
4. [ ] Verificar que contador es el mismo en ambos
5. [ ] Verificar que avatares son los mismos en ambos

### Verificación SQL
```sql
-- Ver likes de un post
SELECT COUNT(*) as total_likes 
FROM likes 
WHERE post_id = '[post_id]';
```

**Resultado esperado:** Número coincide con el mostrado en la UI

---

## 4. MOMENTOS Y MENSAJES ⚡

### Captura Automática
- [ ] Abrir visor de momentos
- [ ] Hacer clic en "Mensaje"
- [ ] Verificar que se captura screenshot automáticamente
- [ ] Verificar que se sube a Supabase Storage
- [ ] Verificar que el mensaje incluye la captura

### Capturas Clicables
- [ ] Abrir chat con mensaje de momento
- [ ] Verificar que la captura es visible
- [ ] Hacer clic en la captura
- [ ] Verificar que abre el visor de momentos
- [ ] Verificar que muestra el momento correcto

### Gestión de Vencimiento
- [ ] Enviar mensaje con momento
- [ ] Eliminar el momento (o esperar 24h)
- [ ] Verificar que la captura desaparece
- [ ] Verificar que muestra "El momento ya no está disponible"
- [ ] Verificar que el texto es claro

### Verificación SQL
```sql
-- Ver mensajes con momentos
SELECT id, tipo_mensaje, momento_id, momento_screenshot_url 
FROM mensajes 
WHERE tipo_mensaje = 'momento' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Resultado esperado:** Todos tienen `momento_screenshot_url` con URL válida

---

## 5. PÁGINA DE PERFIL 👤

### Tarjeta Compacta
- [ ] Hacer check-in en un local
- [ ] Verificar que aparece la tarjeta compacta
- [ ] Verificar que muestra:
  - [ ] Estado actual
  - [ ] Nombre del local
  - [ ] Dirección del local
  - [ ] Visibilidad del check-in
  - [ ] Botón "Salir del local"
- [ ] Verificar que TODO está en un solo bloque
- [ ] Verificar que el diseño es claro
- [ ] Verificar que hay animación de pulso
- [ ] Verificar que hay badge "EN VIVO"

### Botón Salir del Local
- [ ] Hacer clic en "Salir del local"
- [ ] Verificar que pide confirmación
- [ ] Confirmar
- [ ] Verificar que la tarjeta desaparece
- [ ] Verificar que el check-in se elimina de la base de datos

### Verificación SQL
```sql
-- Ver check-in actual
SELECT ci.*, l.nombre as local_nombre 
FROM check_ins ci
JOIN locales l ON ci.local_id = l.id
WHERE ci.usuario_id = '[user_id]';
```

**Resultado esperado:** 
- Con check-in: 1 fila
- Sin check-in: 0 filas

---

## 6. SELECTOR DE PERFIL 🔄

### Sincronización
- [ ] Abrir selector de perfil
- [ ] Verificar que se recargan los locales
- [ ] Verificar que solo aparecen locales activos
- [ ] Verificar que NO aparecen locales de los que ya NO eres propietario

### Caso @jorge y Momo
- [ ] Usuario @jorge ya NO es propietario de Momo
- [ ] Abrir selector de perfil
- [ ] Verificar que Momo NO aparece en "Mis Locales"
- [ ] Verificar que solo aparecen locales actuales

### Verificación SQL
```sql
-- Ver locales de @jorge
SELECT pl.*, l.nombre 
FROM propietarios_locales pl
JOIN locales l ON pl.local_id = l.id
WHERE pl.propietario_id = '[jorge_id]' 
AND pl.activo = true;
```

**Resultado esperado:** Solo locales de los que @jorge ES propietario actualmente

---

## 7. PUBLICACIONES 📸

### Cuadrícula del Perfil
- [ ] Abrir perfil propio
- [ ] Ver cuadrícula de publicaciones
- [ ] Verificar que NO hay icono en la esquina superior derecha
- [ ] Solo debe haber indicador de múltiples imágenes si aplica

### Visor de Publicación
- [ ] Hacer clic en una publicación de la cuadrícula
- [ ] Verificar que se abre el visor
- [ ] Verificar que NO hay icono de dos usuarios
- [ ] Verificar que NO hay icono de opciones (si es perfil ajeno)

### Perfil Ajeno
- [ ] Abrir perfil de otro usuario
- [ ] Ver cuadrícula de publicaciones
- [ ] Verificar que NO hay icono en la esquina
- [ ] Hacer clic en una publicación
- [ ] Verificar que NO hay icono de dos usuarios

---

## 8. DETALLES DEL LOCAL 🏢

### Verificación Visual
- [ ] Abrir detalles de un local
- [ ] Verificar que NO hay texto duplicado del nombre
- [ ] Verificar que el nombre solo aparece en el header
- [ ] Verificar que NO hay "Casa Adolfo" hardcodeado

**Nota:** Si aparece "Casa Adolfo", es porque ese es el nombre del local en la base de datos, NO un texto hardcodeado.

---

## 9. MAPA 🗺️

### Selector por Defecto
- [ ] Abrir página del mapa
- [ ] Verificar que el selector está en "Abiertos"
- [ ] Verificar que solo muestra locales abiertos
- [ ] Cambiar a "Todos"
- [ ] Verificar que muestra todos los locales
- [ ] Volver a "Abiertos"
- [ ] Verificar que filtra correctamente

### Diseño del Selector
- [ ] Verificar que tiene diseño de toggle switch
- [ ] Verificar que hay animación al cambiar
- [ ] Verificar que los colores son contrastantes
- [ ] Verificar que es fácil de usar

---

## 10. CONTROL DE HORARIOS ⏰

### Configuración del Cron
- [ ] Cron job creado con nombre `auto-checkout-closed-locals`
- [ ] Schedule configurado a `*/5 * * * *`
- [ ] Command configurado correctamente
- [ ] Cron job activado (toggle ON)

### Verificación de Ejecución
- [ ] Esperar 5 minutos
- [ ] Ver logs del Edge Function
- [ ] Verificar que se ejecutó correctamente
- [ ] Verificar que hay logs como:
  ```
  [AutoCheckout] Starting automatic checkout process...
  [AutoCheckout] Found X active check-ins
  ```

### Prueba Real
- [ ] Hacer check-in en un local cerrado
- [ ] Esperar 5 minutos
- [ ] Verificar que fuiste expulsado automáticamente
- [ ] Verificar que ya NO apareces en el local

### Verificación SQL
```sql
-- Ver check-ins en locales cerrados
SELECT 
  ci.id,
  u.nombre as usuario,
  l.nombre as local,
  l.horarios_completos
FROM check_ins ci
JOIN usuarios u ON ci.usuario_id = u.id
JOIN locales l ON ci.local_id = l.id;
```

**Resultado esperado:** 0 usuarios en locales cerrados (fuera de horario)

---

## 11. SUSCRIPCIONES EN TIEMPO REAL 🔄

### Perfil Principal
- [ ] Abrir perfil
- [ ] Hacer check-in en otro dispositivo
- [ ] Verificar que la tarjeta aparece INMEDIATAMENTE
- [ ] Salir del local en otro dispositivo
- [ ] Verificar que la tarjeta desaparece INMEDIATAMENTE

### Feed Social
- [ ] Abrir feed social
- [ ] Recibir notificación en otro dispositivo
- [ ] Verificar que el contador se actualiza INMEDIATAMENTE
- [ ] Recibir mensaje en otro dispositivo
- [ ] Verificar que el contador se actualiza INMEDIATAMENTE

### Likes
- [ ] Abrir post en dos dispositivos
- [ ] Dar like en dispositivo A
- [ ] Verificar que se actualiza en dispositivo B en < 1 segundo

---

## 12. LOGS Y DEBUGGING 🔍

### Logs del Frontend
- [ ] Abrir consola del navegador/app
- [ ] Verificar que hay logs como:
  ```
  [Notificaciones] ✅ Redirecting to post: [id]
  [Chats] ✅ Messages marked as read
  [InstagramPostCard] 🔄 Real-time like change detected
  [MomentoViewer] ✅ Screenshot uploaded
  ```

### Logs del Backend
- [ ] Ir a Supabase Dashboard → Edge Functions
- [ ] Seleccionar `auto-checkout-closed-locals`
- [ ] Ver logs
- [ ] Verificar que hay logs cada 5 minutos
- [ ] Verificar que NO hay errores

### Logs del Cron Job
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'auto-checkout-closed-locals' 
ORDER BY start_time DESC 
LIMIT 10;
```

**Resultado esperado:** 
- Ejecuciones cada 5 minutos
- Estado: `succeeded`
- Sin errores

---

## 13. PRUEBAS DE USUARIO FINAL

### Flujo Completo 1: Notificación → Post → Like
1. [ ] Usuario A crea un post
2. [ ] Usuario B da like
3. [ ] Usuario A recibe notificación
4. [ ] Usuario A hace clic en la notificación
5. [ ] Se abre el post correcto
6. [ ] Notificación se marca como leída
7. [ ] Usuario A refresca
8. [ ] Notificación sigue marcada como leída

### Flujo Completo 2: Momento → Mensaje → Captura
1. [ ] Usuario A crea un momento
2. [ ] Usuario B abre el visor de momentos
3. [ ] Usuario B hace clic en "Mensaje"
4. [ ] Se captura screenshot automáticamente
5. [ ] Se envía mensaje con captura
6. [ ] Usuario A recibe el mensaje
7. [ ] Usuario A ve la captura
8. [ ] Usuario A hace clic en la captura
9. [ ] Se abre el visor de momentos

### Flujo Completo 3: Check-in → Local Cierra → Expulsión
1. [ ] Usuario hace check-in en un local
2. [ ] Verificar que aparece en el local
3. [ ] Local cierra (o cambiar horarios para simular)
4. [ ] Esperar 5 minutos
5. [ ] Verificar que el usuario fue expulsado
6. [ ] Verificar que ya NO aparece en el local

---

## 14. VERIFICACIÓN DE BASE DE DATOS

### Tabla: notificaciones
```sql
SELECT 
  COUNT(*) FILTER (WHERE leida = true AND leida_at IS NOT NULL) as leidas_con_timestamp,
  COUNT(*) FILTER (WHERE leida = true AND leida_at IS NULL) as leidas_sin_timestamp,
  COUNT(*) FILTER (WHERE leida = false) as no_leidas
FROM notificaciones;
```

**Resultado esperado:**
- `leidas_con_timestamp` > 0
- `leidas_sin_timestamp` = 0 (todas deben tener timestamp)
- `no_leidas` >= 0

### Tabla: mensajes
```sql
SELECT 
  COUNT(*) FILTER (WHERE leido = true AND leido_at IS NOT NULL) as leidos_con_timestamp,
  COUNT(*) FILTER (WHERE leido = true AND leido_at IS NULL) as leidos_sin_timestamp,
  COUNT(*) FILTER (WHERE leido = false) as no_leidos
FROM mensajes;
```

**Resultado esperado:**
- `leidos_con_timestamp` > 0
- `leidos_sin_timestamp` = 0 (todos deben tener timestamp)
- `no_leidos` >= 0

### Tabla: mensajes (momentos)
```sql
SELECT 
  COUNT(*) as total_momento_messages,
  COUNT(*) FILTER (WHERE momento_screenshot_url IS NOT NULL) as con_screenshot,
  COUNT(*) FILTER (WHERE momento_screenshot_url IS NULL) as sin_screenshot
FROM mensajes 
WHERE tipo_mensaje = 'momento';
```

**Resultado esperado:**
- `con_screenshot` = `total_momento_messages` (todos deben tener screenshot)
- `sin_screenshot` = 0

### Tabla: check_ins
```sql
-- Ver check-ins en locales cerrados
SELECT 
  ci.id,
  u.nombre as usuario,
  l.nombre as local,
  l.horarios_completos,
  CURRENT_TIME as hora_actual
FROM check_ins ci
JOIN usuarios u ON ci.usuario_id = u.id
JOIN locales l ON ci.local_id = l.id;
```

**Resultado esperado:** 
- 0 usuarios en locales cerrados (fuera de horario)
- Si hay usuarios, deben estar en locales abiertos

### Tabla: propietarios_locales
```sql
-- Ver propietarios activos
SELECT 
  pl.propietario_id,
  pl.local_id,
  pl.activo,
  u.nombre as propietario,
  l.nombre as local
FROM propietarios_locales pl
JOIN usuarios u ON pl.propietario_id = u.id
JOIN locales l ON pl.local_id = l.id
WHERE pl.activo = true;
```

**Resultado esperado:** 
- Solo propietarios activos
- @jorge NO debe tener Momo si ya NO es propietario

---

## 15. VERIFICACIÓN DE EDGE FUNCTION

### Estado del Edge Function
- [ ] Ve a Supabase Dashboard → Edge Functions
- [ ] Busca `auto-checkout-closed-locals`
- [ ] Verifica que el estado es **ACTIVE**
- [ ] Verifica que la versión es la más reciente

### Logs del Edge Function
- [ ] Ve a la pestaña **Logs**
- [ ] Verifica que hay logs recientes (últimos 5 minutos)
- [ ] Verifica que NO hay errores
- [ ] Verifica que los logs muestran:
  ```
  [AutoCheckout] Starting automatic checkout process...
  [AutoCheckout] Found X active check-ins
  [AutoCheckout] Successfully checked out Y users
  ```

### Ejecución Manual
```bash
curl -X POST \
  https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Successfully checked out X users from closed locals",
  "checkedOut": X
}
```

---

## 16. VERIFICACIÓN DE CRON JOB

### Estado del Cron Job
```sql
SELECT * FROM cron.job 
WHERE jobname = 'auto-checkout-closed-locals';
```

**Resultado esperado:**
- 1 fila
- `active` = true
- `schedule` = `*/5 * * * *`

### Ejecuciones del Cron Job
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'auto-checkout-closed-locals' 
ORDER BY start_time DESC 
LIMIT 10;
```

**Resultado esperado:**
- Ejecuciones cada 5 minutos
- `status` = `succeeded`
- Sin errores

---

## 17. PRUEBAS DE REGRESIÓN

### Funcionalidades Existentes
- [ ] Login funciona correctamente
- [ ] Registro funciona correctamente
- [ ] Crear publicación funciona
- [ ] Comentar funciona
- [ ] Seguir/dejar de seguir funciona
- [ ] Favoritos funciona
- [ ] Búsqueda funciona
- [ ] Mapa funciona
- [ ] Perfil funciona

### Nuevas Funcionalidades NO Rompen las Existentes
- [ ] Notificaciones NO rompen el login
- [ ] Mensajes NO rompen el chat
- [ ] Likes NO rompen las publicaciones
- [ ] Momentos NO rompen el feed
- [ ] Control de horarios NO rompe los check-ins

---

## 18. PERFORMANCE

### Tiempos de Respuesta
- [ ] Notificación → Redirección: < 500ms
- [ ] Mensaje → Marcado como leído: < 300ms
- [ ] Like → Actualización UI: < 100ms
- [ ] Momento → Captura → Envío: < 3s
- [ ] Check-in → Expulsión: < 5 min

### Uso de Recursos
- [ ] Suscripciones en tiempo real NO causan lag
- [ ] Capturas de momentos NO consumen mucha memoria
- [ ] Edge Function NO tarda más de 10 segundos
- [ ] Cron job NO sobrecarga la base de datos

---

## 19. SEGURIDAD

### Permisos
- [ ] Solo el usuario puede marcar sus notificaciones como leídas
- [ ] Solo el usuario puede marcar sus mensajes como leídos
- [ ] Solo el usuario puede dar like (con su ID)
- [ ] Solo el usuario puede hacer check-in
- [ ] Solo el sistema puede expulsar usuarios (Edge Function)

### RLS (Row Level Security)
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'notificaciones';
SELECT * FROM pg_policies WHERE tablename = 'mensajes';
SELECT * FROM pg_policies WHERE tablename = 'likes';
SELECT * FROM pg_policies WHERE tablename = 'check_ins';
```

**Resultado esperado:** Políticas RLS configuradas correctamente

---

## 20. RESUMEN FINAL

### Funcionalidades Implementadas
- [x] Notificaciones con redirección correcta
- [x] Persistencia de mensajes leídos
- [x] Actualizaciones en tiempo real (likes)
- [x] Captura automática de momentos
- [x] Capturas clicables
- [x] Gestión de vencimiento
- [x] Tarjeta de perfil compacta
- [x] Sincronización del selector
- [x] Eliminación de iconos
- [x] Selector del mapa
- [x] Control de horarios

**Total:** 11/11 ✅

### Configuración Pendiente
- [ ] Cron job configurado (ver `CONFIGURAR_CRON_JOB_PASO_A_PASO.md`)

### Documentación Generada
- [x] COMPLETE_IMPLEMENTATION_SUMMARY_V12.md
- [x] GUIA_RAPIDA_CAMBIOS_V12.md
- [x] SETUP_AUTO_CHECKOUT_CRON_V2.md
- [x] VERIFICACION_IMPLEMENTACION_V12.md
- [x] CONFIGURAR_CRON_JOB_PASO_A_PASO.md
- [x] RESUMEN_FINAL_IMPLEMENTACION_V12.md
- [x] GUIA_VISUAL_IMPLEMENTACION_V12.md
- [x] CHECKLIST_VERIFICACION_FINAL_V12.md (este archivo)

---

## 🎉 CONCLUSIÓN

Si has marcado TODAS las casillas de este checklist:

✅ **LA IMPLEMENTACIÓN ESTÁ COMPLETA Y FUNCIONANDO CORRECTAMENTE**

Si alguna casilla NO está marcada:

1. Revisa la documentación correspondiente
2. Ejecuta los comandos SQL de verificación
3. Revisa los logs del Edge Function
4. Consulta la guía de solución de problemas

---

**Versión:** 12.0  
**Fecha:** 2025-01-20  
**Estado:** ✅ LISTO PARA VERIFICACIÓN  
**Próximo paso:** Marcar todas las casillas ✅
