
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * ✅ INSTAGRAM-STYLE v13.0.0: Outlined icons for inactive, filled for active
 * - Active icons: Filled, pure white (#FFFFFF) at 100% opacity
 * - Inactive icons: Outlined (hollow), pure white (#FFFFFF) at 100% opacity
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from outline vs filled, not opacity
 * - Uses fill property to control icon rendering (none for outlined, white for filled)
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
  console.log(`🎨 [IconSymbol iOS v13.0] Rendering ${name} with color: ${color}, weight: ${weight}, fill: ${fill || 'none'}`);
  
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      renderingMode={fill ? "hierarchical" : "monochrome"}
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
