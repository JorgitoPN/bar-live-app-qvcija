
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
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

export default function MessageBubble({ message, isOwn, otroUsuario, onLongPress }: MessageBubbleProps) {
  const router = useRouter();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // ✅ FIX 1: Redirect to Social Feed instead of standalone post page
  const handlePostPress = () => {
    if (message.post_compartido_id) {
      console.log('[MessageBubble] 🔄 Navigating to Social Feed with post:', message.post_compartido_id);
      // Navigate to Social Feed tab with post ID parameter
      router.push(`/(tabs)/social?postId=${message.post_compartido_id}`);
    }
  };

  const renderContent = () => {
    if (message.tipo_mensaje === 'post_compartido' && message.post_compartido_id) {
      return (
        <View style={styles.sharedPostContainer}>
          {message.post_imagen && (
            <TouchableOpacity onPress={handlePostPress} activeOpacity={0.8}>
              <Image 
                source={{ uri: message.post_imagen }} 
                style={styles.postSnapshot}
                resizeMode="cover"
              />
              <View style={styles.snapshotOverlay}>
                <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="open_in_new" size={20} color="#fff" />
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
  postSnapshot: {
    width: 200,
    height: 200,
    borderRadius: 12,
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
