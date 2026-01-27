
# ⏰ CONFIGURACIÓN FINAL DEL CRON JOB - AUTO-CHECKOUT

## 🎯 OBJETIVO

Configurar el cron job que expulsa automáticamente a los usuarios de los locales cuando estos cierran, ejecutándose cada 5 minutos.

---

## ✅ PASO 1: VERIFICAR QUE EL EDGE FUNCTION EXISTE

El Edge Function `auto-checkout-closed-locals` ya está desplegado y activo.

**Verificación:**
- ✅ Edge Function desplegado
- ✅ Versión: 6
- ✅ Estado: ACTIVE
- ✅ verify_jwt: false (permite llamadas desde cron)

---

## 🔧 PASO 2: CONFIGURAR EL CRON JOB EN SUPABASE

### Acceder a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `embntaqwlwmgazvrglaf`
3. En el menú lateral, ve a **Database**
4. Selecciona **Cron Jobs**

### Crear el Cron Job

Haz clic en **Create a new cron job** y rellena:

**Name:**
```
auto-checkout-closed-locals
```

**Schedule (cron expression):**
```
*/5 * * * *
```
*Esto significa: cada 5 minutos*

**Command:**
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
  body := '{}'::jsonb
);
```

**Importante:** Si el comando anterior no funciona, usa esta versión simplificada:

```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```

### Activar el Cron Job

1. Haz clic en **Create cron job**
2. Busca el cron job en la lista
3. Asegúrate de que el toggle esté en **ON** (verde)
4. Verifica que el estado sea **Active**

---

## 📊 PASO 3: VERIFICAR QUE FUNCIONA

### Ver Ejecuciones del Cron Job

Ejecuta esta query en el SQL Editor de Supabase:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'auto-checkout-closed-locals' 
ORDER BY start_time DESC 
LIMIT 10;
```

### Ver Logs del Edge Function

1. Ve a **Edge Functions** en Supabase Dashboard
2. Selecciona `auto-checkout-closed-locals`
3. Ve a la pestaña **Logs**
4. Verifica que se ejecuta cada 5 minutos

### Logs Esperados

```
[AutoCheckout] ========================================
[AutoCheckout] Starting automatic checkout process...
[AutoCheckout] Time: 2025-01-21T10:05:00.000Z
[AutoCheckout] Found 2 active check-ins
[AutoCheckout] Checking Bar San Roque - Day: lunes, Time: 10:05
[AutoCheckout] Bar San Roque is OPEN (09:00 - 23:00)
[AutoCheckout] ✅ User [user_id] can stay in Bar San Roque (OPEN)
[AutoCheckout] ========================================
```

---

## 🧪 PASO 4: PRUEBA MANUAL

### Ejecutar el Edge Function Manualmente

Puedes ejecutar el Edge Function manualmente para verificar que funciona:

```bash
curl -X POST \
  https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Escenario de Prueba

1. **Configuración:**
   - Local: Bar San Roque
   - Horario: 09:00 - 23:00
   - Hora actual: 08:06 AM (antes de apertura)
   - Usuario: @jorge

2. **Acción:**
   - @jorge hace check-in en Bar San Roque a las 08:06 AM

3. **Resultado esperado:**
   - Después de máximo 5 minutos, @jorge es expulsado automáticamente
   - @jorge ya NO aparece en el local
   - Se registra en los logs del Edge Function

---

## 🔍 PASO 5: DEBUGGING

### Ver Check-ins Activos

```sql
SELECT 
  ci.id,
  u.nombre as usuario,
  l.nombre as local,
  l.horarios_completos,
  ci.created_at
FROM check_ins ci
JOIN usuarios u ON ci.usuario_id = u.id
JOIN locales l ON ci.local_id = l.id
ORDER BY ci.created_at DESC;
```

### Ver Horarios de un Local

```sql
SELECT 
  nombre,
  horarios_completos
FROM locales
WHERE nombre = 'Bar San Roque';
```

### Verificar Formato de Horarios

El formato correcto es:

```json
{
  "lunes": ["09:00-23:00"],
  "martes": ["09:00-23:00"],
  "miercoles": ["09:00-23:00"],
  "jueves": ["09:00-23:00"],
  "viernes": ["09:00-02:00"],
  "sabado": ["09:00-03:00"],
  "domingo": ["10:00-22:00"]
}
```

**Importante:**
- Usar guión simple `-` o guión largo `–`
- Formato 24 horas: `HH:MM-HH:MM`
- Para horarios overnight (ej: 23:00-03:00), el sistema lo maneja automáticamente

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Cambiar la Frecuencia

**Cada 1 minuto:**
```
* * * * *
```

**Cada 10 minutos:**
```
*/10 * * * *
```

**Cada hora:**
```
0 * * * *
```

### Deshabilitar el Cron Job

1. Ve a **Database** → **Cron Jobs**
2. Busca `auto-checkout-closed-locals`
3. Cambia el toggle a **OFF**

### Eliminar el Cron Job

```sql
SELECT cron.unschedule('auto-checkout-closed-locals');
```

---

## ✅ CHECKLIST FINAL

- [ ] Edge Function `auto-checkout-closed-locals` desplegado ✅ (Ya está)
- [ ] Cron job creado con nombre `auto-checkout-closed-locals`
- [ ] Schedule configurado a `*/5 * * * *`
- [ ] Command configurado correctamente
- [ ] Cron job activado (toggle ON)
- [ ] Primera ejecución verificada en logs
- [ ] Usuarios expulsados correctamente de locales cerrados

---

## 📝 NOTAS IMPORTANTES

1. **Zona Horaria:** El Edge Function usa la zona horaria de Madrid (`Europe/Madrid`)
2. **Formato de Horarios:** Debe ser `HH:MM-HH:MM` o `HH:MM–HH:MM`
3. **Horarios Overnight:** Se manejan correctamente (ej: 23:00-03:00)
4. **Frecuencia:** Cada 5 minutos es un buen balance entre precisión y costo
5. **Logs:** Se guardan en Supabase Edge Functions Logs

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### El cron job no se ejecuta

**Verificar:**
```sql
-- Ver estado del cron job
SELECT * FROM cron.job 
WHERE jobname = 'auto-checkout-closed-locals';

-- Ver últimas ejecuciones
SELECT * FROM cron.job_run_details 
WHERE jobname = 'auto-checkout-closed-locals' 
ORDER BY start_time DESC 
LIMIT 5;
```

### Los usuarios no son expulsados

**Verificar horarios del local:**
```sql
SELECT nombre, horarios_completos 
FROM locales 
WHERE id = '[local_id]';
```

**Verificar check-ins activos:**
```sql
SELECT 
  ci.*,
  u.nombre as usuario_nombre,
  l.nombre as local_nombre,
  l.horarios_completos
FROM check_ins ci
JOIN usuarios u ON ci.usuario_id = u.id
JOIN locales l ON ci.local_id = l.id;
```

---

**Versión:** FINAL  
**Fecha:** 2025-01-21  
**Estado:** ✅ LISTO PARA CONFIGURACIÓN
