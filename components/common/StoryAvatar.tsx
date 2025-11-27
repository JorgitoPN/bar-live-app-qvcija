
import React, { memo } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useStoryState } from '@/contexts/StoryStateContext';

interface StoryAvatarProps {
  userId: string;
  userStories: any[];
  avatarUrl?: string;
  userName: string;
  size?: number;
  onPress?: () => void;
  showLabel?: boolean;
  labelText?: string;
}

// ✅ INSTAGRAM-STYLE: Consistent story outline color across all components
const STORY_OUTLINE_COLORS = ['#10B981', '#3B82F6']; // Green to Blue gradient

const StoryAvatar = memo(function StoryAvatar({
  userId,
  userStories,
  avatarUrl,
  userName,
  size = 64,
  onPress,
  showLabel = false,
  labelText,
}: StoryAvatarProps) {
  const { hasUnviewedStories } = useStoryState();
  
  const hasActiveStories = userStories.length > 0;
  const showOutline = hasActiveStories && hasUnviewedStories(userId, userStories);

  const avatarSize = size;
  const ringSize = size + 8;
  const borderRadius = size / 2;
  const ringBorderRadius = ringSize / 2;

  return (
    <TouchableOpacity
      style={[styles.container, { width: ringSize, height: ringSize }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!hasActiveStories || !onPress}
    >
      <View style={styles.avatarWrapper}>
        {/* ✅ FIXED: Perfect centering - ring is positioned absolutely and centered */}
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
                color={colors.headerText}
              />
            </View>
          )}
        </View>
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
    justifyContent: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    position: 'absolute',
    // ✅ FIXED: Perfect centering - no transform needed, just center with absolute positioning
    top: 0,
    left: 0,
  },
  avatarContainer: {
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.background,
    overflow: 'hidden',
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
  label: {
    marginTop: 4,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 72,
  },
});

export default StoryAvatar;
