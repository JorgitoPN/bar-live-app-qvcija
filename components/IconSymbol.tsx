
// This file is a fallback for using MaterialIcons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Ionicons from "@expo/vector-icons/Ionicons";

// ✅ v458.0 SIMPLIFIED ICON MAPPING - DIRECT PASSTHROUGH
// CRITICAL: Material Icons use HYPHENS (-) in their glyphMap, not underscores
// The @expo/vector-icons/MaterialIcons library expects hyphenated names
// Category icons: star, local-cafe, restaurant, local-bar, sports-bar, liquor, nightlife
// MUST match EXACTLY with the androidIcon values in CATEGORIAS arrays in:
// - app/(tabs)/explorar/filtros-simples.tsx
// - app/(tabs)/explorar/filtros-simples.android.tsx
// - app/(tabs)/explorar/mapa.tsx
const ICON_MAPPING: Record<string, string> = {
  // Common icons
  'home': 'home',
  'person': 'person',
  'add': 'add',
  'settings': 'settings',
  'search': 'search',
  'close': 'close',
  'check': 'check',
  'arrow_back': 'arrow-back',
  'arrow-back': 'arrow-back',
  'arrow-forward': 'arrow-forward',
  'menu': 'menu',
  'more-vert': 'more-vert',
  'more-horiz': 'more-horiz',
  'edit': 'edit',
  'delete': 'delete',
  'share': 'share',
  'favorite': 'favorite',
  'favorite-border': 'favorite-border',
  'star': 'star',
  'star-border': 'star-border',
  'location-on': 'location-on',
  'map': 'map',
  'phone': 'phone',
  'email': 'email',
  'mail': 'email',
  'web': 'language',
  'language': 'language',
  'calendar': 'event',
  'event': 'event',
  'calendar-today': 'event',
  'time': 'access-time',
  'access-time': 'access-time',
  'schedule': 'access-time',
  'notifications': 'notifications',
  'notification': 'notifications',
  'bell': 'notifications',
  'chat': 'chat',
  'message': 'chat',
  'send': 'send',
  'camera': 'camera-alt',
  'camera-alt': 'camera-alt',
  'photo': 'photo',
  'image': 'image',
  'visibility': 'visibility',
  'visibility-off': 'visibility-off',
  'lock': 'lock',
  'lock-open': 'lock-open',
  'info': 'info',
  'help': 'help',
  'warning': 'warning',
  'error': 'error',
  'check_circle': 'check-circle',
  'check-circle': 'check-circle',
  'cancel': 'cancel',
  'refresh': 'refresh',
  'sync': 'sync',
  'download': 'file-download',
  'file-download': 'file-download',
  'upload': 'file-upload',
  'file-upload': 'file-upload',
  'attach-file': 'attach-file',
  'attachment': 'attach-file',
  'link': 'link',
  'copy': 'content-copy',
  'content-copy': 'content-copy',
  'filter': 'filter-list',
  'filter-list': 'filter-list',
  'tune': 'tune',
  'sort': 'sort',
  'expand-more': 'expand-more',
  'expand-less': 'expand-less',
  'chevron-right': 'chevron-right',
  'chevron-left': 'chevron-left',
  'navigate-next': 'navigate-next',
  'navigate-before': 'navigate-before',
  'arrow-upward': 'arrow-upward',
  'arrow-downward': 'arrow-downward',
  'remove': 'remove',
  'save': 'save',
  'done': 'done',
  'clear': 'clear',
  'account-circle': 'account-circle',
  'profile': 'account-circle',
  'user': 'person',
  'group': 'group',
  'people': 'group',
  'thumb-up': 'thumb-up',
  'thumb-down': 'thumb-down',
  'mic': 'mic',
  'videocam': 'videocam',
  'video': 'videocam',
  'movie': 'movie',
  'music-note': 'music-note',
  'music': 'music-note',
  'play-arrow': 'play-arrow',
  'play': 'play-arrow',
  'pause': 'pause',
  'stop': 'stop',
  'volume-up': 'volume-up',
  'volume-off': 'volume-off',
  'shopping-cart': 'shopping-cart',
  'cart': 'shopping-cart',
  'shopping-bag': 'shopping-bag',
  'bag': 'shopping-bag',
  'payment': 'payment',
  'credit-card': 'credit-card',
  'card': 'credit-card',
  'local-offer': 'local-offer',
  'offer': 'local-offer',
  'store': 'store',
  'receipt': 'receipt',
  'description': 'description',
  'folder': 'folder',
  'folder-open': 'folder-open',
  'insert-drive-file': 'insert-drive-file',
  'file': 'insert-drive-file',
  'cloud': 'cloud',
  'cloud-upload': 'cloud-upload',
  'cloud-download': 'cloud-download',
  'place': 'place',
  'navigation': 'navigation',
  'my_location': 'my-location',
  'my-location': 'my-location',
  'explore': 'explore',
  'directions': 'directions',
  'alarm': 'alarm',
  'date-range': 'date-range',
  'watch-later': 'watch-later',
  'menu-open': 'menu-open',
  'notification-important': 'notifications-active',
  'notifications-active': 'notifications-active',
  // ✅ v458.0 CATEGORY ICONS - CORRECT MATERIAL ICONS NAMES
  // CRITICAL: MaterialIcons glyphMap uses HYPHENS (-), not underscores (_)
  // These MUST match the androidIcon values in CATEGORIAS arrays
  // We map BOTH underscore and hyphen versions to the correct hyphenated name
  'star': 'star',
  'local_cafe': 'local-cafe',
  'local-cafe': 'local-cafe',
  'restaurant': 'restaurant',
  'local_bar': 'local-bar',
  'local-bar': 'local-bar',
  'sports_bar': 'sports-bar',
  'sports-bar': 'sports-bar',
  'liquor': 'liquor',
  'nightlife': 'nightlife',
  'nightlife_dining': 'nightlife',
};

// ✅ v458.0 Get valid icon name with fallback - SIMPLIFIED LOGIC
// CRITICAL: MaterialIcons glyphMap uses HYPHENS (-), not underscores (_)
// This function resolves icon names to valid Material Icons
// For category icons, it uses the ICON_MAPPING above
function getValidIconName(iconName: string): { name: string; library: 'material' | 'ionicons' } {
  // If no icon name provided, return default
  if (!iconName) {
    return { name: 'help-outline', library: 'material' };
  }

  // Convert to lowercase and trim
  const normalizedName = iconName.toLowerCase().trim();
  
  // ✅ STEP 1: Check if mapped (HIGHEST PRIORITY for category icons)
  if (ICON_MAPPING[normalizedName]) {
    const mappedName = ICON_MAPPING[normalizedName];
    return { name: mappedName, library: 'material' };
  }
  
  // ✅ STEP 2: Check if exists in MaterialIcons directly (with hyphen)
  if (normalizedName in MaterialIcons.glyphMap) {
    return { name: normalizedName, library: 'material' };
  }
  
  // ✅ STEP 3: Try with underscore-to-hyphen conversion (MaterialIcons use hyphens)
  const withHyphen = normalizedName.replace(/_/g, '-');
  if (withHyphen !== normalizedName && withHyphen in MaterialIcons.glyphMap) {
    return { name: withHyphen, library: 'material' };
  }
  
  // ✅ STEP 4: Check if exists in Ionicons
  if (normalizedName in Ionicons.glyphMap) {
    return { name: normalizedName, library: 'ionicons' };
  }
  
  // ✅ STEP 5: Try with hyphen-to-underscore conversion (for Ionicons)
  const withUnderscore = normalizedName.replace(/-/g, '_');
  if (withUnderscore !== normalizedName && withUnderscore in Ionicons.glyphMap) {
    return { name: withUnderscore, library: 'ionicons' };
  }
  
  // ✅ STEP 6: Fallback to help-outline
  return { name: 'help-outline', library: 'material' };
}

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
/**
 * ✅ v458.0 IconSymbol Component - FINAL FIX FOR MATERIAL ICONS
 * 
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * 
 * CRITICAL FIX v458.0: MaterialIcons glyphMap uses HYPHENS (-), not underscores (_)
 * For category icons (Explorar/Mapa filters), the android_material_icon_name
 * can use EITHER format (underscore or hyphen), and this component will convert:
 * - star (Todas)
 * - local_cafe → local-cafe (Cafés)
 * - restaurant (Restaurantes)
 * - local_bar → local-bar (Bares)
 * - sports_bar → sports-bar (Pubs)
 * - liquor (Coctelería)
 * - nightlife (Discotecas)
 * 
 * The component now properly handles both hyphen and underscore formats
 * and converts them to the correct hyphenated Material Icons naming convention.
 */
export function IconSymbol({
  ios_icon_name = undefined,
  android_material_icon_name,
  size = 24,
  color,
  style,
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const { name, library } = getValidIconName(android_material_icon_name);
  
  if (library === 'ionicons') {
    return (
      <Ionicons
        color={color}
        size={size}
        name={name as keyof typeof Ionicons.glyphMap}
        style={style as StyleProp<TextStyle>}
      />
    );
  }
  
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={name as keyof typeof MaterialIcons.glyphMap}
      style={style as StyleProp<TextStyle>}
    />
  );
}
