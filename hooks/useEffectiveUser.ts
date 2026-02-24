
import { useAuthStore } from '@/src/store/useAuthStore';
import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Hook that returns the effective user ID and user object
 * If admin is impersonating, returns the impersonated user
 * Otherwise returns the current logged-in user
 * 
 * Use this hook in ALL components that need to display user-specific data
 * to ensure impersonation works correctly across the entire app
 */
export function useEffectiveUser() {
  const currentUser = useAuthStore(state => state.user);
  const { isImpersonating, impersonatedUser, effectiveUserId, effectiveUser } = useImpersonation();

  return {
    // The user ID to use for all database queries
    userId: effectiveUserId || currentUser?.id || null,
    
    // The user object to use for all UI displays
    user: effectiveUser || currentUser,
    
    // Whether we're currently impersonating
    isImpersonating,
    
    // The actual admin user (if impersonating)
    adminUser: isImpersonating ? currentUser : null,
    
    // The impersonated user (if impersonating)
    impersonatedUser: isImpersonating ? impersonatedUser : null,
  };
}
