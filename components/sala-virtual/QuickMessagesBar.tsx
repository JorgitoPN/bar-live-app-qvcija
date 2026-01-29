
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';

interface QuickMessage {
  id: string;
  contenido: string;
  categoria: string;
  emoji?: string;
  orden: number;
}

interface QuickMessagesBarProps {
  onSelectMessage: (message: string) => void;
}

export function QuickMessagesBar({ onSelectMessage }: QuickMessagesBarProps) {
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuickMessages();
  }, []);

  const loadQuickMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('sala_mensajes_predefinidos')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (error) {
        console.error('[QuickMessages] Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('[QuickMessages] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || messages.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {messages.map((message) => (
          <TouchableOpacity
            key={message.id}
            style={styles.messageButton}
            onPress={() => onSelectMessage(message.contenido)}
          >
            {message.emoji && (
              <Text style={styles.messageEmoji}>{message.emoji}</Text>
            )}
            <Text style={styles.messageText} numberOfLines={1}>
              {message.contenido}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  messageEmoji: {
    fontSize: 16,
  },
  messageText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    maxWidth: 150,
  },
});
