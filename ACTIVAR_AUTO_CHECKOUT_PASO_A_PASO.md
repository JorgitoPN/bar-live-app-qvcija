
# 🔧 ACTIVAR AUTO-CHECKOUT - PASO A PASO

## 📋 GUÍA VISUAL PARA ACTIVAR LA EXPULSIÓN AUTOMÁTICA

Esta guía te ayudará a activar el sistema de expulsión automática de usuarios de locales cerrados.

---

## ✅ PASO 1: VERIFICAR QUE LA EDGE FUNCTION ESTÁ DESPLEGADA

### 1.1 Ir a Supabase Dashboard
1. Abre tu navegador
2. Ve a: https://supabase.com/dashboard
3. Selecciona tu proyecto: `embntaqwlwmgazvrglaf`

### 1.2 Verificar Edge Function
1. En el menú lateral, haz clic en **Edge Functions**
2. Busca la función: `auto-checkout-closed-locals`
3. Verifica que el estado sea: **ACTIVE** ✅

### 1.3 Probar la Función Manualmente (Opcional)
1. Haz clic en la función `auto-checkout-closed-locals`
2. Ve a la pestaña **Logs**
3. En otra pestaña, abre **SQL Editor**
4. Ejecuta este comando:

```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

5. Vuelve a la pestaña de Logs
6. Deberías ver logs como:
```
🔄 [AUTO-CHECKOUT] Starting auto-checkout process...
✅ [AUTO-CHECKOUT] Found X active check-ins
```

---

## ✅ PASO 2: ACTIVAR EL CRON JOB

### Opción A: Usando la Interfaz de Supabase (MÁS FÁCIL)

#### 2.1 Ir a Cron Jobs
1. En el menú lateral de Supabase, haz clic en **Database**
2. Haz clic en **Cron Jobs** (en el submenú)

#### 2.2 Crear Nuevo Cron Job
1. Haz clic en el botón **Create a new cron job**
2. Rellena el formulario:

**Nombre del Job:**
```
auto-checkout-closed-locals
```

**Descripción:**
```
Expulsa automáticamente a usuarios de locales cerrados
```

**Schedule (Cron Expression):**
```
*/15 * * * *
```
*(Esto significa: cada 15 minutos)*

**SQL Command:**
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb
);
```

3. Haz clic en **Create cron job**

#### 2.3 Verificar que se Creó
1. Deberías ver el cron job en la lista
2. Estado: **Active** ✅
3. Next run: Debería mostrar la próxima ejecución

---

### Opción B: Usando SQL Editor (ALTERNATIVA)

#### 2.1 Abrir SQL Editor
1. En el menú lateral, haz clic en **SQL Editor**
2. Haz clic en **New query**

#### 2.2 Ejecutar SQL
Copia y pega este código:

```sql
-- Habilitar extensión pg_cron (si no está habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Crear el cron job
SELECT cron.schedule(
  'auto-checkout-closed-locals',  -- Nombre del job
  '*/15 * * * *',                  -- Cada 15 minutos
  $$
  SELECT net.http_post(
    url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

3. Haz clic en **Run** (o presiona Ctrl+Enter)

#### 2.3 Verificar que se Creó
Ejecuta esta query:

```sql
SELECT * FROM cron.job WHERE jobname = 'auto-checkout-closed-locals';
```

**Esperado:**
- Debe devolver 1 fila
- `jobname = 'auto-checkout-closed-locals'`
- `schedule = '*/15 * * * *'`
- `active = true`

---

## ✅ PASO 3: VERIFICAR QUE FUNCIONA

### 3.1 Esperar 15 Minutos
El cron job se ejecutará automáticamente cada 15 minutos.

### 3.2 Ver Historial de Ejecuciones
Ejecuta esta query en SQL Editor:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-checkout-closed-locals')
ORDER BY start_time DESC 
LIMIT 10;
```

**Esperado:**
- Deberías ver ejecuciones cada 15 minutos
- `status = 'succeeded'` para ejecuciones exitosas

### 3.3 Ver Logs de Edge Function
1. Ve a **Edge Functions** → `auto-checkout-closed-locals`
2. Haz clic en la pestaña **Logs**
3. Deberías ver logs de ejecuciones cada 15 minutos

---

## 🎯 OPCIONES DE FRECUENCIA

Puedes cambiar la frecuencia del cron job según tus necesidades:

### Cada 5 minutos (Muy frecuente)
```
*/5 * * * *
```
**Pros:** Máxima precisión
**Contras:** Más llamadas a la API

### Cada 10 minutos (Frecuente)
```
*/10 * * * *
```
**Pros:** Buen balance
**Contras:** Ninguno

### Cada 15 minutos (Recomendado) ⭐
```
*/15 * * * *
```
**Pros:** Balance perfecto entre precisión y eficiencia
**Contras:** Ninguno

### Cada 30 minutos (Menos frecuente)
```
*/30 * * * *
```
**Pros:** Menos llamadas a la API
**Contras:** Menos preciso

### Cada hora (Mínimo)
```
0 * * * *
```
**Pros:** Mínimas llamadas a la API
**Contras:** Usuarios pueden estar hasta 1 hora en locales cerrados

---

## 🔍 MONITOREO CONTINUO

### Ver Ejecuciones Recientes
```sql
SELECT 
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-checkout-closed-locals')
ORDER BY start_time DESC 
LIMIT 5;
```

### Ver Usuarios Expulsados Hoy
```sql
SELECT 
  n.created_at,
  u.nombre as usuario,
  n.mensaje
FROM notificaciones n
JOIN usuarios u ON u.id = n.usuario_id
WHERE n.tipo = 'sistema'
  AND n.titulo = 'Check-out automático'
  AND n.created_at >= CURRENT_DATE
ORDER BY n.created_at DESC;
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: El cron job no se ejecuta

**Solución 1:** Verificar que pg_cron está habilitado
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Si no aparece, ejecuta:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

**Solución 2:** Verificar que el job está activo
```sql
SELECT * FROM cron.job WHERE jobname = 'auto-checkout-closed-locals';
```

Si `active = false`, ejecuta:
```sql
SELECT cron.unschedule('auto-checkout-closed-locals');
-- Luego vuelve a crear el job
```

### Problema: La Edge Function devuelve error

**Solución:** Ver logs detallados
1. Ve a Edge Functions → `auto-checkout-closed-locals` → Logs
2. Busca errores en rojo
3. Verifica que la función tiene acceso a la base de datos

### Problema: Los usuarios no son expulsados

**Solución:** Verificar horarios de locales
```sql
SELECT id, nombre, horarios_completos, estado_negocio
FROM locales
WHERE id IN (
  SELECT DISTINCT local_id FROM check_ins
);
```

Asegúrate de que:
- `horarios_completos` tiene datos correctos
- `estado_negocio` no es 'CLOSED_PERMANENTLY' o 'CLOSED_TEMPORARILY' (a menos que deba estarlo)

---

## 📊 MÉTRICAS DE ÉXITO

### Indicadores de que funciona correctamente:

1. **Cron Job:**
   - ✅ Se ejecuta cada 15 minutos
   - ✅ Status: succeeded
   - ✅ No hay errores en los logs

2. **Edge Function:**
   - ✅ Logs muestran ejecuciones exitosas
   - ✅ Usuarios son expulsados de locales cerrados
   - ✅ Notificaciones son enviadas

3. **Base de Datos:**
   - ✅ No hay check-ins en locales cerrados
   - ✅ Notificaciones de auto-checkout en la tabla

4. **Aplicación:**
   - ✅ Perfiles de usuarios no muestran locales cerrados
   - ✅ Usuarios reciben notificaciones de expulsión

---

## 🎉 CONFIRMACIÓN FINAL

Una vez que hayas completado todos los pasos:

1. ✅ Edge Function desplegada y activa
2. ✅ Cron job creado y activo
3. ✅ Logs muestran ejecuciones exitosas
4. ✅ Usuarios son expulsados correctamente

**¡El sistema de auto-checkout está completamente operativo!**

---

## 📞 AYUDA ADICIONAL

Si necesitas ayuda:
1. Revisa `SETUP_AUTO_CHECKOUT_CRON.md` para más detalles
2. Consulta `VERIFICACION_IMPLEMENTACION_V11.md` para pruebas
3. Revisa los logs de Edge Functions en Supabase Dashboard

---

**Fecha:** 20 de Enero de 2025
**Versión:** 11.0
**Dificultad:** ⭐⭐ (Fácil)
**Tiempo estimado:** 5-10 minutos

---

**¡Éxito! 🚀**
