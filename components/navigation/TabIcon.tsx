
/**
 * TAB ICON COMPONENT - v11.0.0 INSTAGRAM-STYLE
 * 
 * Platform-specific icon rendering with Instagram-style outlined/filled distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * 🔥 INSTAGRAM-STYLE v11.0.0:
 * - Inactive icons: Outlined (hollow), pure white, 100% opacity, NO transparency
 * - Active icons: Filled, pure white, 100% opacity, NO transparency
 * - Icons are smaller (24px) and positioned higher in the tab bar
 * - Visual distinction comes from outline vs filled, not opacity changes
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
  size = 24 
}: TabIconProps) {
  // Use filled icon when active, outlined when inactive
  const iosIcon = isActive ? iosIconFilled : iosIconOutlined;
  const androidIcon = isActive ? androidIconFilled : androidIconOutlined;
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;

  // 🎨 DEBUG LOG - Verify icons are being applied
  console.log(`🎨 [TabIcon v11.0 INSTAGRAM-STYLE] Rendering ${iconName}: ${isActive ? 'FILLED (active)' : 'OUTLINED (inactive)'}`);

  return (
    <View style={[styles.container, { opacity: 1 }]}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={ICON_COLOR}
        weight={isActive ? 'semibold' : 'regular'}
        style={{ opacity: 1 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    opacity: 1, // Force 100% opacity on container - NO INHERITANCE
  },
});
