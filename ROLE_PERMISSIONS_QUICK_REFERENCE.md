
# Role & Permissions Quick Reference

## Quick Permission Checks

### In Components
```typescript
import { useRolePermissions } from '@/hooks/useRolePermissions';

function MyComponent() {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId } = useMode();
  
  const {
    userRole,
    localSubscription,
    canPerformAction,
    isAdmin,
    isPropietario,
    isCliente,
  } = useRolePermissions(
    user?.id,
    activeProfileType === 'local',
    activeProfileId
  );

  // Check permission
  const handleAction = () => {
    const permission = canPerformAction('create_post');
    if (!permission.allowed) {
      Alert.alert('Error', permission.reason);
      return;
    }
    // Proceed with action
  };
}
```

### Available Actions
- `'create_post'` - Create a post
- `'create_story'` - Create a story
- `'create_event'` - Create an event
- `'view_analytics'` - View analytics dashboard
- `'featured_promotion'` - Create featured promotions
- `'priority_support'` - Access priority support
- `'unlimited_posts'` - No post limits
- `'advanced_stats'` - View advanced statistics

## Role Checks

### Simple Role Checks
```typescript
if (isAdmin) {
  // Admin-only code
}

if (isPropietario) {
  // Propietario-only code
}

if (isCliente) {
  // Cliente-only code
}
```

### Subscription Checks
```typescript
if (localSubscription?.isActive) {
  const plan = localSubscription.plan;
  
  if (plan === 'premium' || plan === 'enterprise') {
    // Premium features
  } else if (plan === 'basic') {
    // Basic features
  }
}
```

## Database Queries

### Check User Role
```sql
SELECT rol_app FROM usuarios WHERE id = 'user-id';
```

### Check Subscription Status
```sql
SELECT 
  sl.estado,
  ps.nombre as plan_name,
  ps.activo as plan_active
FROM suscripciones_locales sl
JOIN planes_suscripcion ps ON sl.plan_id = ps.id
WHERE sl.local_id = 'local-id'
  AND sl.usuario_id = 'user-id'
  AND sl.estado = 'activa';
```

### Using Helper Functions
```sql
-- Check if subscription is active
SELECT check_local_subscription_active(
  'local-id'::UUID,
  'user-id'::UUID,
  'basic' -- minimum required plan
);

-- Get user role
SELECT get_user_role('user-id'::UUID);
```

## Common Patterns

### Protected Button
```typescript
<PermissionGuard
  permission={canPerformAction('create_event')}
  onAllowed={() => router.push('/crear/evento')}
>
  <TouchableOpacity style={styles.button}>
    <Text>Crear Evento</Text>
  </TouchableOpacity>
</PermissionGuard>
```

### Conditional Rendering
```typescript
{canPerformAction('view_analytics').allowed && (
  <AnalyticsSection />
)}
```

### Subscription Banner
```typescript
{isInteractingAsLocal && localSubscription && (
  <SubscriptionBanner 
    subscription={localSubscription}
    showUpgradeButton={true}
  />
)}
```

## Error Messages

### Standard Messages
- **No Permission**: "Esta función está disponible solo para propietarios de locales"
- **No Subscription**: "Necesitas una suscripción activa para usar esta función"
- **Upgrade Required**: "Actualiza a Premium para acceder a esta función"
- **Switch Profile**: "Cambia al perfil de tu local para acceder a esta función"

### With Upgrade Path
```typescript
Alert.alert(
  'Acción no permitida',
  permission.reason,
  [
    { text: 'Entendido', style: 'cancel' },
    ...(permission.requiresUpgrade ? [{
      text: 'Ver planes',
      onPress: () => router.push('/gestion/planes-suscripcion'),
    }] : []),
  ]
);
```

## Testing Scenarios

### Test User Roles
```typescript
// Set user role in database
UPDATE usuarios SET rol_app = 'admin' WHERE id = 'user-id';
UPDATE usuarios SET rol_app = 'propietario' WHERE id = 'user-id';
UPDATE usuarios SET rol_app = 'cliente' WHERE id = 'user-id';
```

### Test Subscription Plans
```typescript
// Create test subscription
INSERT INTO suscripciones_locales (
  usuario_id,
  local_id,
  plan_id,
  estado
) VALUES (
  'user-id',
  'local-id',
  (SELECT id FROM planes_suscripcion WHERE nombre = 'premium'),
  'activa'
);
```

### Test Expired Subscription
```typescript
UPDATE suscripciones_locales 
SET estado = 'expirada'
WHERE usuario_id = 'user-id' AND local_id = 'local-id';
```

## Debugging

### Enable Logging
```typescript
// In useRolePermissions hook
console.log('[useRolePermissions] User role:', userRole);
console.log('[useRolePermissions] Subscription:', localSubscription);
console.log('[useRolePermissions] Permission check:', action, result);
```

### Check RLS Policies
```sql
-- View active policies
SELECT * FROM pg_policies WHERE tablename = 'posts';
SELECT * FROM pg_policies WHERE tablename = 'historias';
SELECT * FROM pg_policies WHERE tablename = 'eventos';
```

### Test Permission Function
```typescript
const testPermissions = () => {
  const actions = [
    'create_post',
    'create_story',
    'create_event',
    'view_analytics',
  ];
  
  actions.forEach(action => {
    const result = canPerformAction(action as any);
    console.log(`${action}:`, result);
  });
};
```

## Common Issues

### Issue: Permission denied even with correct role
**Solution**: Check if subscription is active and plan meets requirements

### Issue: Subscription not loading
**Solution**: Verify `suscripciones_locales` has correct `local_id` and `usuario_id`

### Issue: RLS blocking queries
**Solution**: Ensure user is authenticated and policies are correctly defined

### Issue: Wrong plan showing
**Solution**: Check `planes_suscripcion` table and verify `plan_id` in subscription

---

**Quick Links**:
- Full Documentation: `SOCIAL_ROLE_SUBSCRIPTION_SYSTEM.md`
- Hook Implementation: `hooks/useRolePermissions.ts`
- Social Screen: `app/(tabs)/social/index.tsx`
- Database Policies: Migration `add_role_based_rls_policies`
