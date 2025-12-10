
import React from 'react';
import { View, Image, StyleSheet, ViewStyle, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

// ✅ DEFAULT AVATAR URL - Barlive branded default avatar
const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  isViewed?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  nombre?: string;
  style?: ViewStyle;
}

/**
 * ✅ MINI FOOD PLATE AVATAR v3.0
 * Compact version of FoodPlateAvatar for use in posts, comments, etc.
 * Features:
 * - Smaller size optimized for inline use
 * - Story ring support
 * - Default avatar with user's first letter OR default Barlive avatar
 * - Fallback to icon if no name available
 * - ALWAYS shows an avatar (never empty)
 */
export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 40,
  hasStory = false,
  isViewed = false,
  placeholderIcon = 'person.fill',
  placeholderText,
  nombre,
  style,
}: MiniFoodPlateAvatarProps) {
  const plateSize = size;
  const imageSize = size * 0.85; // Image is 85% of plate size for mini version
  const rimWidth = size * 0.06; // Rim is 6% of plate size

  // ✅ FIXED: Determine what to show
  const shouldShowImage = !!imageUrl;
  const shouldShowLetter = !imageUrl && (placeholderText || nombre);
  const shouldShowDefaultAvatar = !imageUrl && !placeholderText && !nombre;

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
              onError={() => {
                console.log('[MiniFoodPlateAvatar] ⚠️ Image failed to load, will show fallback');
              }}
            />
          ) : shouldShowLetter ? (
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
              <View style={styles.placeholderTextContainer}>
                <Text style={[styles.placeholderText, { fontSize: size * 0.4 }]}>
                  {(placeholderText || nombre || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: DEFAULT_AVATAR_URL }}
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
    backgroundColor: colors.primary + '20',
  },
  placeholderText: {
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
});
