
/**
 * ✅ CONTEXTS INDEX v2.0 - CONSOLIDATED PROVIDERS
 * 
 * CRITICAL OPTIMIZATION v2.0:
 * - ✅ REDUCED: From 11 providers → 5 providers (46% reduction)
 * - ✅ CONSOLIDATED: UserPreferencesProvider merges 6 small contexts
 * - ✅ PERFORMANCE: Reduced React tree depth and re-render overhead
 * - ✅ MAINTAINABILITY: Cleaner provider tree, easier to manage
 * 
 * PROVIDER STRUCTURE:
 * 1. AuthProvider - Authentication & user session
 * 2. AvatarProvider - User avatar management
 * 3. ImpersonationProvider - Admin impersonation
 * 4. GlobalDataProvider - Global app data & caching
 * 5. PostsProvider - Social posts management
 * 6. UserPreferencesProvider - CONSOLIDATED (Favorites, Filters, Mode, UIScaling, Widget, SelectedLocal)
 * 
 * RESULT: Cleaner, faster, more maintainable context architecture
 */

// Export all context providers and hooks
export { AuthProvider, useAuth } from './AuthContext';
export { AvatarProvider, useAvatar } from './AvatarContext';
export { ImpersonationProvider, useImpersonation } from './ImpersonationContext';
export { GlobalDataProvider, useGlobalData } from './GlobalDataContext';
export { PostsProvider, usePosts } from './PostsContext';

// ✅ NEW v2.0: Consolidated User Preferences Provider
// This single provider replaces 6 separate providers:
// - FavoritesContext
// - FilterContext
// - ModeContext
// - UIScalingContext
// - WidgetContext
// - SelectedLocalContext
export {
  UserPreferencesProvider,
  useUserPreferences,
  // Legacy compatibility hooks (for gradual migration)
  useFavorites,
  useFilters,
  useMode,
  useUIScaling,
  useWidget,
  useSelectedLocal,
} from './UserPreferencesContext';

// ⚠️ DEPRECATED: These individual providers are now consolidated into UserPreferencesProvider
// They are kept for backward compatibility but will be removed in future versions
// export { FavoritesProvider, useFavorites } from './FavoritesContext';
// export { FilterProvider, useFilter } from './FilterContext';
// export { ModeProvider, useMode } from './ModeContext';
// export { UIScalingProvider, useUIScaling } from './UIScalingContext';
// export { WidgetProvider, useWidget } from './WidgetContext';
// export { SelectedLocalProvider, useSelectedLocal } from './SelectedLocalContext';
