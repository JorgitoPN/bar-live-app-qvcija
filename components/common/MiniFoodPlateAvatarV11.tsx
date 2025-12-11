
import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useStoryContext } from '@/contexts/StoryContext';

// ✅ DEFAULT AVATAR ICON - Simple user icon (non-realistic)
const DEFAULT_AVATAR_ICON = 'person.circle.fill';

// ✅ NEON GREEN COLOR - Phosphorescent green for story borders
const NEON_GREEN = '#39FF14';

interface MiniFoodPlateAvatarV11Props {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  placeholderIcon?: string;
  placeholderText?: string;
  nombre?: string;
  style?: ViewStyle;
  userId?: string;
  userStories?: any[];
}

/**
 * ✅ MINI FOOD PLATE AVATAR V11.0.6 - FIXED TOUCH GESTURES
 * 
 * FIXES IN V11.0.6:
 * - ✅ CRITICAL FIX: Added pointerEvents="none" to prevent blocking touches
 * - ✅ Improved rendering performance
 * 
 * Features:
 * - ✅ Smaller size optimized for inline use
 * - ✅ NEON GREEN border for unviewed stories (Instagram logic)
 * - ✅ Border DISAPPEARS when all stories are viewed (Instagram logic)
 * - ✅ Default avatar with user icon (non-realistic)
 * - ✅ ALWAYS shows an avatar (never empty)
 * - ✅ Uses StoryContext for consistent state management
 * - ✅ Real-time updates via context subscription
 * - ✅ DOES NOT BLOCK TOUCH EVENTS
 */
export default function MiniFoodPlateAvatarV11({
  imageUrl,
  size = 48,
  hasStory = false,
  placeholderIcon = 'person.fill',
  placeholderText,
  nombre,
  style,
  userId,
  userStories = [],
}: MiniFoodPlateAvatarV11Props) {
  const { hasUnviewedStories } = useStoryContext();

  const plateSize = size;
  const imageSize = size * 0.85; // Image is 85% of plate size for mini version
  const rimWidth = size * 0.06; // Rim is 6% of plate size

  // ✅ INSTAGRAM LOGIC: Check if user has unviewed stories
  const showStoryRing = hasStory && userId && userStories.length > 0 
    ? hasUnviewedStories(userId, userStories)
    : false;

  console.log('[MiniFoodPlateAvatarV11] 🎨 V11.0.6 - Rendering avatar:', {
    userId,
    hasStory,
    storiesCount: userStories.length,
    showStoryRing,
    imageUrl: !!imageUrl,
  });

  // ✅ Determine what to show
  const shouldShowImage = !!imageUrl;

  return (
    <View 
      style={[styles.container, { width: plateSize, height: plateSize }, style]}
      pointerEvents="none"
    >
      {/* ✅ INSTAGRAM-STYLE: NEON GREEN Story Ring (only if unviewed) */}
      {showStoryRing && (
        <LinearGradient
          colors={[NEON_GREEN, NEON_GREEN]}
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
          pointerEvents="none"
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
        pointerEvents="none"
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
          pointerEvents="none"
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
              pointerEvents="none"
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
              pointerEvents="none"
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
    backgroundColor: colors.cardBackground,
  },
  foodPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
