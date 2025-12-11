
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useStoryContext } from '@/contexts/StoryContext';

/**
 * ============================================================================
 * STORY AVATAR - INSTAGRAM-STYLE AVATAR WITH BORDER
 * ============================================================================
 * 
 * Built from scratch with maximum attention to detail.
 * 
 * Features:
 * - ✅ Neon green gradient border for unviewed stories
 * - ✅ Border disappears when all stories are viewed
 * - ✅ Uses StoryContext for consistent state management
 * - ✅ Real-time updates via context subscription
 * - ✅ Default avatar with user icon
 * - ✅ Touch gestures work correctly
 * - ✅ Optimized with memo for performance
 * - ✅ Larger avatars (92px) for better visibility
 */

// Neon green color for story borders (Instagram-style)
const NEON_GREEN = '#39FF14';

// Default avatar icon
const DEFAULT_AVATAR_ICON = 'person.circle.fill';

interface StoryAvatarProps {
  userId: string;
  userStories: any[];
  avatarUrl?: string;
  userName: string;
  size?: number;
  onPress: () => void;
  showLabel?: boolean;
  labelText?: string;
}

const StoryAvatar = memo(function StoryAvatar({
  userId,
  userStories,
  avatarUrl,
  userName,
  size = 92,
  onPress,
  showLabel = false,
  labelText,
}: StoryAvatarProps) {
  const { hasUnviewedStories, viewedStoryIds } = useStoryContext();
  
  // Instagram Logic: Check if user has unviewed stories
  const showGradientBorder = hasUnviewedStories(userId, userStories);
  
  console.log('[StoryAvatar] 🎨 Rendering:', {
    userId,
    userName,
    storiesCount: userStories.length,
    showGradientBorder,
    hasAvatar: !!avatarUrl,
    viewedStoriesCount: viewedStoryIds.size,
  });
  
  const ringSize = size + 8;
  const avatarSize = size - 4;
  const hasAvatar = !!avatarUrl;
  
  return (
    <TouchableOpacity
      style={[styles.container, { width: size }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessible={true}
      accessibilityLabel={`Ver historias de ${userName}`}
      accessibilityRole="button"
    >
      <View style={[styles.avatarWrapper, { width: ringSize, height: ringSize }]}>
        {showGradientBorder ? (
          // Neon green gradient for unviewed stories
          <LinearGradient
            colors={[NEON_GREEN, NEON_GREEN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.gradientRing,
              { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }
            ]}
          >
            <View
              style={[
                styles.innerRing,
                {
                  width: avatarSize + 4,
                  height: avatarSize + 4,
                  borderRadius: (avatarSize + 4) / 2
                }
              ]}
            >
              {hasAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[
                    styles.avatarImage,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
                  ]}
                >
                  <IconSymbol
                    ios_icon_name={DEFAULT_AVATAR_ICON}
                    android_material_icon_name="account_circle"
                    size={avatarSize * 0.8}
                    color={colors.primary}
                  />
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          // Neutral border for fully viewed stories
          <View
            style={[
              styles.viewedRing,
              { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }
            ]}
          >
            <View
              style={[
                styles.innerRing,
                {
                  width: avatarSize + 4,
                  height: avatarSize + 4,
                  borderRadius: (avatarSize + 4) / 2
                }
              ]}
            >
              {hasAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[
                    styles.avatarImage,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }
                  ]}
                >
                  <IconSymbol
                    ios_icon_name={DEFAULT_AVATAR_ICON}
                    android_material_icon_name="account_circle"
                    size={avatarSize * 0.8}
                    color={colors.primary}
                  />
                </View>
              )}
            </View>
          </View>
        )}
      </View>
      {showLabel && (
        <Text style={styles.label} numberOfLines={1}>
          {labelText || userName}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewedRing: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(200, 200, 200, 0.3)',
  },
  innerRing: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: colors.cardBackground,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    maxWidth: '100%',
  },
});

export default StoryAvatar;
