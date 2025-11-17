
/**
 * TAB NAVIGATION CONFIGURATION - v1.0.0
 * 
 * Centralized configuration for all tab navigation in the app.
 * This file defines all available tabs, their icons, routes, and visibility rules.
 */

export interface TabDefinition {
  id: string;
  route: string;
  label: string;
  iosIcon: string;
  androidIcon: string;
  roles: ('cliente' | 'propietario' | 'admin')[];
  modes: ('cliente' | 'propietario' | 'admin')[];
  requiresOwnership?: boolean; // Only show if user owns the current local
}

/**
 * All available tabs in the application
 */
export const ALL_TABS: TabDefinition[] = [
  {
    id: 'home',
    route: '/(tabs)/(home)',
    label: 'Inicio',
    iosIcon: 'house.fill',
    androidIcon: 'home',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
  },
  {
    id: 'eventos',
    route: '/(tabs)/eventos',
    label: 'Eventos',
    iosIcon: 'calendar',
    androidIcon: 'event',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
  },
  {
    id: 'favoritos',
    route: '/(tabs)/favoritos',
    label: 'Favoritos',
    iosIcon: 'heart.fill',
    androidIcon: 'favorite',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario'],
  },
  {
    id: 'explorar',
    route: '/(tabs)/explorar',
    label: 'Explorar',
    iosIcon: 'sparkles',
    androidIcon: 'auto-awesome',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario', 'admin'],
  },
  {
    id: 'social',
    route: '/(tabs)/social',
    label: 'Social',
    iosIcon: 'person.2.fill',
    androidIcon: 'group',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario'],
  },
  {
    id: 'gestion',
    route: '/(tabs)/gestion',
    label: 'Gestión',
    iosIcon: 'building.2',
    androidIcon: 'business',
    roles: ['propietario', 'admin'],
    modes: ['propietario'],
    requiresOwnership: true,
  },
  {
    id: 'empleo',
    route: '/(tabs)/empleo',
    label: 'Empleo',
    iosIcon: 'briefcase.fill',
    androidIcon: 'work',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
  },
  {
    id: 'admin',
    route: '/(tabs)/admin',
    label: 'Admin',
    iosIcon: 'gear',
    androidIcon: 'settings',
    roles: ['admin'],
    modes: ['admin'],
  },
  {
    id: 'perfil',
    route: '/(tabs)/perfil',
    label: 'Perfil',
    iosIcon: 'person.fill',
    androidIcon: 'person',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario', 'admin'],
  },
];

/**
 * Get tabs for a specific user role and mode
 */
export function getTabsForContext(
  userRole: 'cliente' | 'propietario' | 'admin',
  currentMode: 'cliente' | 'propietario' | 'admin',
  isOwner: boolean = false
): TabDefinition[] {
  return ALL_TABS.filter(tab => {
    // Check if tab is available for this role
    if (!tab.roles.includes(userRole)) {
      return false;
    }

    // Check if tab is available for this mode
    if (!tab.modes.includes(currentMode)) {
      return false;
    }

    // Check ownership requirement
    if (tab.requiresOwnership && !isOwner) {
      return false;
    }

    return true;
  });
}

/**
 * Predefined tab sets for common scenarios
 */
export const TAB_SETS = {
  cliente: ['home', 'eventos', 'favoritos', 'explorar', 'social', 'perfil'],
  propietario: ['gestion', 'favoritos', 'explorar', 'social', 'perfil'],
  admin: ['admin', 'explorar', 'perfil'],
};
