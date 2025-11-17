
/**
 * TAB ICON COMPONENT - v9.0.0 INSTAGRAM-EXACT
 * 
 * Platform-specific icon rendering with EXACT Instagram-style active/inactive distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * 🔥 INSTAGRAM-EXACT VISIBILITY v9.0.0:
 * - Icons same size as mini-avatar (36px)
 * - Active icons: Pure white (#FFFFFF) at 100% opacity - MUST BE CLEARLY VISIBLE
 * - Inactive icons: White at 40% opacity (rgba(255,255,255,0.4)) - CLEARLY VISIBLE, just softened
 * - NO filters, NO parent opacity, NO style inheritance issues
 * - Direct color application to ensure maximum contrast
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

// 🎯 INSTAGRAM-EXACT COLORS - DO NOT MODIFY
const ACTIVE_COLOR = '#FFFFFF';                     // Pure white, 100% opacity, NO transparency
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.4)';  // 40% opacity, clearly visible but softened

export function TabIcon({ iosIcon, androidIcon, isActive, size = 36 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

  console.log(`🎨 [TabIcon v9.0] Rendering ${iconName}: ${isActive ? 'ACTIVE (white)' : 'INACTIVE (40% opacity)'}`);

  return (
    <View style={[styles.container, { opacity: 1 }]}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={color}
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
    width: 36,
    height: 36,
    opacity: 1, // Force 100% opacity on container
  },
});
