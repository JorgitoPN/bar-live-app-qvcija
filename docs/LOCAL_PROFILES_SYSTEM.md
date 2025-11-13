
# Local Profiles System - User and Profile Structure

## Overview

This document describes the user and profile structure implemented in the social network, where local profiles function as independent user profiles within the system.

## Key Concepts

### 1. User Types

- **Cliente (Client User)**: The standard user of the social network
- **Propietario (Owner)**: A client user who has activated the owner role, allowing them to create and manage local profiles

### 2. Profile Types

- **Client Profile**: The user's personal profile (tipo: 'usuario')
- **Local Profile**: An independent profile representing a business/local (tipo: 'local')

### 3. Core Principle

**Each local functions as an independent profile** within the social network. This means:
- Each local has its own identity, profile, and content
- Locals can interact in the social network (comment, react, follow, etc.)
- Locals have their own cover photo, business information, and links
- Each local maintains its own activity, posts, and data

## Database Structure

### Tables

#### `propietarios_locales`
Maps owners to their local profiles. An owner can have multiple locals.

```sql
CREATE TABLE propietarios_locales (
  id uuid PRIMARY KEY,
  propietario_id uuid REFERENCES usuarios(id),
  local_id uuid REFERENCES locales(id),
  created_at timestamptz,
  UNIQUE(propietario_id, local_id)
);
```

#### `usuarios` (Extended)
Added `local_profile_id` column to link users that represent local profiles.

```sql
ALTER TABLE usuarios 
ADD COLUMN local_profile_id uuid REFERENCES locales(id);
```

### Helper Functions

#### `get_user_locals(user_id uuid)`
Returns all locals owned by a user.

```sql
SELECT * FROM get_user_locals('user-uuid');
```

#### `user_owns_local(user_id uuid, local_id uuid)`
Checks if a user owns a specific local.

```sql
SELECT user_owns_local('user-uuid', 'local-uuid');
```

#### `is_local_profile(user_id uuid)`
Checks if a user represents a local profile.

```sql
SELECT is_local_profile('user-uuid');
```

## Context Management

### ModeContext

The `ModeContext` manages the active profile and mode switching.

#### Key State

```typescript
interface ModeContextType {
  // Current mode (cliente, propietario, admin)
  currentMode: UserMode;
  
  // Active profile information
  activeProfileId: string | null;        // Current active user ID
  activeProfileType: 'cliente' | 'local'; // Type of active profile
  activeLocalData: LocalProfile | null;   // Local data if active profile is local
  
  // Owner's local profiles
  ownedLocals: LocalProfile[];           // All locals owned by user
  
  // Profile switching functions
  switchToClientProfile: () => Promise<void>;
  switchToLocalProfile: (localId: string) => Promise<void>;
}
```

#### Usage Example

```typescript
import { useMode } from '@/contexts/ModeContext';

function MyComponent() {
  const {
    activeProfileType,
    activeLocalData,
    ownedLocals,
    switchToClientProfile,
    switchToLocalProfile,
  } = useMode();

  // Check if viewing as local
  if (activeProfileType === 'local') {
    console.log('Viewing as:', activeLocalData?.nombre);
  }

  // Switch to a local profile
  const handleSwitchToLocal = async (localId: string) => {
    await switchToLocalProfile(localId);
  };

  // Switch back to client profile
  const handleSwitchToClient = async () => {
    await switchToClientProfile();
  };
}
```

## Profile Switching

### ProfileSwitcher Component

A modal component that allows users to switch between their client profile and their local profiles.

```typescript
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';

<ProfileSwitcher
  visible={showProfileSwitcher}
  onClose={() => setShowProfileSwitcher(false)}
/>
```

### Switching Flow

1. User opens the profile switcher
2. User sees their client profile and all owned local profiles
3. User selects a profile to switch to
4. Context updates the active profile
5. UI updates to reflect the new active profile

## Content Creation

### Posts and Stories

When creating content, the system uses the active profile:

```typescript
// Creating a post
const createPost = async (content: string, image?: string) => {
  const { activeProfileId, activeProfileType } = useMode();
  
  await supabase.from('posts').insert({
    autor_id: activeProfileId,
    tipo: activeProfileType === 'local' ? 'local' : 'usuario',
    local_id: activeProfileType === 'local' ? activeProfileId : null,
    contenido: content,
    imagen: image,
  });
};
```

### Comments

Comments also respect the active profile:

```typescript
// Creating a comment
const createComment = async (postId: string, text: string) => {
  const { activeProfileId, activeProfileType } = useMode();
  
  await supabase.from('comentarios').insert({
    post_id: postId,
    autor_id: activeProfileId,
    tipo: activeProfileType === 'local' ? 'local' : 'usuario',
    local_id: activeProfileType === 'local' ? activeProfileId : null,
    texto: text,
  });
};
```

## Navigation

### Profile Pages

- **Client Profile**: `/perfil` or `/(tabs)/perfil`
- **Local Profile**: `/perfil/local?localId={localId}`

### Automatic Redirection

The profile screen automatically redirects to the appropriate page based on the active profile:

```typescript
useEffect(() => {
  if (activeProfileType === 'local' && activeLocalData) {
    router.replace(`/perfil/local?localId=${activeLocalData.id}`);
  } else {
    // Load client profile
    loadClientProfile();
  }
}, [activeProfileType, activeLocalData]);
```

## UI Considerations

### Display Information

Always use the active profile information for display:

```typescript
const { activeProfileType, activeLocalData, user } = useMode();

const displayName = activeProfileType === 'local' && activeLocalData
  ? activeLocalData.nombre
  : user?.nombre || 'Usuario';

const displayAvatar = activeProfileType === 'local' && activeLocalData
  ? activeLocalData.imagen_url
  : user?.avatar;
```

### Action Buttons

Show appropriate actions based on the active profile:

```typescript
{activeProfileType === 'local' ? (
  // Show local-specific actions
  <TouchableOpacity onPress={handleEditLocal}>
    <Text>Editar Local</Text>
  </TouchableOpacity>
) : (
  // Show client-specific actions
  <TouchableOpacity onPress={handleEditProfile}>
    <Text>Editar Perfil</Text>
  </TouchableOpacity>
)}
```

## Best Practices

### 1. Always Check Active Profile

Before performing any action, check the active profile type:

```typescript
const { activeProfileType, activeProfileId } = useMode();

if (activeProfileType === 'local') {
  // Perform action as local
} else {
  // Perform action as client
}
```

### 2. Maintain Profile Context

When navigating between screens, maintain the active profile context:

```typescript
// Don't clear the context unless explicitly switching profiles
// The context should persist across navigation
```

### 3. Verify Ownership

Before allowing actions on a local, verify ownership:

```typescript
const { data: ownership } = await supabase
  .from('propietarios_locales')
  .select('id')
  .eq('propietario_id', user.id)
  .eq('local_id', localId)
  .single();

if (!ownership) {
  Alert.alert('Error', 'No tienes permisos para esta acción');
  return;
}
```

### 4. Clear Context on Logout

When the user logs out, clear all profile context:

```typescript
const handleLogout = async () => {
  await switchToClientProfile();
  await supabase.auth.signOut();
};
```

## Migration Guide

### For Existing Code

1. **Replace direct local_id checks** with active profile checks:
   ```typescript
   // Before
   if (selectedLocalId) { ... }
   
   // After
   if (activeProfileType === 'local') { ... }
   ```

2. **Update content creation** to use active profile:
   ```typescript
   // Before
   autor_id: user.id,
   local_id: selectedLocalId,
   
   // After
   autor_id: activeProfileId,
   local_id: activeProfileType === 'local' ? activeProfileId : null,
   ```

3. **Update display logic** to use active profile data:
   ```typescript
   // Before
   const name = user.nombre;
   
   // After
   const name = activeProfileType === 'local' && activeLocalData
     ? activeLocalData.nombre
     : user?.nombre;
   ```

## Future Enhancements

### Potential Features

1. **Local Profile Users**: Create dedicated user accounts for locals (not just linked to owner)
2. **Multi-Owner Support**: Allow multiple owners to manage a single local
3. **Role-Based Permissions**: Different permission levels for local managers
4. **Profile Analytics**: Track engagement metrics per profile
5. **Cross-Profile Notifications**: Notify owners about activity on their local profiles

## Troubleshooting

### Common Issues

1. **Profile not switching**: Check that `loadOwnedLocals()` is called after mode changes
2. **Content showing wrong profile**: Verify `activeProfileId` is used for `autor_id`
3. **Navigation loops**: Ensure redirection logic doesn't create infinite loops
4. **Context not persisting**: Check AsyncStorage keys are being saved/loaded correctly

### Debug Logging

Enable debug logging in ModeContext:

```typescript
console.log('[ModeContext] Active Profile:', {
  id: activeProfileId,
  type: activeProfileType,
  localData: activeLocalData,
});
```

## Summary

The local profiles system allows owners to manage multiple independent profiles (their client profile + local profiles) within the social network. Each profile maintains its own identity, content, and interactions, providing a seamless experience for both personal and business use cases.
