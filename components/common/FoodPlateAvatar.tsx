
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface FoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  isViewed?: boolean;
  showAddButton?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  style?: ViewStyle;
}

export default function FoodPlateAvatar({
  imageUrl,
  size = 88,
  hasStory = false,
  isViewed = false,
  showAddButton = false,
  placeholderIcon = 'person.fill',
  placeholderText,
  style,
}: FoodPlateAvatarProps) {
  const plateSize = size;
  const imageSize = size * 0.75; // Image is 75% of plate size
  const rimWidth = size * 0.08; // Rim is 8% of plate size
  const addButtonSize = size * 0.34; // Add button is 34% of plate size

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      {/* Story Ring (if has story) */}
      {hasStory && !isViewed && (
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.storyRing,
            {
              width: plateSize + 8,
              height: plateSize + 8,
              borderRadius: (plateSize + 8) / 2,
              top: -4,
              left: -4,
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
                  <View style={styles.placeholderTextBackground}>
                    <View style={styles.placeholderTextInner}>
                      {placeholderText.charAt(0).toUpperCase()}
                    </View>
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

      {/* Add Button (if showAddButton) */}
      {showAddButton && (
        <View
          style={[
            styles.addButtonContainer,
            {
              width: addButtonSize,
              height: addButtonSize,
              borderRadius: addButtonSize / 2,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.addButtonGradient,
              {
                width: addButtonSize,
                height: addButtonSize,
                borderRadius: addButtonSize / 2,
              },
            ]}
          >
            <IconSymbol name="plus" size={addButtonSize * 0.6} color={colors.white} />
          </LinearGradient>
        </View>
      )}
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
  },
  plateBase: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    // Plate shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  plateRimShadow: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  foodContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    // Food shadow (inner)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  placeholderTextBackground: {
    width: '80%',
    height: '80%',
    borderRadius: 1000,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderTextInner: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  addButtonContainer: {
    position: 'absolute',
    zIndex: 3,
    // Button shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonGradient: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
