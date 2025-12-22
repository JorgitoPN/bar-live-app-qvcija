
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';

interface Message {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  tipo_mensaje: 'texto' | 'post_compartido' | 'imagen';
  post_compartido_id?: string;
  post_imagen?: string;
  leido: boolean;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  otroUsuario?: any;
  onLongPress?: () => void;
}

/**
 * ✅ MESSAGE BUBBLE v3.1 - FIXED IMAGE LOADING ERROR
 * 
 * FIXES APPLIED:
 * - ✅ FIXED: Better error handling for corrupted/invalid image URLs
 * - ✅ FIXED: Fallback to placeholder when image fails to load
 * - ✅ FIXED: Added image validation before attempting to load
 * - ✅ OPTIMIZED: Instant navigation to Social Feed with post ID
 */

export default function MessageBubble({ message, isOwn, otroUsuario, onLongPress }: MessageBubbleProps) {
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // ✅ OPTIMIZED: Instant navigation to Social Feed with post ID
  const handlePostPress = () => {
    if (message.post_compartido_id) {
      console.log('[MessageBubble] 🚀 Navigating to Social Feed with post:', message.post_compartido_id);
      // Navigate to Social Feed tab with post ID parameter for instant loading
      router.push(`/(tabs)/social?postId=${message.post_compartido_id}`);
    }
  };

  // ✅ FIXED: Validate image URL before attempting to load
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) {
      console.log('[MessageBubble] ⚠️ No URL provided');
      return false;
    }
    
    // Check if it's a data URL (base64)
    if (url.startsWith('data:image/')) {
      console.log('[MessageBubble] ⚠️ Data URL detected, skipping (not supported)');
      return false;
    }
    
    try {
      // Check if it's a valid URL
      const urlObj = new URL(url);
      // Check if it has a valid protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        console.log('[MessageBubble] ⚠️ Invalid protocol:', urlObj.protocol);
        return false;
      }
      // Check if it has a valid image extension or is from Supabase storage
      const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url);
      const isSupabaseStorage = url.includes('supabase.co/storage') || url.includes('supabase');
      const isValid = hasImageExtension || isSupabaseStorage;
      
      if (!isValid) {
        console.log('[MessageBubble] ⚠️ URL validation failed:', {
          url,
          hasImageExtension,
          isSupabaseStorage,
        });
      }
      
      return isValid;
    } catch (error) {
      console.error('[MessageBubble] ❌ Invalid image URL:', url, error);
      return false;
    }
  };

  const renderContent = () => {
    if (message.tipo_mensaje === 'post_compartido' && message.post_compartido_id) {
      const hasValidImage = isValidImageUrl(message.post_imagen);
      
      console.log('[MessageBubble] 🖼️ Rendering shared post:', {
        postId: message.post_compartido_id,
        hasImage: !!message.post_imagen,
        imageUrl: message.post_imagen,
        isValidUrl: hasValidImage,
        imageError,
        imageLoading,
      });
      
      return (
        <View style={styles.sharedPostContainer}>
          {hasValidImage && !imageError ? (
            <TouchableOpacity onPress={handlePostPress} activeOpacity={0.8}>
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                )}
                <Image 
                  source={{ uri: message.post_imagen }} 
                  style={styles.postSnapshot}
                  resizeMode="cover"
                  onLoadStart={() => {
                    console.log('[MessageBubble] 🔄 Image loading started');
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoad={() => {
                    console.log('[MessageBubble] ✅ Image loaded successfully');
                    setImageLoading(false);
                    setImageError(false);
                  }}
                  onError={(error) => {
                    console.error('[MessageBubble] ❌ Image load error:', error.nativeEvent);
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                {!imageLoading && !imageError && (
                  <View style={styles.snapshotOverlay}>
                    <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="open_in_new" size={20} color="#fff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handlePostPress} activeOpacity={0.8} style={styles.postSnapshotPlaceholder}>
              <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={48} color="rgba(255, 255, 255, 0.5)" />
              <Text style={styles.postSnapshotPlaceholderText}>
                {imageError ? 'Error al cargar imagen' : !hasValidImage ? 'Publicación compartida' : 'Publicación compartida'}
              </Text>
              <View style={styles.tapToViewBadge}>
                <IconSymbol ios_icon_name="hand.tap" android_material_icon_name="touch_app" size={14} color={colors.primary} />
                <Text style={styles.tapToViewText}>Toca para ver</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {message.contenido}
          </Text>
        </View>
      );
    }

    return (
      <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
        {message.contenido}
      </Text>
    );
  };

  return (
    <Pressable
      style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      {!isOwn && otroUsuario?.avatar && (
        <Image source={{ uri: otroUsuario.avatar }} style={styles.avatar} />
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {renderContent()}
        <View style={styles.footer}>
          <Text style={[styles.time, isOwn && styles.timeOwn]}>
            {formatTime(message.created_at)}
          </Text>
          {isOwn && (
            <IconSymbol
              ios_icon_name={message.leido ? 'checkmark.circle.fill' : 'checkmark.circle'}
              android_material_icon_name={message.leido ? 'check_circle' : 'check_circle_outline'}
              size={14}
              color={message.leido ? '#10B981' : 'rgba(255, 255, 255, 0.6)'}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  containerOwn: {
    justifyContent: 'flex-end',
  },
  containerOther: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  messageTextOwn: {
    color: colors.headerText,
  },
  sharedPostContainer: {
    gap: 8,
  },
  imageContainer: {
    position: 'relative',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 1,
  },
  postSnapshot: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  postSnapshotPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    gap: 8,
  },
  postSnapshotPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  tapToViewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  tapToViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  snapshotOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  timeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
