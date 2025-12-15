
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

export interface MentionSuggestion {
  id: string;
  nombre: string;
  username: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

interface MentionAutocompleteProps {
  text: string;
  cursorPosition: number;
  onSelectMention: (mention: MentionSuggestion, mentionText: string) => void;
  style?: any;
}

/**
 * Normalize text for better matching (remove accents, lowercase, trim)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Remove duplicate entries by ID, keeping the first occurrence
 */
function deduplicateById(items: any[]): any[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * ✅ NEW: Generate a mention-friendly username for locals with multiple words
 * Examples:
 * - "Bar Central" -> "BarCentral"
 * - "La Taberna del Puerto" -> "LaTabernaDelPuerto"
 * - "Café de la Plaza" -> "CafeDeLaPlaza"
 */
function generateLocalMentionUsername(nombre: string): string {
  // Remove special characters and split by spaces
  const words = nombre
    .replace(/[^\w\s]/g, '') // Remove special chars
    .split(/\s+/) // Split by spaces
    .filter(word => word.length > 0); // Remove empty strings
  
  // Capitalize first letter of each word and join
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export default function MentionAutocomplete({
  text,
  cursorPosition,
  onSelectMention,
  style,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMentionText, setCurrentMentionText] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const detectMention = useCallback(() => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    console.log('[MentionAutocomplete] 🔍 Detecting mention...');
    console.log('[MentionAutocomplete] Text before cursor:', textBeforeCursor);
    console.log('[MentionAutocomplete] Last @ index:', lastAtIndex);

    // No @ found
    if (lastAtIndex === -1) {
      console.log('[MentionAutocomplete] ❌ No @ found');
      setCurrentMentionText(null);
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    // Get text after @
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    console.log('[MentionAutocomplete] Text after @:', textAfterAt);

    // If there's a space or newline after @, stop
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      console.log('[MentionAutocomplete] ❌ Space or newline found after @');
      setCurrentMentionText(null);
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    console.log('[MentionAutocomplete] ✅ Valid mention detected:', textAfterAt);
    setCurrentMentionText(textAfterAt);
    setIsVisible(true);
  }, [text, cursorPosition]);

  const searchMentions = useCallback(async (query: string) => {
    console.log('[MentionAutocomplete] 🔍 Starting search for:', query);
    setLoading(true);
    
    try {
      const results: MentionSuggestion[] = [];
      const cleanQuery = query.trim();
      const normalizedQuery = normalizeText(cleanQuery);

      console.log('[MentionAutocomplete] 📝 Clean query:', cleanQuery);
      console.log('[MentionAutocomplete] 📝 Normalized query:', normalizedQuery);

      // Search users
      console.log('[MentionAutocomplete] 👤 Searching users...');
      
      let usersData: any[] = [];
      
      if (cleanQuery.length > 0) {
        // Search by username (handle null usernames)
        const { data: usersByUsername, error: usernameError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .not('username', 'is', null)
          .ilike('username', `%${cleanQuery}%`)
          .limit(10);

        if (usernameError) {
          console.error('[MentionAutocomplete] ❌ Error searching users by username:', usernameError);
        } else if (usersByUsername) {
          console.log('[MentionAutocomplete] ✅ Found users by username:', usersByUsername.length);
          usersData = [...usersByUsername];
        }

        // Search by name
        const { data: usersByName, error: nameError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .ilike('nombre', `%${cleanQuery}%`)
          .limit(10);

        if (nameError) {
          console.error('[MentionAutocomplete] ❌ Error searching users by name:', nameError);
        } else if (usersByName) {
          console.log('[MentionAutocomplete] ✅ Found users by name:', usersByName.length);
          // Merge results, avoiding duplicates by ID
          for (const user of usersByName) {
            if (!usersData.find(u => u.id === user.id)) {
              usersData.push(user);
            }
          }
        }
      } else {
        // Show recent users when query is empty
        const { data: recentUsers, error: recentError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          console.error('[MentionAutocomplete] ❌ Error fetching recent users:', recentError);
        } else if (recentUsers) {
          console.log('[MentionAutocomplete] ✅ Found recent users:', recentUsers.length);
          usersData = recentUsers;
        }
      }

      console.log('[MentionAutocomplete] 📊 Total users found:', usersData.length);

      // Add users to results with scoring
      if (usersData && usersData.length > 0) {
        const scoredUsers = usersData.map(u => {
          const nombre = normalizeText(u.nombre || '');
          const username = normalizeText(u.username || '');

          let score = 0;
          // Exact match gets highest priority
          if (nombre === normalizedQuery || username === normalizedQuery) score += 100;
          // Starts with query gets second priority
          else if (nombre.startsWith(normalizedQuery) || username.startsWith(normalizedQuery)) score += 50;
          // Contains query gets third priority
          else if (nombre.includes(normalizedQuery) || username.includes(normalizedQuery)) score += 25;
          // Default score
          else score += 10;

          return { ...u, score };
        });

        scoredUsers.sort((a, b) => b.score - a.score);

        results.push(...scoredUsers.slice(0, 5).map(u => ({
          id: u.id,
          nombre: u.nombre,
          username: u.username || u.nombre,
          avatar: u.avatar,
          tipo: 'usuario' as const,
        })));
      }

      // Search locals - ✅ IMPROVED: Search by mention-friendly username
      console.log('[MentionAutocomplete] 🏢 Searching locals...');
      
      let localsData: any[] = [];
      
      if (cleanQuery.length > 0) {
        // Search by name
        const { data: localsByName, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', `%${cleanQuery}%`)
          .limit(20);

        if (localsError) {
          console.error('[MentionAutocomplete] ❌ Error searching locals:', localsError);
        } else if (localsByName) {
          console.log('[MentionAutocomplete] ✅ Found locals by name:', localsByName.length);
          localsData = localsByName;
        }
      } else {
        // Show recent locals when query is empty
        const { data: recentLocals, error: recentError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          console.error('[MentionAutocomplete] ❌ Error fetching recent locals:', recentError);
        } else if (recentLocals) {
          console.log('[MentionAutocomplete] ✅ Found recent locals:', recentLocals.length);
          localsData = recentLocals;
        }
      }

      // Deduplicate locals
      localsData = deduplicateById(localsData);
      console.log('[MentionAutocomplete] 📊 Total unique locals found:', localsData.length);

      // ✅ IMPROVED: Add locals to results with mention-friendly usernames and scoring
      if (localsData && localsData.length > 0) {
        const scoredLocals = localsData.map(l => {
          const nombre = normalizeText(l.nombre || '');
          const mentionUsername = normalizeText(generateLocalMentionUsername(l.nombre || ''));

          let score = 0;
          // Exact match gets highest priority
          if (nombre === normalizedQuery || mentionUsername === normalizedQuery) score += 100;
          // Starts with query gets second priority
          else if (nombre.startsWith(normalizedQuery) || mentionUsername.startsWith(normalizedQuery)) score += 50;
          // Contains query gets third priority
          else if (nombre.includes(normalizedQuery) || mentionUsername.includes(normalizedQuery)) score += 25;
          // Default score
          else score += 10;

          return { ...l, score, mentionUsername: generateLocalMentionUsername(l.nombre || '') };
        });

        scoredLocals.sort((a, b) => b.score - a.score);

        results.push(...scoredLocals.slice(0, 5).map(l => ({
          id: l.id,
          nombre: l.nombre,
          username: l.mentionUsername, // ✅ Use mention-friendly username
          avatar: l.imagen_url,
          tipo: 'local' as const,
        })));
      }

      console.log('[MentionAutocomplete] ✅ Total results:', results.length);
      console.log('[MentionAutocomplete] 📊 Users:', results.filter(r => r.tipo === 'usuario').length, 'Locals:', results.filter(r => r.tipo === 'local').length);
      
      // Final deduplication
      const uniqueResults = deduplicateById(results);
      
      if (uniqueResults.length !== results.length) {
        console.warn('[MentionAutocomplete] ⚠️ Removed', results.length - uniqueResults.length, 'duplicate results');
      }
      
      console.log('[MentionAutocomplete] 🎯 Setting suggestions:', uniqueResults.length);
      setSuggestions(uniqueResults);
    } catch (error) {
      console.error('[MentionAutocomplete] ❌ Error in searchMentions:', error);
      setSuggestions([]);
    } finally {
      console.log('[MentionAutocomplete] ✅ Search complete, setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectMention();
  }, [detectMention]);

  useEffect(() => {
    if (currentMentionText !== null) {
      console.log('[MentionAutocomplete] 🔄 Triggering search with debounce for:', currentMentionText);
      const timeoutId = setTimeout(() => {
        searchMentions(currentMentionText);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      console.log('[MentionAutocomplete] 🚫 currentMentionText is null, clearing suggestions');
      setSuggestions([]);
      setIsVisible(false);
    }
  }, [currentMentionText, searchMentions]);

  const handleSelectMention = (mention: MentionSuggestion) => {
    console.log('[MentionAutocomplete] ✅ Mention selected:', mention);
    onSelectMention(mention, currentMentionText || '');
    setIsVisible(false);
    setSuggestions([]);
    setCurrentMentionText(null);
  };

  // Don't render if not visible or no mention text
  if (!isVisible || currentMentionText === null) {
    console.log('[MentionAutocomplete] 🚫 Not rendering - isVisible:', isVisible, 'currentMentionText:', currentMentionText);
    return null;
  }

  console.log('[MentionAutocomplete] 🎨 Rendering - loading:', loading, 'suggestions:', suggestions.length);

  return (
    <View style={[styles.container, style]} pointerEvents="auto">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled={true}
        >
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${item.tipo}-${index}`}
              style={styles.suggestionItem}
              onPress={() => handleSelectMention(item)}
              activeOpacity={0.7}
            >
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol
                    name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionUsername}>
                  {item.username}
                </Text>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {item.nombre}
                </Text>
              </View>
              {item.tipo === 'local' && (
                <View style={styles.localBadge}>
                  <IconSymbol name="building.2.fill" size={12} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : currentMentionText.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  localBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
