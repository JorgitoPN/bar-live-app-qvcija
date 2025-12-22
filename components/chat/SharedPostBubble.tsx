
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface SharedPostBubbleProps {
  postId: string;
  imageUrl?: string;
  content?: string;
  authorName?: string;
  authorAvatar?: string;
  isSender: boolean;
}

/**
 * ✅ SHARED POST BUBBLE v1.0
 * 
 * Purpose:
 * - Displays shared post preview in chat messages
 * - Clickable to navigate to full post
 * - Beautiful visual design
 * - Matches chat bubble style
 */

export default function SharedPostBubble({
  postId,
  imageUrl,
  content,
  authorName,
  authorAvatar,
  isSender,
}: SharedPostBubbleProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/social/post',
      params: { postId },
    });
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSender ? styles.containerSender : styles.containerReceiver,
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        {authorAvatar ? (
          <Image source={{ uri: authorAvatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={12} color={colors.white} />
          </View>
        )}
        <Text style={styles.authorName} numberOfLines={1}>
          {authorName || 'Usuario'}
        </Text>
      </View>

      {imageUrl && (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      )}

      {content && (
        <View style={styles.contentContainer}>
          <Text style={styles.content} numberOfLines={2}>
            {content}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={12} color={colors.primary} />
        <Text style={styles.footerText}>Toca para ver</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: 280,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  containerSender: {
    backgroundColor: colors.primary + '15',
  },
  containerReceiver: {
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 12,
  },
  content: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
});
