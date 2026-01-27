
# 🔍 SQL Debugging Queries - Casa Adolfo Visibility

## 📋 Quick Diagnostics

### 1. Check Casa Adolfo Details
```sql
SELECT 
  l.id,
  l.nombre,
  l.username,
  l.activo,
  l.perfil_visible,
  l.barlive_types,
  u.id as owner_id,
  u.nombre as owner_name,
  u.username as owner_username,
  u.activo as owner_activo,
  sl.id as subscription_id,
  sl.estado as subscription_estado,
  sl.fecha_inicio
FROM locales l
LEFT JOIN usuarios u ON l.propietario_id = u.id
LEFT JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.nombre ILIKE '%casa adolfo%'
ORDER BY l.created_at DESC;
```

**Expected Result**:
- `activo`: true ✅
- `perfil_visible`: true ✅
- `subscription_estado`: activa ✅
- `owner_activo`: true ✅

---

### 2. Check RLS Policies on suscripciones_locales
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'suscripciones_locales'
ORDER BY policyname;
```

**Expected Policies**:
- ✅ "Everyone can view active subscriptions for local discovery"
- ✅ "Admins can view all subscriptions"
- ✅ "Users can view their own subscriptions"

---

### 3. Check RLS Policies on locales
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'locales'
ORDER BY policyname;
```

**Expected Policies**:
- ✅ "Todos pueden ver locales activos" - `(activo = true) OR (propietario_id = auth.uid())`

---

### 4. Test Search Query (As Regular User)
```sql
-- This simulates the query executed by HeaderSocial.tsx
SELECT 
  l.id,
  l.nombre,
  l.username,
  l.imagen_url,
  l.barlive_type,
  l.provincia,
  l.activo,
  l.perfil_visible,
  sl.id as subscription_id,
  sl.estado as subscription_estado
FROM locales l
INNER JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE (l.nombre ILIKE '%casa adolfo%' OR l.username ILIKE '%casa adolfo%')
  AND l.activo = true
  AND l.perfil_visible = true
  AND sl.estado = 'activa'
LIMIT 10;
```

**Expected Result**: Casa Adolfo should appear ✅

---

### 5. Check All Locals with Active Subscriptions
```sql
SELECT 
  l.id,
  l.nombre,
  l.username,
  l.activo,
  l.perfil_visible,
  sl.estado as subscription_estado,
  sl.fecha_inicio
FROM locales l
INNER JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.activo = true
  AND l.perfil_visible = true
  AND sl.estado = 'activa'
ORDER BY l.nombre;
```

**Purpose**: Verify all locals with active subscriptions are visible

---

### 6. Check User @barlive1
```sql
SELECT 
  id,
  nombre,
  username,
  email,
  activo,
  rol_app,
  created_at
FROM usuarios
WHERE username = 'barlive1';
```

**Expected Result**:
- `activo`: true ✅
- `rol_app`: cliente ✅

---

### 7. Check User @jorge (Owner)
```sql
SELECT 
  id,
  nombre,
  username,
  email,
  activo,
  rol_app,
  created_at
FROM usuarios
WHERE username = 'jorgitopn';
```

**Expected Result**:
- `activo`: true ✅
- `rol_app`: propietario ✅

---

## 🐛 Troubleshooting

### Issue: Casa Adolfo Not Appearing in Search

#### Step 1: Verify Local is Active
```sql
SELECT activo, perfil_visible
FROM locales
WHERE nombre ILIKE '%casa adolfo%';
```

**Expected**: `activo = true`, `perfil_visible = true`

#### Step 2: Verify Active Subscription
```sql
SELECT sl.estado, sl.fecha_inicio
FROM locales l
JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.nombre ILIKE '%casa adolfo%';
```

**Expected**: `estado = 'activa'`

#### Step 3: Verify RLS Policy Exists
```sql
SELECT COUNT(*)
FROM pg_policies
WHERE tablename = 'suscripciones_locales'
  AND policyname = 'Everyone can view active subscriptions for local discovery';
```

**Expected**: `count = 1`

#### Step 4: Test Query Without RLS (As Admin)
```sql
-- Run this as a superuser/admin to bypass RLS
SET ROLE postgres;

SELECT 
  l.nombre,
  l.activo,
  l.perfil_visible,
  sl.estado
FROM locales l
INNER JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.nombre ILIKE '%casa adolfo%';

RESET ROLE;
```

**Purpose**: Verify data exists regardless of RLS

---

### Issue: Local Disappears When Owner is Inactive

#### Check Owner Status
```sql
SELECT 
  l.nombre as local_name,
  u.nombre as owner_name,
  u.activo as owner_activo,
  l.activo as local_activo
FROM locales l
JOIN usuarios u ON l.propietario_id = u.id
WHERE l.nombre ILIKE '%casa adolfo%';
```

**Expected Behavior**: Local visibility should NOT depend on owner status

#### Verify GlobalDataContext Query
The query in `GlobalDataContext.tsx` should be:
```sql
SELECT *
FROM locales
WHERE activo = true  -- ✅ Only filters by local.activo
ORDER BY destacado DESC, rating DESC;
```

**NOT**:
```sql
-- ❌ WRONG - Don't filter by owner status
SELECT l.*
FROM locales l
JOIN usuarios u ON l.propietario_id = u.id
WHERE l.activo = true
  AND u.activo = true;  -- ❌ This would cause the issue
```

---

## 🔧 Fix Queries

### If RLS Policy is Missing
```sql
CREATE POLICY "Everyone can view active subscriptions for local discovery"
ON suscripciones_locales
FOR SELECT
TO public
USING (estado = 'activa');
```

### If Local is Inactive
```sql
UPDATE locales
SET activo = true
WHERE nombre ILIKE '%casa adolfo%';
```

### If Subscription is Inactive
```sql
UPDATE suscripciones_locales
SET estado = 'activa'
WHERE local_id = (
  SELECT id FROM locales WHERE nombre ILIKE '%casa adolfo%'
);
```

### If perfil_visible is False
```sql
UPDATE locales
SET perfil_visible = true
WHERE nombre ILIKE '%casa adolfo%';
```

---

## 📊 Performance Queries

### Check Query Performance
```sql
EXPLAIN ANALYZE
SELECT 
  l.id,
  l.nombre,
  l.username,
  sl.estado
FROM locales l
INNER JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE (l.nombre ILIKE '%casa adolfo%' OR l.username ILIKE '%casa adolfo%')
  AND l.activo = true
  AND l.perfil_visible = true
  AND sl.estado = 'activa';
```

**Purpose**: Verify query is using indexes efficiently

### Check Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('locales', 'suscripciones_locales')
ORDER BY tablename, indexname;
```

**Purpose**: Verify indexes exist for performance

---

## 🔐 Security Verification

### Check What Data is Exposed
```sql
-- As a regular user, try to access sensitive subscription data
SELECT 
  id,
  local_id,
  estado,
  plan_id,
  usuario_id,
  precio,
  metodo_pago
FROM suscripciones_locales
WHERE estado = 'activa'
LIMIT 1;
```

**Expected**: Only `id`, `local_id`, and `estado` should be accessible
**Protected**: `precio`, `metodo_pago`, `usuario_id` should be restricted

---

## 📝 Monitoring Queries

### Count Locals with Active Subscriptions
```sql
SELECT COUNT(DISTINCT l.id)
FROM locales l
INNER JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.activo = true
  AND l.perfil_visible = true
  AND sl.estado = 'activa';
```

### List All Locals with Active Subscriptions
```sql
SELECT 
  l.nombre,
  l.username,
  l.provincia,
  sl.fecha_inicio
FROM locales l
INNER JOIN suscripciones_locales sl ON l.id = sl.local_id
WHERE l.activo = true
  AND l.perfil_visible = true
  AND sl.estado = 'activa'
ORDER BY l.nombre;
```

---

**Version**: v35.0
**Purpose**: Debugging and verification
**Last Updated**: 2025-01-XX
