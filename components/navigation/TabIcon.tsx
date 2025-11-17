
/**
 * TAB ICON COMPONENT - v1.0.0
 * 
 * Platform-specific icon rendering with proper active/inactive states.
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

const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.6)';
const ACTIVE_GLOW_COLOR = '#FFFFFF';

export function TabIcon({ iosIcon, androidIcon, isActive, size = 28 }: TabIconProps) {
  const iconName = Platform.OS === 'ios' ? iosIcon : androidIcon;
  const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;

  return (
    <View style={[styles.container, isActive && styles.activeContainer]}>
      <IconSymbol
        name={iconName as any}
        size={size}
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
    shadowColor: ACTIVE_GLOW_COLOR,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 12,
  },
});
