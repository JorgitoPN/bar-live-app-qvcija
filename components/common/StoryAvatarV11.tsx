
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useStoryState } from '@/contexts/StoryStateContextV11';

// ✅ DEFAULT AVATAR ICON - Simple user icon (non-realistic)
const DEFAULT_AVATAR_ICON = 'person.circle.fill';

// ✅ NEON GREEN COLOR - Phosphorescent green for story borders (Instagram-style)
const NEON_GREEN = '#39FF14';

interface StoryAvatarV11Props {
  userId: string;
  userStories: any[];
  avatarUrl?: string;
  userName: string;
  size?: number;
  onPress: () => void;
  showLabel?: boolean;
  labelText?: string;
}

/**
 * ✅ STORY AVATAR V11.2.1 - COMPLETE INSTAGRAM-STYLE AVATAR WITH BORDER
 * 
 * CRITICAL FIXES:
 * - ✅ Removed custom memo comparison - now uses default shallow comparison
 * - ✅ Added viewedStoryIds dependency to force re-renders
 * - ✅ Improved logging for debugging
 * - ✅ Better touch event handling
 * 
 * Features:
 * - ✅ NEON GREEN gradient border for unviewed stories
 * - ✅ Border DISAPPEARS when all stories are viewed (Instagram logic)
 * - ✅ Uses StoryStateContextV11 for consistent state management
 * - ✅ Real-time updates via context subscription
 * - ✅ Default avatar with user icon (non-realistic)
 * - ✅ TOUCH GESTURES WORK CORRECTLY
 * - ✅ Larger avatars (92px default) for better visibility
 */
const StoryAvatarV11 = memo(function StoryAvatarV11({
  userId,
  userStories,
  avatarUrl,
  userName,
  size = 92,
  onPress,
  showLabel = false,
  labelText,
}: StoryAvatarV11Props) {
  const { hasUnviewedStories, viewedStoryIds } = useStoryState();

  // ✅ INSTAGRAM LOGIC: Check if user has unviewed stories
  const showGradientBorder = hasUnviewedStories(userId, userStories);

  console.log('[StoryAvatarV11.2.1] 🎨 Rendering story avatar:', {
    userId,
    userName,
    storiesCount: userStories.length,
    showGradientBorder,
    hasAvatar: !!avatarUrl,
    viewedStoriesCount: viewedStoryIds.size,
  });

  const ringSize = size + 8;
  const avatarSize = size - 4;

  // ✅ Check if avatar exists
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
          // ✅ NEON GREEN GRADIENT for unviewed stories (Instagram-style)
          <LinearGradient
            colors={[NEON_GREEN, NEON_GREEN]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
          >
            <View style={[styles.innerRing, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]}>
              {hasAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
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
          // ✅ INSTAGRAM LOGIC: Neutral border for fully viewed stories
          <View style={[styles.viewedRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
            <View style={[styles.innerRing, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]}>
              {hasAvatar ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
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

export default StoryAvatarV11;
