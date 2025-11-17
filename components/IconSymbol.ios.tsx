
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * ✅ INSTAGRAM-STYLE v15.0.0: Outlined icons for inactive, filled for active
 * - Active icons: Filled variant with semibold weight, pure white (#FFFFFF) at 100% opacity
 * - Inactive icons: Outlined variant with regular weight, pure white (#FFFFFF) at 100% opacity
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from different SF Symbol variants (.fill suffix) and weight
 * - Uses hierarchical rendering mode for filled icons to show depth
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
  // Determine if icon should be rendered as filled based on weight or fill property
  const isFilled = weight === 'semibold' || weight === 'bold' || fill === '#FFFFFF';
  
  // Use hierarchical mode for filled icons to show depth, monochrome for outlined
  const renderingMode = isFilled ? "hierarchical" : "monochrome";
  
  console.log(`🎨 [IconSymbol iOS v15.0] ${name}, ${isFilled ? 'FILLED' : 'OUTLINED'}, weight: ${weight}, mode: ${renderingMode}, color: ${color}`);
  
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
