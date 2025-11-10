
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

interface Message {
  id: string;
  chat_id: string;
  remitente_id: string;
  contenido: string;
  tipo_mensaje: 'texto' | 'post_compartido' | 'imagen';
  post_compartido_id?: string;
  leido: boolean;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  otroUsuario?: {
    nombre: string;
    avatar?: string;
  };
}

export default function MessageBubble({ message, isOwn, otroUsuario }: MessageBubbleProps) {
  const router = useRouter();

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePostPress = () => {
    if (message.post_compartido_id) {
      router.push(`/social/post?id=${message.post_compartido_id}`);
    }
  };

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      {!isOwn && otroUsuario?.avatar && (
        <Image source={{ uri: otroUsuario.avatar }} style={styles.avatar} />
      )}
      
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {message.tipo_mensaje === 'post_compartido' ? (
          <TouchableOpacity onPress={handlePostPress}>
            <View style={styles.sharedPost}>
              <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
                {message.contenido}
              </Text>
              <Text style={styles.sharedPostLabel}>Ver publicación →</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.messageText, isOwn ? styles.ownText : styles.otherText]}>
            {message.contenido}
          </Text>
        )}
        
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isOwn ? styles.ownTimeText : styles.otherTimeText]}>
            {formatTime(message.created_at)}
          </Text>
          {isOwn && (
            <Text style={styles.readStatus}>{message.leido ? '✓✓' : '✓'}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownContainer: {
    justifyContent: 'flex-end',
  },
  otherContainer: {
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownText: {
    color: colors.headerText,
  },
  otherText: {
    color: colors.text,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 11,
  },
  ownTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimeText: {
    color: colors.textSecondary,
  },
  readStatus: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sharedPost: {
    gap: 8,
  },
  sharedPostLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textDecorationLine: 'underline',
  },
});
