
import React from 'react';
import { View, Image, StyleSheet, ViewStyle, Text } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  placeholderIcon?: string;
  placeholderText?: string;
  style?: ViewStyle;
}

/**
 * Mini version of FoodPlateAvatar for use in post headers, comments, etc.
 * Maintains the food plate aesthetic at smaller sizes
 */
export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 42,
  placeholderIcon = 'person.fill',
  placeholderText,
  style,
}: MiniFoodPlateAvatarProps) {
  const plateSize = size;
  const imageSize = size * 0.75;
  const rimWidth = size * 0.08;

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      {/* Plate Base */}
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
        {/* Plate Rim Shadow */}
        <View
          style={[
            styles.plateRimShadow,
            {
              width: plateSize - rimWidth * 2,
              height: plateSize - rimWidth * 2,
              borderRadius: (plateSize - rimWidth * 2) / 2,
            },
          ]}
        />

        {/* Food/Image Container */}
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
          {imageUrl ? (
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
              {placeholderText ? (
                <Text style={[styles.placeholderText, { fontSize: imageSize * 0.5 }]}>
                  {placeholderText.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <IconSymbol
                  name={placeholderIcon}
                  size={imageSize * 0.5}
                  color={colors.textSecondary}
                />
              )}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plateRimShadow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
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
    backgroundColor: '#F5F5F5',
  },
  foodPlaceholder: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});
