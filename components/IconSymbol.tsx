
import { View, StyleProp, ViewStyle } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/**
 * Android/Web fallback icon component using Material Icons.
 * 
 * VERSION v22.0: ENHANCED ERROR HANDLING
 * - Added comprehensive null/undefined checks
 * - Returns null gracefully when name is invalid
 * - Logs detailed error information for debugging
 * - Uses Material Icons for Android/Web compatibility
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  ios_icon_name,
  android_material_icon_name,
}: {
  name?: string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  ios_icon_name?: string;
  android_material_icon_name?: string;
}) {
  // ✅ FIXED: Use android_material_icon_name if provided, fallback to name
  const iconName = android_material_icon_name || name;
  
  // ✅ FIXED: Enhanced validation with detailed logging
  if (!iconName || typeof iconName !== 'string' || iconName.trim() === '') {
    console.error('🚨 [IconSymbol Android v22.0] ERROR: Invalid icon name', {
      name,
      ios_icon_name,
      android_material_icon_name,
      type: typeof iconName,
      value: iconName,
    });
    return null;
  }

  console.log(`🎨 [IconSymbol Android v22.0] Rendering "${iconName}", color: ${color}, size: ${size}`);

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      <MaterialIcons name={iconName as any} size={size} color={color} />
    </View>
  );
}
