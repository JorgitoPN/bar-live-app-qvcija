
/**
 * TAB ICON COMPONENT - v5.0.0
 * 
 * Platform-specific icon rendering with EXTREME visibility difference.
 * Handles iOS SF Symbols and Android Material Icons.
 * 
 * ✅ ENHANCED VISIBILITY v5.0.0:
 * - Active icons: Pure white (#FFFFFF) at 100% opacity with MASSIVE glow
 * - Inactive icons: White at 80% opacity (very visible)
 * - 5X GREATER visual distinction between active and inactive states
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

// ✅ 5X GREATER DISTINCTION
const ACTIVE_COLOR = '#FFFFFF';                    // Pure white at 100% opacity
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.8)'; // 80% opacity - very visible
const ACTIVE_SCALE = 1.5;                          // 50% larger when active (was 1.3)

export function TabIcon({ iosIcon, androidIcon, isActive, size = 28 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
  const iconSize = isActive ? size * ACTIVE_SCALE : size;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      {/* MASSIVE active state background with extreme glow */}
      {isActive && (
        <>
          <View style={styles.activeGlowOuter} />
          <View style={styles.activeGlowMiddle} />
          <View style={styles.activeGlowInner} />
        </>
      )}
      
      <IconSymbol
        name={iconName as any}
        size={iconSize}
        color={color}
        weight={isActive ? 'bold' : 'regular'}
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
    // EXTREME shadow for active state
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 25,
  },
  activeGlowOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 35,
    elevation: 20,
  },
  activeGlowMiddle: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 22,
  },
  activeGlowInner: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 24,
  },
});
