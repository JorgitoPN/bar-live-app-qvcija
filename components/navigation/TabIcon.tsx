
/**
 * TAB ICON COMPONENT - v15.1.0 INSTAGRAM-STYLE WITH PROPER WEIGHT DISTINCTION
 * 
 * Platform-specific icon rendering with Instagram-style outlined/filled distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * 🔥 INSTAGRAM-STYLE v15.1.0:
 * - Inactive icons: Outlined (hollow), pure white, 100% opacity, regular weight
 * - Active icons: Filled, pure white, 100% opacity, semibold weight
 * - Icons match miniavatar size (32px by default)
 * - Visual distinction comes from icon variant AND weight
 * - Uses different icon names for filled/outlined variants
 * 
 * 🔧 FIX v15.1.0: Enhanced logging for debugging
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

interface TabIconProps {
  iosIconFilled: string;
  iosIconOutlined: string;
  androidIconFilled: string;
  androidIconOutlined: string;
  isActive: boolean;
  size?: number;
}

// 🎯 INSTAGRAM-STYLE COLORS - Pure white, fully opaque, NO transparency
const ICON_COLOR = '#FFFFFF'; // Pure white, 100% opacity for both active and inactive

export function TabIcon({ 
  iosIconFilled, 
  iosIconOutlined,
  androidIconFilled,
  androidIconOutlined,
  isActive, 
  size = 32 // Match miniavatar size
}: TabIconProps) {
  // Use filled icon when active, outlined when inactive
  const iosIcon = isActive ? iosIconFilled : iosIconOutlined;
  const androidIcon = isActive ? androidIconFilled : androidIconOutlined;
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  
  // Use weight to control icon rendering
  // semibold for active (filled appearance), regular for inactive (outlined appearance)
  const weight = isActive ? 'semibold' : 'regular';
  
  // Use fill property to control icon rendering
  // fill="#FFFFFF" for active (filled), fill="none" for inactive (outlined)
  const fillValue = isActive ? '#FFFFFF' : 'none';

  // 🎨 DEBUG LOG - Verify icons are being applied
  console.log(`🎨 [TabIcon v15.1.0] ${iconName}: ${isActive ? 'FILLED (active)' : 'OUTLINED (inactive)'}, size: ${size}px, weight: ${weight}, fill: ${fillValue}`);

  return (
    <View style={[styles.container, { width: size, height: size, opacity: 1 }]}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={ICON_COLOR}
        weight={weight}
        fill={fillValue}
        style={{ opacity: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1, // Force 100% opacity on container - NO INHERITANCE
  },
});
