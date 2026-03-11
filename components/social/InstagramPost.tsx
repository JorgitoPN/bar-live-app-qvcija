
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ImageSourcePropType,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface InstagramPostProps {
  username: string;
  userAvatar?: string;
  images: string[];
  caption?: string;
  likes: number;
  comments: number;
  timestamp: string;
  location?: string;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onUserPress?: () => void;
  isLiked?: boolean;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

export default function InstagramPost({
  username,
  userAvatar,
  images,
  caption,
  likes,
  comments,
  timestamp,
  location,
  onLike,
  onComment,
  onShare,
  onUserPress,
  isLiked = false,
}: InstagramPostProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      const millions = num / 1000000;
      return `${millions.toFixed(1)}M`;
    }
    if (num >= 1000) {
      const thousands = num / 1000;
      return `${thousands.toFixed(1)}K`;
    }
    return num.toString();
  };

  const likesText = formatNumber(likes);
  const commentsText = formatNumber(comments);
  const timeText = formatTimestamp(timestamp);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={onUserPress}>
          <Image
            source={resolveImageSource(userAvatar || 'https://via.placeholder.com/40')}
            style={styles.avatar}
          />
          <View style={styles.userTextContainer}>
            <Text style={styles.username}>{username}</Text>
            {location && <Text style={styles.location}>{location}</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <IconSymbol
            ios_icon_name="ellipsis"
            android_material_icon_name="more-vert"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Image Carousel */}
      <View style={styles.imageContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {images.map((image, index) => (
            <Image
              key={index}
              source={resolveImageSource(image)}
              style={styles.postImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Image Indicators */}
        {images.length > 1 && (
          <View style={styles.indicatorContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <View style={styles.leftActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onLike}>
            <IconSymbol
              ios_icon_name={isLiked ? 'heart.fill' : 'heart'}
              android_material_icon_name={isLiked ? 'favorite' : 'favorite-border'}
              size={28}
              color={isLiked ? '#FF3B30' : colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onComment}>
            <IconSymbol
              ios_icon_name="bubble.right"
              android_material_icon_name="chat-bubble-outline"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onShare}>
            <IconSymbol
              ios_icon_name="paperplane"
              android_material_icon_name="send"
              size={28}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.bookmarkButton}>
          <IconSymbol
            ios_icon_name="bookmark"
            android_material_icon_name="bookmark-border"
            size={28}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Likes Count */}
      <View style={styles.likesContainer}>
        <Text style={styles.likesText}>{likesText} Me gusta</Text>
      </View>

      {/* Caption */}
      {caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>
            <Text style={styles.captionUsername}>{username}</Text>
            <Text> {caption}</Text>
          </Text>
        </View>
      )}

      {/* Comments Preview */}
      {comments > 0 && (
        <TouchableOpacity style={styles.commentsPreview} onPress={onComment}>
          <Text style={styles.commentsText}>Ver los {commentsText} comentarios</Text>
        </TouchableOpacity>
      )}

      {/* Timestamp */}
      <View style={styles.timestampContainer}>
        <Text style={styles.timestampText}>{timeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  location: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  postImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    backgroundColor: '#f0f0f0',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeIndicator: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
    padding: 4,
  },
  bookmarkButton: {
    padding: 4,
  },
  likesContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  captionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  captionUsername: {
    fontWeight: '600',
  },
  commentsPreview: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  commentsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timestampContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  timestampText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
