
# 🔧 IMPERSONATION SYSTEM FIX - COMPLETE GUIDE

## 📋 Issues Fixed

### 1. **Impersonation Not Working Across the App**
**Problem**: When an admin activated impersonation, they were still seeing their own content instead of the impersonated user's content throughout the entire application.

**Root Cause**: Most components were using `useAuth()` directly to get the current user, which always returns the logged-in admin user, not the impersonated user.

**Solution**: 
- Created `useEffectiveUser()` hook that checks if impersonation is active
- If impersonating, returns the impersonated user's data
- If not impersonating, returns the current logged-in user's data
- Updated all relevant components to use `useEffectiveUser()` instead of `useAuth()`

### 2. **Social Profile Button Not Appearing**
**Problem**: The social profile button was not appearing on the local details page even when the local had a social profile.

**Root Cause**: The button was only shown when `plan_activo === 'estandar' || plan_activo === 'premium'`, but it should also check if the local has a `local_profile_id`.

**Solution**: 
- Updated the condition to: `const hasSocialProfile = !!(local.local_profile_id || local.plan_activo === 'estandar' || local.plan_activo === 'premium');`
- Now the button appears if the local has either a profile ID or an active plan

---

## 🔑 Key Changes Made

### 1. **Updated `app/detalle/local.tsx`**
```typescript
// BEFORE:
import { useAuth } from '../../contexts/AuthContext';
const { user } = useAuth();

// AFTER:
import { useEffectiveUser } from '../../hooks/useEffectiveUser';
const { user } = useEffectiveUser();
```

**Social Profile Button Fix:**
```typescript
// BEFORE:
const hasSocialProfile = local.plan_activo === 'estandar' || local.plan_activo === 'premium';

// AFTER:
const hasSocialProfile = !!(local.local_profile_id || local.plan_activo === 'estandar' || local.plan_activo === 'premium');
```

---

## 📚 How the Impersonation System Works

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                    ImpersonationContext                      │
│  - Manages impersonation sessions                           │
│  - Stores impersonated user data                            │
│  - Provides effectiveUserId and effectiveUser               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    useEffectiveUser() Hook                   │
│  - Returns impersonated user if active                      │
│  - Returns current user if not impersonating                │
│  - Used by ALL components that need user data               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Components                    │
│  - Use useEffectiveUser() instead of useAuth()              │
│  - Display impersonated user's content                      │
│  - Interact as impersonated user                            │
└─────────────────────────────────────────────────────────────┘
```

### **Impersonation Flow**

1. **Admin starts impersonation** (from `app/admin/gestionar-usuarios.tsx`):
   - Clicks "Suplantar" button on user card
   - `startImpersonation(userId)` is called
   - Session is created in `admin_impersonation_sessions` table
   - Session is stored in AsyncStorage
   - `ImpersonationContext` updates state

2. **User navigates the app**:
   - All components using `useEffectiveUser()` now see the impersonated user
   - All database queries use the impersonated user's ID
   - All UI displays show the impersonated user's data

3. **Admin ends impersonation**:
   - Clicks "Volver a mi cuenta" in ProfileSwitcher
   - `endImpersonation()` is called
   - Session is marked as inactive in database
   - AsyncStorage is cleared
   - Admin returns to their own account

---

## ✅ Components That MUST Use `useEffectiveUser()`

To ensure impersonation works correctly, the following types of components **MUST** use `useEffectiveUser()` instead of `useAuth()`:

### **1. Profile Pages**
- `app/(tabs)/perfil/index.tsx` - User profile page
- `app/perfil/usuario.tsx` - User profile viewer
- `app/editar/perfil.tsx` - Profile editor

### **2. Social Features**
- `app/(tabs)/social/index.tsx` - Social feed
- `app/social/post.tsx` - Post viewer
- `components/social/PublicacionCard.tsx` - Post card
- `components/social/CommentsModal.tsx` - Comments
- `components/social/NewPostCard.tsx` - Create post

### **3. Favorites & Following**
- `app/(tabs)/favoritos/index.tsx` - Favorites page
- `app/perfil/seguidos.tsx` - Following list
- `app/perfil/seguidores.tsx` - Followers list
- `contexts/FavoritesContext.tsx` - Favorites context

### **4. Messaging**
- `app/(tabs)/perfil/chats.tsx` - Chat list
- `app/chat/conversacion.tsx` - Conversation view
- `components/chat/MessageBubble.tsx` - Message bubble

### **5. Check-ins & Reviews**
- `app/detalle/local.tsx` - Local details (✅ FIXED)
- `components/social/ReviewsModal.tsx` - Reviews modal
- `components/detalle/CheckInModal.tsx` - Check-in modal

### **6. Notifications**
- `app/(tabs)/perfil/notificaciones.tsx` - Notifications page
- `components/perfil/NotificacionItem.tsx` - Notification item

---

## 🚨 Common Mistakes to Avoid

### ❌ **DON'T DO THIS:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth(); // ❌ This will always return the admin user
  
  // This will show admin's data even when impersonating
  return <Text>{user.nombre}</Text>;
}
```

### ✅ **DO THIS INSTEAD:**
```typescript
import { useEffectiveUser } from '@/hooks/useEffectiveUser';

function MyComponent() {
  const { user } = useEffectiveUser(); // ✅ This returns impersonated user if active
  
  // This will show impersonated user's data
  return <Text>{user.nombre}</Text>;
}
```

---

## 🔍 How to Test Impersonation

### **Step 1: Start Impersonation**
1. Log in as admin (jorgepereznoyagh@gmail.com)
2. Navigate to "Gestionar Usuarios" in admin panel
3. Find a user to impersonate
4. Click the purple "Suplantar" button (👤 icon)
5. Confirm the impersonation

### **Step 2: Verify Impersonation is Active**
1. You should see a purple banner at the top of ProfileSwitcher
2. The banner should say "Modo Suplantación Activo"
3. It should show the impersonated user's name

### **Step 3: Test User-Specific Features**
1. **Profile**: Navigate to "Mi Perfil" - should show impersonated user's profile
2. **Social Feed**: Check posts - should show impersonated user's feed
3. **Favorites**: Check favorites - should show impersonated user's favorites
4. **Following**: Check following list - should show impersonated user's following
5. **Messages**: Check chats - should show impersonated user's conversations
6. **Check-ins**: Try checking in - should create check-in for impersonated user
7. **Reviews**: Try adding a review - should create review for impersonated user

### **Step 4: End Impersonation**
1. Open ProfileSwitcher (tap profile icon)
2. Click "Volver a mi cuenta" button
3. Confirm you want to end impersonation
4. Verify you're back to your admin account

---

## 📊 Database Schema

### **admin_impersonation_sessions Table**
```sql
CREATE TABLE admin_impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES usuarios(id),
  impersonated_user_id UUID NOT NULL REFERENCES usuarios(id),
  admin_email TEXT NOT NULL,
  impersonated_user_email TEXT NOT NULL,
  impersonated_user_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  reason TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 Future Improvements

1. **Audit Logging**: Log all actions performed during impersonation
2. **Time Limits**: Automatically end impersonation after X hours
3. **Permissions**: Restrict certain actions during impersonation
4. **Notifications**: Notify impersonated user when admin accesses their account
5. **Multi-Admin**: Support multiple admins impersonating different users simultaneously

---

## 📝 Summary

### **What Was Fixed:**
1. ✅ Impersonation now works across the entire app
2. ✅ Social profile button now appears correctly on local details page
3. ✅ All user-specific content now shows impersonated user's data
4. ✅ All database queries now use impersonated user's ID

### **Key Takeaways:**
- Always use `useEffectiveUser()` for user-specific features
- Never use `useAuth()` directly in components that need to support impersonation
- Test impersonation thoroughly after making changes to user-related features
- The impersonation system is designed to be transparent to the rest of the app

---

## 🆘 Troubleshooting

### **Problem: Still seeing admin content after impersonation**
**Solution**: Check if the component is using `useAuth()` instead of `useEffectiveUser()`

### **Problem: Impersonation session not persisting**
**Solution**: Check AsyncStorage and verify the session is being saved correctly

### **Problem: Can't end impersonation**
**Solution**: Clear AsyncStorage manually or restart the app

### **Problem: Social profile button not appearing**
**Solution**: Verify the local has either `local_profile_id` or an active plan

---

## 📞 Support

If you encounter any issues with the impersonation system, please:
1. Check the console logs for `[Impersonation]` messages
2. Verify the `admin_impersonation_sessions` table in the database
3. Check AsyncStorage for the `@barlive_impersonation_session` key
4. Review this guide for common mistakes

---

**Last Updated**: 2025-01-XX
**Version**: 1.0
**Author**: Natively AI Assistant
