
/**
 * TAB ICON COMPONENT - v3.1.0
 * 
 * Platform-specific icon rendering with MAXIMUM visibility and distinction.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * ✅ ACTIVE ICONS: Pure white (#FFFFFF) at 100% opacity with maximum intensity
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

// ✅ MAXIMUM VISIBILITY: Pure white at 100% opacity for active icons
const ACTIVE_COLOR = '#FFFFFF';           // Pure white at 100% opacity - maximum intensity
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.35)'; // Lower opacity for better contrast
const ACTIVE_SCALE = 1.25;                // Larger when active for better visibility

export function TabIcon({ iosIcon, androidIcon, isActive, size = 28 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconSize = isActive ? size * ACTIVE_SCALE : size;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      {/* Active state background glow - enhanced for maximum visibility */}
      {isActive && <View style={styles.activeGlow} />}
      
      <IconSymbol
        name={iconName as any}
        size={iconSize}
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
    padding: 8,
    position: 'relative',
  },
  activeContainer: {
    // Strong glow effect for active state - maximum visibility
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
  activeGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
});
