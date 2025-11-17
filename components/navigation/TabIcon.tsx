
/**
 * TAB ICON COMPONENT - v2.0.0
 * 
 * Platform-specific icon rendering with ENHANCED active/inactive states.
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

// ✅ ENHANCED: Much more visible distinction between active and inactive states
const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.35)'; // More transparent for better distinction
const ACTIVE_SCALE = 1.15; // Slightly larger when active

export function TabIcon({ iosIcon, androidIcon, isActive, size = 28 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconSize = isActive ? size * ACTIVE_SCALE : size;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      <IconSymbol
        name={iconName as any}
        size={iconSize}
        color={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  activeContainer: {
    // Enhanced glow effect for active state
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
});
