
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useStoryContext } from '@/contexts/StoryContext';

interface StoryAvatarProps {
  userId: string;
  userStories: any[];
  avatarUrl?: string;
  userName: string;
  size?: number;
  onPress: () => void;
  showLabel?: boolean;
}

const StoryAvatar = memo(function StoryAvatar({
  userId,
  userStories,
  avatarUrl,
  userName,
  size = 80,
  onPress,
  showLabel = true,
}: StoryAvatarProps) {
  const { hasUnviewedStories } = useStoryContext();

  const showBorder = hasUnviewedStories(userId, userStories);
  const ringSize = size + 8;
  const avatarSize = size - 4;

  return (
    <TouchableOpacity 
      style={[styles.container, { width: size }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatarWrapper, { width: ringSize, height: ringSize }]}>
        {showBorder ? (
          <LinearGradient
            colors={['#39FF14', '#00D9FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}
          >
            <View style={[styles.innerRing, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                  <IconSymbol
                    ios_icon_name="person.circle.fill"
                    android_material_icon_name="account_circle"
                    size={avatarSize * 0.8}
                    color={colors.primary}
                  />
                </View>
              )}
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.viewedRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
            <View style={[styles.innerRing, { width: avatarSize + 4, height: avatarSize + 4, borderRadius: (avatarSize + 4) / 2 }]}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[styles.avatarImage, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                  <IconSymbol
                    ios_icon_name="person.circle.fill"
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
          {userName}
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
