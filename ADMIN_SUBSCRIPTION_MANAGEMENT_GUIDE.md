
# 📋 ADMIN GUIDE - SUBSCRIPTION AND USERNAME MANAGEMENT

## Quick Reference for Administrators

### Check Local Subscription Status

```sql
SELECT 
  l.id,
  l.nombre,
  l.username,
  l.perfil_visible,
  s.estado as suscripcion_estado,
  p.nombre as plan_nombre,
  s.creditos_eventos_restantes,
  s.creditos_destacados_restantes,
  s.fecha_proximo_pago
FROM locales l
LEFT JOIN suscripciones_locales s ON l.id = s.local_id AND s.estado = 'activa'
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.nombre ILIKE '%search_term%';
```

---

### Manually Assign Username to Local

```sql
-- Option 1: Simple assignment (check uniqueness first!)
UPDATE locales
SET username = 'desired_username'
WHERE id = 'local-uuid-here';

-- Option 2: Use Edge Function (recommended)
-- Call from Supabase Dashboard > Edge Functions > handle-subscription-changes
{
  "localId": "local-uuid-here",
  "action": "activate",
  "planId": "plan-uuid-here"
}
```

---

### Check Username Availability

```sql
-- Check if username is available
SELECT 
  'locales' as table_name, id, nombre as name, username
FROM locales
WHERE username = 'desired_username'
UNION ALL
SELECT 
  'usuarios' as table_name, id, nombre as name, username
FROM usuarios
WHERE username = 'desired_username';

-- If no results, username is available
```

---

### Force Profile Visibility

```sql
-- Make profile visible (use with caution!)
UPDATE locales
SET perfil_visible = true
WHERE id = 'local-uuid-here';

-- Hide profile
UPDATE locales
SET perfil_visible = false
WHERE id = 'local-uuid-here';
```

---

### Check Subscription Permissions

```sql
-- Get detailed subscription info
SELECT 
  l.nombre as local_nombre,
  l.username,
  l.perfil_visible,
  p.nombre as plan_nombre,
  p.precio_mensual,
  s.estado,
  s.creditos_eventos_restantes,
  s.creditos_destacados_restantes,
  s.eventos_usados_mes,
  s.fecha_proximo_pago,
  s.cancelar_al_final_periodo,
  s.plan_pendiente_id
FROM locales l
INNER JOIN suscripciones_locales s ON l.id = s.local_id
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.id = 'local-uuid-here';
```

---

### Manually Activate Subscription

```sql
-- Create new subscription for a local
INSERT INTO suscripciones_locales (
  local_id,
  propietario_id,
  plan_id,
  estado,
  fecha_inicio,
  fecha_proximo_pago,
  fecha_renovacion_creditos,
  creditos_eventos_restantes,
  creditos_destacados_restantes,
  eventos_disponibles,
  plan_nombre
)
SELECT 
  'local-uuid-here',
  l.propietario_id,
  'plan-uuid-here',
  'activa',
  NOW(),
  NOW() + INTERVAL '1 month',
  NOW() + INTERVAL '1 month',
  p.eventos_mes,
  p.promos_destacadas,
  p.eventos_mes,
  p.nombre
FROM locales l, planes_suscripcion p
WHERE l.id = 'local-uuid-here'
AND p.id = 'plan-uuid-here';

-- The trigger will automatically assign username and set perfil_visible = true
```

---

### Manually Expire Subscription

```sql
-- Expire a subscription
UPDATE suscripciones_locales
SET estado = 'expirada',
    updated_at = NOW()
WHERE local_id = 'local-uuid-here'
AND estado = 'activa';

-- The trigger will automatically set perfil_visible = false
```

---

### Get All Locals Without Usernames (But Have Active Subscription)

```sql
SELECT 
  l.id,
  l.nombre,
  l.username,
  p.nombre as plan_nombre
FROM locales l
INNER JOIN suscripciones_locales s ON l.id = s.local_id
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE s.estado = 'activa'
AND p.nombre IN ('estandar', 'premium')
AND l.username IS NULL;

-- These locals should have usernames assigned automatically
-- If not, run the migration again or use Edge Function
```

---

### Fix Broken Usernames

```sql
-- Find locals with invalid usernames
SELECT id, nombre, username
FROM locales
WHERE username IS NOT NULL
AND (
  LENGTH(username) < 3 
  OR LENGTH(username) > 30
  OR username !~ '^[a-z0-9_]+$'
);

-- Fix them by regenerating
UPDATE locales
SET username = NULL
WHERE id IN (
  SELECT id FROM locales
  WHERE username IS NOT NULL
  AND (
    LENGTH(username) < 3 
    OR LENGTH(username) > 30
    OR username !~ '^[a-z0-9_]+$'
  )
);

-- Then trigger will regenerate on next subscription update
```

---

### Get Subscription Statistics

```sql
-- Count subscriptions by plan
SELECT 
  p.nombre as plan_nombre,
  COUNT(*) as total_suscripciones,
  COUNT(CASE WHEN s.estado = 'activa' THEN 1 END) as activas,
  COUNT(CASE WHEN s.estado = 'expirada' THEN 1 END) as expiradas,
  COUNT(CASE WHEN s.estado = 'cancelada' THEN 1 END) as canceladas
FROM suscripciones_locales s
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
GROUP BY p.nombre
ORDER BY p.precio_mensual DESC;
```

---

### Get Locals About to Expire

```sql
-- Locals with subscriptions expiring in next 7 days
SELECT 
  l.nombre,
  l.username,
  p.nombre as plan_nombre,
  s.fecha_proximo_pago,
  s.cancelar_al_final_periodo,
  EXTRACT(DAY FROM (s.fecha_proximo_pago - NOW())) as dias_restantes
FROM locales l
INNER JOIN suscripciones_locales s ON l.id = s.local_id
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE s.estado = 'activa'
AND s.fecha_proximo_pago <= NOW() + INTERVAL '7 days'
ORDER BY s.fecha_proximo_pago ASC;
```

---

### Reset Credits for a Local

```sql
-- Reset monthly credits (usually done automatically)
UPDATE suscripciones_locales s
SET 
  creditos_eventos_restantes = p.eventos_mes,
  creditos_destacados_restantes = p.promos_destacadas,
  eventos_usados_mes = 0,
  promos_usadas_mes = 0,
  ultimo_reset_contador = NOW(),
  fecha_renovacion_creditos = NOW() + INTERVAL '1 month',
  updated_at = NOW()
FROM planes_suscripcion p
WHERE s.plan_id = p.id
AND s.local_id = 'local-uuid-here';
```

---

### Check Cart Items

```sql
-- See what's in users' carts
SELECT 
  u.nombre as usuario_nombre,
  u.email,
  l.nombre as local_nombre,
  p.nombre as plan_nombre,
  p.precio_mensual,
  c.quantity,
  c.created_at
FROM shopping_cart c
INNER JOIN usuarios u ON c.user_id = u.id
INNER JOIN locales l ON c.local_id = l.id
INNER JOIN planes_suscripcion p ON c.plan_id = p.id
ORDER BY c.created_at DESC;
```

---

### Clear Abandoned Carts

```sql
-- Remove cart items older than 7 days
DELETE FROM shopping_cart
WHERE created_at < NOW() - INTERVAL '7 days';
```

---

## Common Issues and Solutions

### Issue 1: Local has subscription but no username

**Diagnosis:**
```sql
SELECT l.id, l.nombre, l.username, s.estado, p.nombre as plan
FROM locales l
INNER JOIN suscripciones_locales s ON l.id = s.local_id
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE s.estado = 'activa'
AND p.nombre IN ('estandar', 'premium')
AND l.username IS NULL;
```

**Solution:**
```sql
-- Trigger username assignment by updating subscription
UPDATE suscripciones_locales
SET updated_at = NOW()
WHERE local_id = 'local-uuid-here';

-- Or use Edge Function
```

---

### Issue 2: Profile not visible despite active subscription

**Diagnosis:**
```sql
SELECT 
  l.nombre,
  l.perfil_visible,
  s.estado,
  p.nombre as plan
FROM locales l
INNER JOIN suscripciones_locales s ON l.id = s.local_id
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.id = 'local-uuid-here';
```

**Solution:**
```sql
-- Force visibility update
UPDATE locales
SET perfil_visible = true
WHERE id = 'local-uuid-here';
```

---

### Issue 3: Duplicate usernames

**Diagnosis:**
```sql
-- Find duplicate usernames
SELECT username, COUNT(*) as count
FROM (
  SELECT username FROM locales WHERE username IS NOT NULL
  UNION ALL
  SELECT username FROM usuarios WHERE username IS NOT NULL
) combined
GROUP BY username
HAVING COUNT(*) > 1;
```

**Solution:**
```sql
-- Clear duplicate usernames (will be regenerated)
UPDATE locales
SET username = NULL
WHERE username IN (
  SELECT username FROM (
    SELECT username, COUNT(*) as count
    FROM locales
    WHERE username IS NOT NULL
    GROUP BY username
    HAVING COUNT(*) > 1
  ) duplicates
);
```

---

### Issue 4: Cart not showing items

**Diagnosis:**
```sql
-- Check cart for user
SELECT * FROM shopping_cart
WHERE user_id = 'user-uuid-here';
```

**Solution:**
- Verify user has `rol_app = 'propietario'`
- Check cart icon visibility logic in code
- Verify Supabase RLS policies allow reading cart

---

## Stripe Configuration Steps

### 1. Get Stripe Keys

1. Go to https://dashboard.stripe.com
2. Navigate to Developers > API keys
3. Copy Publishable key (starts with `pk_`)
4. Copy Secret key (starts with `sk_`)

### 2. Configure in Database

```sql
-- Update Stripe configuration
UPDATE stripe_configuration
SET 
  publishable_key = 'pk_test_...',
  secret_key = 'sk_test_...',
  test_mode = true,
  updated_at = NOW()
WHERE id = (SELECT id FROM stripe_configuration LIMIT 1);

-- If no row exists, insert
INSERT INTO stripe_configuration (
  publishable_key,
  secret_key,
  test_mode
) VALUES (
  'pk_test_...',
  'sk_test_...',
  true
);
```

### 3. Set Up Webhook

1. In Stripe Dashboard, go to Developers > Webhooks
2. Add endpoint: `https://your-supabase-project.supabase.co/functions/v1/stripe-webhook`
3. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret (starts with `whsec_`)
5. Update database:

```sql
UPDATE stripe_configuration
SET webhook_secret = 'whsec_...'
WHERE id = (SELECT id FROM stripe_configuration LIMIT 1);
```

---

## Monitoring and Maintenance

### Daily Checks:

1. **Expiring Subscriptions:**
```sql
SELECT COUNT(*) FROM suscripciones_locales
WHERE estado = 'activa'
AND fecha_proximo_pago <= NOW() + INTERVAL '3 days';
```

2. **Failed Payments:**
```sql
SELECT COUNT(*) FROM payment_transactions
WHERE status = 'failed'
AND created_at >= NOW() - INTERVAL '1 day';
```

3. **Cart Abandonment:**
```sql
SELECT COUNT(*) FROM shopping_cart
WHERE created_at >= NOW() - INTERVAL '1 day';
```

### Weekly Checks:

1. **Subscription Revenue:**
```sql
SELECT 
  p.nombre,
  COUNT(*) as suscripciones_activas,
  SUM(p.precio_mensual) as ingresos_mensuales
FROM suscripciones_locales s
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE s.estado = 'activa'
GROUP BY p.nombre, p.precio_mensual;
```

2. **Username Coverage:**
```sql
SELECT 
  COUNT(*) as total_con_plan,
  COUNT(l.username) as con_username,
  COUNT(*) - COUNT(l.username) as sin_username
FROM locales l
INNER JOIN suscripciones_locales s ON l.id = s.local_id
INNER JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE s.estado = 'activa'
AND p.nombre IN ('estandar', 'premium');
```

---

## Emergency Procedures

### Restore Hidden Profile

```sql
-- If a profile was hidden incorrectly
UPDATE locales
SET perfil_visible = true
WHERE id = 'local-uuid-here';

-- Verify subscription is active
SELECT * FROM suscripciones_locales
WHERE local_id = 'local-uuid-here'
AND estado = 'activa';
```

### Extend Subscription

```sql
-- Extend subscription by 1 month
UPDATE suscripciones_locales
SET fecha_proximo_pago = fecha_proximo_pago + INTERVAL '1 month',
    updated_at = NOW()
WHERE local_id = 'local-uuid-here'
AND estado = 'activa';
```

### Grant Extra Credits

```sql
-- Add extra event credits
UPDATE suscripciones_locales
SET creditos_eventos_restantes = creditos_eventos_restantes + 5,
    updated_at = NOW()
WHERE local_id = 'local-uuid-here';

-- Add extra highlight credits
UPDATE suscripciones_locales
SET creditos_destacados_restantes = creditos_destacados_restantes + 2,
    updated_at = NOW()
WHERE local_id = 'local-uuid-here';
```

---

## Support Scenarios

### Scenario 1: "My profile disappeared!"

**Diagnosis:**
```sql
SELECT 
  l.nombre,
  l.perfil_visible,
  s.estado,
  s.fecha_proximo_pago,
  p.nombre as plan
FROM locales l
LEFT JOIN suscripciones_locales s ON l.id = s.local_id
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.propietario_id = 'user-uuid-here';
```

**Common Causes:**
- Subscription expired
- Payment failed
- Subscription cancelled

**Solution:**
- Check payment status
- Reactivate subscription if payment successful
- Contact user about payment issue

---

### Scenario 2: "I can't publish posts!"

**Diagnosis:**
```sql
SELECT 
  l.nombre,
  l.perfil_visible,
  s.estado,
  p.nombre as plan,
  p.perfil_social
FROM locales l
LEFT JOIN suscripciones_locales s ON l.id = s.local_id
LEFT JOIN planes_suscripcion p ON s.plan_id = p.id
WHERE l.id = 'local-uuid-here';
```

**Common Causes:**
- No active subscription
- Profile not visible
- Plan doesn't include social profile feature

**Solution:**
- Verify subscription is active
- Check plan includes `perfil_social = true`
- Ensure `perfil_visible = true`

---

### Scenario 3: "My username is wrong!"

**Diagnosis:**
```sql
SELECT id, nombre, username
FROM locales
WHERE id = 'local-uuid-here';
```

**Solution:**
```sql
-- Update username (check availability first!)
UPDATE locales
SET username = 'new_username'
WHERE id = 'local-uuid-here';
```

---

## Best Practices

### DO:
- ✅ Always check username availability before assigning
- ✅ Preserve data when hiding profiles
- ✅ Use triggers for automatic username assignment
- ✅ Monitor subscription expiration dates
- ✅ Send notifications before expiration
- ✅ Keep audit logs of manual changes

### DON'T:
- ❌ Delete local data when subscription expires
- ❌ Assign duplicate usernames
- ❌ Manually change `perfil_visible` without checking subscription
- ❌ Skip username validation
- ❌ Forget to update `updated_at` timestamps

---

## Troubleshooting Commands

### Verify Triggers Are Active:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%username%' OR trigger_name LIKE '%subscription%';
```

### Check Recent Subscription Changes:

```sql
SELECT 
  l.nombre,
  s.estado,
  s.updated_at,
  s.plan_nombre
FROM suscripciones_locales s
INNER JOIN locales l ON s.local_id = l.id
WHERE s.updated_at >= NOW() - INTERVAL '24 hours'
ORDER BY s.updated_at DESC;
```

### Verify RPC Function:

```sql
-- Test follower count function
SELECT get_total_seguidores_count('user-uuid-here');
```

---

## Contact Information

For technical issues with the subscription system:
- Check database logs
- Review Edge Function logs
- Verify Stripe webhook logs
- Contact development team

For business/billing issues:
- Check payment transaction history
- Review invoice records
- Contact finance team
