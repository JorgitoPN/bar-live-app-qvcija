
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

// ✅ v455.0 COMPREHENSIVE ICON MAPPING WITH FALLBACKS
// CRITICAL: Category icons (star, local-cafe, restaurant, local-bar, sports-bar, liquor, nightlife)
// MUST match EXACTLY with the androidIcon values in CATEGORIAS arrays in:
// - app/(tabs)/explorar/filtros-simples.tsx
// - app/(tabs)/explorar/filtros-simples.android.tsx
// - app/(tabs)/explorar/mapa.tsx
// DO NOT CHANGE THESE MAPPINGS WITHOUT UPDATING ALL THREE FILES
const ICON_MAPPING: Record<string, string> = {
  // Common icons
  'home': 'home',
  'person': 'person',
  'add': 'add',
  'settings': 'settings',
  'search': 'search',
  'close': 'close',
  'check': 'check',
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
  'explore': 'explore',
  'directions': 'directions',
  'alarm': 'alarm',
  'date-range': 'date-range',
  'watch-later': 'watch-later',
  'menu-open': 'menu-open',
  'notification-important': 'notifications-active',
  'notifications-active': 'notifications-active',
  // ✅ v456.0 CATEGORY ICONS - FIXED MATERIAL ICONS NAMES
  // CRITICAL: Material Icons use underscores, not hyphens
  // These MUST match the androidIcon values in CATEGORIAS arrays
  'star': 'star',
  'local-cafe': 'local_cafe',
  'local_cafe': 'local_cafe',
  'restaurant': 'restaurant',
  'local-bar': 'local_bar',
  'local_bar': 'local_bar',
  'sports-bar': 'sports_bar',
  'sports_bar': 'sports_bar',
  'liquor': 'liquor',
  'nightlife': 'nightlife',
  'nightlife_dining': 'nightlife',
};

// ✅ v455.0 Get valid icon name with fallback
// CRITICAL: This function resolves icon names to valid Material Icons
// For category icons, it uses the ICON_MAPPING above
function getValidIconName(iconName: string): { name: string; library: 'material' | 'ionicons' } {
  // If no icon name provided, return default
  if (!iconName) {
    console.warn('⚠️ IconSymbol: No icon name provided, using fallback');
    return { name: 'help-outline', library: 'material' };
  }

  // Convert to lowercase and remove common prefixes/suffixes
  const normalizedName = iconName.toLowerCase().trim();
  
  // ✅ STEP 1: Check if mapped (HIGHEST PRIORITY for category icons)
  if (ICON_MAPPING[normalizedName]) {
    const mappedName = ICON_MAPPING[normalizedName];
    console.log(`✅ IconSymbol: Mapped "${iconName}" → "${mappedName}"`);
    return { name: mappedName, library: 'material' };
  }
  
  // ✅ STEP 2: Check if exists in MaterialIcons directly
  if (normalizedName in MaterialIcons.glyphMap) {
    console.log(`✅ IconSymbol: Found "${iconName}" in MaterialIcons`);
    return { name: normalizedName, library: 'material' };
  }
  
  // ✅ STEP 3: Check if exists in Ionicons
  if (normalizedName in Ionicons.glyphMap) {
    console.log(`✅ IconSymbol: Found "${iconName}" in Ionicons`);
    return { name: normalizedName, library: 'ionicons' };
  }
  
  // ✅ STEP 4: Try with common variations
  const variations = [
    normalizedName.replace(/-/g, '_'),
    normalizedName.replace(/_/g, '-'),
    normalizedName.replace(/\./g, '-'),
  ];
  
  for (const variation of variations) {
    if (variation in MaterialIcons.glyphMap) {
      console.log(`✅ IconSymbol: Found variation "${iconName}" → "${variation}" in MaterialIcons`);
      return { name: variation, library: 'material' };
    }
    if (variation in Ionicons.glyphMap) {
      console.log(`✅ IconSymbol: Found variation "${iconName}" → "${variation}" in Ionicons`);
      return { name: variation, library: 'ionicons' };
    }
  }
  
  // ✅ STEP 5: Fallback to help-outline
  console.warn(`❌ IconSymbol: Icon "${iconName}" not found. Using fallback icon "help-outline"`);
  return { name: 'help-outline', library: 'material' };
}

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
/**
 * ✅ v455.0 IconSymbol Component
 * 
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * 
 * CRITICAL: For category icons (Explorar/Mapa filters), the android_material_icon_name
 * MUST match the values in CATEGORIAS arrays:
 * - star (Todas)
 * - local-cafe (Cafés)
 * - restaurant (Restaurantes)
 * - local-bar (Bares)
 * - sports-bar (Pubs)
 * - liquor (Coctelería)
 * - nightlife (Discotecas)
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
