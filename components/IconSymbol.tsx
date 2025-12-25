
// This file is a fallback for using Ionicons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
  Platform,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// COMPREHENSIVE SF Symbol to Ionicons/MaterialIcons mapping
// VERSION v23.0: COMPLETE ANDROID-iOS PARITY
const MAPPING = {
  // Navigation & Home
  "house.fill": "home",
  "house": "home-outline",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.up": "arrow-up",
  "arrow.down": "arrow-down",
  "chevron.left": "chevron-back",
  "chevron.right": "chevron-forward",
  "chevron.up": "chevron-up",
  "chevron.down": "chevron-down",
  "arrow.clockwise": "refresh",
  "arrow.counterclockwise": "refresh",

  // Communication & Social
  "paperplane.fill": "send",
  "paperplane": "send-outline",
  "envelope.fill": "mail",
  "envelope": "mail-outline",
  "phone.fill": "call",
  "phone": "call-outline",
  "message.fill": "chatbubble",
  "message": "chatbubble-outline",
  "bell.fill": "notifications",
  "bell": "notifications-outline",
  "heart.fill": "heart",
  "heart": "heart-outline",

  // Actions & Controls
  "plus": "add",
  "plus.circle": "add-circle-outline",
  "plus.circle.fill": "add-circle",
  "minus": "remove",
  "minus.circle": "remove-circle-outline",
  "minus.circle.fill": "remove-circle",
  "xmark": "close",
  "xmark.circle": "close-circle-outline",
  "xmark.circle.fill": "close-circle",
  "checkmark": "checkmark",
  "checkmark.circle.fill": "checkmark-circle",
  "checkmark.circle": "checkmark-circle-outline",
  "checkmark.square.fill": "checkbox",
  "checkmark.square": "checkbox-outline",
  "multiply": "close",
  "trash.fill": "trash",
  "trash": "trash-outline",
  "trash.circle.fill": "close-circle",
  "pause.circle": "pause-circle-outline",
  "pause.circle.fill": "pause-circle",
  "play.circle": "play-circle-outline",
  "play.circle.fill": "play-circle",
  "pencil.circle.fill": "create",

  // Editing & Creation
  "pencil": "pencil",
  "pencil.and.list.clipboard": "clipboard",
  "square.and.pencil": "create",
  "doc.text.fill": "document-text",
  "doc.text": "document-text-outline",
  "folder.fill": "folder",
  "folder": "folder-outline",
  "doc.fill": "document",
  "doc": "document-outline",

  // Media & Content
  "photo.fill": "image",
  "photo": "image-outline",
  "photo.on.rectangle": "images",
  "photo.on.rectangle.fill": "images",
  "camera.fill": "camera",
  "camera": "camera-outline",
  "video.fill": "videocam",
  "video": "videocam-outline",
  "music.note": "musical-note",
  "speaker.wave.2.fill": "volume-high",
  "speaker.slash.fill": "volume-mute",
  "play.fill": "play",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "square.stack.fill": "albums",
  "square.stack": "albums-outline",

  // System & Settings
  "gear": "settings-outline",
  "gearshape.fill": "settings",
  "gearshape": "settings-outline",
  "slider.horizontal.3": "options",
  "info.circle.fill": "information-circle",
  "info.circle": "information-circle-outline",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.triangle": "warning-outline",
  "questionmark.circle.fill": "help-circle",
  "questionmark.circle": "help-circle-outline",

  // Shapes & Symbols
  "square": "square-outline",
  "square.fill": "square",
  "square.grid.3x3": "grid",
  "square.grid.3x3.fill": "grid",
  "circle": "ellipse-outline",
  "circle.fill": "ellipse",
  "triangle.fill": "triangle",
  "triangle": "triangle-outline",
  "star.fill": "star",
  "star": "star-outline",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-outline",

  // Technology & Code
  "chevron.left.forwardslash.chevron.right": "code-slash",
  "qrcode.viewfinder": "qr-code",
  "qrcode": "qr-code",
  "wifi": "wifi",
  "antenna.radiowaves.left.and.right": "cellular",
  "battery.100": "battery-full",
  "battery.25": "battery-half",
  "lock.fill": "lock-closed",
  "lock": "lock-closed-outline",
  "lock.open.fill": "lock-open",
  "lock.open": "lock-open-outline",

  // Shopping & Commerce
  "cart.fill": "cart",
  "cart": "cart-outline",
  "creditcard.fill": "card",
  "creditcard": "card-outline",
  "dollarsign.circle.fill": "cash",
  "dollarsign.circle": "cash-outline",
  "bag.fill": "bag",
  "bag": "bag-outline",
  "eurosign.circle": "cash-outline",
  "eurosign.circle.fill": "cash",

  // Location & Maps
  "location.fill": "location",
  "location": "location-outline",
  "map.fill": "map",
  "map": "map-outline",
  "compass.drawing": "compass",
  "compass": "compass-outline",
  "mappin": "pin",
  "mappin.circle.fill": "location",
  "mappin.circle": "location-outline",
  "building.2": "business-outline",
  "building.2.fill": "business",

  // Time & Calendar
  "clock.fill": "time",
  "clock": "time-outline",
  "calendar": "calendar-outline",
  "calendar.badge.clock": "calendar",
  "timer": "timer-outline",

  // User & Profile
  "person": "person-outline",
  "person.fill": "person",
  "person.2.fill": "people",
  "person.2": "people-outline",
  "person.circle.fill": "person-circle",
  "person.circle": "person-circle-outline",
  "person.crop.circle.fill": "person-circle",
  "person.crop.circle": "person-circle-outline",
  "person.crop.square": "person",
  "person.badge.key": "key",

  // Work & Business
  "briefcase": "briefcase-outline",
  "briefcase.fill": "briefcase",

  // Sharing & Export
  "square.and.arrow.up": "share-social",
  "square.and.arrow.up.fill": "share-social",
  "square.and.arrow.down": "download",
  "square.and.arrow.down.fill": "download",
  "arrow.up.doc.fill": "cloud-upload",
  "arrow.up.doc": "cloud-upload-outline",
  "link": "link",

  // Search & Discovery
  "magnifyingglass": "search",
  "magnifyingglass.circle": "search-circle",
  "magnifyingglass.circle.fill": "search-circle",
  "line.3.horizontal.decrease": "filter",
  "line.3.horizontal.decrease.circle": "filter-circle",
  "arrow.up.arrow.down": "swap-vertical",

  // Visibility & Display
  "eye": "eye-outline",
  "eye.fill": "eye",
  "eye.slash.fill": "eye-off",
  "eye.slash": "eye-off-outline",
  "lightbulb.fill": "bulb",
  "lightbulb": "bulb-outline",
  "moon.fill": "moon",
  "moon": "moon-outline",
  "sun.max.fill": "sunny",
  "sun.max": "sunny-outline",
  
  // Special icons
  "sparkles": "sparkles",
  "globe": "globe",
  "globe.americas.fill": "globe",
  "arrow.triangle.2.circlepath": "sync",
  
  // Direct Ionicons mappings for tab navigation
  "home": "home",
  "home-outline": "home-outline",
  "calendar": "calendar",
  "calendar-outline": "calendar-outline",
  "heart": "heart",
  "heart-outline": "heart-outline",
  "compass": "compass",
  "compass-outline": "compass-outline",
  "people": "people",
  "people-outline": "people-outline",
  "business": "business",
  "business-outline": "business-outline",
  "briefcase": "briefcase",
  "briefcase-outline": "briefcase-outline",
  "settings": "settings",
  "settings-outline": "settings-outline",
  "person": "person",
  "person-outline": "person-outline",
  "account-circle": "person-circle",
  
  // Additional common icons
  "ellipsis.circle": "ellipsis-horizontal-circle",
  "ellipsis.circle.fill": "ellipsis-horizontal-circle",
  "list.bullet": "list",
  "list.bullet.rectangle": "list",
  "text.alignleft": "text",
  "text.aligncenter": "text",
  "text.alignright": "text",
} as Partial<
  Record<
    import("expo-symbols").SymbolViewProps["name"],
    React.ComponentProps<typeof Ionicons>["name"]
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and Ionicons on Android and web. 
 * This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to Ionicons.
 * 
 * VERSION v23.0: COMPLETE ANDROID-iOS PARITY
 * - Comprehensive icon mapping with fallbacks
 * - Better error handling and logging
 * - Support for both naming conventions
 * - Guaranteed icon rendering on all platforms
 */
export function IconSymbol({
  name,
  ios_icon_name,
  android_material_icon_name,
  size = 24,
  color,
  style,
  weight = "regular",
  fill,
}: {
  name?: IconSymbolName;
  ios_icon_name?: IconSymbolName;
  android_material_icon_name?: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  fill?: string;
}) {
  // Priority: android_material_icon_name (direct Ionicon name) > name (SF Symbol name) > ios_icon_name (SF Symbol name)
  let iconName: string | undefined;
  let iconSource: 'direct' | 'mapped' | 'fallback' = 'fallback';
  
  if (android_material_icon_name) {
    // Direct Ionicon name provided
    iconName = android_material_icon_name;
    iconSource = 'direct';
  } else {
    // Use SF Symbol name and map it
    const sfSymbolName = name || ios_icon_name;
    if (sfSymbolName) {
      iconName = MAPPING[sfSymbolName];
      if (iconName) {
        iconSource = 'mapped';
      }
    }
  }
  
  // Fallback to a default icon if no mapping found
  if (!iconName) {
    const sfSymbolName = name || ios_icon_name;
    console.warn(
      `⚠️ [IconSymbol v23.0 Android] No icon mapping found for "${sfSymbolName}". ` +
      `Using fallback icon. Please add mapping to MAPPING object.`
    );
    iconName = 'help-circle-outline'; // Fallback icon
    iconSource = 'fallback';
  }
  
  if (Platform.OS === 'android') {
    console.log(
      `🎨 [IconSymbol v23.0 Android] Rendering "${iconName}" (${iconSource}), ` +
      `size: ${size}, color: ${color}`
    );
  }
  
  return (
    <Ionicons
      color={color}
      size={size}
      name={iconName as any}
      style={style as StyleProp<TextStyle>}
    />
  );
}
