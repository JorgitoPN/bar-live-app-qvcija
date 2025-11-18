
/**
 * TAB NAVIGATION CONFIGURATION - SIMPLIFIED WITH VERIFIED IONICONS
 * 
 * Centralized configuration for all tab navigation in the app.
 * Uses Ionicons with VERIFIED filled/outlined variants that have clear visual differences.
 */

export interface TabDefinition {
  id: string;
  route: string;
  label: string;
  iosIconFilled: string;
  iosIconOutlined: string;
  androidIconFilled: string;
  androidIconOutlined: string;
  roles: ('cliente' | 'propietario' | 'admin')[];
  modes: ('cliente' | 'propietario' | 'admin')[];
  requiresOwnership?: boolean;
  order: {
    cliente?: number;
    propietario?: number;
    admin?: number;
  };
}

/**
 * All available tabs in the application
 * 
 * VERIFIED IONICONS WITH CLEAR VISUAL DIFFERENCES:
 * - home / home-outline ✅
 * - calendar / calendar-outline ✅
 * - heart / heart-outline ✅
 * - compass / compass-outline ✅
 * - people / people-outline ✅
 * - business / business-outline ✅
 * - briefcase / briefcase-outline ✅
 * - settings / settings-outline ✅
 * - person / person-outline ✅
 */
export const ALL_TABS: TabDefinition[] = [
  {
    id: 'home',
    route: '/(tabs)/(home)',
    label: 'Inicio',
    iosIconFilled: 'house.fill',
    iosIconOutlined: 'house',
    androidIconFilled: 'home',
    androidIconOutlined: 'home-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: [],
    order: {},
  },
  {
    id: 'eventos',
    route: '/(tabs)/eventos',
    label: 'Eventos',
    iosIconFilled: 'calendar.badge.clock',
    iosIconOutlined: 'calendar',
    androidIconFilled: 'calendar',
    androidIconOutlined: 'calendar-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
    order: {
      cliente: 0,
    },
  },
  {
    id: 'favoritos',
    route: '/(tabs)/favoritos',
    label: 'Favoritos',
    iosIconFilled: 'heart.fill',
    iosIconOutlined: 'heart',
    androidIconFilled: 'heart',
    androidIconOutlined: 'heart-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente'],
    order: {
      cliente: 1,
    },
  },
  {
    id: 'explorar',
    route: '/(tabs)/explorar',
    label: 'Explorar',
    iosIconFilled: 'sparkles',
    iosIconOutlined: 'sparkles',
    androidIconFilled: 'compass',
    androidIconOutlined: 'compass-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario', 'admin'],
    order: {
      cliente: 2,
      propietario: 2,
      admin: 1,
    },
  },
  {
    id: 'social',
    route: '/(tabs)/social',
    label: 'Social',
    iosIconFilled: 'person.2.fill',
    iosIconOutlined: 'person.2',
    androidIconFilled: 'people',
    androidIconOutlined: 'people-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario'],
    order: {
      cliente: 3,
      propietario: 3,
    },
  },
  {
    id: 'gestion',
    route: '/(tabs)/gestion',
    label: 'Gestión',
    iosIconFilled: 'building.2.fill',
    iosIconOutlined: 'building.2',
    androidIconFilled: 'business',
    androidIconOutlined: 'business-outline',
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
    iosIconFilled: 'briefcase.fill',
    iosIconOutlined: 'briefcase',
    androidIconFilled: 'briefcase',
    androidIconOutlined: 'briefcase-outline',
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
    iosIconFilled: 'gearshape.fill',
    iosIconOutlined: 'gear',
    androidIconFilled: 'settings',
    androidIconOutlined: 'settings-outline',
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
    iosIconFilled: 'person.fill',
    iosIconOutlined: 'person',
    androidIconFilled: 'person',
    androidIconOutlined: 'person-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['cliente', 'propietario', 'admin'],
    order: {
      cliente: 4,
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
    if (!tab.roles.includes(userRole)) return false;
    if (!tab.modes.includes(currentMode)) return false;
    if (tab.requiresOwnership && !isOwner) return false;
    return true;
  });

  return filteredTabs.sort((a, b) => {
    const orderA = a.order[currentMode] ?? 999;
    const orderB = b.order[currentMode] ?? 999;
    return orderA - orderB;
  });
}

export const TAB_SETS = {
  cliente: ['eventos', 'favoritos', 'explorar', 'social', 'perfil'],
  propietario: ['gestion', 'empleo', 'explorar', 'social', 'perfil'],
  admin: ['admin', 'explorar', 'perfil'],
};
