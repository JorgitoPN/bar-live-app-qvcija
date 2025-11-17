
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * ✅ INSTAGRAM-STYLE v11.0.0: Outlined icons for inactive, filled for active
 * - Active icons: Filled, pure white (#FFFFFF) at 100% opacity
 * - Inactive icons: Outlined (hollow), pure white (#FFFFFF) at 100% opacity
 * - NO transparency, NO filters - icons are fully opaque and bright
 * - Visual distinction comes from outline vs filled, not opacity
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = "regular",
}: {
  name: SymbolViewProps["name"];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  console.log(`🎨 [IconSymbol iOS] Rendering ${name} with color: ${color}, weight: ${weight}`);
  
  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
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
