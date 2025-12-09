
# Social Network Role-Based Access Control & Subscription System

## Overview

This document describes the comprehensive role-based access control (RBAC) and subscription plan system implemented for the social network features of the BarLive application.

## User Roles

### 1. Admin
- **Full Access**: Admins have unrestricted access to all features
- **Permissions**:
  - View all posts and stories (including from inactive subscriptions)
  - Create/edit/delete any content
  - Access all analytics and reports
  - Manage users and subscriptions
  - No subscription requirements

### 2. Propietario (Local Owner)
- **Subscription-Based Access**: Features depend on active subscription plan
- **Dual Profile**: Can interact as personal user or as local profile
- **Permissions**:
  - As personal user: Same as Cliente
  - As local profile: Depends on subscription plan (see below)

### 3. Cliente (Customer)
- **Basic Access**: Standard social features
- **Permissions**:
  - Create personal posts and stories
  - Like, comment, and share content
  - Follow users and locals
  - View public content
  - No subscription required

## Subscription Plans

### Free Plan
- **Cost**: €0/month
- **Features**:
  - Basic profile listing
  - Limited visibility
  - No social posting capabilities
- **Restrictions**:
  - Cannot create posts or stories as local
  - No analytics access
  - No event creation
  - No featured promotions

### Basic Plan (Standard)
- **Cost**: €9.99/month or €99.99/year
- **Features**:
  - ✅ Create unlimited posts as local
  - ✅ Create unlimited stories as local
  - ✅ Basic analytics dashboard
  - ✅ Customer engagement metrics
  - ✅ Standard support
- **Restrictions**:
  - ❌ No featured events
  - ❌ No advanced analytics
  - ❌ No priority support

### Premium Plan
- **Cost**: €19.99/month or €199.99/year
- **Features**:
  - ✅ All Basic plan features
  - ✅ Create featured events
  - ✅ Advanced analytics and insights
  - ✅ Priority customer support
  - ✅ Featured promotions
  - ✅ Enhanced visibility in search
  - ✅ Custom branding options

### Enterprise Plan
- **Cost**: Custom pricing
- **Features**:
  - ✅ All Premium plan features
  - ✅ Multiple location management
  - ✅ API access
  - ✅ Dedicated account manager
  - ✅ Custom integrations

## Implementation Details

### Database Structure

#### Tables
- `usuarios`: User accounts with `rol_app` field (admin, propietario, cliente)
- `locales`: Local business profiles
- `planes_suscripcion`: Subscription plan definitions
- `suscripciones_locales`: Active subscriptions linking users to locals with plans
- `propietarios_locales`: Junction table for local ownership

#### Key Fields
```sql
usuarios.rol_app: 'admin' | 'propietario' | 'cliente'
suscripciones_locales.estado: 'activa' | 'cancelada' | 'pausada' | 'expirada'
planes_suscripcion.nombre: 'free' | 'basic' | 'premium' | 'enterprise'
```

### Row Level Security (RLS) Policies

#### Posts Table
1. **Admin View Policy**: Admins can view all posts
2. **User View Policy**: Users can view:
   - All personal posts (tipo = 'usuario')
   - Local posts only from locals with active paid subscriptions
3. **Cliente Insert Policy**: Can create personal posts
4. **Propietario Insert Policy**: Can create local posts only with active subscription

#### Stories Table
Similar policies as posts table for consistency

#### Events Table
- Only Premium/Enterprise subscription holders can create events
- All users can view active events

### Frontend Components

#### 1. Enhanced Social Screen (`app/(tabs)/social/index.tsx`)
- Displays subscription status banner for local profiles
- Shows admin badge for admin users
- Filters content based on role and subscription
- Permission checks before allowing actions

#### 2. useRolePermissions Hook (`hooks/useRolePermissions.ts`)
- Centralized permission management
- Loads user role and subscription info
- Provides `canPerformAction()` method for permission checks
- Returns feature availability matrix

#### 3. SubscriptionBanner Component (`components/social/SubscriptionBanner.tsx`)
- Visual indicator of current subscription plan
- Color-coded by plan level (Gold for Premium, Blue for Basic, Gray for Free)
- Quick access to upgrade options
- Shows inactive status when subscription expired

#### 4. PermissionGuard Component (`components/social/PermissionGuard.tsx`)
- Wrapper component for protected actions
- Shows appropriate error messages
- Provides upgrade path when applicable

### Permission Check Flow

```typescript
// Example: Creating a post
const permission = canPerformAction('create_post');

if (!permission.allowed) {
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
  return;
}

// Proceed with action
router.push('/crear/publicacion');
```

### Helper Functions

#### `check_local_subscription_active()`
```sql
-- Checks if a local has an active subscription meeting requirements
SELECT check_local_subscription_active(
  local_id,
  usuario_id,
  'basic' -- or 'premium', 'enterprise'
);
```

#### `get_user_role()`
```sql
-- Returns the role of a user
SELECT get_user_role(usuario_id);
```

## Feature Matrix

| Feature | Cliente | Propietario (Free) | Propietario (Basic) | Propietario (Premium) | Admin |
|---------|---------|-------------------|---------------------|----------------------|-------|
| Create Personal Posts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Personal Stories | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create Local Posts | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Local Stories | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create Events | ❌ | ❌ | ❌ | ✅ | ✅ |
| View Basic Analytics | ❌ | ❌ | ✅ | ✅ | ✅ |
| View Advanced Analytics | ❌ | ❌ | ❌ | ✅ | ✅ |
| Featured Promotions | ❌ | ❌ | ❌ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ❌ | ✅ | ✅ |

## User Experience Flow

### For Clientes
1. Sign up and verify email
2. Create profile
3. Start posting and interacting immediately
4. No subscription required

### For Propietarios
1. Sign up as Cliente
2. Request Propietario role upgrade
3. Admin approves request
4. Create/claim local profile
5. Choose subscription plan
6. Activate subscription
7. Start posting as local with plan-appropriate features

### For Admins
1. Assigned by system administrator
2. Full access to all features
3. Can manage users, subscriptions, and content
4. No restrictions

## Error Handling

### Permission Denied
- Clear error message explaining why action is not allowed
- Suggestion for next steps (upgrade, switch profile, etc.)
- Direct link to subscription plans when applicable

### Subscription Expired
- Graceful degradation of features
- Notification banner showing expired status
- Easy reactivation process

### Role Mismatch
- Contextual guidance (e.g., "Switch to local profile to access this feature")
- Profile switcher easily accessible

## Security Considerations

1. **Server-Side Validation**: All permissions checked at database level via RLS
2. **Token-Based Auth**: Uses Supabase JWT for authentication
3. **Role in JWT**: User role stored in `app_metadata` for quick access
4. **Subscription Verification**: Real-time checks against active subscriptions
5. **Audit Trail**: All permission checks logged for security review

## Performance Optimizations

1. **Indexed Queries**: All role and subscription queries use database indexes
2. **Cached Permissions**: Permission checks cached during session
3. **Lazy Loading**: Subscription details loaded only when needed
4. **Optimistic UI**: Actions appear instant with background validation

## Testing Checklist

- [ ] Cliente can create personal posts
- [ ] Cliente cannot create local posts
- [ ] Propietario with Free plan cannot post as local
- [ ] Propietario with Basic plan can post as local
- [ ] Propietario with Basic plan cannot create events
- [ ] Propietario with Premium plan can create events
- [ ] Admin can perform all actions
- [ ] Expired subscriptions block local posting
- [ ] Subscription banner displays correctly
- [ ] Permission errors show appropriate messages
- [ ] Upgrade flow works correctly

## Future Enhancements

1. **Trial Periods**: 14-day free trial for new Propietarios
2. **Usage Limits**: Soft limits on free tier (e.g., 5 posts/month)
3. **Analytics Dashboard**: Detailed subscription usage metrics
4. **Automated Reminders**: Email notifications before subscription expires
5. **Promo Codes**: Discount codes for subscription plans
6. **Referral Program**: Rewards for referring other local owners

## Support & Documentation

For questions or issues:
- Check this documentation first
- Review code comments in implementation files
- Contact development team
- Submit bug reports with role/subscription details

---

**Last Updated**: 2025-01-XX
**Version**: 1.0
**Author**: Development Team
