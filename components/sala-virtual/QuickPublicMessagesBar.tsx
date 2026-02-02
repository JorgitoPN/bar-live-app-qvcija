
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { scaleFontSize } from '@/utils/androidScaling';

interface QuickMessage {
  id: string;
  text: string;
  emoji: string;
}

interface QuickPublicMessagesBarProps {
  onSelectMessage: (message: string) => void;
  themeColors: any;
}

const QUICK_PUBLIC_MESSAGES: QuickMessage[] = [
  { id: 'q1', text: '¡Salud a todos! 🍻', emoji: '🍻' },
  { id: 'q2', text: '¡Vaya temazo está sonando! 🎶', emoji: '🎶' },
  { id: 'q3', text: '¡Qué ambientazo hay hoy! 🔥', emoji: '🔥' },
  { id: 'q4', text: '¿Quién se pide la siguiente ronda? 🍺', emoji: '🍺' },
];

export function QuickPublicMessagesBar({ onSelectMessage, themeColors }: QuickPublicMessagesBarProps) {
  return (
    <View style={[styles.container, { backgroundColor: themeColors.cardBg, borderTopColor: themeColors.cardBorder }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_PUBLIC_MESSAGES.map((msg) => (
          <TouchableOpacity
            key={msg.id}
            style={[styles.messageButton, { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary + '40' }]}
            onPress={() => onSelectMessage(msg.text)}
            activeOpacity={0.7}
          >
            <Text style={styles.messageEmoji}>{msg.emoji}</Text>
            <Text style={[styles.messageText, { fontSize: scaleFontSize(13), color: themeColors.text }]}>
              {msg.text}
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
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
  },
  messageEmoji: {
    fontSize: 18,
  },
  messageText: {
    fontWeight: '600',
  },
});
