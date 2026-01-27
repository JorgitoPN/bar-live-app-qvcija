
# ⏰ CONFIGURAR CRON JOB - PASO A PASO

## 🎯 OBJETIVO

Configurar un cron job que expulse automáticamente a los usuarios de los locales cuando estos cierran.

---

## 📝 PASOS EXACTOS

### PASO 1: Acceder a Supabase

1. Abre tu navegador
2. Ve a: https://supabase.com/dashboard
3. Inicia sesión con tu cuenta
4. Selecciona el proyecto: **embntaqwlwmgazvrglaf**

### PASO 2: Ir a Cron Jobs

1. En el menú lateral izquierdo, haz clic en **Database**
2. En el submenú que aparece, haz clic en **Cron Jobs**
3. Verás una lista de cron jobs (puede estar vacía)

### PASO 3: Crear Nuevo Cron Job

1. Haz clic en el botón **Create a new cron job** (esquina superior derecha)
2. Se abrirá un formulario

### PASO 4: Rellenar el Formulario

**Campo 1: Name**
```
auto-checkout-closed-locals
```
*Copia y pega exactamente este nombre*

**Campo 2: Schedule**
```
*/5 * * * *
```
*Esto significa: cada 5 minutos*

**Campo 3: Command**
```sql
SELECT net.http_post(
  url := 'https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals',
  headers := '{"Content-Type": "application/json"}'::jsonb,
  body := '{}'::jsonb
);
```
*Copia y pega exactamente este comando*

### PASO 5: Crear el Cron Job

1. Revisa que todos los campos estén correctos
2. Haz clic en **Create cron job**
3. Deberías ver un mensaje de éxito

### PASO 6: Activar el Cron Job

1. En la lista de cron jobs, busca `auto-checkout-closed-locals`
2. Verifica que el toggle esté en **ON** (verde)
3. Si está en OFF (gris), haz clic para activarlo

### PASO 7: Verificar que Funciona

1. Espera 5 minutos
2. Ve a **Edge Functions** en el menú lateral
3. Haz clic en `auto-checkout-closed-locals`
4. Ve a la pestaña **Logs**
5. Deberías ver logs como:
   ```
   [AutoCheckout] Starting automatic checkout process...
   [AutoCheckout] Found X active check-ins
   ```

---

## ✅ VERIFICACIÓN RÁPIDA

### Opción 1: Ver Logs del Edge Function

1. Ve a **Edge Functions** → `auto-checkout-closed-locals` → **Logs**
2. Busca logs recientes (últimos 5 minutos)
3. Deberías ver:
   ```
   [AutoCheckout] ========================================
   [AutoCheckout] Starting automatic checkout process...
   [AutoCheckout] Time: 2025-01-20T...
   [AutoCheckout] Found X active check-ins
   ```

### Opción 2: Ejecutar SQL

1. Ve a **SQL Editor**
2. Ejecuta:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobname = 'auto-checkout-closed-locals' 
   ORDER BY start_time DESC 
   LIMIT 5;
   ```
3. Deberías ver las últimas 5 ejecuciones

### Opción 3: Ejecutar Manualmente

1. Abre una terminal
2. Ejecuta:
   ```bash
   curl -X POST \
     https://embntaqwlwmgazvrglaf.supabase.co/functions/v1/auto-checkout-closed-locals \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
3. Deberías ver una respuesta como:
   ```json
   {
     "success": true,
     "message": "Successfully checked out X users from closed locals",
     "checkedOut": X
   }
   ```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema 1: El cron job no aparece en la lista

**Solución:**
1. Verifica que estás en el proyecto correcto
2. Verifica que tienes permisos de administrador
3. Intenta refrescar la página

### Problema 2: El cron job no se ejecuta

**Verificar:**
```sql
-- Ver estado del cron job
SELECT * FROM cron.job 
WHERE jobname = 'auto-checkout-closed-locals';
```

**Si no aparece:**
1. Vuelve a crear el cron job siguiendo los pasos exactos
2. Verifica que el nombre sea exactamente `auto-checkout-closed-locals`

### Problema 3: El Edge Function falla

**Verificar:**
1. Ve a **Edge Functions** → `auto-checkout-closed-locals`
2. Verifica que el estado sea **ACTIVE**
3. Ve a **Logs** y busca errores

**Si hay errores:**
1. Copia el error completo
2. Busca en los logs del Edge Function
3. Verifica que las variables de entorno estén configuradas

### Problema 4: Los usuarios no son expulsados

**Verificar horarios del local:**
```sql
SELECT nombre, horarios_completos 
FROM locales 
WHERE nombre = 'Bar San Roque';
```

**Formato correcto:**
```json
{
  "lunes": ["09:00-23:00"],
  "martes": ["09:00-23:00"],
  "miercoles": ["09:00-23:00"],
  "jueves": ["09:00-23:00"],
  "viernes": ["09:00-03:00"],
  "sabado": ["09:00-03:00"],
  "domingo": ["09:00-23:00"]
}
```

---

## 📊 MONITOREO

### Ver Usuarios Actualmente en Locales

```sql
SELECT 
  u.nombre as usuario,
  l.nombre as local,
  l.horarios_completos,
  ci.created_at as check_in_time
FROM check_ins ci
JOIN usuarios u ON ci.usuario_id = u.id
JOIN locales l ON ci.local_id = l.id
ORDER BY ci.created_at DESC;
```

### Ver Últimas Expulsiones

Revisa los logs del Edge Function en:
**Edge Functions** → `auto-checkout-closed-locals` → **Logs**

Busca líneas como:
```
[AutoCheckout] ❌ User [user_id] should be checked out from [local_name] (CLOSED)
[AutoCheckout] ✅ Successfully checked out users:
   - User [user_id] from [local_name] (Local is closed)
```

---

## 🎉 CONFIRMACIÓN FINAL

Una vez configurado, deberías ver:

1. ✅ Cron job en la lista con estado **Active**
2. ✅ Toggle en **ON** (verde)
3. ✅ Logs del Edge Function cada 5 minutos
4. ✅ Usuarios expulsados de locales cerrados
5. ✅ 0 usuarios en locales fuera de horario

---

## 📞 AYUDA

Si tienes problemas:

1. Revisa este documento paso a paso
2. Verifica los logs del Edge Function
3. Ejecuta los comandos SQL de verificación
4. Ejecuta manualmente el Edge Function con curl

---

**Versión:** 2.0  
**Fecha:** 2025-01-20  
**Tiempo estimado:** 5 minutos  
**Dificultad:** ⭐⭐☆☆☆ (Fácil)
