
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

// Comprehensive icon mapping for all icons used in the app
const ICON_MAPPING: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  // Outline variants
  'home-outline': 'home',
  'calendar-outline': 'event',
  'heart-outline': 'favorite-border',
  'compass-outline': 'explore',
  'people-outline': 'people-outline',
  'business-outline': 'business',
  'briefcase-outline': 'work-outline',
  'settings-outline': 'settings',
  'person-outline': 'person-outline',
  'notifications-outline': 'notifications-none',
  'chatbubble-outline': 'chat-bubble-outline',
  'search-outline': 'search',
  'add-outline': 'add-circle-outline',
  'close-outline': 'close',
  'checkmark-outline': 'check-circle-outline',
  'trash-outline': 'delete-outline',
  'create-outline': 'edit',
  'eye-outline': 'visibility',
  'eye-off-outline': 'visibility-off',
  'lock-closed-outline': 'lock-outline',
  'mail-outline': 'email',
  'call-outline': 'phone',
  'location-outline': 'location-on',
  'time-outline': 'access-time',
  'star-outline': 'star-border',
  'share-outline': 'share',
  'bookmark-outline': 'bookmark-border',
  'image-outline': 'image',
  'camera-outline': 'camera-alt',
  'document-outline': 'description',
  'folder-outline': 'folder',
  'download-outline': 'download',
  'cloud-upload-outline': 'cloud-upload',
  'arrow-back-outline': 'arrow-back',
  'arrow-forward-outline': 'arrow-forward',
  'chevron-back-outline': 'chevron-left',
  'chevron-forward-outline': 'chevron-right',
  'chevron-down-outline': 'keyboard-arrow-down',
  'chevron-up-outline': 'keyboard-arrow-up',
  'menu-outline': 'menu',
  'ellipsis-horizontal-outline': 'more-horiz',
  'ellipsis-vertical-outline': 'more-vert',
  'filter-outline': 'filter-list',
  'options-outline': 'tune',
  'refresh-outline': 'refresh',
  'sync-outline': 'sync',
  'warning-outline': 'warning',
  'information-circle-outline': 'info',
  'help-circle-outline': 'help-outline',
  'alert-circle-outline': 'error-outline',
  'checkmark-circle-outline': 'check-circle-outline',
  'close-circle-outline': 'cancel',
  
  // Filled variants
  'home': 'home',
  'calendar': 'event',
  'heart': 'favorite',
  'compass': 'explore',
  'people': 'people',
  'business': 'business',
  'briefcase': 'work',
  'settings': 'settings',
  'person': 'person',
  'notifications': 'notifications',
  'chatbubble': 'chat-bubble',
  'search': 'search',
  'add': 'add-circle',
  'close': 'close',
  'checkmark': 'check-circle',
  'trash': 'delete',
  'create': 'edit',
  'eye': 'visibility',
  'eye-off': 'visibility-off',
  'lock-closed': 'lock',
  'mail': 'email',
  'call': 'phone',
  'location': 'location-on',
  'time': 'access-time',
  'star': 'star',
  'share': 'share',
  'bookmark': 'bookmark',
  'image': 'image',
  'camera': 'camera-alt',
  'document': 'description',
  'folder': 'folder',
  'download': 'download',
  'cloud-upload': 'cloud-upload',
  'arrow-back': 'arrow-back',
  'arrow-forward': 'arrow-forward',
  'chevron-back': 'chevron-left',
  'chevron-forward': 'chevron-right',
  'chevron-down': 'keyboard-arrow-down',
  'chevron-up': 'keyboard-arrow-up',
  'menu': 'menu',
  'ellipsis-horizontal': 'more-horiz',
  'ellipsis-vertical': 'more-vert',
  'filter': 'filter-list',
  'options': 'tune',
  'refresh': 'refresh',
  'sync': 'sync',
  'warning': 'warning',
  'information-circle': 'info',
  'help-circle': 'help-outline',
  'alert-circle': 'error',
  'checkmark-circle': 'check-circle',
  'close-circle': 'cancel',
  
  // Additional mappings for app-specific icons
  'label': 'local-offer',
  'tune': 'tune',
  'groups': 'groups',
  'location_city': 'location-city',
  'my_location': 'my-location',
  'arrow_drop_down': 'arrow-drop-down',
  'more_vert': 'more-vert',
  'send': 'send',
  'attach-file': 'attach-file',
  'mic': 'mic',
  'videocam': 'videocam',
  'play-arrow': 'play-arrow',
  'pause': 'pause',
  'stop': 'stop',
  'volume-up': 'volume-up',
  'volume-off': 'volume-off',
  'wifi': 'wifi',
  'bluetooth': 'bluetooth',
  'gps-fixed': 'gps-fixed',
  'brightness-high': 'brightness-high',
  'brightness-low': 'brightness-low',
  'battery-full': 'battery-full',
  'signal-cellular-alt': 'signal-cellular-alt',
  'shopping-cart': 'shopping-cart',
  'shopping-bag': 'shopping-bag',
  'payment': 'payment',
  'credit-card': 'credit-card',
  'store': 'store',
  'receipt': 'receipt',
  'local-offer': 'local-offer',
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
  android_material_icon_name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  // 3-Level Fallback System:
  // 1. Check ICON_MAPPING for custom mappings
  let iconName = ICON_MAPPING[android_material_icon_name];
  
  // 2. If not in mapping, check if it exists directly in MaterialIcons
  if (!iconName) {
    iconName = MaterialIcons.glyphMap[android_material_icon_name as keyof typeof MaterialIcons.glyphMap] 
      ? (android_material_icon_name as keyof typeof MaterialIcons.glyphMap)
      : undefined;
  }
  
  // 3. Fallback to safe default if still not found
  if (!iconName || MaterialIcons.glyphMap[iconName] === undefined) {
    console.warn(`⚠️ Invalid Material Icon: "${android_material_icon_name}" → Using fallback "help-outline"`);
    iconName = 'help-outline';
  }

  return (
    <MaterialIcons
      color={color}
      size={size}
      name={iconName}
      style={style as StyleProp<TextStyle>}
    />
  );
}
