
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * VERSION v21.0: FIXED UNDEFINED NAME ERROR
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
  size = 24,
  color,
  style,
  weight = "regular",
  fill,
}: {
  name: SymbolViewProps["name"];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
  fill?: string;
}) {
  // ✅ FIXED: Check if name is defined before calling includes()
  if (!name) {
    console.error('🚨 [IconSymbol iOS v21.0] ERROR: name prop is undefined or null');
    return null;
  }

  // Determine if this is a filled or outlined icon based on the icon name
  const isFilled = name.includes('.fill');
  
  // Use monochrome rendering mode for consistent appearance
  const renderingMode = "monochrome";
  
  console.log(`🎨 [IconSymbol iOS v21.0] Rendering "${name}", ${isFilled ? 'FILLED' : 'OUTLINED'}, mode: ${renderingMode}, color: ${color}, size: ${size}`);
  
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
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
