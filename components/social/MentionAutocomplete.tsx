
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
  Keyboard,
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
 * ✅ MENTION SYSTEM v16.0 - KEYBOARD-ALIGNED MODAL (FINAL FIX)
 * 
 * Key improvements:
 * - ✅ FIXED: Modal now sticks directly to keyboard with NO gap
 * - ✅ Changed modal text to "Etiquetar usuarios/locales"
 * - ✅ Enhanced positioning and layout
 * - ✅ Shows helpful hint when user types @ with less than 2 characters
 * - ✅ Only shows results after typing at least 2 characters after "@"
 * - ✅ Removed all bottom margins to ensure perfect keyboard alignment
 */

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
 * Generate a mention-friendly username for locals with multiple words
 */
function generateMentionUsername(nombre: string): string {
  const words = nombre
    .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Calculate relevance score for search results
 */
function calculateScore(searchTerm: string, nombre: string, username: string): number {
  const normalizedSearch = normalizeText(searchTerm);
  const normalizedNombre = normalizeText(nombre);
  const normalizedUsername = normalizeText(username);

  let score = 0;

  if (normalizedNombre === normalizedSearch || normalizedUsername === normalizedSearch) {
    score += 1000;
  } else if (normalizedNombre.startsWith(normalizedSearch) || normalizedUsername.startsWith(normalizedSearch)) {
    score += 500;
  } else if (normalizedNombre.includes(normalizedSearch) || normalizedUsername.includes(normalizedSearch)) {
    score += 250;
  } else {
    const searchWords = normalizedSearch.split(/\s+/);
    const nombreWords = normalizedNombre.split(/\s+/);
    const usernameWords = normalizedUsername.split(/\s+/);
    
    for (const searchWord of searchWords) {
      for (const nombreWord of nombreWords) {
        if (nombreWord.startsWith(searchWord)) {
          score += 100;
        }
      }
      for (const usernameWord of usernameWords) {
        if (usernameWord.startsWith(searchWord)) {
          score += 100;
        }
      }
    }
  }

  return score;
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
  const [showHint, setShowHint] = useState(false);

  /**
   * Detect if user is typing a mention
   */
  const detectMention = useCallback(() => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    console.log('[MentionAutocomplete v15.0] 🔍 Detecting mention...');
    console.log('[MentionAutocomplete v15.0] Text before cursor:', textBeforeCursor);
    console.log('[MentionAutocomplete v15.0] Last @ index:', lastAtIndex);

    if (lastAtIndex === -1) {
      console.log('[MentionAutocomplete v15.0] ❌ No @ found');
      setCurrentMentionText(null);
      setIsVisible(false);
      setShowHint(false);
      setSuggestions([]);
      return;
    }

    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    console.log('[MentionAutocomplete v15.0] Text after @:', textAfterAt);

    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      console.log('[MentionAutocomplete v15.0] ❌ Space or newline found after @');
      setCurrentMentionText(null);
      setIsVisible(false);
      setShowHint(false);
      setSuggestions([]);
      return;
    }

    if (textAfterAt.length < 2) {
      console.log('[MentionAutocomplete v15.0] 💡 Showing hint - current length:', textAfterAt.length);
      setCurrentMentionText(textAfterAt);
      setIsVisible(true);
      setShowHint(true);
      setSuggestions([]);
      return;
    }

    console.log('[MentionAutocomplete v15.0] ✅ Valid mention detected:', textAfterAt);
    setCurrentMentionText(textAfterAt);
    setIsVisible(true);
    setShowHint(false);
  }, [text, cursorPosition]);

  /**
   * Search mentions with minimum 2 characters requirement
   */
  const searchMentions = useCallback(async (query: string) => {
    if (query.length < 2) {
      console.log('[MentionAutocomplete v15.0] ⏳ Query too short, skipping search:', query.length);
      setSuggestions([]);
      setLoading(false);
      return;
    }

    console.log('[MentionAutocomplete v15.0] 🔍 Starting search for:', query);
    setLoading(true);
    
    try {
      const results: MentionSuggestion[] = [];
      const cleanQuery = query.trim();

      console.log('[MentionAutocomplete v15.0] 📝 Clean query:', cleanQuery);

      // Search users
      console.log('[MentionAutocomplete v15.0] 👤 Searching users...');
      
      try {
        const usersQuery = supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
          .limit(10);

        const { data: usersData, error: usersError } = await usersQuery;

        if (usersError) {
          console.error('[MentionAutocomplete v15.0] ❌ Error searching users:', usersError);
        } else if (usersData) {
          console.log('[MentionAutocomplete v15.0] ✅ Found users:', usersData.length);

          const scoredUsers = usersData
            .filter(u => u.username)
            .map(u => {
              const score = calculateScore(cleanQuery, u.nombre || '', u.username || '');
              return { ...u, score };
            })
            .filter(u => u.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          results.push(...scoredUsers.map(u => ({
            id: u.id,
            nombre: u.nombre,
            username: u.username,
            avatar: u.avatar,
            tipo: 'usuario' as const,
          })));
        }
      } catch (error) {
        console.error('[MentionAutocomplete v15.0] ❌ Error in user search:', error);
      }

      // Search locals
      console.log('[MentionAutocomplete v15.0] 🏢 Searching locals...');
      
      try {
        const localsQuery = supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', `%${cleanQuery}%`)
          .limit(20);

        const { data: localsData, error: localsError } = await localsQuery;

        if (localsError) {
          console.error('[MentionAutocomplete v15.0] ❌ Error searching locals:', localsError);
        } else if (localsData && localsData.length > 0) {
          console.log('[MentionAutocomplete v15.0] ✅ Found locals:', localsData.length);
          
          const localIds = localsData.map(l => l.id);
          
          const { data: subscriptionsData, error: subscriptionsError } = await supabase
            .from('suscripciones_locales')
            .select(`
              local_id,
              estado,
              plan_id,
              planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)
            `)
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subscriptionsError) {
            console.error('[MentionAutocomplete v15.0] ❌ Error fetching subscriptions:', subscriptionsError);
          } else if (subscriptionsData) {
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            const filteredLocalsData = localsData.filter(local => validLocalIds.includes(local.id));
            
            console.log('[MentionAutocomplete v15.0] ✅ Found locals with valid subscriptions:', filteredLocalsData.length);

            const scoredLocals = filteredLocalsData
              .map(l => {
                const mentionUsername = generateMentionUsername(l.nombre || '');
                const score = calculateScore(cleanQuery, l.nombre || '', mentionUsername);
                return { ...l, mentionUsername, score };
              })
              .filter(l => l.score > 0)
              .sort((a, b) => b.score - a.score)
              .slice(0, 5);

            results.push(...scoredLocals.map(l => ({
              id: l.id,
              nombre: l.nombre,
              username: l.mentionUsername,
              avatar: l.imagen_url,
              tipo: 'local' as const,
            })));
          }
        }
      } catch (error) {
        console.error('[MentionAutocomplete v15.0] ❌ Error in local search:', error);
      }

      console.log('[MentionAutocomplete v15.0] ✅ Total results:', results.length);
      
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id && t.tipo === item.tipo)
      );
      
      console.log('[MentionAutocomplete v15.0] 🎯 Setting suggestions:', uniqueResults.length);
      setSuggestions(uniqueResults);
    } catch (error) {
      console.error('[MentionAutocomplete v15.0] ❌ Error in searchMentions:', error);
      setSuggestions([]);
    } finally {
      console.log('[MentionAutocomplete v15.0] ✅ Search complete');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectMention();
  }, [detectMention]);

  useEffect(() => {
    if (currentMentionText !== null && currentMentionText.length >= 2) {
      console.log('[MentionAutocomplete v15.0] 🔄 Triggering search with debounce for:', currentMentionText);
      const timeoutId = setTimeout(() => {
        searchMentions(currentMentionText);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else if (currentMentionText !== null && currentMentionText.length < 2) {
      console.log('[MentionAutocomplete v15.0] 💡 Showing hint for short query:', currentMentionText);
      setSuggestions([]);
      setShowHint(true);
    } else {
      console.log('[MentionAutocomplete v15.0] 🚫 currentMentionText is null, clearing suggestions');
      setSuggestions([]);
      setIsVisible(false);
      setShowHint(false);
    }
  }, [currentMentionText, searchMentions]);

  const handleSelectMention = (mention: MentionSuggestion) => {
    console.log('[MentionAutocomplete v15.0] ✅ Mention selected:', mention);
    onSelectMention(mention, currentMentionText || '');
    setIsVisible(false);
    setSuggestions([]);
    setCurrentMentionText(null);
    setShowHint(false);
  };

  if (!isVisible || currentMentionText === null) {
    console.log('[MentionAutocomplete v15.0] 🚫 Not rendering - isVisible:', isVisible, 'currentMentionText:', currentMentionText);
    return null;
  }

  console.log('[MentionAutocomplete v15.0] 🎨 Rendering - loading:', loading, 'suggestions:', suggestions.length, 'showHint:', showHint);

  return (
    <View style={[styles.container, style]} pointerEvents="auto">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : showHint ? (
        <View style={styles.hintContainer}>
          <IconSymbol 
            ios_icon_name="info.circle.fill" 
            android_material_icon_name="info" 
            size={20} 
            color={colors.primary} 
          />
          <Text style={styles.hintText}>
            Escribe al menos 2 letras después de @ para buscar usuarios y locales
          </Text>
        </View>
      ) : suggestions.length > 0 ? (
        <ScrollView 
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {suggestions.map((item) => (
            <TouchableOpacity
              key={`${item.id}-${item.tipo}`}
              style={styles.suggestionItem}
              onPress={() => handleSelectMention(item)}
              activeOpacity={0.7}
            >
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol
                    ios_icon_name={item.tipo === 'local' ? 'building.2.fill' : 'person.fill'}
                    android_material_icon_name={item.tipo === 'local' ? 'business' : 'person'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              )}
              <View style={styles.suggestionInfo}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionUsername}>
                    @{item.username}
                  </Text>
                  {item.tipo === 'local' && (
                    <View style={styles.localBadge}>
                      <IconSymbol 
                        ios_icon_name="building.2.fill" 
                        android_material_icon_name="business" 
                        size={10} 
                        color={colors.primary} 
                      />
                      <Text style={styles.localBadgeText}>Local</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {item.nombre}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
            size={20} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>No se encontraron resultados para "@{currentMentionText}"</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: colors.primary,
    marginBottom: 0,
    minHeight: 60,
    overflow: 'hidden',
  },
  list: {
    maxHeight: 240,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
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
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  suggestionUsername: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  localBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
  suggestionName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 24,
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
  hintContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.primary + '10',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
});
