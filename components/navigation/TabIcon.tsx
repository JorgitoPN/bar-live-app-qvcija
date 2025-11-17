
/**
 * TAB ICON COMPONENT - v7.0.0
 * 
 * Platform-specific icon rendering with clear active/inactive distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * ✅ ENHANCED VISIBILITY v7.0.0:
 * - Icons same size as mini-avatar (36px - reduced from 42px)
 * - Active icons: Pure white (#FFFFFF) at 100% opacity (NO transparency)
 * - Inactive icons: White at 10% opacity (10x difference for clear distinction)
 * - Clear visual distinction between active and inactive states
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

// Clear distinction: Active = 100% opacity, Inactive = 10% opacity (10x difference)
const ACTIVE_COLOR = '#FFFFFF';                     // Pure white at 100% opacity (NO transparency)
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.1)';  // 10% opacity (10x less than active)

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
    width: 36, // Reduced from 42px
    height: 36,
  },
});
