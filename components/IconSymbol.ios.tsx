
import { SymbolView, SymbolViewProps, SymbolWeight } from "expo-symbols";
import { StyleProp, ViewStyle } from "react-native";

/**
 * iOS-specific icon component using native SF Symbols.
 * 
 * ✅ ENHANCED VISIBILITY v6.0.0: Clear active/inactive distinction
 * - Active icons: 100% opacity (no transparency) with semibold weight
 * - Inactive icons: 50% opacity (transparent) with regular weight
 * - Weight parameter properly applied for better distinction
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
        },
        style,
      ]}
    />
  );
}
