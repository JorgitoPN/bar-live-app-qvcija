
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle, Platform } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * VERSION v26.0: COMPLETE ANDROID-iOS PARITY
 * - Consistent behavior with Android version
 * - Proper error handling
 * - Support for both naming conventions
 * - Active icons: Uses filled icon name (with .fill suffix)
 * - Inactive icons: Uses outlined icon name (without .fill suffix)
 * - Pure white (#FFFFFF) at 100% opacity for both states
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from different SF Symbol names (.fill suffix)
 * - Uses monochrome rendering mode for consistent appearance
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
  name?: SymbolViewProps["name"];
  ios_icon_name?: SymbolViewProps["name"];
  android_material_icon_name?: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  fill?: string;
}) {
  // Support both prop naming conventions
  const iconName = ios_icon_name || name;

  // Check if iconName is defined before using it
  if (!iconName) {
    console.error(
      '🚨 [IconSymbol v26.0 iOS] ERROR: name/ios_icon_name prop is undefined or null. ' +
      'Rendering fallback icon.'
    );
    // Return a fallback icon instead of null
    return (
      <SymbolView
        weight={weight}
        tintColor={color}
        resizeMode="scaleAspectFit"
        name="questionmark.circle"
        renderingMode="monochrome"
        style={[
          {
            width: size,
            height: size,
            opacity: 1,
          },
          style,
        ]}
      />
    );
  }

  // Determine if this is a filled or outlined icon based on the icon name
  const isFilled = iconName.includes('.fill');
  
  // Use monochrome rendering mode for consistent appearance
  const renderingMode = "monochrome";
  
  console.log(
    `🎨 [IconSymbol v26.0 iOS] Rendering "${iconName}", ` +
    `${isFilled ? 'FILLED' : 'OUTLINED'}, mode: ${renderingMode}, ` +
    `color: ${color}, size: ${size}`
  );
  
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={iconName}
      renderingMode={renderingMode}
      style={[
        {
          width: size,
          height: size,
          opacity: 1, // Force 100% opacity to prevent inheritance issues
        },
        style,
      ]}
    />
  );
}
