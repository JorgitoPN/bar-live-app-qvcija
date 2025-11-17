
/**
 * TAB ICON COMPONENT - v8.0.0
 * 
 * Platform-specific icon rendering with Instagram-style active/inactive distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * ✅ INSTAGRAM-STYLE VISIBILITY v8.0.0:
 * - Icons same size as mini-avatar (36px)
 * - Active icons: Pure white (#FFFFFF) at 100% opacity (NO transparency)
 * - Inactive icons: White at 40% opacity (clearly visible, just softened)
 * - Clear visual distinction like Instagram's bottom menu
 */

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

interface TabIconProps {
  iosIcon: string;
  androidIcon: string;
  isActive: boolean;
  size?: number;
}

// Instagram-style distinction: Active = 100% opacity, Inactive = 40% opacity
const ACTIVE_COLOR = '#FFFFFF';                     // Pure white at 100% opacity (NO transparency)
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.4)';  // 40% opacity (clearly visible, just softened)

export function TabIcon({ iosIcon, androidIcon, isActive, size = 36 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <View style={styles.container}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={color}
        weight={isActive ? 'semibold' : 'regular'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
  },
});
