
/**
 * TAB ICON COMPONENT - v13.0.0 INSTAGRAM-STYLE WITH FILL PROPERTY
 * 
 * Platform-specific icon rendering with Instagram-style outlined/filled distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * 🔥 INSTAGRAM-STYLE v13.0.0:
 * - Inactive icons: Outlined (hollow), pure white, 100% opacity, NO transparency
 * - Active icons: Filled, pure white, 100% opacity, NO transparency
 * - Icons are now 36px (same size as miniavatar)
 * - Visual distinction comes from outline vs filled using fill property
 * - fill="none" for outlined (inactive), fill="#FFFFFF" for filled (active)
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
  size = 36 // Updated to match miniavatar size
}: TabIconProps) {
  // Use filled icon when active, outlined when inactive
  const iosIcon = isActive ? iosIconFilled : iosIconOutlined;
  const androidIcon = isActive ? androidIconFilled : androidIconOutlined;
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  
  // Use fill property to control icon rendering
  // fill="none" for outlined (inactive), fill="#FFFFFF" for filled (active)
  const fillValue = isActive ? '#FFFFFF' : 'none';

  // 🎨 DEBUG LOG - Verify icons are being applied
  console.log(`🎨 [TabIcon v13.0 INSTAGRAM-STYLE] Rendering ${iconName}: ${isActive ? 'FILLED (active)' : 'OUTLINED (inactive)'}, size: ${size}px, fill: ${fillValue}`);

  return (
    <View style={[styles.container, { width: size, height: size, opacity: 1 }]}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={ICON_COLOR}
        weight={isActive ? 'semibold' : 'regular'}
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
