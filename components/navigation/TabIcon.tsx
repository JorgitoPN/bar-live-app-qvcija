
/**
 * TAB ICON COMPONENT - v19.0.0 INSTAGRAM-STYLE FIXED
 * 
 * Platform-specific icon rendering with Instagram-style outlined/filled distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * 🔥 INSTAGRAM-STYLE v19.0.0 FIX:
 * - Inactive icons: Uses outlined icon name, pure white, 100% opacity
 * - Active icons: Uses filled icon name, pure white, 100% opacity
 * - Icons match miniavatar size (32px by default)
 * - Visual distinction comes from DIFFERENT ICON NAMES (not weight or fill props)
 * - iOS: Uses SF Symbol names with/without .fill suffix
 * - Android: Uses REAL Material Icon names that exist (e.g., favorite vs favorite-border)
 * 
 * 🔧 FIX v19.0.0: Pass the correct icon name based on active state
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
  // 🔥 KEY FIX: Use the correct icon name based on active state
  // Active = filled icon name, Inactive = outlined icon name
  const iosIcon = isActive ? iosIconFilled : iosIconOutlined;
  const androidIcon = isActive ? androidIconFilled : androidIconOutlined;
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;

  // 🎨 DEBUG LOG - Verify correct icon names are being used
  console.log(`🎨 [TabIcon v19.0.0] ${iconName}: ${isActive ? 'FILLED (active)' : 'OUTLINED (inactive)'}, size: ${size}px`);

  return (
    <View style={[styles.container, { width: size, height: size, opacity: 1 }]}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={ICON_COLOR}
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
