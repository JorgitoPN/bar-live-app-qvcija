
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

// Comprehensive icon mapping to ensure valid MaterialIcons names
// Maps SF Symbols (iOS) and custom names to Material Icons
const ICON_MAPPING: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  // Basic icons
  'person': 'person',
  'home': 'home',
  'phone': 'phone',
  'email': 'email',
  'mail': 'email',
  'search': 'search',
  'menu': 'menu',
  'close': 'close',
  'settings': 'settings',
  'delete': 'delete',
  'edit': 'edit',
  'add': 'add',
  'remove': 'remove',
  'check': 'check',
  'clear': 'clear',
  'done': 'done',
  'cancel': 'cancel',
  
  // Location icons
  'location-on': 'location-on',
  'location_on': 'location-on',
  'location-off': 'location-off',
  'location_off': 'location-off',
  'map': 'map',
  'place': 'place',
  'navigation': 'navigation',
  'my-location': 'my-location',
  'my_location': 'my-location',
  
  // SF Symbols to Material Icons mapping
  'person.circle.fill': 'account-circle',
  'phone.fill': 'phone',
  'location.fill': 'location-on',
  'mappin': 'location-on',
  'mappin.circle.fill': 'location-on',
  'mappin.slash.circle.fill': 'location-off',
  'house': 'home',
  'house.fill': 'home',
  'magnifyingglass': 'search',
  'gearshape': 'settings',
  'gearshape.fill': 'settings',
  'trash': 'delete',
  'trash.fill': 'delete',
  'pencil': 'edit',
  'plus': 'add',
  'plus.circle': 'add-circle',
  'plus.circle.fill': 'add-circle',
  'minus': 'remove',
  'xmark': 'close',
  'checkmark': 'check',
  
  // Social & Communication
  'message': 'message',
  'message.fill': 'message',
  'chat': 'chat',
  'send': 'send',
  'bell': 'notifications',
  'bell.fill': 'notifications',
  'notifications': 'notifications',
  'notification-important': 'notification-important',
  'favorite': 'favorite',
  'favorite-border': 'favorite-border',
  'heart': 'favorite',
  'heart.fill': 'favorite',
  'star': 'star',
  'star-border': 'star-border',
  'thumb-up': 'thumb-up',
  'thumb-down': 'thumb-down',
  
  // Media & Content
  'camera': 'camera',
  'photo': 'photo',
  'photo.fill': 'photo',
  'image': 'image',
  'photo.on.rectangle': 'photo-library',
  'photo_library': 'photo-library',
  'collections': 'collections',
  'square.stack.fill': 'collections',
  'movie': 'movie',
  'play-arrow': 'play-arrow',
  'pause': 'pause',
  'stop': 'stop',
  'volume-up': 'volume-up',
  'volume-off': 'volume-off',
  
  // UI Controls
  'visibility': 'visibility',
  'visibility-off': 'visibility-off',
  'eye': 'visibility',
  'eye.fill': 'visibility',
  'lock': 'lock',
  'lock.fill': 'lock',
  'lock-open': 'lock-open',
  'help': 'help',
  'info': 'info',
  'warning': 'warning',
  'error': 'error',
  'check-circle': 'check-circle',
  
  // Navigation
  'arrow-back': 'arrow-back',
  'arrow-forward': 'arrow-forward',
  'arrow-upward': 'arrow-upward',
  'arrow-downward': 'arrow-downward',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'chevron.right': 'chevron-right',
  'chevron-up': 'expand-less',
  'chevron-down': 'expand-more',
  'arrow_drop_down': 'expand-more',
  'more-vert': 'more-vert',
  'more-horiz': 'more-horiz',
  'menu-open': 'menu-open',
  
  // Shopping & Commerce
  'shopping-cart': 'shopping-cart',
  'shopping_cart': 'shopping-cart',
  'cart': 'shopping-cart',
  'cart.fill': 'shopping-cart',
  'shopping-bag': 'shopping-bag',
  'payment': 'payment',
  'credit-card': 'credit-card',
  'local-offer': 'local-offer',
  'store': 'store',
  'receipt': 'receipt',
  
  // Time & Calendar
  'calendar-today': 'calendar-today',
  'schedule': 'schedule',
  'access-time': 'access-time',
  'alarm': 'alarm',
  'event': 'event',
  'date-range': 'date-range',
  'watch-later': 'watch-later',
  
  // Content & Files
  'description': 'description',
  'folder': 'folder',
  'folder-open': 'folder-open',
  'insert-drive-file': 'insert-drive-file',
  'cloud': 'cloud',
  'cloud-upload': 'cloud-upload',
  'cloud-download': 'cloud-download',
  'attach-file': 'attach-file',
  'link': 'link',
  
  // User & Account
  'account-circle': 'account-circle',
  'person-outline': 'person-outline',
  'person.crop.square': 'person-outline',
  'group': 'group',
  'people': 'people',
  'groups': 'people',
  
  // Actions
  'refresh': 'refresh',
  'sync': 'sync',
  'share': 'share',
  'download': 'download',
  'upload': 'upload',
  'save': 'save',
  'bookmark': 'bookmark',
  'bookmark-border': 'bookmark-border',
  
  // Grid & Layout
  'grid-on': 'grid-on',
  'grid_on': 'grid-on',
  'square.grid.3x3': 'grid-on',
  'view-module': 'view-module',
  'view-list': 'view-list',
  
  // Business & Work
  'work': 'work',
  'work-outline': 'work-outline',
  'briefcase': 'work',
  'briefcase.fill': 'work',
  'business': 'business',
  'building.2.fill': 'store',
  
  // Misc
  'mic': 'mic',
  'videocam': 'videocam',
  'arrow.triangle.2.circlepath': 'swap-horiz',
  'swap_horiz': 'swap-horiz',
  'filter_list': 'filter-list',
  'tune': 'filter-list',
  'label': 'local-offer',
};

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. 
 * This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  ios_icon_name = undefined,
  android_material_icon_name,
  size = 24,
  color,
  style,
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // Map the icon name to a valid MaterialIcons name
  const mappedIconName = ICON_MAPPING[android_material_icon_name] || android_material_icon_name;
  
  // Validate that the icon exists in MaterialIcons
  const isValidIcon = MaterialIcons.glyphMap[mappedIconName] !== undefined;
  
  // Use fallback icon if invalid
  const finalIconName = isValidIcon ? mappedIconName : 'help-outline';
  
  if (!isValidIcon) {
    console.warn(`⚠️ Invalid MaterialIcon: "${android_material_icon_name}" (mapped to: "${mappedIconName}"). Using "help-outline" as fallback. Please use a valid Material Icons name.`);
  }

  return (
    <MaterialIcons
      color={color}
      size={size}
      name={finalIconName}
      style={style as StyleProp<TextStyle>}
    />
  );
}
