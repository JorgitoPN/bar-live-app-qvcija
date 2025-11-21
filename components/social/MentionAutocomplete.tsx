
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  FlatList,
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
 * Remove duplicate locals by ID, keeping the first occurrence
 */
function deduplicateLocals(locals: any[]): any[] {
  const seen = new Set<string>();
  return locals.filter(local => {
    if (seen.has(local.id)) {
      return false;
    }
    seen.add(local.id);
    return true;
  });
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

      // Create fuzzy pattern for better matching
      const fuzzyPattern = cleanQuery.split('').join('%');

      // Search users
      console.log('[MentionAutocomplete] 👤 Searching users...');
      
      let usersData: any[] = [];
      
      if (cleanQuery.length > 0) {
        // Search by username and name with fuzzy matching
        const { data: usersByUsername, error: usernameError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .eq('permitir_etiquetas', true)
          .or(`username.ilike.%${cleanQuery}%,username.ilike.%${fuzzyPattern}%`)
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
          .or(`nombre.ilike.%${cleanQuery}%,nombre.ilike.%${fuzzyPattern}%`)
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
          // Fuzzy match gets lowest priority
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

      // Search locals with active estandar or premium subscriptions
      console.log('[MentionAutocomplete] 🏢 Searching locals with active subscriptions...');
      
      let localsData: any[] = [];
      
      if (cleanQuery.length > 0) {
        // First, get all locals matching the search
        // Use multiple search strategies to find locals
        const searchPromises = [
          // Exact and fuzzy name search
          supabase
            .from('locales')
            .select('id, nombre, imagen_url')
            .eq('activo', true)
            .or(`nombre.ilike.%${cleanQuery}%,nombre.ilike.%${fuzzyPattern}%`)
            .limit(30),
        ];

        const searchResults = await Promise.all(searchPromises);
        
        // Combine all results and deduplicate by ID
        const allLocals: any[] = [];
        for (const result of searchResults) {
          if (!result.error && result.data) {
            allLocals.push(...result.data);
          }
        }

        // CRITICAL: Deduplicate locals by ID to prevent duplicates
        const uniqueLocals = deduplicateLocals(allLocals);
        
        console.log('[MentionAutocomplete] ✅ Found unique locals:', uniqueLocals.length, '(before deduplication:', allLocals.length, ')');

        if (uniqueLocals.length > 0) {
          // Now filter by active subscriptions with estandar or premium plans
          const localIds = uniqueLocals.map(l => l.id);
          
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
            console.error('[MentionAutocomplete] ❌ Error fetching subscriptions:', subscriptionsError);
          } else if (subscriptionsData) {
            // Filter to only include locals with estandar or premium plans
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            // CRITICAL: Filter locals to only include those with valid subscriptions
            // This ensures we don't show duplicate locals
            localsData = uniqueLocals.filter(local => validLocalIds.includes(local.id));
            
            console.log('[MentionAutocomplete] ✅ Found locals with estandar/premium subscriptions:', localsData.length);
          }
        }
      } else {
        // Show recent locals with active subscriptions when query is empty
        const { data: recentLocals, error: recentError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(30);

        if (recentError) {
          console.error('[MentionAutocomplete] ❌ Error fetching recent locals:', recentError);
        } else if (recentLocals && recentLocals.length > 0) {
          // CRITICAL: Deduplicate recent locals by ID
          const uniqueRecentLocals = deduplicateLocals(recentLocals);
          
          console.log('[MentionAutocomplete] ✅ Found unique recent locals:', uniqueRecentLocals.length);
          
          // Filter by active subscriptions with estandar or premium plans
          const localIds = uniqueRecentLocals.map(l => l.id);
          
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
            console.error('[MentionAutocomplete] ❌ Error fetching subscriptions:', subscriptionsError);
          } else if (subscriptionsData) {
            // Filter to only include locals with estandar or premium plans
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            localsData = uniqueRecentLocals.filter(local => validLocalIds.includes(local.id));
            
            console.log('[MentionAutocomplete] ✅ Found recent locals with estandar/premium subscriptions:', localsData.length);
          }
        }
      }

      console.log('[MentionAutocomplete] 📊 Total unique locals with valid subscriptions found:', localsData.length);

      // Add locals to results with scoring
      if (localsData && localsData.length > 0) {
        const scoredLocals = localsData.map(l => {
          const nombre = normalizeText(l.nombre || '');

          let score = 0;
          // Exact match gets highest priority
          if (nombre === normalizedQuery) score += 100;
          // Starts with query gets second priority
          else if (nombre.startsWith(normalizedQuery)) score += 50;
          // Contains query gets third priority
          else if (nombre.includes(normalizedQuery)) score += 25;
          // Fuzzy match gets lowest priority
          else score += 10;

          return { ...l, score };
        });

        scoredLocals.sort((a, b) => b.score - a.score);

        // CRITICAL: Final deduplication before adding to results
        // This ensures absolutely no duplicates in the final list
        const uniqueScoredLocals = deduplicateLocals(scoredLocals);

        results.push(...uniqueScoredLocals.slice(0, 5).map(l => ({
          id: l.id,
          nombre: l.nombre,
          username: l.nombre,
          avatar: l.imagen_url,
          tipo: 'local' as const,
        })));
      }

      console.log('[MentionAutocomplete] ✅ Total results:', results.length);
      console.log('[MentionAutocomplete] 📊 Users:', results.filter(r => r.tipo === 'usuario').length, 'Locals:', results.filter(r => r.tipo === 'local').length);
      
      // FINAL CHECK: Ensure no duplicate IDs in the final results
      const uniqueResults = results.filter((result, index, self) =>
        index === self.findIndex((r) => r.id === result.id && r.tipo === result.tipo)
      );
      
      if (uniqueResults.length !== results.length) {
        console.warn('[MentionAutocomplete] ⚠️ Removed', results.length - uniqueResults.length, 'duplicate results');
      }
      
      setSuggestions(uniqueResults);
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
    return null;
  }

  const renderItem = ({ item }: { item: MentionSuggestion }) => (
    <TouchableOpacity
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
          {item.username || item.nombre}
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
  );

  return (
    <View style={[styles.container, style]} pointerEvents="auto">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${item.tipo}-${index}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        />
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
    maxHeight: 250,
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
