
/**
 * TAB ICON COMPONENT - VERSION v57.0
 * 
 * ✅ COMPLETE ANDROID-iOS VISUAL PARITY
 * 
 * CRITICAL FIXES v57.0:
 * - ✅ Icon sizes identical on both platforms
 * - ✅ Proper icon rendering with correct proportions
 * - ✅ Consistent filled/outlined distinction
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
  size = 24 // ✅ ANDROID FIX v57.0: Default size matches iOS
}: TabIconProps) {
  const iosIcon = isActive ? iosIconFilled : iosIconOutlined;
  const androidIcon = isActive ? androidIconFilled : androidIconOutlined;

  if (Platform.OS === 'android') {
    console.log(
      `🎨 [TabIcon v57.0 Android] isActive: ${isActive}, ` +
      `icon: "${androidIcon}", size: ${size}, color: ${ICON_COLOR}`
    );
  } else if (Platform.OS === 'ios') {
    console.log(
      `🎨 [TabIcon v57.0 iOS] isActive: ${isActive}, ` +
      `icon: "${iosIcon}", size: ${size}, color: ${ICON_COLOR}`
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
