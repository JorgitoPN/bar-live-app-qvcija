
import React from 'react';
import { Image, ImageProps } from 'expo-image';
import { StyleSheet, View, Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string } | number;
  recyclingKey?: string;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * ✅ OPTIMIZED IMAGE v335.0 - EXPO-IMAGE WRAPPER
 * 
 * OPTIMIZATIONS v335.0:
 * - ✅ EXPO-IMAGE: Uses expo-image for optimal performance
 * - ✅ PRIORITY: Configurable priority (default: "high")
 * - ✅ CACHE POLICY: "disk" for persistent caching
 * - ✅ TRANSITION: 150ms smooth transition
 * - ✅ RECYCLING KEY: Optional recyclingKey for memory optimization
 * - ✅ PLACEHOLDER: Shows icon while loading
 */

export default function OptimizedImage({
  source,
  style,
  recyclingKey,
  priority = 'high',
  contentFit = 'cover',
  ...props
}: OptimizedImageProps) {
  return (
    <Image
      source={source}
      style={style}
      contentFit={contentFit}
      priority={priority}
      cachePolicy="disk"
      transition={150}
      recyclingKey={recyclingKey}
      placeholder={
        <View style={[StyleSheet.flatten(style), styles.placeholder]}>
          <IconSymbol
            ios_icon_name="photo"
            android_material_icon_name="photo"
            size={32}
            color={colors.textSecondary}
          />
        </View>
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
