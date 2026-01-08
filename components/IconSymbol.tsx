
// This file is a fallback for using MaterialIcons on Android and web.

import React, { useMemo } from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Cache for validated icons to improve performance
const validatedIconsCache = new Map<string, keyof typeof MaterialIcons.glyphMap>();

// Get all valid Material Icons at runtime
const VALID_MATERIAL_ICONS = Object.keys(MaterialIcons.glyphMap) as Array<keyof typeof MaterialIcons.glyphMap>;

// Comprehensive icon mapping - ONLY includes icons that exist in MaterialIcons
const ICON_MAPPING: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  // Navigation & UI
  'home': 'home',
  'search': 'search',
  'person': 'person',
  'menu': 'menu',
  'close': 'close',
  'arrow-back': 'arrow-back',
  'arrow-forward': 'arrow-forward',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'expand-more': 'expand-more',
  'expand-less': 'expand-less',
  'more-vert': 'more-vert',
  'more-horiz': 'more-horiz',
  'keyboard-arrow-down': 'keyboard-arrow-down',
  'keyboard-arrow-up': 'keyboard-arrow-up',
  'keyboard-arrow-left': 'keyboard-arrow-left',
  'keyboard-arrow-right': 'keyboard-arrow-right',
  
  // Actions
  'add': 'add',
  'remove': 'remove',
  'edit': 'edit',
  'delete': 'delete',
  'save': 'save',
  'check': 'check',
  'check-circle': 'check-circle',
  'cancel': 'cancel',
  'refresh': 'refresh',
  'sync': 'sync',
  'share': 'share',
  'send': 'send',
  'download': 'download',
  'upload': 'upload',
  'content-copy': 'content-copy',
  'content-paste': 'content-paste',
  'done': 'done',
  'clear': 'clear',
  
  // Social & Communication
  'favorite': 'favorite',
  'favorite-border': 'favorite-border',
  'thumb-up': 'thumb-up',
  'thumb-down': 'thumb-down',
  'comment': 'comment',
  'chat': 'chat',
  'message': 'message',
  'notifications': 'notifications',
  'notifications-active': 'notifications-active',
  'mail': 'mail',
  'email': 'email',
  'phone': 'phone',
  'call': 'call',
  
  // Media
  'image': 'image',
  'photo': 'photo',
  'camera-alt': 'camera-alt',
  'videocam': 'videocam',
  'play-arrow': 'play-arrow',
  'pause': 'pause',
  'stop': 'stop',
  'volume-up': 'volume-up',
  'volume-off': 'volume-off',
  'music-note': 'music-note',
  'movie': 'movie',
  'mic': 'mic',
  
  // Location & Maps
  'location-on': 'location-on',
  'location-off': 'location-off',
  'place': 'place',
  'map': 'map',
  'directions': 'directions',
  'navigation': 'navigation',
  'my-location': 'my-location',
  'near-me': 'near-me',
  'explore': 'explore',
  
  // Business & Commerce
  'store': 'store',
  'shopping-cart': 'shopping-cart',
  'shopping-bag': 'shopping-bag',
  'payment': 'payment',
  'credit-card': 'credit-card',
  'receipt': 'receipt',
  'local-offer': 'local-offer',
  'sell': 'sell',
  'attach-money': 'attach-money',
  
  // Time & Calendar
  'schedule': 'schedule',
  'access-time': 'access-time',
  'alarm': 'alarm',
  'event': 'event',
  'today': 'today',
  'date-range': 'date-range',
  'watch-later': 'watch-later',
  
  // Food & Dining
  'restaurant': 'restaurant',
  'fastfood': 'fastfood',
  'local-bar': 'local-bar',
  'local-cafe': 'local-cafe',
  'local-pizza': 'local-pizza',
  'restaurant-menu': 'restaurant-menu',
  'free-breakfast': 'free-breakfast',
  'local-dining': 'local-dining',
  
  // Entertainment & Nightlife
  'nightlife': 'nightlife',
  'sports-bar': 'sports-bar',
  'casino': 'casino',
  'celebration': 'celebration',
  'theater-comedy': 'theater-comedy',
  'audiotrack': 'audiotrack',
  
  // People & Groups
  'people': 'people',
  'group': 'group',
  'groups': 'groups',
  'person-add': 'person-add',
  'person-remove': 'person-remove',
  'account-circle': 'account-circle',
  'supervised-user-circle': 'supervised-user-circle',
  
  // Settings & Configuration
  'settings': 'settings',
  'tune': 'tune',
  'filter-list': 'filter-list',
  'sort': 'sort',
  'visibility': 'visibility',
  'visibility-off': 'visibility-off',
  'lock': 'lock',
  'lock-open': 'lock-open',
  'security': 'security',
  
  // Information & Help
  'info': 'info',
  'info-outline': 'info-outline',
  'help': 'help',
  'help-outline': 'help-outline',
  'error': 'error',
  'error-outline': 'error-outline',
  'warning': 'warning',
  'report': 'report',
  'report-problem': 'report-problem',
  
  // Status & Indicators
  'star': 'star',
  'star-border': 'star-border',
  'star-half': 'star-half',
  'verified': 'verified',
  'verified-user': 'verified-user',
  'new-releases': 'new-releases',
  'trending-up': 'trending-up',
  'trending-down': 'trending-down',
  'check-circle-outline': 'check-circle-outline',
  
  // Connectivity & Devices
  'wifi': 'wifi',
  'wifi-off': 'wifi-off',
  'smartphone': 'smartphone',
  'computer': 'computer',
  'tablet': 'tablet',
  'bluetooth': 'bluetooth',
  
  // Transportation
  'directions-car': 'directions-car',
  'directions-bus': 'directions-bus',
  'directions-walk': 'directions-walk',
  'local-taxi': 'local-taxi',
  'local-parking': 'local-parking',
  'traffic': 'traffic',
  
  // Accessibility & Services
  'accessible': 'accessible',
  'elevator': 'elevator',
  'stairs': 'stairs',
  'escalator': 'escalator',
  'family-restroom': 'family-restroom',
  'wc': 'wc',
  
  // Weather & Nature
  'wb-sunny': 'wb-sunny',
  'wb-cloudy': 'wb-cloudy',
  'beach-access': 'beach-access',
  'park': 'park',
  'nature': 'nature',
  'pets': 'pets',
  
  // Documents & Files
  'description': 'description',
  'article': 'article',
  'folder': 'folder',
  'folder-open': 'folder-open',
  'insert-drive-file': 'insert-drive-file',
  'picture-as-pdf': 'picture-as-pdf',
  'cloud': 'cloud',
  'cloud-upload': 'cloud-upload',
  'cloud-download': 'cloud-download',
  
  // Admin & Management
  'admin-panel-settings': 'admin-panel-settings',
  'dashboard': 'dashboard',
  'analytics': 'analytics',
  'bar-chart': 'bar-chart',
  'pie-chart': 'pie-chart',
  'assessment': 'assessment',
  'work': 'work',
  'business': 'business',
  'business-center': 'business-center',
  
  // Miscellaneous
  'label': 'label',
  'bookmark': 'bookmark',
  'bookmark-border': 'bookmark-border',
  'flag': 'flag',
  'grade': 'grade',
  'loyalty': 'loyalty',
  'redeem': 'redeem',
  'card-giftcard': 'card-giftcard',
  'language': 'language',
  'public': 'public',
  'travel-explore': 'travel-explore',
  'attach-file': 'attach-file',
  'link': 'link',
};

/**
 * Validates if an icon name exists in MaterialIcons.glyphMap
 */
function isValidMaterialIcon(iconName: string): iconName is keyof typeof MaterialIcons.glyphMap {
  return iconName in MaterialIcons.glyphMap;
}

/**
 * Resolves icon names with comprehensive validation and fallback system
 * This function ensures NO question marks appear by always returning a valid icon
 */
function resolveIconName(requestedIcon: string): keyof typeof MaterialIcons.glyphMap {
  // Check cache first for performance
  if (validatedIconsCache.has(requestedIcon)) {
    return validatedIconsCache.get(requestedIcon)!;
  }

  let resolvedIcon: keyof typeof MaterialIcons.glyphMap;

  // Level 1: Check direct mapping
  if (ICON_MAPPING[requestedIcon]) {
    const mappedIcon = ICON_MAPPING[requestedIcon];
    if (isValidMaterialIcon(mappedIcon)) {
      resolvedIcon = mappedIcon;
      validatedIconsCache.set(requestedIcon, resolvedIcon);
      return resolvedIcon;
    }
  }

  // Level 2: Try the icon name directly (in case it's already a valid Material icon)
  if (isValidMaterialIcon(requestedIcon)) {
    resolvedIcon = requestedIcon as keyof typeof MaterialIcons.glyphMap;
    validatedIconsCache.set(requestedIcon, resolvedIcon);
    return resolvedIcon;
  }

  // Level 3: Try common variations (underscore to dash, etc.)
  const variations = [
    requestedIcon.replace(/_/g, '-'),  // underscore to dash
    requestedIcon.replace(/-/g, '_'),  // dash to underscore
    requestedIcon.toLowerCase(),
    requestedIcon.toLowerCase().replace(/_/g, '-'),
  ];

  for (const variation of variations) {
    if (isValidMaterialIcon(variation)) {
      resolvedIcon = variation as keyof typeof MaterialIcons.glyphMap;
      validatedIconsCache.set(requestedIcon, resolvedIcon);
      console.log(`[IconSymbol] Resolved "${requestedIcon}" to "${resolvedIcon}" via variation`);
      return resolvedIcon;
    }
  }

  // Level 4: Try to find a similar icon by partial match
  const lowerRequested = requestedIcon.toLowerCase();
  const similarIcon = VALID_MATERIAL_ICONS.find(icon => 
    icon.toLowerCase().includes(lowerRequested) || 
    lowerRequested.includes(icon.toLowerCase())
  );

  if (similarIcon) {
    resolvedIcon = similarIcon;
    validatedIconsCache.set(requestedIcon, resolvedIcon);
    console.warn(`[IconSymbol] Using similar icon "${resolvedIcon}" for "${requestedIcon}"`);
    return resolvedIcon;
  }

  // Level 5: Category-based intelligent fallback
  const categoryMap: Record<string, keyof typeof MaterialIcons.glyphMap> = {
    'nav': 'home',
    'home': 'home',
    'search': 'search',
    'user': 'person',
    'person': 'person',
    'profile': 'person',
    'account': 'account-circle',
    'social': 'people',
    'people': 'people',
    'group': 'group',
    'media': 'image',
    'image': 'image',
    'photo': 'photo',
    'camera': 'camera-alt',
    'video': 'videocam',
    'location': 'place',
    'map': 'map',
    'place': 'place',
    'business': 'store',
    'store': 'store',
    'shop': 'shopping-cart',
    'cart': 'shopping-cart',
    'time': 'schedule',
    'clock': 'schedule',
    'calendar': 'event',
    'food': 'restaurant',
    'restaurant': 'restaurant',
    'entertainment': 'celebration',
    'music': 'music-note',
    'settings': 'settings',
    'config': 'settings',
    'info': 'info',
    'help': 'help',
    'warning': 'warning',
    'error': 'error',
    'star': 'star',
    'favorite': 'favorite',
    'heart': 'favorite',
    'like': 'thumb-up',
    'notification': 'notifications',
    'bell': 'notifications',
    'message': 'message',
    'chat': 'chat',
    'mail': 'mail',
    'email': 'mail',
    'phone': 'phone',
    'call': 'phone',
  };

  for (const [keyword, fallbackIcon] of Object.entries(categoryMap)) {
    if (lowerRequested.includes(keyword)) {
      resolvedIcon = fallbackIcon;
      validatedIconsCache.set(requestedIcon, resolvedIcon);
      console.warn(`[IconSymbol] Using category fallback "${resolvedIcon}" for "${requestedIcon}"`);
      return resolvedIcon;
    }
  }

  // Level 6: Final fallback - use a generic icon that definitely exists
  resolvedIcon = 'help-outline';
  validatedIconsCache.set(requestedIcon, resolvedIcon);
  console.error(`[IconSymbol] ⚠️ Icon "${requestedIcon}" not found in MaterialIcons. Using fallback: "${resolvedIcon}"`);
  console.error(`[IconSymbol] Available icons count: ${VALID_MATERIAL_ICONS.length}`);
  
  return resolvedIcon;
}

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 *
 * CRITICAL: This component validates ALL icon names against MaterialIcons.glyphMap
 * to prevent question marks from appearing. Invalid icons are automatically
 * resolved to valid alternatives.
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
  // Resolve and validate the icon name with memoization for performance
  const resolvedIconName = useMemo(() => {
    return resolveIconName(android_material_icon_name);
  }, [android_material_icon_name]);
  
  // Double-check that the resolved icon is valid (safety check)
  if (!isValidMaterialIcon(resolvedIconName)) {
    console.error(`[IconSymbol] CRITICAL: Resolved icon "${resolvedIconName}" is not valid! Using help-outline.`);
    return (
      <MaterialIcons
        color={color}
        size={size}
        name="help-outline"
        style={style as StyleProp<TextStyle>}
      />
    );
  }
  
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={resolvedIconName}
      style={style as StyleProp<TextStyle>}
    />
  );
}

/**
 * Utility function to check if an icon name is valid
 * Can be used in development to validate icon names before using them
 */
export function validateIconName(iconName: string): boolean {
  return isValidMaterialIcon(iconName) || iconName in ICON_MAPPING;
}

/**
 * Utility function to get all valid Material icon names
 * Useful for debugging and development
 */
export function getValidMaterialIcons(): string[] {
  return VALID_MATERIAL_ICONS;
}

/**
 * Utility function to clear the validation cache
 * Useful for testing or if icon mappings are updated
 */
export function clearIconCache(): void {
  validatedIconsCache.clear();
}
