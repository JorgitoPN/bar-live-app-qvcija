
# 🏗️ Local Ownership System - Technical Documentation

## 📐 Architecture Overview

The local ownership system uses a **three-table architecture** with automatic synchronization:

```
┌─────────────────────────┐
│  propietarios_locales   │ ← Junction table (source of truth)
│  (many-to-many)         │
└───────────┬─────────────┘
            │
            ├─ TRIGGER: sync_local_propietario_id()
            │  └─> Updates locales.propietario_id
            │
            └─ TRIGGER: ensure_local_subscription()
               └─> Creates suscripciones_locales entry
```

## 🗄️ Database Tables

### 1. propietarios_locales (Junction Table)
**Purpose:** Source of truth for local ownership

```sql
CREATE TABLE propietarios_locales (
  id uuid PRIMARY KEY,
  propietario_id uuid REFERENCES usuarios(id),
  local_id uuid REFERENCES locales(id),
  rol text CHECK (rol IN ('propietario', 'administrador', 'editor')),
  activo boolean DEFAULT true,
  fecha_asignacion timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Points:**
- ✅ Supports multiple owners per local
- ✅ Supports multiple locals per owner
- ✅ Role-based permissions
- ✅ Soft delete with `activo` flag

### 2. locales (Main Table)
**Purpose:** Local information with denormalized owner reference

```sql
ALTER TABLE locales ADD COLUMN propietario_id uuid REFERENCES usuarios(id);
```

**Key Points:**
- ✅ Denormalized for query performance
- ✅ Automatically synced by trigger
- ✅ Used by legacy code for backwards compatibility

### 3. suscripciones_locales (Subscriptions)
**Purpose:** Subscription and credits management

```sql
CREATE TABLE suscripciones_locales (
  id uuid PRIMARY KEY,
  local_id uuid REFERENCES locales(id),
  propietario_id uuid REFERENCES usuarios(id),
  usuario_id uuid REFERENCES usuarios(id),
  plan_id uuid REFERENCES planes_suscripcion(id),
  plan_nombre text,
  estado text CHECK (estado IN ('activa', 'cancelada', 'pausada', 'expirada')),
  perfil_visible boolean DEFAULT true,
  creditos_destacados_restantes integer DEFAULT 0,
  creditos_eventos_restantes integer DEFAULT 0,
  ...
);
```

**Key Points:**
- ✅ Automatically created by trigger
- ✅ Includes welcome credits
- ✅ Controls profile visibility
- ✅ Manages feature permissions

## ⚙️ Trigger Functions

### 1. sync_local_propietario_id()

**Purpose:** Keep `locales.propietario_id` in sync with `propietarios_locales`

**Trigger Events:** AFTER INSERT, UPDATE, DELETE on `propietarios_locales`

**Logic:**
```sql
IF NEW.activo = true AND NEW.rol = 'propietario' THEN
  -- Set locales.propietario_id
  UPDATE locales SET propietario_id = NEW.propietario_id
  WHERE id = NEW.local_id;
  
ELSIF NEW.activo = false THEN
  -- Clear locales.propietario_id if no other active assignments
  IF NOT EXISTS (other active propietario assignments) THEN
    UPDATE locales SET propietario_id = NULL
    WHERE id = NEW.local_id;
  END IF;
END IF;
```

**Edge Cases Handled:**
- ✅ Multiple owners: Only clears if no other active propietario
- ✅ Role changes: Only syncs for 'propietario' role
- ✅ Deactivation: Properly cleans up

### 2. ensure_local_subscription()

**Purpose:** Automatically create subscription when local is assigned

**Trigger Events:** AFTER INSERT, UPDATE on `propietarios_locales`

**Logic:**
```sql
IF NEW.activo = true AND NEW.rol = 'propietario' THEN
  IF NOT EXISTS (subscription for this local+user) THEN
    -- Create free subscription with welcome credits
    INSERT INTO suscripciones_locales (
      local_id, propietario_id, usuario_id,
      plan_id, plan_nombre: 'free',
      estado: 'activa',
      creditos_destacados_restantes: 1,
      creditos_eventos_restantes: 1,
      perfil_visible: true,
      ...
    );
  ELSE
    -- Fix existing subscription if propietario_id is NULL
    UPDATE suscripciones_locales
    SET propietario_id = NEW.propietario_id
    WHERE propietario_id IS NULL;
  END IF;
END IF;
```

**Features:**
- ✅ Creates free plan subscription
- ✅ Grants 1 destacado + 1 evento credit
- ✅ Sets profile as visible
- ✅ Enables all free features
- ✅ Fixes existing subscriptions with NULL propietario_id

## 🔐 RLS Policies

### propietarios_locales:
```sql
-- Users can view their own assignments
CREATE POLICY "Users can view their own local ownership"
  ON propietarios_locales FOR SELECT
  USING (propietario_id = auth.uid());

-- Admins can manage all assignments
CREATE POLICY "Admins can view all local ownership"
  ON propietarios_locales FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() AND rol_app = 'admin'
  ));

CREATE POLICY "Admins can insert local ownership"
  ON propietarios_locales FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() AND rol_app = 'admin'
  ));

CREATE POLICY "Admins can update local ownership"
  ON propietarios_locales FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() AND rol_app = 'admin'
  ));

CREATE POLICY "Admins can delete local ownership"
  ON propietarios_locales FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM usuarios 
    WHERE id = auth.uid() AND rol_app = 'admin'
  ));
```

## 🔄 Data Flow

### Assignment Creation:
```
Admin Panel (asignar-local-usuario.tsx)
  ↓
1. INSERT INTO propietarios_locales
   - propietario_id: user.id
   - local_id: local.id
   - rol: 'propietario'
   - activo: true
  ↓
2. TRIGGER: sync_local_propietario_id()
   - UPDATE locales SET propietario_id = user.id
  ↓
3. TRIGGER: ensure_local_subscription()
   - INSERT INTO suscripciones_locales
   - plan: 'free'
   - credits: 1 destacado, 1 evento
  ↓
4. UPDATE usuarios SET rol_app = 'propietario'
  ↓
5. INSERT INTO notificaciones
   - Notify user of assignment
  ↓
✅ User can access local immediately
```

### Query Flow (Mis Locales):
```
User opens "Mis Locales" page
  ↓
1. Query propietarios_locales
   - WHERE propietario_id = user.id
   - WHERE activo = true
   - JOIN locales
  ↓
2. Query locales (fallback)
   - WHERE propietario_id = user.id
  ↓
3. Merge results (deduplicate)
  ↓
✅ Display all owned locals
```

## 🧪 Testing Queries

### Check Assignment Status:
```sql
SELECT 
  pl.id,
  u.nombre as owner,
  l.nombre as local,
  pl.rol,
  pl.activo,
  l.propietario_id as local_owner_id,
  CASE 
    WHEN l.propietario_id = pl.propietario_id THEN '✅ SYNCED'
    ELSE '❌ NOT SYNCED'
  END as sync_status
FROM propietarios_locales pl
JOIN usuarios u ON u.id = pl.propietario_id
JOIN locales l ON l.id = pl.local_id
WHERE pl.activo = true;
```

### Check Subscription Status:
```sql
SELECT 
  sl.id,
  l.nombre as local,
  u.nombre as owner,
  sl.plan_nombre,
  sl.estado,
  sl.creditos_destacados_restantes,
  sl.creditos_eventos_restantes,
  sl.perfil_visible
FROM suscripciones_locales sl
JOIN locales l ON l.id = sl.local_id
JOIN usuarios u ON u.id = sl.propietario_id
WHERE sl.estado = 'activa';
```

### Find Inconsistencies:
```sql
-- Find assignments without subscriptions
SELECT 
  pl.id,
  u.nombre as owner,
  l.nombre as local
FROM propietarios_locales pl
JOIN usuarios u ON u.id = pl.propietario_id
JOIN locales l ON l.id = pl.local_id
WHERE pl.activo = true
  AND pl.rol = 'propietario'
  AND NOT EXISTS (
    SELECT 1 FROM suscripciones_locales 
    WHERE local_id = pl.local_id 
      AND propietario_id = pl.propietario_id
  );

-- Find locales with mismatched propietario_id
SELECT 
  pl.id,
  l.nombre as local,
  pl.propietario_id as assignment_owner,
  l.propietario_id as local_owner
FROM propietarios_locales pl
JOIN locales l ON l.id = pl.local_id
WHERE pl.activo = true
  AND pl.rol = 'propietario'
  AND (l.propietario_id IS NULL OR l.propietario_id != pl.propietario_id);
```

## 🔧 Manual Fixes (If Needed)

### Fix Missing propietario_id:
```sql
UPDATE locales l
SET propietario_id = pl.propietario_id
FROM propietarios_locales pl
WHERE l.id = pl.local_id
  AND pl.activo = true
  AND pl.rol = 'propietario'
  AND l.propietario_id IS NULL;
```

### Create Missing Subscription:
```sql
INSERT INTO suscripciones_locales (
  local_id, propietario_id, usuario_id,
  plan_id, plan_nombre, estado,
  creditos_destacados_restantes,
  creditos_eventos_restantes,
  perfil_visible
)
SELECT 
  pl.local_id,
  pl.propietario_id,
  pl.propietario_id,
  (SELECT id FROM planes_suscripcion WHERE nombre = 'free'),
  'free',
  'activa',
  1, -- destacado credit
  1, -- evento credit
  true
FROM propietarios_locales pl
WHERE pl.activo = true
  AND pl.rol = 'propietario'
  AND NOT EXISTS (
    SELECT 1 FROM suscripciones_locales 
    WHERE local_id = pl.local_id 
      AND usuario_id = pl.propietario_id
  );
```

## 📱 Frontend Integration

### ModeContext (contexts/ModeContext.tsx)
Loads owned locals from `propietarios_locales`:

```typescript
const loadOwnedLocals = async () => {
  const { data } = await supabase
    .from('propietarios_locales')
    .select(`
      local_id,
      locales (id, nombre, imagen_url, tipo)
    `)
    .eq('propietario_id', user.id);
  
  return data?.map(item => item.locales);
};
```

### Mis Locales Page (app/gestion/mis-locales.tsx)
Queries both sources for maximum compatibility:

```typescript
// Primary: propietarios_locales
const assignments = await supabase
  .from('propietarios_locales')
  .select('..., locales(...)')
  .eq('propietario_id', user.id)
  .eq('activo', true);

// Fallback: locales.propietario_id
const directLocales = await supabase
  .from('locales')
  .select('*')
  .eq('propietario_id', user.id);

// Merge and deduplicate
const allLocales = mergeUnique(assignments, directLocales);
```

## 🎯 Best Practices

### When Assigning Locals:
1. ✅ Always use the admin panel (automatic sync)
2. ✅ Verify user has correct email
3. ✅ Choose appropriate role
4. ✅ Check assignment list after creation

### When Removing Assignments:
1. ✅ Use "Quitar Asignación" button (proper cleanup)
2. ✅ Don't manually delete from database
3. ✅ Verify local is freed after removal

### When Debugging:
1. ✅ Check all three tables (propietarios_locales, locales, suscripciones_locales)
2. ✅ Verify trigger execution in database logs
3. ✅ Check RLS policies allow user access
4. ✅ Test with actual user login (not just admin)

## 🚀 Performance Considerations

### Indexing:
```sql
-- Existing indexes (verify these exist)
CREATE INDEX idx_propietarios_locales_propietario 
  ON propietarios_locales(propietario_id) 
  WHERE activo = true;

CREATE INDEX idx_propietarios_locales_local 
  ON propietarios_locales(local_id) 
  WHERE activo = true;

CREATE INDEX idx_locales_propietario 
  ON locales(propietario_id) 
  WHERE activo = true;

CREATE INDEX idx_suscripciones_locales_propietario 
  ON suscripciones_locales(propietario_id) 
  WHERE estado = 'activa';
```

### Query Optimization:
- Use `propietarios_locales` as primary source (indexed)
- Use `locales.propietario_id` as fallback (also indexed)
- Merge results in application layer (avoid complex JOINs)

## 🔒 Security

### RLS Policies:
- ✅ Users can only see their own assignments
- ✅ Admins can see and manage all assignments
- ✅ Triggers run with SECURITY DEFINER (bypass RLS)

### Validation:
- ✅ User must exist in `usuarios` table
- ✅ Local must exist in `locales` table
- ✅ Role must be valid enum value
- ✅ Only admins can create/modify assignments

## 📊 Monitoring

### Key Metrics to Track:
1. **Assignment Success Rate**: % of assignments that complete successfully
2. **Sync Failures**: Trigger execution failures
3. **Subscription Creation**: % of assignments with subscriptions
4. **User Activation**: % of users who use their assigned local

### Logging:
```sql
-- Check trigger execution logs
SELECT * FROM pg_stat_user_functions 
WHERE funcname IN ('sync_local_propietario_id', 'ensure_local_subscription');

-- Check recent assignments
SELECT 
  pl.created_at,
  u.nombre as owner,
  l.nombre as local,
  pl.activo,
  l.propietario_id IS NOT NULL as has_propietario_id,
  EXISTS (
    SELECT 1 FROM suscripciones_locales 
    WHERE local_id = pl.local_id 
      AND propietario_id = pl.propietario_id
  ) as has_subscription
FROM propietarios_locales pl
JOIN usuarios u ON u.id = pl.propietario_id
JOIN locales l ON l.id = pl.local_id
WHERE pl.created_at > now() - interval '7 days'
ORDER BY pl.created_at DESC;
```

## 🐛 Common Issues & Solutions

### Issue 1: Local doesn't appear in "Mis Locales"
**Cause:** Assignment not active or propietario_id not synced
**Solution:**
```sql
-- Check assignment status
SELECT * FROM propietarios_locales 
WHERE propietario_id = 'USER_ID' AND activo = true;

-- Fix sync if needed
UPDATE locales SET propietario_id = 'USER_ID'
WHERE id = 'LOCAL_ID';
```

### Issue 2: Subscription error on local profile
**Cause:** Missing or inactive subscription
**Solution:**
```sql
-- Check subscription
SELECT * FROM suscripciones_locales 
WHERE local_id = 'LOCAL_ID' AND propietario_id = 'USER_ID';

-- Create if missing (trigger should do this automatically)
-- If trigger didn't fire, manually create or re-assign local
```

### Issue 3: User role not updated
**Cause:** User role update failed during assignment
**Solution:**
```sql
-- Update user role manually
UPDATE usuarios SET rol_app = 'propietario'
WHERE id = 'USER_ID';
```

## 🔄 Migration Path

### From Old System to New System:
1. ✅ Existing `locales.propietario_id` preserved
2. ✅ New assignments use `propietarios_locales`
3. ✅ Both systems work in parallel
4. ✅ Gradual migration as assignments are updated

### Backwards Compatibility:
- ✅ Old code querying `locales.propietario_id` still works
- ✅ New code queries `propietarios_locales` (preferred)
- ✅ Triggers keep both in sync

## 📈 Future Enhancements

### Planned Features:
1. **Ownership Transfer**: Transfer local between users with data migration
2. **Co-ownership**: Multiple propietarios with equal rights
3. **Temporary Access**: Time-limited assignments for events
4. **Ownership History**: Track all ownership changes
5. **Bulk Assignment**: Assign multiple locals at once

### Technical Debt:
1. Consider removing `locales.propietario_id` once all code migrated
2. Add more comprehensive logging
3. Add webhook notifications for assignment changes
4. Create admin dashboard for ownership analytics

## 🎓 Code Examples

### Check if User Owns Local:
```typescript
const isOwner = async (userId: string, localId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('propietarios_locales')
    .select('id')
    .eq('propietario_id', userId)
    .eq('local_id', localId)
    .eq('activo', true)
    .single();
  
  return !!data;
};
```

### Get User's Owned Locals:
```typescript
const getOwnedLocals = async (userId: string) => {
  const { data } = await supabase
    .from('propietarios_locales')
    .select(`
      local_id,
      rol,
      locales (id, nombre, imagen_url, tipo)
    `)
    .eq('propietario_id', userId)
    .eq('activo', true);
  
  return data?.map(item => ({
    ...item.locales,
    role: item.rol,
  }));
};
```

### Check Subscription Status:
```typescript
const hasActiveSubscription = async (localId: string, userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('suscripciones_locales')
    .select('id')
    .eq('local_id', localId)
    .eq('propietario_id', userId)
    .eq('estado', 'activa')
    .single();
  
  return !!data;
};
```

## 📞 Support

For technical issues:
1. Check database logs for trigger execution
2. Verify RLS policies with `SELECT * FROM pg_policies WHERE tablename = 'propietarios_locales'`
3. Test triggers manually with test data
4. Check application logs for error messages

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-27  
**Status:** ✅ Production Ready
