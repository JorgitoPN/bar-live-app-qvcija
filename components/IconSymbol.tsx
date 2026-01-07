
// This file is a fallback for using Ionicons on Android and web with proper Material Icons mapping.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Comprehensive mapping from Material Icons to Ionicons
const MATERIAL_TO_IONICONS_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Navigation & Common
  "home": "home",
  "person": "person",
  "add": "add",
  "settings": "settings",
  "apps": "apps",
  
  // Arrows & Chevrons
  "arrow_drop_down": "chevron-down",
  "arrow_drop_up": "chevron-up",
  "arrow_back": "arrow-back",
  "arrow_forward": "arrow-forward",
  "chevron_left": "chevron-back",
  "chevron_right": "chevron-forward",
  
  // Actions
  "more_vert": "ellipsis-vertical",
  "more_horiz": "ellipsis-horizontal",
  "delete": "trash",
  "edit": "create",
  "share": "share-social",
  "search": "search",
  "close": "close",
  "check": "checkmark",
  "cancel": "close-circle",
  "check_circle": "checkmark-circle",
  
  // Content
  "favorite": "heart",
  "favorite_border": "heart-outline",
  "star": "star",
  "star_border": "star-outline",
  "bookmark": "bookmark",
  "bookmark_border": "bookmark-outline",
  
  // Communication
  "chat": "chatbubble",
  "comment": "chatbubble-outline",
  "notifications": "notifications",
  "mail": "mail",
  "email": "mail",
  "phone": "call",
  "message": "chatbubble",
  "send": "send",
  
  // Media
  "image": "image",
  "photo": "image",
  "photo_library": "images",
  "collections": "images",
  "camera": "camera",
  "video": "videocam",
  "play_arrow": "play",
  "pause": "pause",
  
  // Navigation
  "menu": "menu",
  "location_on": "location",
  "my_location": "locate",
  "map": "map",
  "directions": "navigate",
  
  // Social
  "people": "people",
  "group": "people",
  "account_circle": "person-circle",
  "person_add": "person-add",
  "person_add_disabled": "person-remove",
  "supervised_user_circle": "people-circle",
  
  // File & Document
  "folder": "folder",
  "file": "document",
  "attach_file": "attach",
  "download": "download",
  "upload": "cloud-upload",
  
  // UI Elements
  "visibility": "eye",
  "visibility_off": "eye-off",
  "lock": "lock-closed",
  "lock_open": "lock-open",
  "info": "information-circle",
  "warning": "warning",
  "error": "alert-circle",
  "help": "help-circle",
  
  // Business & Places
  "store": "storefront",
  "business": "business",
  "work": "briefcase",
  "local_cafe": "cafe",
  "restaurant": "restaurant",
  "local_bar": "wine",
  "sports_bar": "beer",
  "local_drink": "wine",
  "nightlife": "musical-notes",
  
  // Time & Calendar
  "event": "calendar",
  "schedule": "time",
  "calendar": "calendar",
  "time": "time",
  
  // Additional common icons
  "refresh": "refresh",
  "sync": "sync",
  "filter": "filter",
  "tune": "options",
  "sort": "swap-vertical",
  "trending_up": "trending-up",
  "trending_down": "trending-down",
  "grid_on": "grid",
  "bar_chart": "bar-chart",
  "language": "globe",
  "exit_to_app": "exit",
  "add_circle": "add-circle",
  "admin_panel_settings": "shield",
};

/**
 * An icon component that uses native SFSymbols on iOS, and Ionicons on Android and web.
 * This ensures a consistent look across platforms with proper icon mapping.
 *
 * Icon `android_material_icon_name`s are automatically mapped to Ionicons equivalents.
 */
export function IconSymbol({
  ios_icon_name = undefined,
  android_material_icon_name,
  size = 24,
  color,
  style,
  name, // Legacy support for old API
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name?: keyof typeof Ionicons.glyphMap | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  name?: string; // Legacy support
}) {
  // Determine the icon name to use
  let iconName: keyof typeof Ionicons.glyphMap;
  
  // Support legacy 'name' prop (used in ListItem.tsx)
  if (name) {
    // Convert SF Symbol names to Ionicons
    const sfSymbolMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      "trash.fill": "trash",
      "trash": "trash-outline",
      "plus": "add",
      "gear": "settings",
      "person.fill": "person",
      "person": "person-outline",
      "house.fill": "home",
      "house": "home-outline",
    };
    iconName = sfSymbolMap[name] || (name as keyof typeof Ionicons.glyphMap);
  } else if (android_material_icon_name) {
    // Map Material Icons to Ionicons
    const mappedName = MATERIAL_TO_IONICONS_MAP[android_material_icon_name];
    iconName = mappedName || (android_material_icon_name as keyof typeof Ionicons.glyphMap);
  } else {
    // Fallback to a default icon
    iconName = "help-circle";
  }

  return (
    <Ionicons
      name={iconName}
      size={size}
      color={color as string}
      style={style as StyleProp<TextStyle>}
    />
  );
}
