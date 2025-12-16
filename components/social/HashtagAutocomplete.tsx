
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
  keyboardHeight: number;
}

/**
 * ✅ HASHTAG AUTOCOMPLETE v4.0 - COMPLETE REDESIGN WITH PERFECT KEYBOARD ALIGNMENT
 * 
 * Revolutionary improvements:
 * - ✅ NEW: Uses keyboardHeight prop for perfect positioning
 * - ✅ NEW: Compact design matching MentionAutocomplete v4.0
 * - ✅ NEW: Better visual hierarchy
 * - ✅ FIXED: Modal sticks PERFECTLY to keyboard with ZERO gap
 * - ✅ FIXED: No overflow above header
 */

export default function HashtagAutocomplete({
  text,
  cursorPosition,
  onSelectHashtag,
  keyboardHeight,
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
      const { data, error } = await supabase
        .from('hashtags')
        .select('id, tag, uso_count')
        .ilike('tag', `${query}%`)
        .order('uso_count', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[HashtagAutocomplete v4.0] Error searching hashtags:', error);
        setSuggestions([]);
        return;
      }

      setSuggestions(data || []);
    } catch (error) {
      console.error('[HashtagAutocomplete v4.0] Error:', error);
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

  if (currentHashtagText === null || keyboardHeight === 0) {
    return null;
  }

  const handleSelectHashtag = (hashtag: HashtagSuggestion) => {
    onSelectHashtag(hashtag.tag, currentHashtagText);
  };

  return (
    <View style={[styles.container, { bottom: keyboardHeight }]} pointerEvents="box-none">
      <View style={styles.content} pointerEvents="auto">
        <View style={styles.header}>
          <IconSymbol 
            ios_icon_name="number" 
            android_material_icon_name="tag" 
            size={16} 
            color={colors.primary} 
          />
          <Text style={styles.headerText}>Hashtags</Text>
        </View>

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
                style={styles.suggestionItem}
                onPress={() => handleSelectHashtag(item)}
                activeOpacity={0.7}
              >
                <View style={styles.hashtagIcon}>
                  <IconSymbol ios_icon_name="number" android_material_icon_name="tag" size={18} color={colors.primary} />
                </View>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionTag}>#{item.tag}</Text>
                  <Text style={styles.suggestionCount}>
                    {item.uso_count} {item.uso_count === 1 ? 'publicación' : 'publicaciones'}
                  </Text>
                </View>
                <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : currentHashtagText.length > 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol ios_icon_name="number" android_material_icon_name="tag" size={18} color={colors.textSecondary} />
            <View style={styles.emptyTextContainer}>
              <Text style={styles.emptyText}>Sé el primero en usar</Text>
              <Text style={styles.emptyHashtag}>#{currentHashtagText}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  content: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.primary + '40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    gap: 8,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    maxHeight: 190,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  hashtagIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTag: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  emptyTextContainer: {
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  emptyHashtag: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
