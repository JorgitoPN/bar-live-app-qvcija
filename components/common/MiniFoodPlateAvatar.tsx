
import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const DEFAULT_AVATAR_ICON = 'person.circle.fill';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  placeholderIcon?: string;
  placeholderText?: string;
  nombre?: string;
  style?: ViewStyle;
  userId?: string;
}

/**
 * MINI FOOD PLATE AVATAR v6.0 - Story system removed
 * Compact version of FoodPlateAvatar for use in posts, comments, etc.
 * Features:
 * - Smaller size optimized for inline use
 * - Default avatar with user icon (non-realistic)
 * - ALWAYS shows an avatar (never empty)
 */
export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 40,
  placeholderIcon = 'person.fill',
  placeholderText,
  nombre,
  style,
  userId,
}: MiniFoodPlateAvatarProps) {
  const plateSize = size;
  const imageSize = size * 0.85;
  const rimWidth = size * 0.06;

  const shouldShowImage = !!imageUrl;

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      <View
        style={[
          styles.plateBase,
          {
            width: plateSize,
            height: plateSize,
            borderRadius: plateSize / 2,
            borderWidth: rimWidth,
          },
        ]}
      >
        <View
          style={[
            styles.foodContainer,
            {
              width: imageSize,
              height: imageSize,
              borderRadius: imageSize / 2,
            },
          ]}
        >
          {shouldShowImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.foodImage,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.foodPlaceholder,
                {
                  width: imageSize,
                  height: imageSize,
                  borderRadius: imageSize / 2,
                },
              ]}
            >
              <IconSymbol
                ios_icon_name={DEFAULT_AVATAR_ICON}
                android_material_icon_name="account_circle"
                size={imageSize * 0.9}
                color={colors.primary}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateBase: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  foodImage: {
    backgroundColor: colors.cardBackground,
  },
  foodPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
