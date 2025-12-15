
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
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
 * ✅ MENTION SYSTEM v12.0 - CRITICAL FIXES
 * 
 * Key improvements:
 * - ✅ FIXED: Only show results after typing at least 2 characters after "@"
 * - Fixed VirtualizedLists warning by removing ScrollView wrapper
 * - Improved database queries with better error handling
 * - Enhanced visibility with better styling and z-index
 * - Added comprehensive logging for debugging
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
 * Examples:
 * - "Casa Adolfo" -> "CasaAdolfo"
 * - "Bar Central" -> "BarCentral"
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

  // Exact match gets highest priority
  if (normalizedNombre === normalizedSearch || normalizedUsername === normalizedSearch) {
    score += 1000;
  }
  // Starts with query gets high priority
  else if (normalizedNombre.startsWith(normalizedSearch) || normalizedUsername.startsWith(normalizedSearch)) {
    score += 500;
  }
  // Contains query gets medium priority
  else if (normalizedNombre.includes(normalizedSearch) || normalizedUsername.includes(normalizedSearch)) {
    score += 250;
  }
  // Word boundary match
  else {
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

  /**
   * Detect if user is typing a mention
   */
  const detectMention = useCallback(() => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    console.log('[MentionAutocomplete v12.0] 🔍 Detecting mention...');
    console.log('[MentionAutocomplete v12.0] Text before cursor:', textBeforeCursor);
    console.log('[MentionAutocomplete v12.0] Last @ index:', lastAtIndex);

    // No @ found
    if (lastAtIndex === -1) {
      console.log('[MentionAutocomplete v12.0] ❌ No @ found');
      setCurrentMentionText(null);
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    // Get text after @
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    console.log('[MentionAutocomplete v12.0] Text after @:', textAfterAt);

    // If there's a space or newline after @, stop
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      console.log('[MentionAutocomplete v12.0] ❌ Space or newline found after @');
      setCurrentMentionText(null);
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    // ✅ CRITICAL FIX v12.0: Only show results after typing at least 2 characters
    if (textAfterAt.length < 2) {
      console.log('[MentionAutocomplete v12.0] ⏳ Waiting for at least 2 characters after @, current length:', textAfterAt.length);
      setCurrentMentionText(null);
      setIsVisible(false);
      setSuggestions([]);
      return;
    }

    console.log('[MentionAutocomplete v12.0] ✅ Valid mention detected:', textAfterAt);
    setCurrentMentionText(textAfterAt);
    setIsVisible(true);
  }, [text, cursorPosition]);

  /**
   * ✅ CRITICAL FIX v12.0: Enhanced search with minimum 2 characters requirement
   */
  const searchMentions = useCallback(async (query: string) => {
    // ✅ CRITICAL FIX: Don't search if query is less than 2 characters
    if (query.length < 2) {
      console.log('[MentionAutocomplete v12.0] ⏳ Query too short, skipping search:', query.length);
      setSuggestions([]);
      setLoading(false);
      return;
    }

    console.log('[MentionAutocomplete v12.0] 🔍 Starting search for:', query);
    setLoading(true);
    
    try {
      const results: MentionSuggestion[] = [];
      const cleanQuery = query.trim();

      console.log('[MentionAutocomplete v12.0] 📝 Clean query:', cleanQuery);

      // ✅ Search users with proper query
      console.log('[MentionAutocomplete v12.0] 👤 Searching users...');
      
      try {
        const usersQuery = supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
          .limit(10);

        const { data: usersData, error: usersError } = await usersQuery;

        if (usersError) {
          console.error('[MentionAutocomplete v12.0] ❌ Error searching users:', usersError);
        } else if (usersData) {
          console.log('[MentionAutocomplete v12.0] ✅ Found users:', usersData.length);
          console.log('[MentionAutocomplete v12.0] 📊 User data sample:', usersData.slice(0, 2));

          // Add users to results with scoring
          const scoredUsers = usersData
            .filter(u => u.username) // Only include users with username
            .map(u => {
              const score = calculateScore(cleanQuery, u.nombre || '', u.username || '');
              return { ...u, score };
            })
            .filter(u => u.score > 0) // Only include results with positive score
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
        console.error('[MentionAutocomplete v12.0] ❌ Error in user search:', error);
      }

      // ✅ Search locals with proper query and subscription check
      console.log('[MentionAutocomplete v12.0] 🏢 Searching locals...');
      
      try {
        const localsQuery = supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', `%${cleanQuery}%`)
          .limit(20);

        const { data: localsData, error: localsError } = await localsQuery;

        if (localsError) {
          console.error('[MentionAutocomplete v12.0] ❌ Error searching locals:', localsError);
        } else if (localsData && localsData.length > 0) {
          console.log('[MentionAutocomplete v12.0] ✅ Found locals:', localsData.length);
          
          // Check which locals have active subscriptions
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
            console.error('[MentionAutocomplete v12.0] ❌ Error fetching subscriptions:', subscriptionsError);
          } else if (subscriptionsData) {
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            const filteredLocalsData = localsData.filter(local => validLocalIds.includes(local.id));
            
            console.log('[MentionAutocomplete v12.0] ✅ Found locals with valid subscriptions:', filteredLocalsData.length);

            // Add locals to results with mention-friendly usernames and scoring
            const scoredLocals = filteredLocalsData
              .map(l => {
                const mentionUsername = generateMentionUsername(l.nombre || '');
                const score = calculateScore(cleanQuery, l.nombre || '', mentionUsername);
                return { ...l, mentionUsername, score };
              })
              .filter(l => l.score > 0) // Only include results with positive score
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
        console.error('[MentionAutocomplete v12.0] ❌ Error in local search:', error);
      }

      console.log('[MentionAutocomplete v12.0] ✅ Total results:', results.length);
      console.log('[MentionAutocomplete v12.0] 📊 Users:', results.filter(r => r.tipo === 'usuario').length, 'Locals:', results.filter(r => r.tipo === 'local').length);
      
      // Remove duplicates by ID and tipo
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id && t.tipo === item.tipo)
      );
      
      if (uniqueResults.length !== results.length) {
        console.warn('[MentionAutocomplete v12.0] ⚠️ Removed', results.length - uniqueResults.length, 'duplicate results');
      }
      
      console.log('[MentionAutocomplete v12.0] 🎯 Setting suggestions:', uniqueResults.length);
      setSuggestions(uniqueResults);
    } catch (error) {
      console.error('[MentionAutocomplete v12.0] ❌ Error in searchMentions:', error);
      setSuggestions([]);
    } finally {
      console.log('[MentionAutocomplete v12.0] ✅ Search complete, setting loading to false');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectMention();
  }, [detectMention]);

  useEffect(() => {
    if (currentMentionText !== null) {
      console.log('[MentionAutocomplete v12.0] 🔄 Triggering search with debounce for:', currentMentionText);
      const timeoutId = setTimeout(() => {
        searchMentions(currentMentionText);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      console.log('[MentionAutocomplete v12.0] 🚫 currentMentionText is null, clearing suggestions');
      setSuggestions([]);
      setIsVisible(false);
    }
  }, [currentMentionText, searchMentions]);

  const handleSelectMention = (mention: MentionSuggestion) => {
    console.log('[MentionAutocomplete v12.0] ✅ Mention selected:', mention);
    onSelectMention(mention, currentMentionText || '');
    setIsVisible(false);
    setSuggestions([]);
    setCurrentMentionText(null);
  };

  // ✅ CRITICAL FIX v12.0: Always render when visible, even if loading or no suggestions yet
  if (!isVisible || currentMentionText === null) {
    console.log('[MentionAutocomplete v12.0] 🚫 Not rendering - isVisible:', isVisible, 'currentMentionText:', currentMentionText);
    return null;
  }

  console.log('[MentionAutocomplete v12.0] 🎨 Rendering - loading:', loading, 'suggestions:', suggestions.length);

  return (
    <View style={[styles.container, style]} pointerEvents="auto">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <View style={styles.list}>
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
        </View>
      ) : currentMentionText.length >= 2 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="magnifyingglass" 
            android_material_icon_name="search" 
            size={20} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>No se encontraron resultados para "@{currentMentionText}"</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <IconSymbol 
            ios_icon_name="at" 
            android_material_icon_name="alternate_email" 
            size={20} 
            color={colors.textSecondary} 
          />
          <Text style={styles.emptyText}>Escribe al menos 2 letras para buscar</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
    borderWidth: 3,
    borderColor: colors.primary,
    marginBottom: 12,
    // ✅ CRITICAL FIX v12.0: Force minimum height to ensure visibility
    minHeight: 60,
    overflow: 'visible',
  },
  list: {
    maxHeight: 240,
    // ✅ CRITICAL FIX v12.0: Removed ScrollView to fix VirtualizedLists warning
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
