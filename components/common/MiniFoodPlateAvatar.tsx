
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  isViewed?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  style?: ViewStyle;
}

export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 42,
  hasStory = false,
  isViewed = false,
  placeholderIcon = 'person.fill',
  placeholderText,
  style,
}: MiniFoodPlateAvatarProps) {
  const plateSize = size;
  const imageSize = size * 0.72; // Image is 72% of plate size
  const rimWidth = size * 0.08; // Rim is 8% of plate size

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      {/* Story Ring (if has story) */}
      {hasStory && !isViewed && (
        <View
          style={[
            styles.storyRing,
            {
              width: plateSize + 4,
              height: plateSize + 4,
              borderRadius: (plateSize + 4) / 2,
              top: -2,
              left: -2,
            },
          ]}
        />
      )}

      {/* Plate Base (outer circle) */}
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

        {/* Food/Image Container (inner circle) */}
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
                <View style={styles.placeholderTextContainer}>
                  <View style={[styles.placeholderTextInner, { fontSize: imageSize * 0.4 }]}>
                    {placeholderText.charAt(0).toUpperCase()}
                  </View>
                </View>
              ) : (
                <IconSymbol
                  name={placeholderIcon}
                  size={imageSize * 0.45}
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
  storyRing: {
    position: 'absolute',
    zIndex: 0,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  plateBase: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    // Plate shadow
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
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  foodContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    // Food shadow (inner)
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
  placeholderTextContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTextInner: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});
