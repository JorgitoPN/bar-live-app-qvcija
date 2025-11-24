
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * VERSION v22.0: FIXED PROP NAMING ISSUE
 * - Now accepts both 'name' and 'ios_icon_name' props for compatibility
 * - Added null/undefined check for name prop before calling includes()
 * - Active icons: Uses filled icon name (with .fill suffix) passed from TabIcon
 * - Inactive icons: Uses outlined icon name (without .fill suffix) passed from TabIcon
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
  // ✅ FIXED: Support both prop naming conventions
  const iconName = ios_icon_name || name;

  // ✅ FIXED: Check if iconName is defined before calling includes()
  if (!iconName) {
    console.error('🚨 [IconSymbol iOS v22.0] ERROR: name/ios_icon_name prop is undefined or null');
    return null;
  }

  // Determine if this is a filled or outlined icon based on the icon name
  const isFilled = iconName.includes('.fill');
  
  // Use monochrome rendering mode for consistent appearance
  const renderingMode = "monochrome";
  
  console.log(`🎨 [IconSymbol iOS v22.0] Rendering "${iconName}", ${isFilled ? 'FILLED' : 'OUTLINED'}, mode: ${renderingMode}, color: ${color}, size: ${size}`);
  
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
