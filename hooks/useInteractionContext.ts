
import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

/**
 * Hook that provides the correct interaction context based on the current mode.
 * When a user is in "propietario" mode and has selected a local, all interactions
 * should be performed as that local, not as the user's personal profile.
 * 
 * @returns {Object} Interaction context with the following properties:
 * - interactionUserId: The user ID to use for interactions (always the logged-in user's ID)
 * - interactionType: 'usuario' or 'local' - the type of entity performing the interaction
 * - interactionLocalId: The local ID if interacting as a local, null otherwise
 * - isInteractingAsLocal: Boolean indicating if currently interacting as a local
 * - displayName: The name to display for the current interaction context
 * - displayAvatar: The avatar URL to display for the current interaction context
 */
export function useInteractionContext() {
  const { user } = useAuth();
  const { activeProfileType, activeProfileId, activeLocalData } = useMode();

  return useMemo(() => {
    const isInteractingAsLocal = activeProfileType === 'local';
    
    const context = {
      // The user ID is always the logged-in user's ID (for RLS and permissions)
      interactionUserId: user?.id || null,
      
      // The type of interaction: 'usuario' or 'local'
      interactionType: isInteractingAsLocal ? ('local' as const) : ('usuario' as const),
      
      // The local ID if interacting as a local
      interactionLocalId: isInteractingAsLocal ? activeProfileId : null,
      
      // Boolean for convenience
      isInteractingAsLocal,
      
      // Display information
      displayName: isInteractingAsLocal 
        ? (activeLocalData?.nombre || 'Local')
        : (user?.nombre || 'Usuario'),
      
      displayAvatar: isInteractingAsLocal
        ? (activeLocalData?.imagen_url || null)
        : (user?.avatar || null),
    };

    console.log('[useInteractionContext] 🎭 Interaction context:', context);
    
    return context;
  }, [user, activeProfileType, activeProfileId, activeLocalData]);
}
