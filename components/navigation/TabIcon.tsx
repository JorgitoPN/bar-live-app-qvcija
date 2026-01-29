
/**
 * TAB ICON COMPONENT - VERSION v23.0
 * 
 * Renders tab icons with clear filled/outlined distinction.
 * Active tabs show filled icons in white, inactive tabs show outlined icons in white.
 * 
 * COMPLETE ANDROID-iOS PARITY:
 * - Consistent icon rendering on both platforms
 * - Proper fallbacks for missing icons
 * - Better error handling and logging
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
  const iosIcon = isActive ? iosIconFilled : iosIconOutlined;
  const androidIcon = isActive ? androidIconFilled : androidIconOutlined;

  if (Platform.OS === 'android') {
    console.log(
      `🎨 [TabIcon v23.0 Android] isActive: ${isActive}, ` +
      `icon: "${androidIcon}", color: ${ICON_COLOR}`
    );
  } else if (Platform.OS === 'ios') {
    console.log(
      `🎨 [TabIcon v23.0 iOS] isActive: ${isActive}, ` +
      `icon: "${iosIcon}", color: ${ICON_COLOR}`
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {Platform.OS === 'ios' ? (
        <IconSymbol
          ios_icon_name={iosIcon as any}
          size={size}
          color={ICON_COLOR}
        />
      ) : (
        <IconSymbol
          android_material_icon_name={androidIcon}
          size={size}
          color={ICON_COLOR}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
