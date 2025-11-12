
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { isStoryExpired, getExpiredStoryText } from '@/utils/storyMessageCleanup';

interface Message {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  tipo_mensaje: 'texto' | 'post_compartido' | 'imagen' | 'historia';
  post_compartido_id?: string;
  historia_id?: string;
  historia_imagen?: string;
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
  const [storyExpired, setStoryExpired] = useState(false);

  useEffect(() => {
    // Check if story has expired
    if (message.historia_id && message.historia_imagen) {
      isStoryExpired(message.historia_id).then(expired => {
        setStoryExpired(expired);
      });
    }
  }, [message.historia_id, message.historia_imagen]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderContent = () => {
    // Story message
    if (message.tipo_mensaje === 'historia' || message.historia_id) {
      if (storyExpired || !message.historia_imagen) {
        return (
          <View style={styles.expiredStoryContainer}>
            <IconSymbol name="exclamationmark.triangle" size={20} color={colors.textSecondary} />
            <Text style={styles.expiredStoryText}>{getExpiredStoryText()}</Text>
          </View>
        );
      }

      return (
        <View style={styles.storyContainer}>
          <Image 
            source={{ uri: message.historia_imagen }} 
            style={styles.storyImage}
            resizeMode="cover"
          />
          {message.contenido && (
            <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
              {message.contenido}
            </Text>
          )}
        </View>
      );
    }

    // Regular text message
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
              name={message.leido ? 'checkmark.circle.fill' : 'checkmark.circle'}
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
  storyContainer: {
    gap: 8,
  },
  storyImage: {
    width: 200,
    height: 300,
    borderRadius: 12,
  },
  expiredStoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  expiredStoryText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.textSecondary,
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
