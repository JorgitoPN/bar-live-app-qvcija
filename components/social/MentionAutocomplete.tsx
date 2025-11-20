
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
    console.log('[MentionAutocomplete] Cursor position:', cursorPosition);

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

    // Check if @ is at the start or preceded by space/newline (relaxed check)
    if (lastAtIndex > 0) {
      const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
      // Allow @ at start of text or after space/newline
      if (charBeforeAt !== ' ' && charBeforeAt !== '\n' && lastAtIndex !== 0) {
        console.log('[MentionAutocomplete] ⚠️ @ not at valid position, but continuing anyway');
        // Don't return here - let's be more permissive
      }
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

      // Search users - Use separate queries for better reliability
      console.log('[MentionAutocomplete] 👤 Searching users...');
      
      let usersData: any[] = [];
      
      if (query.length > 0) {
        // Search by username
        const { data: usersByUsername, error: usernameError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar, perfil_privado, permitir_etiquetas')
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .ilike('username', `%${query}%`)
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
          .select('id, nombre, username, avatar, perfil_privado, permitir_etiquetas')
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .ilike('nombre', `%${query}%`)
          .limit(10);

        if (nameError) {
          console.error('[MentionAutocomplete] ❌ Error searching users by name:', nameError);
        } else if (usersByName) {
          console.log('[MentionAutocomplete] ✅ Found users by name:', usersByName.length);
          // Merge results, avoiding duplicates
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
          .select('id, nombre, username, avatar, perfil_privado, permitir_etiquetas')
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
          const nombre = (u.nombre || '').toLowerCase();
          const username = (u.username || '').toLowerCase();
          const search = query.toLowerCase();

          let score = 0;
          if (nombre === search || username === search) score += 100;
          else if (nombre.startsWith(search) || username.startsWith(search)) score += 50;
          else if (nombre.includes(search) || username.includes(search)) score += 25;
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

      // Search locals
      console.log('[MentionAutocomplete] 🏢 Searching locals...');
      
      let localsData: any[] = [];
      
      if (query.length > 0) {
        const { data: locals, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', `%${query}%`)
          .limit(20);

        if (localsError) {
          console.error('[MentionAutocomplete] ❌ Error searching locals:', localsError);
        } else if (locals) {
          console.log('[MentionAutocomplete] ✅ Found locals:', locals.length);
          localsData = locals;
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

      console.log('[MentionAutocomplete] 📊 Total locals found:', localsData.length);

      // Add locals to results with scoring
      if (localsData && localsData.length > 0) {
        const scoredLocals = localsData.map(l => {
          const nombre = (l.nombre || '').toLowerCase();
          const search = query.toLowerCase();

          let score = 0;
          if (nombre === search) score += 100;
          else if (nombre.startsWith(search)) score += 50;
          else if (nombre.includes(search)) score += 25;
          else score += 10;

          return { ...l, score };
        });

        scoredLocals.sort((a, b) => b.score - a.score);

        results.push(...scoredLocals.slice(0, 5).map(l => ({
          id: l.id,
          nombre: l.nombre,
          username: l.nombre,
          avatar: l.imagen_url,
          tipo: 'local' as const,
        })));
      }

      console.log('[MentionAutocomplete] ✅ Total results:', results.length);
      console.log('[MentionAutocomplete] Results:', results);
      setSuggestions(results);
    } catch (error) {
      console.error('[MentionAutocomplete] ❌ Error in searchMentions:', error);
      setSuggestions([]);
    } finally {
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

  // Don't render if not visible
  if (!isVisible || currentMentionText === null) {
    console.log('[MentionAutocomplete] 🚫 Not rendering - isVisible:', isVisible, 'currentMentionText:', currentMentionText);
    return null;
  }

  console.log('[MentionAutocomplete] 📊 Rendering with state:', {
    isVisible,
    currentMentionText,
    loading,
    suggestionsCount: suggestions.length,
  });

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <ScrollView 
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.id}-${item.tipo}-${index}`}
              style={[styles.suggestionItem, index === suggestions.length - 1 && styles.suggestionItemLast]}
              onPress={() => handleSelectMention(item)}
              activeOpacity={0.7}
            >
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol
                    name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName}>{item.nombre}</Text>
                <Text style={styles.suggestionType}>
                  {item.tipo === 'local' ? '🏢 Local' : `@${item.username}`}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : currentMentionText.length > 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No se encontraron resultados para "{currentMentionText}"</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <IconSymbol name="at" size={20} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Escribe para buscar usuarios o locales</Text>
        </View>
      )}
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
    marginBottom: 8,
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  suggestionType: {
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
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
});
