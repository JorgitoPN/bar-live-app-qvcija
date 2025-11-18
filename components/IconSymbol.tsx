
// This file is a fallback for using Ionicons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

// Add your SFSymbol to Ionicons mappings here.
const MAPPING = {
  // See Ionicons here: https://ionic.io/ionicons
  // See SF Symbols in the SF Symbols app on Mac.

  // Navigation & Home - CLEAR VISUAL DIFFERENCES
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

  // Communication & Social - CLEAR VISUAL DIFFERENCES
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

  // Actions & Controls - CLEAR VISUAL DIFFERENCES
  "plus": "add",
  "minus": "remove",
  "xmark": "close",
  "checkmark": "checkmark",
  "checkmark.circle.fill": "checkmark-circle",
  "checkmark.circle": "checkmark-circle-outline",
  "checkmark.square.fill": "checkbox",
  "checkmark.square": "checkbox-outline",
  "multiply": "close",
  "trash.fill": "trash",
  "trash": "trash-outline",
  "pause.circle": "pause-circle-outline",
  "play.circle": "play-circle-outline",
  "pencil.circle.fill": "create",

  // Editing & Creation - CLEAR VISUAL DIFFERENCES
  "pencil": "pencil",
  "pencil.and.list.clipboard": "clipboard",
  "square.and.pencil": "create",
  "doc.text.fill": "document-text",
  "doc.text": "document-text-outline",
  "folder.fill": "folder",
  "folder": "folder-outline",
  "doc.fill": "document",
  "doc": "document-outline",

  // Media & Content - CLEAR VISUAL DIFFERENCES
  "photo.fill": "image",
  "photo": "image-outline",
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

  // System & Settings - CLEAR VISUAL DIFFERENCES
  "gear": "settings-outline",
  "gearshape.fill": "settings",
  "slider.horizontal.3": "options",
  "info.circle.fill": "information-circle",
  "info.circle": "information-circle-outline",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.triangle": "warning-outline",
  "questionmark.circle.fill": "help-circle",
  "questionmark.circle": "help-circle-outline",

  // Shapes & Symbols - CLEAR VISUAL DIFFERENCES
  "square": "square-outline",
  "square.grid.3x3": "grid",
  "circle": "ellipse-outline",
  "triangle.fill": "triangle",
  "star.fill": "star",
  "star": "star-outline",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-outline",

  // Technology & Code
  "chevron.left.forwardslash.chevron.right": "code-slash",
  "qrcode.viewfinder": "qr-code",
  "wifi": "wifi",
  "antenna.radiowaves.left.and.right": "cellular",
  "battery.100": "battery-full",
  "battery.25": "battery-half",
  "lock.fill": "lock-closed",
  "lock.open.fill": "lock-open",

  // Shopping & Commerce - CLEAR VISUAL DIFFERENCES
  "cart.fill": "cart",
  "cart": "cart-outline",
  "creditcard.fill": "card",
  "creditcard": "card-outline",
  "dollarsign.circle.fill": "cash",
  "bag.fill": "bag",
  "bag": "bag-outline",
  "eurosign.circle": "cash-outline",
  "eurosign.circle.fill": "cash",

  // Location & Maps - CLEAR VISUAL DIFFERENCES
  "location.fill": "location",
  "location": "location-outline",
  "map.fill": "map",
  "map": "map-outline",
  "compass.drawing": "compass",
  "mappin": "pin",
  "mappin.circle.fill": "location",
  "building.2": "business",
  "building.2.fill": "business",

  // Time & Calendar - CLEAR VISUAL DIFFERENCES
  "clock.fill": "time",
  "clock": "time-outline",
  "calendar": "calendar-outline",
  "calendar.badge.clock": "calendar",
  "timer": "timer-outline",

  // User & Profile - CLEAR VISUAL DIFFERENCES
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

  // Work & Business - CLEAR VISUAL DIFFERENCES
  "briefcase": "briefcase-outline",
  "briefcase.fill": "briefcase",

  // Sharing & Export - CLEAR VISUAL DIFFERENCES
  "square.and.arrow.up": "share-social",
  "square.and.arrow.down": "download",
  "arrow.up.doc.fill": "cloud-upload",
  "link": "link",

  // Search & Discovery - CLEAR VISUAL DIFFERENCES
  "magnifyingglass": "search",
  "line.3.horizontal.decrease": "filter",
  "line.3.horizontal.decrease.circle": "filter-circle",
  "arrow.up.arrow.down": "swap-vertical",

  // Visibility & Display - CLEAR VISUAL DIFFERENCES
  "eye": "eye-outline",
  "eye.fill": "eye",
  "eye.slash.fill": "eye-off",
  "lightbulb.fill": "bulb",
  "moon.fill": "moon",
  "sun.max.fill": "sunny",
  
  // Special icons - CLEAR VISUAL DIFFERENCES
  "sparkles": "sparkles",
  "photo.on.rectangle": "images",
  "globe": "globe",
  "arrow.triangle.2.circlepath": "sync",
  "plus.circle.fill": "add-circle",
  "trash.circle.fill": "close-circle",
  
  // Tab navigation icons - v23.0.0 IONICONS WITH CLEAR VISUAL DIFFERENCES
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
 * ✅ v23.0.0: FIXED - Uses Ionicons with CLEAR filled/outlined variants
 * - Active icons: Uses filled icon name (e.g., "home", "heart", "person")
 * - Inactive icons: Uses outlined icon name (e.g., "home-outline", "heart-outline", "person-outline")
 * - Pure white (#FFFFFF) at 100% opacity for both states
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from different icon names (filled vs outlined)
 * - Ionicons have MUCH clearer visual differences than Material Icons
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
  // Get the Ionicon name from the mapping
  const ioniconName = MAPPING[name];
  
  // Ensure color is applied directly without any modifications
  const finalColor = typeof color === 'string' ? color : color.toString();
  
  // Determine if this is a filled or outlined icon based on the icon name
  const isFilled = !name.includes('-outline') && 
                   !name.includes('.circle') &&
                   (name.includes('.fill') || 
                    name === 'home' || 
                    name === 'heart' || 
                    name === 'person' || 
                    name === 'people' || 
                    name === 'briefcase' || 
                    name === 'business' || 
                    name === 'calendar' ||
                    name === 'compass' ||
                    name === 'settings');
  
  console.log(`🎨 [IconSymbol Android/Web v23.0 IONICONS] ${name} → ${ioniconName}, ${isFilled ? 'FILLED' : 'OUTLINED'}, color: ${finalColor}`);
  
  return (
    <Ionicons
      color={finalColor}
      size={size}
      name={ioniconName}
      style={[
        { 
          opacity: 1, // Force 100% opacity to prevent inheritance issues
        },
        style as StyleProp<TextStyle>,
      ]}
    />
  );
}
