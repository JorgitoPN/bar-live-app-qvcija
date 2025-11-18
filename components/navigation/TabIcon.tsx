
/**
 * TAB ICON COMPONENT - FIXED VERSION v20.0
 * 
 * Renders tab icons with clear filled/outlined distinction.
 * Active tabs show filled icons in white, inactive tabs show outlined icons in white.
 * 
 * FIX: Added extensive logging to debug icon rendering
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

const ICON_COLOR = '#FFFFFF';

export function TabIcon({ 
  iosIconFilled, 
  iosIconOutlined,
  androidIconFilled,
  androidIconOutlined,
  isActive, 
  size = 28
}: TabIconProps) {
  // Select the correct icon based on platform and active state
  const iconName = Platform.OS === 'ios' 
    ? (isActive ? iosIconFilled : iosIconOutlined)
    : (isActive ? androidIconFilled : androidIconOutlined);

  console.log(`🎨 [TabIcon v20.0] Platform: ${Platform.OS}, isActive: ${isActive}, icon: "${iconName}", color: ${ICON_COLOR}`);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <IconSymbol
        name={iconName as any}
        size={size}
        color={ICON_COLOR}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
