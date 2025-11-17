
/**
 * TAB NAVIGATION CONFIGURATION - v1.1.0
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
  order: {
    cliente?: number;
    propietario?: number;
    admin?: number;
  };
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
    order: {
      cliente: 0,
    },
  },
  {
    id: 'eventos',
    route: '/(tabs)/eventos',
    label: 'Eventos',
    iosIcon: 'calendar',
    androidIcon: 'event',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
    order: {
      cliente: 1,
    },
  },
  {
    id: 'favoritos',
    route: '/(tabs)/favoritos',
    label: 'Favoritos',
    iosIcon: 'heart.fill',
    androidIcon: 'favorite',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
    order: {
      cliente: 2,
    },
  },
  {
    id: 'explorar',
    route: '/(tabs)/explorar',
    label: 'Explorar',
    iosIcon: 'sparkles',
    androidIcon: 'auto-awesome',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario', 'admin'],
    order: {
      cliente: 3,
      propietario: 2,
      admin: 1,
    },
  },
  {
    id: 'social',
    route: '/(tabs)/social',
    label: 'Social',
    iosIcon: 'person.2.fill',
    androidIcon: 'group',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario'],
    order: {
      cliente: 4,
      propietario: 3,
    },
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
    order: {
      propietario: 0,
    },
  },
  {
    id: 'empleo',
    route: '/(tabs)/empleo',
    label: 'Empleo',
    iosIcon: 'briefcase.fill',
    androidIcon: 'work',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['propietario'],
    order: {
      propietario: 1,
    },
  },
  {
    id: 'admin',
    route: '/(tabs)/admin',
    label: 'Admin',
    iosIcon: 'gear',
    androidIcon: 'settings',
    roles: ['admin'],
    modes: ['admin'],
    order: {
      admin: 0,
    },
  },
  {
    id: 'perfil',
    route: '/(tabs)/perfil',
    label: 'Perfil',
    iosIcon: 'person.fill',
    androidIcon: 'person',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario', 'admin'],
    order: {
      cliente: 5,
      propietario: 4,
      admin: 2,
    },
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
  const filteredTabs = ALL_TABS.filter(tab => {
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

  // Sort tabs by their order for the current mode
  return filteredTabs.sort((a, b) => {
    const orderA = a.order[currentMode] ?? 999;
    const orderB = b.order[currentMode] ?? 999;
    return orderA - orderB;
  });
}

/**
 * Predefined tab sets for common scenarios (for reference only)
 * Actual order is determined by the order property in each tab definition
 */
export const TAB_SETS = {
  // Modo Cliente: Eventos, Locales Favoritos, Explorar, Social, Mi Perfil
  cliente: ['eventos', 'favoritos', 'explorar', 'social', 'perfil'],
  
  // Modo Propietario: Gestión de Locales, Empleo, Explorar, Social, Perfil del Local
  propietario: ['gestion', 'empleo', 'explorar', 'social', 'perfil'],
  
  // Modo Admin: Panel Admin, Explorar, Mi Perfil
  admin: ['admin', 'explorar', 'perfil'],
};
