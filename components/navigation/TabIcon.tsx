
/**
 * TAB ICON COMPONENT - v3.1.0
 * 
 * Platform-specific icon rendering with MAXIMUM visibility and distinction.
 * Handles iOS SF Symbols and Android Material Icons.
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

// ✅ MAXIMUM VISIBILITY: Strong distinction between active and inactive states
const ACTIVE_COLOR = '#FFFFFF';           // Pure white for active - 100% opacity
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.4)'; // More transparent inactive state
const ACTIVE_SCALE = 1.2;                 // Larger when active for better visibility

export function TabIcon({ iosIcon, androidIcon, isActive, size = 28 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconSize = isActive ? size * ACTIVE_SCALE : size;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      {/* Active state background glow */}
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
    // Strong glow effect for active state
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 12,
  },
  activeGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
});
