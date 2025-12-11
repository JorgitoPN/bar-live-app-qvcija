
import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useStoryContext } from '@/contexts/StoryContext';

interface MiniFoodPlateAvatarProps {
  imageUrl?: string;
  size?: number;
  hasStory?: boolean;
  style?: ViewStyle;
  userId?: string;
  userStories?: any[];
}

export default function MiniFoodPlateAvatar({
  imageUrl,
  size = 48,
  hasStory = false,
  style,
  userId,
  userStories = [],
}: MiniFoodPlateAvatarProps) {
  const { hasUnviewedStories } = useStoryContext();

  const plateSize = size;
  const imageSize = size * 0.85;
  const rimWidth = size * 0.06;

  const showStoryRing = hasStory && userId && userStories.length > 0 
    ? hasUnviewedStories(userId, userStories)
    : false;

  return (
    <View style={[styles.container, { width: plateSize, height: plateSize }, style]}>
      {showStoryRing && (
        <LinearGradient
          colors={['#39FF14', '#00D9FF']}
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
        />
      )}

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
          {imageUrl ? (
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
            >
              <IconSymbol
                ios_icon_name="person.circle.fill"
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  foodContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
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
