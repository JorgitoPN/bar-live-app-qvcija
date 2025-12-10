
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useStoryState } from '@/contexts/StoryStateContextV10';

// ✅ DEFAULT AVATAR ICON - Simple user icon (non-realistic)
const DEFAULT_AVATAR_ICON = 'person.circle.fill';

// ✅ NEON GREEN COLOR - Phosphorescent green for story borders
const NEON_GREEN = '#39FF14';

interface StoryAvatarV10Props {
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
 * ✅ STORY AVATAR V10.0 - Instagram-style story avatar with dynamic border
 * 
 * Features:
 * - ✅ NEON GREEN gradient border for unviewed stories
 * - ✅ Border DISAPPEARS when all stories are viewed (Instagram logic)
 * - ✅ Uses StoryStateContext for consistent state management
 * - ✅ Real-time updates via context subscription
 * - ✅ Default avatar with user icon (non-realistic)
 * - ✅ Optimized with memo for performance
 */
const StoryAvatarV10 = memo(function StoryAvatarV10({
  userId,
  userStories,
  avatarUrl,
  userName,
  size = 92,
  onPress,
  showLabel = false,
  labelText,
}: StoryAvatarV10Props) {
  const { hasUnviewedStories } = useStoryState();

  // ✅ INSTAGRAM LOGIC: Check if user has unviewed stories
  const showGradientBorder = hasUnviewedStories(userId, userStories);

  console.log('[StoryAvatarV10] 🎨 Rendering story avatar:', {
    userId,
    userName,
    storiesCount: userStories.length,
    showGradientBorder,
    hasAvatar: !!avatarUrl,
  });

  const ringSize = size + 8;
  const avatarSize = size - 4;

  // ✅ FIXED: Check if avatar exists
  const hasAvatar = !!avatarUrl;

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size }]} 
      onPress={onPress}
      activeOpacity={0.7}
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
}, (prevProps, nextProps) => {
  // ✅ OPTIMIZED: Only re-render if essential props change
  return (
    prevProps.userId === nextProps.userId &&
    prevProps.userStories.length === nextProps.userStories.length &&
    prevProps.avatarUrl === nextProps.avatarUrl &&
    prevProps.userName === nextProps.userName &&
    prevProps.size === nextProps.size &&
    prevProps.showLabel === nextProps.showLabel &&
    prevProps.labelText === nextProps.labelText
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

export default StoryAvatarV10;
