
import React, { memo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useStoryState } from '@/contexts/StoryStateContext';

interface MiniFoodPlateAvatarProps {
  userId: string;
  userStories?: any[];
  avatarUrl?: string;
  size?: number;
  onPress?: () => void;
  showStoryOutline?: boolean;
}

// ✅ INSTAGRAM-STYLE: Consistent story outline color
const STORY_OUTLINE_COLORS = ['#10B981', '#3B82F6']; // Green to Blue gradient

const MiniFoodPlateAvatar = memo(function MiniFoodPlateAvatar({
  userId,
  userStories = [],
  avatarUrl,
  size = 40,
  onPress,
  showStoryOutline = true,
}: MiniFoodPlateAvatarProps) {
  const { hasUnviewedStories } = useStoryState();
  
  const hasActiveStories = userStories.length > 0;
  const showOutline = showStoryOutline && hasActiveStories && hasUnviewedStories(userId, userStories);

  const avatarSize = size;
  const ringSize = size + 6;
  const borderRadius = size / 2;
  const ringBorderRadius = ringSize / 2;

  const content = (
    <View style={[styles.container, { width: ringSize, height: ringSize }]}>
      <View style={[styles.avatarWrapper, { width: ringSize, height: ringSize }]}>
        {/* ✅ Story outline ring */}
        {showOutline && (
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
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
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

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
    right: 0,
    bottom: 0,
    margin: 'auto',
  },
  avatarContainer: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.background,
    overflow: 'hidden',
    position: 'absolute',
    top: 3,
    left: 3,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MiniFoodPlateAvatar;
