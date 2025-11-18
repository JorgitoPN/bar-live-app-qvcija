
/**
 * TAB ICON COMPONENT - SIMPLIFIED VERSION
 * 
 * Renders tab icons with clear filled/outlined distinction.
 * Active tabs show filled icons, inactive tabs show outlined icons.
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
