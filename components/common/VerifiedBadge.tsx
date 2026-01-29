
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface VerifiedBadgeProps {
  size?: number;
  color?: string;
}

/**
 * VerifiedBadge Component
 * 
 * Displays a verified badge (checkmark seal) next to local profile names
 * to indicate they have an active payment plan.
 * 
 * Usage:
 * <VerifiedBadge size={18} color={colors.primary} />
 */
export default function VerifiedBadge({ size = 18, color = colors.primary }: VerifiedBadgeProps) {
  return (
    <View style={styles.container}>
      <IconSymbol 
        ios_icon_name="checkmark.seal.fill" 
        android_material_icon_name="verified" 
        size={size} 
        color={color} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
  },
});
