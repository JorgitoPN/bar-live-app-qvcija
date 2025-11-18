
/**
 * TAB NAVIGATION CONFIGURATION - v22.0.0 FIXED WITH CLEAR VISUAL ICONS
 * 
 * Centralized configuration for all tab navigation in the app.
 * ThisI understand the problem now. The issue is that **Material Icons don't always have clear visual differences between their "filled" and "outlined" variants**. Many Material Icons look the same whether you use `home` or `home-outline` because they don't have distinct variants.

The solution is to use **Ionicons** instead, which has MUCH clearer filled vs outlined variants. Let me implement this fix:

<write file="components/navigation/TabConfig.ts">
/**
 * TAB NAVIGATION CONFIGURATION - v22.0.0 FIXED WITH IONICONS
 * 
 * Centralized configuration for all tab navigation in the app.
 * This file defines all available tabs, their icons (filled and outlined), routes, and visibility rules.
 * 
 * 🔥 v22.0.0 FIX: Using Ionicons which have CLEAR filled/outlined variants
 * - Each tab uses Ionicons that have DISTINCT visual differences
 * - Inactive tabs show outlined icons with clear hollow appearance
 * - Active tabs show filled icons with solid fill
 * - All icons are pure white, fully opaque, NO transparency
 * - Icons are 28px for better visibility
 * - iOS uses SF Symbol names with/without .fill suffix
 * - Android uses Ionicons with -outline suffix for inactive state
 * 
 * ICON CHANGES v22.0.0:
 * - home: home / home-outline ✅ (CLEAR difference)
 * - eventos: calendar / calendar-outline ✅ (CLEAR difference)
 * - favoritos: heart / heart-outline ✅ (CLEAR difference)
 * - explorar: compass / compass-outline ✅ (CLEAR difference)
 * - social: people / people-outline ✅ (CLEAR difference)
 * - gestion: business / business-outline ✅ (CLEAR difference)
 * - empleo: briefcase / briefcase-outline ✅ (CLEAR difference)
 * - admin: settings / settings-outline ✅ (CLEAR difference)
 * - perfil: person / person-outline ✅ (CLEAR difference)
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
    androidIconOutlined: 'home-outline',
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
 * 
 * 🔧 v22.0.0: Enhanced logging for debugging
 */
export function getTabsForContext(
  userRole: 'cliente' | 'propietario' | 'admin',
  currentMode: 'cliente' | 'propietario' | 'admin',
  isOwner: boolean = false
): TabDefinition[] {
  console.log('🔍 [TabConfig v22.0.0] getTabsForContext called with:', { userRole, currentMode, isOwner });
  
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

  console.log('🎯 [TabConfig v22.0.0] Final tabs:', sortedTabs.map(t => `${t.id} (${t.order[currentMode]})`).join(', '));

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
  propietario: ['gestion', 'empleo', 'explorar', 'social', 'perfil'],
  
  // Modo Admin: Panel Admin, Explorar, Mi Perfil
  admin: ['admin', 'explorar', 'perfil'],
};
