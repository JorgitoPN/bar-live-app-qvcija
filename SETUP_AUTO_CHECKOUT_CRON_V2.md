
# ⏰ CONFIGURACIÓN DEL CRON JOB PARA AUTO-CHECKOUT

## 📋 RESUMEN

Este documento explica cómo configurar el cron job que expulsa automáticamente a los usuarios de los locales cuando estos cierran.

---

## 🎯 OBJETIVO

**Problema:** Los usuarios pueden aparecer en locales cerrados (ej: @jorge en Bar San Roque a las 8:06 AM cuando abre a las 9:00 AM)

**Solución:** Un cron job que se ejecuta cada 5 minutos y expulsa a los usuarios de los locales cerrados

---

## 🔧 CONFIGURACIÓN PASO A PASO

### Paso 1: Acceder a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto: `embntaqwlwmgazvrglaf`
3. Ve a **Database** en el menú lateral
4. Selecciona **Cron Jobs**

### Paso 2: Crear el Cron Job

1. Haz clic en **Create a new cron job**
2. Rellena los campos:

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
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```

3. Haz clic en **Create cron job**

### Paso 3: Activar el Cron Job

1. Busca el cron job en la lista
2. Asegúrate de que el toggle esté en **ON** (verde)
3. Verifica que el estado sea **Active**

---

## 📊 VERIFICACIÓN

### Ver Ejecuciones del Cron Job

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
[AutoCheckout] Time: 2025-01-20T08:05:00.000Z
[AutoCheckout] Found 2 active check-ins
[AutoCheckout] Checking Bar San Roque - Day: lunes, Time: 8:05
[AutoCheckout] Bar San Roque is CLOSED (outside all time ranges)
[AutoCheckout] ❌ User [user_id] should be checked out from Bar San Roque (CLOSED)
[AutoCheckout] 🚪 Checking out 1 users from closed locals...
[AutoCheckout] ✅ Successfully checked out users:
   - User [user_id] from Bar San Roque (Local is closed)
[AutoCheckout] ========================================
```

---

## 🧪 PRUEBAS

### Prueba 1: Usuario en Local Cerrado

1. **Configuración:**
   - Local: Bar San Roque
   - Horario: 9:00 - 23:00
   - Hora actual: 8:06 AM
   - Usuario: @jorge

2. **Acción:**
   - @jorge hace check-in en Bar San Roque

3. **Resultado esperado:**
   - Después de máximo 5 minutos, @jorge es expulsado automáticamente
   - @jorge ya NO aparece en el local
   - Se registra en los logs del Edge Function

### Prueba 2: Usuario en Local Abierto

1. **Configuración:**
   - Local: Bar San Roque
   - Horario: 9:00 - 23:00
   - Hora actual: 15:00 PM
   - Usuario: @jorge

2. **Acción:**
   - @jorge hace check-in en Bar San Roque

3. **Resultado esperado:**
   - @jorge permanece en el local
   - NO es expulsado
   - Los logs muestran "can stay in Bar San Roque (OPEN)"

### Prueba 3: Horario Overnight

1. **Configuración:**
   - Local: Discoteca XYZ
   - Horario: 23:00 - 03:00
   - Hora actual: 01:00 AM
   - Usuario: @jorge

2. **Acción:**
   - @jorge hace check-in en Discoteca XYZ

3. **Resultado esperado:**
   - @jorge permanece en el local
   - NO es expulsado (el local está abierto)
   - Los logs muestran "is OPEN (23:00 - 03:00)"

---

## 🔍 DEBUGGING

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

### Ejecutar Manualmente el Edge Function

```bash
curl -X POST \
  https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## ⚙️ CONFIGURACIÓN AVANZADA

### Cambiar la Frecuencia del Cron

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

**Solo en horario de cierre (23:00-09:00):**
```
0 23-23,0-9 * * *
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

## 📈 MONITOREO

### Métricas Importantes

1. **Ejecuciones exitosas:** Debe ejecutarse cada 5 minutos
2. **Usuarios expulsados:** Depende de cuántos estén en locales cerrados
3. **Errores:** Debe ser 0

### Alertas Recomendadas

- ⚠️ Si el cron job falla 3 veces seguidas
- ⚠️ Si hay más de 10 usuarios expulsados en una ejecución
- ⚠️ Si el Edge Function tarda más de 10 segundos

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### El cron job no se ejecuta

**Verificar:**
1. ¿Está activado el toggle?
2. ¿La expresión cron es correcta?
3. ¿El Edge Function existe y está desplegado?

**Solución:**
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

### El Edge Function falla

**Verificar:**
1. ¿Existen las variables de entorno?
2. ¿El Edge Function está desplegado?
3. ¿Hay errores en los logs?

**Solución:**
```bash
# Ver logs del Edge Function
supabase functions logs auto-checkout-closed-locals

# Ejecutar manualmente para ver errores
curl -X POST \
  https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Los usuarios no son expulsados

**Verificar:**
1. ¿Los horarios del local están correctos en la base de datos?
2. ¿El formato de los horarios es correcto? (HH:MM-HH:MM)
3. ¿La zona horaria es correcta?

**Solución:**
```sql
-- Ver horarios de un local
SELECT nombre, horarios_completos 
FROM locales 
WHERE id = '[local_id]';

-- Formato correcto:
-- {
--   "lunes": ["09:00-23:00"],
--   "martes": ["09:00-23:00"],
--   ...
-- }
```

---

## 📝 NOTAS IMPORTANTES

1. **Zona Horaria:** El Edge Function usa la zona horaria de Madrid (`Europe/Madrid`)
2. **Formato de Horarios:** Debe ser `HH:MM-HH:MM` o `HH:MM–HH:MM` (con guión o guión largo)
3. **Horarios Overnight:** Se manejan correctamente (ej: 23:00-03:00)
4. **Frecuencia:** Cada 5 minutos es un buen balance entre precisión y costo
5. **Logs:** Se guardan en Supabase Edge Functions Logs

---

## ✅ CHECKLIST DE CONFIGURACIÓN

- [ ] Edge Function `auto-checkout-closed-locals` desplegado
- [ ] Cron job creado con nombre `auto-checkout-closed-locals`
- [ ] Schedule configurado a `*/5 * * * *`
- [ ] Command configurado correctamente
- [ ] Cron job activado (toggle ON)
- [ ] Primera ejecución verificada en logs
- [ ] Usuarios expulsados correctamente

---

## 📞 SOPORTE

Si tienes problemas con la configuración:

1. Revisa los logs del Edge Function
2. Ejecuta el Edge Function manualmente
3. Verifica los horarios en la base de datos
4. Revisa este documento

**Versión:** 2.0  
**Fecha:** 2025-01-20  
**Estado:** ✅ LISTO PARA PRODUCCIÓN
