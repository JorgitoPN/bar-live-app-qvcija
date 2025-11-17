
/**
 * TAB ICON COMPONENT - v4.0.0
 * 
 * Platform-specific icon rendering with MAXIMUM visibility and clear active state.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * ✅ ENHANCED VISIBILITY:
 * - Active icons: Pure white (#FFFFFF) at 100% opacity with strong glow
 * - Inactive icons: White at 60% opacity (much more visible)
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

// ✅ MAXIMUM VISIBILITY with clear distinction
const ACTIVE_COLOR = '#FFFFFF';                    // Pure white at 100% opacity
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.6)'; // 60% opacity - much more visible
const ACTIVE_SCALE = 1.3;                          // Significantly larger when active

export function TabIcon({ iosIcon, androidIcon, isActive, size = 28 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconSize = isActive ? size * ACTIVE_SCALE : size;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      {/* Strong active state background with glow */}
      {isActive && (
        <>
          <View style={styles.activeGlowOuter} />
          <View style={styles.activeGlowInner} />
        </>
      )}
      
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
    // Strong shadow for active state
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 20,
  },
  activeGlowOuter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 15,
  },
  activeGlowInner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 18,
  },
});
