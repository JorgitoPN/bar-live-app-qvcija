
/**
 * TAB NAVIGATION CONFIGURATION - v2.3.0 INSTAGRAM-STYLE
 * 
 * Centralized configuration for all tab navigation in the app.
 * This file defines all available tabs, their icons (filled and outlined), routes, and visibility rules.
 * 
 * 🔥 INSTAGRAM-STYLE v2.3.0:
 * - Each tab now has both filled and outlined icon variants
 * - Inactive tabs show outlined (hollow) icons with regular weight
 * - Active tabs show filled icons with semibold weight
 * - All icons are pure white, fully opaque, NO transparency
 * - Icons are 32px (matching miniavatar size)
 * - "Gestión de Locales" icon is properly configured for owner mode
 * 
 * 🔧 FIX v2.3.0: Enhanced logging for debugging tab visibility
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
    iosIconFilled: 'house.fill',
    iosIconOutlined: 'house',
    androidIconFilled: 'home',
    androidIconOutlined: 'home',
    roles: ['cliente', 'propietario', 'admin'],
    modes: [], // Removed from all modes - not used in any menu
    order: {},
  },
  {
    id: 'eventos',
    route: '/(tabs)/eventos',
    label: 'Eventos',
    iosIconFilled: 'calendar.badge.clock',
    iosIconOutlined: 'calendar',
    androidIconFilled: 'event',
    androidIconOutlined: 'event',
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
    androidIconFilled: 'favorite',
    androidIconOutlined: 'favorite-border',
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
    androidIconFilled: 'auto-awesome',
    androidIconOutlined: 'auto-awesome',
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
    androidIconFilled: 'group',
    androidIconOutlined: 'group',
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
    androidIconOutlined: 'business',
    roles: ['propietario', 'admin'],
    modes: ['propietario'], // ✅ VISIBLE in owner mode
    requiresOwnership: true,
    order: {
      propietario: 0, // 🔥 FIRST POSITION in owner profile menu
    },
  },
  {
    id: 'empleo',
    route: '/(tabs)/empleo',
    label: 'Empleo',
    iosIconFilled: 'briefcase.fill',
    iosIconOutlined: 'briefcase',
    androidIconFilled: 'work',
    androidIconOutlined: 'work-outline',
    roles: ['cliente', 'propietario', 'admin'],
    modes: ['propietario'], // ✅ VISIBLE in owner mode
    order: {
      propietario: 1, // 🔥 SECOND POSITION in owner profile menu (to the right of Gestión)
    },
  },
  {
    id: 'admin',
    route: '/(tabs)/admin',
    label: 'Admin',
    iosIconFilled: 'gearshape.fill',
    iosIconOutlined: 'gear',
    androidIconFilled: 'settings',
    androidIconOutlined: 'settings',
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
 * 
 * 🔧 v2.3.0: Enhanced logging for debugging
 */
export function getTabsForContext(
  userRole: 'cliente' | 'propietario' | 'admin',
  currentMode: 'cliente' | 'propietario' | 'admin',
  isOwner: boolean = false
): TabDefinition[] {
  console.log('🔍 [TabConfig v2.3.0] getTabsForContext called with:', { userRole, currentMode, isOwner });
  
  const filteredTabs = ALL_TABS.filter(tab => {
    // Check if tab is available for this role
    if (!tab.roles.includes(userRole)) {
      console.log(`   ❌ ${tab.id}: Not available for role ${userRole}`);
      return false;
    }

    // Check if tab is available for this mode
    if (!tab.modes.includes(currentMode)) {
      console.log(`   ❌ ${tab.id}: Not available for mode ${currentMode}`);
      return false;
    }

    // Check ownership requirement
    if (tab.requiresOwnership && !isOwner) {
      console.log(`   ❌ ${tab.id}: Requires ownership but isOwner=${isOwner}`);
      return false;
    }

    console.log(`   ✅ ${tab.id}: Available (order: ${tab.order[currentMode]})`);
    return true;
  });

  // Sort tabs by their order for the current mode
  const sortedTabs = filteredTabs.sort((a, b) => {
    const orderA = a.order[currentMode] ?? 999;
    const orderB = b.order[currentMode] ?? 999;
    return orderA - orderB;
  });

  console.log('🎯 [TabConfig v2.3.0] Final tabs:', sortedTabs.map(t => `${t.id} (${t.order[currentMode]})`).join(', '));

  return sortedTabs;
}

/**
 * Predefined tab sets for common scenarios (for reference only)
 * Actual order is determined by the order property in each tab definition
 */
export const TAB_SETS = {
  // Modo Cliente: Eventos, Locales Favoritos, Explorar, Social, Mi Perfil
  cliente: ['eventos', 'favoritos', 'explorar', 'social', 'perfil'],
  
  // Modo Propietario: Gestión de Locales, Empleo, Explorar, Social, Perfil del Local
  // ✅ "Gestión de Locales" is FIRST, "Empleo" is SECOND
  propietario: ['gestion', 'empleo', 'explorar', 'social', 'perfil'],
  
  // Modo Admin: Panel Admin, Explorar, Mi Perfil
  admin: ['admin', 'explorar', 'perfil'],
};
