
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { parseText, ParsedSegment } from '@/utils/textParser';

interface ParsedTextProps {
  text: string;
  style?: any;
  onHashtagPress?: (hashtag: string) => void;
  onMentionPress?: (mention: string) => void;
}

export default function ParsedText({ text, style, onHashtagPress, onMentionPress }: ParsedTextProps) {
  const router = useRouter();
  const segments = parseText(text);

  const handleHashtagPress = (hashtag: string) => {
    console.log('[ParsedText] Hashtag pressed:', hashtag);
    if (onHashtagPress) {
      onHashtagPress(hashtag);
    } else {
      // Default: navigate to hashtag search page
      router.push(`/social/hashtag?tag=${encodeURIComponent(hashtag)}`);
    }
  };

  const handleMentionPress = async (mention: string) => {
    console.log('[ParsedText] Mention pressed:', mention);
    if (onMentionPress) {
      onMentionPress(mention);
    } else {
      // Default: try to find and navigate to user profile
      // For now, we'll just log it - you can implement user lookup here
      console.log('[ParsedText] Navigate to user:', mention);
    }
  };

  return (
    <Text style={style}>
      {segments.map((segment: ParsedSegment, index: number) => {
        if (segment.type === 'hashtag') {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleHashtagPress(segment.value!)}
              activeOpacity={0.7}
            >
              <Text style={[style, styles.hashtag]}>{segment.content}</Text>
            </TouchableOpacity>
          );
        } else if (segment.type === 'mention') {
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleMentionPress(segment.value!)}
              activeOpacity={0.7}
            >
              <Text style={[style, styles.mention]}>{segment.content}</Text>
            </TouchableOpacity>
          );
        } else {
          return <Text key={index}>{segment.content}</Text>;
        }
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  hashtag: {
    color: colors.primary,
    fontWeight: '600',
  },
  mention: {
    color: colors.secondary,
    fontWeight: '600',
  },
});
