
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * VERSION v22.0: ENHANCED ERROR HANDLING
 * - Added comprehensive null/undefined checks
 * - Returns null gracefully when name is invalid
 * - Logs detailed error information for debugging
 * - Active icons: Uses filled icon name (with .fill suffix)
 * - Inactive icons: Uses outlined icon name (without .fill suffix)
 * - Pure white (#FFFFFF) at 100% opacity for both states
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from different SF Symbol names (.fill suffix)
 * - Uses monochrome rendering mode for consistent appearance
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
  fill,
  ios_icon_name,
  android_material_icon_name,
}: {
  name?: SymbolViewProps["name"];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  fill?: string;
  ios_icon_name?: string;
  android_material_icon_name?: string;
}) {
  // ✅ FIXED: Use ios_icon_name if provided, fallback to name
  const iconName = ios_icon_name || name;
  
  // ✅ FIXED: Enhanced validation with detailed logging
  if (!iconName || typeof iconName !== 'string' || iconName.trim() === '') {
    console.error('🚨 [IconSymbol iOS v22.0] ERROR: Invalid icon name', {
      name,
      ios_icon_name,
      android_material_icon_name,
      type: typeof iconName,
      value: iconName,
    });
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
