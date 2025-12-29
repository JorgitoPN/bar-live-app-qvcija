
import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, Text, Platform } from 'react-native';
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
  nombre?: string;
}

/**
 * ✅ FOOD PLATE AVATAR v48.0 - NO WHITE BORDER + COMPLETE ANDROID-iOS PARITY
 * 
 * CRITICAL FIX v48.0:
 * - ✅ REMOVED white border completely
 * - ✅ Filter out file:// URLs that cause ENOENT errors on Android
 * - ✅ Removed overly strict URL validation
 * - ✅ Now accepts ANY non-empty string as a valid image URL (except file://)
 * - ✅ Relies on Image component's onError to handle invalid URLs
 * - ✅ Shows default avatar or letter fallback on error
 * - ✅ Works with Supabase storage URLs, AWS URLs, and any other image URLs
 * - ✅ ANDROID FIX: Added cache="reload" for better image loading
 * - ✅ ANDROID FIX: Added proper error handling with retry mechanism
 * - ✅ ANDROID FIX: Consistent image rendering across platforms
 * - ✅ ANDROID FIX: Proper avatar sizing and positioning
 * - ✅ Image fills entire circular area without gaps
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
  const [retryCount, setRetryCount] = useState(0);
  
  const plateSize = size;
  const imageSize = size;
  const addButtonSize = size * 0.34;

  // ✅ CRITICAL FIX v48.0: Filter out file:// URLs that cause ENOENT errors on Android
  const isValidImageUrl = imageUrl && !imageUrl.startsWith('file://');
  const shouldShowImage = !!(isValidImageUrl && !imageError);
  const shouldShowLetter = !shouldShowImage && (placeholderText || nombre);
  const shouldShowDefaultAvatar = !shouldShowImage && !placeholderText && !nombre;

  console.log('[FoodPlateAvatar v48.0] 🖼️ Image decision:', {
    imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none',
    isValidImageUrl,
    imageError,
    shouldShowImage,
    shouldShowLetter,
    shouldShowDefaultAvatar,
    platform: Platform.OS,
  });

  // ✅ ANDROID FIX: Retry mechanism for failed images
  const handleImageError = (error: any) => {
    console.log('[FoodPlateAvatar v48.0] ⚠️ Image failed to load:', imageUrl?.substring(0, 50), error.nativeEvent?.error);
    
    // Retry once on Android
    if (Platform.OS === 'android' && retryCount < 1) {
      console.log('[FoodPlateAvatar v48.0] 🔄 Retrying image load...');
      setRetryCount(retryCount + 1);
      setImageError(false);
      return;
    }
    
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('[FoodPlateAvatar v48.0] ✅ Image loaded successfully:', imageUrl?.substring(0, 50));
    setImageError(false);
    setRetryCount(0);
  };

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

      {/* ✅ CRITICAL FIX v48.0: Removed white border, image fills entire circle */}
      <View
        style={[
          styles.avatarCircle,
          {
            width: plateSize,
            height: plateSize,
            borderRadius: plateSize / 2,
          },
        ]}
      >
        {shouldShowImage ? (
          <Image
            key={`${imageUrl}-${retryCount}`}
            source={{ uri: imageUrl }}
            style={[
              styles.avatarImage,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
              },
            ]}
            resizeMode="cover"
            onError={handleImageError}
            onLoad={handleImageLoad}
            // ✅ ANDROID FIX: Use reload cache for better loading
            {...(Platform.OS === 'android' && { cache: 'reload' as any })}
          />
        ) : shouldShowLetter ? (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
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
              styles.avatarImage,
              {
                width: plateSize,
                height: plateSize,
                borderRadius: plateSize / 2,
              },
            ]}
            resizeMode="cover"
            // ✅ ANDROID FIX: Use reload cache for better loading
            {...(Platform.OS === 'android' && { cache: 'reload' as any })}
          />
        )}
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
  avatarCircle: {
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    zIndex: 1,
    // Avatar shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarImage: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
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
