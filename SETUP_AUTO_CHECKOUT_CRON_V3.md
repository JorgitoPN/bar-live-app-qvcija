
# ⚡ CONFIGURACIÓN RÁPIDA - CRON JOB AUTO-CHECKOUT

## 🎯 OBJETIVO

Configurar un cron job que ejecute la función `auto-checkout-closed-locals` cada 5 minutos para expulsar automáticamente a usuarios de locales cerrados.

---

## 📋 PASOS (5 MINUTOS)

### 1️⃣ Acceder a Supabase Dashboard

1. Abre tu navegador
2. Ve a: https://supabase.com/dashboard/project/embntaqwlwmgazvrglaf
3. Inicia sesión si es necesario

---

### 2️⃣ Navegar a Edge Functions

1. En el menú lateral izquierdo, haz clic en **"Edge Functions"**
2. Busca la función **`auto-checkout-closed-locals`**
3. Haz clic en ella para abrirla

---

### 3️⃣ Configurar Cron Job

#### Opción A: Si hay pestaña "Cron Jobs"

1. Haz clic en la pestaña **"Cron Jobs"**
2. Haz clic en **"Create Cron Job"** o **"New Cron Job"**
3. Completa el formulario:
   - **Name:** `Auto-checkout every 5 minutes`
   - **Cron Expression:** `*/5 * * * *`
   - **Description:** `Automatically checks out users from closed locals every 5 minutes`
   - **Enabled:** ✅ Activado
4. Haz clic en **"Create"** o **"Save"**

#### Opción B: Si NO hay pestaña "Cron Jobs"

1. Ve a **"Settings"** o **"Configuration"**
2. Busca sección **"Scheduled Invocations"** o **"Triggers"**
3. Crea un nuevo trigger:
   - **Type:** `Cron`
   - **Schedule:** `*/5 * * * *`
   - **Function:** `auto-checkout-closed-locals`
   - **Enabled:** ✅ Activado

#### Opción C: Usar Supabase CLI (Alternativa)

Si prefieres usar la línea de comandos:

```bash
# Crear archivo de configuración
cat > supabase/functions/auto-checkout-closed-locals/cron.yaml << EOF
schedule: "*/5 * * * *"
enabled: true
EOF

# Desplegar configuración
supabase functions deploy auto-checkout-closed-locals --project-ref embntaqwlwmgazvrglaf
```

---

### 4️⃣ Verificar Configuración

1. **Espera 5 minutos** para la primera ejecución
2. Ve a **"Logs"** en la función
3. Deberías ver entradas como:
   ```
   [AUTO-CHECKOUT] Starting automatic checkout process...
   [AUTO-CHECKOUT] Found X active check-ins
   [AUTO-CHECKOUT] Successfully checked out Y users from closed locals
   ```

---

## 🔍 EXPRESIÓN CRON EXPLICADA

```
*/5 * * * *
│   │ │ │ │
│   │ │ │ └─── Día de la semana (0-7, 0 y 7 = Domingo)
│   │ │ └───── Mes (1-12)
│   │ └─────── Día del mes (1-31)
│   └───────── Hora (0-23)
└─────────────  Minuto (0-59)
```

**`*/5 * * * *`** significa:
- Cada 5 minutos
- De todas las horas
- De todos los días
- De todos los meses
- De todos los días de la semana

---

## ✅ VERIFICACIÓN

### Prueba Manual:

1. **Hacer check-in en un local:**
   ```sql
   INSERT INTO check_ins (usuario_id, local_id, visibility)
   VALUES ('tu-usuario-id', 'local-id', 'all_users');
   ```

2. **Verificar horario del local:**
   ```sql
   SELECT nombre, horarios_completos 
   FROM locales 
   WHERE id = 'local-id';
   ```

3. **Esperar a que el local cierre** (o modificar horarios para prueba)

4. **Esperar 5 minutos** (próxima ejecución del cron)

5. **Verificar que fuiste expulsado:**
   ```sql
   SELECT * FROM check_ins WHERE usuario_id = 'tu-usuario-id';
   -- Debería estar vacío
   ```

---

## 🐛 TROUBLESHOOTING

### Problema: El cron job no se ejecuta

**Solución:**
1. Verifica que el cron job está **Enabled**
2. Revisa los logs de la función
3. Verifica que la expresión cron es correcta: `*/5 * * * *`

### Problema: Usuarios no son expulsados

**Solución:**
1. Verifica que los locales tienen `horarios_completos` configurados
2. Revisa los logs de la función para ver qué locales se están procesando
3. Verifica que la hora actual está fuera del horario del local

### Problema: Error en logs

**Solución:**
1. Copia el error completo
2. Verifica que las variables de entorno están configuradas:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Contacta al equipo de desarrollo

---

## 📞 CONTACTO

Si necesitas ayuda con la configuración:

1. **Revisa la documentación:** [Supabase Edge Functions Cron](https://supabase.com/docs/guides/functions/schedule-functions)
2. **Contacta al equipo de desarrollo**
3. **Abre un ticket de soporte**

---

**Fecha:** 2025-01-20
**Versión:** 3.0.0
**Estado:** LISTO PARA CONFIGURAR ⚡
