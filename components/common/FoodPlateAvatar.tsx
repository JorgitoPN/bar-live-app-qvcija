
import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

// ✅ DEFAULT AVATAR URL - Barlive branded default avatar
const DEFAULT_AVATAR_URL = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop';

interface FoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  isViewed?: boolean;
  showAddButton?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  style?: ViewStyle;
  nombre?: string; // ✅ For fallback display
}

/**
 * ✅ FOOD PLATE AVATAR v5.0 - FIXED IMAGE LOADING ON ANDROID
 * Features:
 * - Food plate design with rim and shadow
 * - Story ring support
 * - Default avatar with user's first letter OR default Barlive avatar
 * - Add button for creating stories
 * - ALWAYS shows an avatar (never empty)
 * - ✅ FIXED: Relaxed URL validation for Android compatibility
 * - ✅ FIXED: Handles Supabase storage URLs correctly
 * - ✅ FIXED: Shows images even if URL validation is uncertain
 * - ✅ FIXED: Better error handling with onError callback
 */
export default function FoodPlateAvatar({
  imageUrl,
  size = 88,
  hasStory = false,
  isViewed = false,
  showAddButton = false,
  placeholderIcon = 'person.fill',
  placeholderText,
  style,
  nombre,
}: FoodPlateAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const plateSize = size;
  const imageSize = size * 0.75; // Image is 75% of plate size
  const rimWidth = size * 0.08; // Rim is 8% of plate size
  const addButtonSize = size * 0.34; // Add button is 34% of plate size

  // ✅ CRITICAL FIX v5.0: More relaxed URL validation for Android
  // Accept any URL that looks like it could be an image
  const isValidUrl = imageUrl && !imageError && (
    imageUrl.startsWith('http://') || 
    imageUrl.startsWith('https://') ||
    imageUrl.startsWith('file://') ||
    imageUrl.includes('supabase') ||
    imageUrl.includes('storage') ||
    imageUrl.includes('amazonaws') ||
    imageUrl.includes('cloudinary') ||
    imageUrl.includes('unsplash')
  );
  
  const shouldShowImage = isValidUrl;
  const shouldShowLetter = !shouldShowImage && (placeholderText || nombre);
  const shouldShowDefaultAvatar = !shouldShowImage && !placeholderText && !nombre;

  console.log('[FoodPlateAvatar v5.0] 🖼️ Image decision:', {
    imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none',
    isValidUrl,
    imageError,
    shouldShowImage,
    shouldShowLetter,
    shouldShowDefaultAvatar,
  });

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
              onError={(error) => {
                console.log('[FoodPlateAvatar v5.0] ⚠️ Image failed to load:', imageUrl, error.nativeEvent.error);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('[FoodPlateAvatar v5.0] ✅ Image loaded successfully:', imageUrl?.substring(0, 50));
                setImageError(false);
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
                <View style={styles.placeholderTextBackground}>
                  <Text style={styles.placeholderTextInner}>
                    {(placeholderText || nombre || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
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
            <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={addButtonSize * 0.6} color={colors.white} />
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
    textAlign: 'center',
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
