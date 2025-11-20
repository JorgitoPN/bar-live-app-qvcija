
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export interface HashtagSuggestion {
  id: string;
  tag: string;
  uso_count: number;
}

interface HashtagAutocompleteProps {
  text: string;
  cursorPosition: number;
  onSelectHashtag: (hashtag: string, hashtagText: string) => void;
  style?: any;
}

export default function HashtagAutocomplete({
  text,
  cursorPosition,
  onSelectHashtag,
  style,
}: HashtagAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentHashtagText, setCurrentHashtagText] = useState<string | null>(null);

  const detectHashtag = useCallback(() => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastHashIndex = textBeforeCursor.lastIndexOf('#');

    if (lastHashIndex === -1) {
      setCurrentHashtagText(null);
      setSuggestions([]);
      return;
    }

    const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
    if (textAfterHash.includes(' ') || textAfterHash.includes('\n')) {
      setCurrentHashtagText(null);
      setSuggestions([]);
      return;
    }

    // Check if # is at the start or preceded by whitespace
    if (lastHashIndex > 0) {
      const charBeforeHash = textBeforeCursor[lastHashIndex - 1];
      if (charBeforeHash !== ' ' && charBeforeHash !== '\n') {
        setCurrentHashtagText(null);
        setSuggestions([]);
        return;
      }
    }

    setCurrentHashtagText(textAfterHash);
  }, [text, cursorPosition]);

  const searchHashtags = useCallback(async (query: string) => {
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      console.log('[HashtagAutocomplete] 🔍 Searching for hashtags:', query);

      // Search hashtags from publications only (not comments)
      // Order by usage count for most popular first
      const { data, error } = await supabase
        .from('hashtags')
        .select('id, tag, uso_count')
        .ilike('tag', `${query}%`)
        .order('uso_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[HashtagAutocomplete] ❌ Error searching hashtags:', error);
        setSuggestions([]);
        return;
      }

      console.log('[HashtagAutocomplete] ✅ Found hashtags:', data?.length || 0);
      setSuggestions(data || []);
    } catch (error) {
      console.error('[HashtagAutocomplete] ❌ Error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectHashtag();
  }, [detectHashtag]);

  useEffect(() => {
    if (currentHashtagText !== null) {
      searchHashtags(currentHashtagText);
    }
  }, [currentHashtagText, searchHashtags]);

  if (currentHashtagText === null) {
    return null;
  }

  const handleSelectHashtag = (hashtag: HashtagSuggestion) => {
    onSelectHashtag(hashtag.tag, currentHashtagText);
  };

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando hashtags...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <ScrollView 
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              style={[styles.suggestionItem, index === suggestions.length - 1 && styles.suggestionItemLast]}
              onPress={() => handleSelectHashtag(item)}
              activeOpacity={0.7}
            >
              <View style={styles.hashtagIcon}>
                <IconSymbol name="number" size={20} color={colors.primary} />
              </View>
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionTag}>#{item.tag}</Text>
                <Text style={styles.suggestionCount}>
                  {item.uso_count} {item.uso_count === 1 ? 'publicación' : 'publicaciones'}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : currentHashtagText.length > 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="number" size={20} color={colors.textSecondary} />
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyText}>Sé el primero en usar</Text>
            <Text style={styles.emptyHashtag}>#{currentHashtagText}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: 240,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      },
    }),
  },
  list: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  hashtagIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTag: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  suggestionCount: {
    fontSize: 13,
    color: '#666666',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  emptyHashtag: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
