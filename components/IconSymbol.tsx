
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

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.

  // Navigation & Home
  "house.fill": "home",
  "house": "home",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.up": "arrow-upward",
  "arrow.down": "arrow-downward",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "arrow.clockwise": "refresh",
  "arrow.counterclockwise": "refresh",

  // Communication & Social
  "paperplane.fill": "send",
  "paperplane": "send",
  "envelope.fill": "mail",
  "envelope": "mail-outline",
  "phone.fill": "phone",
  "phone": "phone",
  "message.fill": "chat",
  "message": "chat-bubble-outline",
  "bell.fill": "notifications",
  "bell": "notifications-none",
  "heart.fill": "favorite",
  "heart": "favorite-border",

  // Actions & Controls
  "plus": "add",
  "minus": "remove",
  "xmark": "close",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "checkmark.circle": "check-circle-outline",
  "checkmark.square.fill": "check-box",
  "checkmark.square": "check-box-outline-blank",
  "multiply": "clear",
  "trash.fill": "delete",
  "trash": "delete-outline",
  "pause.circle": "pause-circle-outline",
  "play.circle": "play-circle-outline",
  "pencil.circle.fill": "edit",

  // Editing & Creation
  "pencil": "edit",
  "pencil.and.list.clipboard": "edit-note",
  "square.and.pencil": "edit",
  "doc.text.fill": "description",
  "doc.text": "description",
  "folder.fill": "folder",
  "folder": "folder-open",
  "doc.fill": "insert-drive-file",
  "doc": "insert-drive-file",

  // Media & Content
  "photo.fill": "image",
  "photo": "image",
  "camera.fill": "camera-alt",
  "camera": "camera-alt",
  "video.fill": "videocam",
  "video": "videocam-off",
  "music.note": "music-note",
  "speaker.wave.2.fill": "volume-up",
  "speaker.slash.fill": "volume-off",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",
  "square.stack.fill": "collections",

  // System & Settings
  "gear": "settings",
  "gearshape.fill": "settings",
  "slider.horizontal.3": "tune",
  "info.circle.fill": "info",
  "info.circle": "info",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.triangle": "warning-amber",
  "questionmark.circle.fill": "help",
  "questionmark.circle": "help-outline",

  // Shapes & Symbols
  "square": "square",
  "square.grid.3x3": "apps",
  "circle": "circle",
  "triangle.fill": "change-history",
  "star.fill": "star",
  "star": "star-border",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-border",

  // Technology & Code
  "chevron.left.forwardslash.chevron.right": "code",
  "qrcode.viewfinder": "qr-code",
  "wifi": "wifi",
  "antenna.radiowaves.left.and.right": "signal-cellular-alt",
  "battery.100": "battery-full",
  "battery.25": "battery-2-bar",
  "lock.fill": "lock",
  "lock.open.fill": "lock-open",

  // Shopping & Commerce
  "cart.fill": "shopping-cart",
  "cart": "shopping-cart",
  "creditcard.fill": "credit-card",
  "creditcard": "credit-card",
  "dollarsign.circle.fill": "monetization-on",
  "bag.fill": "shopping-bag",
  "bag": "shopping-bag",
  "eurosign.circle": "euro",
  "eurosign.circle.fill": "euro",

  // Location & Maps
  "location.fill": "location-on",
  "location": "location-on",
  "map.fill": "map",
  "map": "map",
  "compass.drawing": "explore",
  "mappin": "place",
  "mappin.circle.fill": "place",
  "building.2": "business_center",
  "building.2.fill": "business",

  // Time & Calendar
  "clock.fill": "access-time",
  "clock": "access-time",
  "calendar": "event_note",
  "calendar.badge.clock": "event",
  "timer": "timer",

  // User & Profile
  "person": "person_outline",
  "person.fill": "person",
  "person.2.fill": "groups",
  "person.2": "groups",
  "person.circle.fill": "account-circle",
  "person.circle": "account-circle",
  "person.crop.circle.fill": "account-circle",
  "person.crop.circle": "account-circle",
  "person.crop.square": "person",
  "person.badge.key": "admin-panel-settings",

  // Work & Business
  "briefcase": "work_outline",
  "briefcase.fill": "work",

  // Sharing & Export
  "square.and.arrow.up": "share",
  "square.and.arrow.down": "download",
  "arrow.up.doc.fill": "upload-file",
  "link": "link",

  // Search & Discovery
  "magnifyingglass": "search",
  "line.3.horizontal.decrease": "filter-list",
  "line.3.horizontal.decrease.circle": "filter-list",
  "arrow.up.arrow.down": "sort",

  // Visibility & Display
  "eye": "visibility",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "lightbulb.fill": "lightbulb",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
  
  // Special icons
  "sparkles": "auto_awesome",
  "photo.on.rectangle": "photo-library",
  "globe": "language",
  "arrow.triangle.2.circlepath": "sync",
  "plus.circle.fill": "add-circle",
  "trash.circle.fill": "cancel",
  "settings_applications": "settings-applications",
} as Partial<
  Record<
    import("expo-symbols").SymbolViewProps["name"],
    React.ComponentProps<typeof MaterialIcons>["name"]
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. 
 * This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 * 
 * ✅ v18.0.0: FIXED - Uses proper Material Icons with real filled/outlined variants
 * - Active icons: Uses filled icon name passed from TabIcon
 * - Inactive icons: Uses outlined icon name passed from TabIcon
 * - Pure white (#FFFFFF) at 100% opacity for both states
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from different icon names (filled vs outlined)
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
  fill,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  fill?: string;
}) {
  // Get the Material Icon name from the mapping
  const materialIconName = MAPPING[name];
  
  // Ensure color is applied directly without any modifications
  const finalColor = typeof color === 'string' ? color : color.toString();
  
  // Determine if this is a filled or outlined icon based on the icon name
  const isFilled = name.includes('.fill');
  
  console.log(`🎨 [IconSymbol Android/Web v18.0] ${name} → ${materialIconName}, ${isFilled ? 'FILLED' : 'OUTLINED'}, color: ${finalColor}`);
  
  return (
    <MaterialIcons
      color={finalColor}
      size={size}
      name={materialIconName}
      style={[
        { 
          opacity: 1, // Force 100% opacity to prevent inheritance issues
        },
        style as StyleProp<TextStyle>,
      ]}
    />
  );
}
