
import React, { memo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

interface StoryAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  viewed?: boolean;
}

// Instagram-style story outline colors
const STORY_OUTLINE_COLORS = ['#10B981', '#3B82F6']; // Green to Blue gradient
const VIEWED_OUTLINE_COLOR = colors.border;

const StoryAvatar = memo(function StoryAvatar({
  imageUrl,
  size = 64,
  hasStory = false,
  viewed = false,
}: StoryAvatarProps) {
  const avatarSize = size;
  const ringSize = size + 8;
  const borderRadius = size / 2;
  const ringBorderRadius = ringSize / 2;

  const showOutline = hasStory;
  const isViewed = viewed;

  return (
    <View style={[styles.container, { width: ringSize, height: ringSize }]}>
      <View style={[styles.avatarWrapper, { width: ringSize, height: ringSize }]}>
        {/* Story Ring */}
        {showOutline && !isViewed && (
          <LinearGradient
            colors={STORY_OUTLINE_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.storyRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringBorderRadius,
              },
            ]}
          />
        )}
        
        {/* Viewed Story Ring */}
        {showOutline && isViewed && (
          <View
            style={[
              styles.viewedRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringBorderRadius,
              },
            ]}
          />
        )}
        
        {/* Avatar Container */}
        <View
          style={[
            styles.avatarContainer,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius,
            },
          ]}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius,
                },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius,
                },
              ]}
            >
              <IconSymbol
                ios_icon_name="person.fill"
                android_material_icon_name="person"
                size={avatarSize * 0.5}
                color={colors.textSecondary}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  viewedRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: VIEWED_OUTLINE_COLOR,
  },
  avatarContainer: {
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
    position: 'absolute',
    top: 4,
    left: 4,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default StoryAvatar;
