
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  FlatList,
  Keyboard,
  Dimensions,
  KeyboardEvent,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
 * Get initials from a name
 */
function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Generate a color based on a string (for avatar backgrounds)
 */
function getColorForString(str: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Listen to keyboard events to adjust positioning
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        const height = e.endCoordinates.height;
        console.log('[MentionAutocomplete] ⌨️ Keyboard showing, height:', height);
        setKeyboardHeight(height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[MentionAutocomplete] ⌨️ Keyboard hiding');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

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

      // Search locals with active subscription (Estándar or Premium)
      console.log('[MentionAutocomplete] 🏢 Searching locals with active subscriptions...');
      
      let localsData: any[] = [];
      
      if (cleanQuery.length > 0) {
        // First get all active locals matching the search
        const { data: allLocals, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', `%${cleanQuery}%`)
          .limit(100);

        if (localsError) {
          console.error('[MentionAutocomplete] ❌ Error searching locals:', localsError);
        } else if (allLocals && allLocals.length > 0) {
          console.log('[MentionAutocomplete] 📊 Found', allLocals.length, 'active locals matching search');
          
          // Now filter by active subscriptions with premium or estandar plans
          const localIds = allLocals.map(l => l.id);
          
          // Query subscriptions - FIX: Specify which foreign key to use with !inner
          // Use plan_id:planes_suscripcion!suscripciones_locales_plan_id_fkey to specify the relationship
          const { data: activeSubs, error: subsError } = await supabase
            .from('suscripciones_locales')
            .select('local_id, plan_id, plan:planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)')
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subsError) {
            console.error('[MentionAutocomplete] ❌ Error checking subscriptions:', subsError);
          } else if (activeSubs && activeSubs.length > 0) {
            console.log('[MentionAutocomplete] 📊 Found', activeSubs.length, 'active subscriptions');
            
            // Filter to only include premium and estandar plans
            const localsWithActivePlans = new Set<string>();
            activeSubs.forEach(sub => {
              const planNombre = (sub.plan as any)?.nombre;
              console.log('[MentionAutocomplete] 🔍 Checking subscription for local:', sub.local_id, 'plan:', planNombre);
              if (planNombre === 'premium' || planNombre === 'estandar') {
                localsWithActivePlans.add(sub.local_id);
              }
            });
            
            console.log('[MentionAutocomplete] ✅ Locals with premium/estandar plans:', localsWithActivePlans.size);
            localsData = allLocals.filter(l => localsWithActivePlans.has(l.id));
            console.log('[MentionAutocomplete] ✅ Final filtered locals:', localsData.length);
          }
        }
      } else {
        // Show recent locals with active subscriptions when query is empty
        const { data: recentLocals, error: recentError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(100);

        if (recentError) {
          console.error('[MentionAutocomplete] ❌ Error fetching recent locals:', recentError);
        } else if (recentLocals && recentLocals.length > 0) {
          console.log('[MentionAutocomplete] 📊 Found', recentLocals.length, 'recent active locals');
          
          // Filter by active subscriptions
          const localIds = recentLocals.map(l => l.id);
          
          // FIX: Specify which foreign key to use
          const { data: activeSubs, error: subsError } = await supabase
            .from('suscripciones_locales')
            .select('local_id, plan_id, plan:planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)')
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subsError) {
            console.error('[MentionAutocomplete] ❌ Error checking subscriptions:', subsError);
          } else if (activeSubs && activeSubs.length > 0) {
            const localsWithActivePlans = new Set<string>();
            activeSubs.forEach(sub => {
              const planNombre = (sub.plan as any)?.nombre;
              if (planNombre === 'premium' || planNombre === 'estandar') {
                localsWithActivePlans.add(sub.local_id);
              }
            });
            
            localsData = recentLocals.filter(l => localsWithActivePlans.has(l.id));
            console.log('[MentionAutocomplete] ✅ Found', localsData.length, 'recent locals with active plans');
          }
        }
      }

      // Deduplicate locals
      localsData = deduplicateById(localsData);
      console.log('[MentionAutocomplete] 📊 Total unique locals found:', localsData.length);

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
          // Default score
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

  // Calculate optimal positioning
  useEffect(() => {
    if (isVisible && suggestions.length > 0 && keyboardHeight > 0) {
      // Constants for layout calculation
      const ITEM_HEIGHT = 76; // Height of each suggestion item
      const MIN_ITEMS = 1;
      const MAX_ITEMS = 4; // Show up to 4 items
      const INPUT_CONTAINER_HEIGHT = 60; // Height of the input container at bottom
      const SPACING_ABOVE_INPUT = 8; // Small gap between list and input
      const TOP_SAFE_AREA = 100; // Safe area at top (status bar + header)
      
      // Calculate ideal height based on number of suggestions
      const itemsToShow = Math.min(Math.max(suggestions.length, MIN_ITEMS), MAX_ITEMS);
      const idealHeight = itemsToShow * ITEM_HEIGHT;
      
      // Calculate available space
      // Total space from top to keyboard = SCREEN_HEIGHT - keyboardHeight
      // Available space for list = Total space - TOP_SAFE_AREA - INPUT_CONTAINER_HEIGHT - SPACING
      const availableSpace = SCREEN_HEIGHT - keyboardHeight - TOP_SAFE_AREA - INPUT_CONTAINER_HEIGHT - SPACING_ABOVE_INPUT;
      
      // Use the smaller of ideal height or available space, with a max of 304px (4 items)
      const finalHeight = Math.min(idealHeight, availableSpace, 304);
      
      setContainerHeight(finalHeight);
      
      console.log('[MentionAutocomplete] 📐 Layout calculation:');
      console.log('  - Screen height:', SCREEN_HEIGHT);
      console.log('  - Keyboard height:', keyboardHeight);
      console.log('  - Suggestions:', suggestions.length);
      console.log('  - Items to show:', itemsToShow);
      console.log('  - Ideal height:', idealHeight);
      console.log('  - Available space:', availableSpace);
      console.log('  - Final height:', finalHeight);
      console.log('  - Bottom position (above input):', keyboardHeight + INPUT_CONTAINER_HEIGHT + SPACING_ABOVE_INPUT);
    }
  }, [isVisible, suggestions.length, keyboardHeight]);

  // Don't render if not visible or no mention text
  if (!isVisible || currentMentionText === null) {
    console.log('[MentionAutocomplete] 🚫 Not rendering - isVisible:', isVisible, 'currentMentionText:', currentMentionText);
    return null;
  }

  console.log('[MentionAutocomplete] 🎨 Rendering - loading:', loading, 'suggestions:', suggestions.length, 'keyboardHeight:', keyboardHeight);

  const renderItem = ({ item }: { item: MentionSuggestion }) => {
    const avatarColor = getColorForString(item.id);
    const initials = getInitials(item.nombre);

    return (
      <TouchableOpacity
        style={styles.suggestionItem}
        onPress={() => handleSelectMention(item)}
        activeOpacity={0.7}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.suggestionInfo}>
          <Text style={styles.suggestionUsername}>
            {item.username || item.nombre}
          </Text>
          {item.username && item.nombre !== item.username && (
            <Text style={styles.suggestionName} numberOfLines={1}>
              {item.nombre}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Calculate bottom position - position above the input container with proper spacing
  const INPUT_CONTAINER_HEIGHT = 60;
  const SPACING_ABOVE_INPUT = 8;
  const bottomPosition = keyboardHeight > 0 
    ? keyboardHeight + INPUT_CONTAINER_HEIGHT + SPACING_ABOVE_INPUT 
    : INPUT_CONTAINER_HEIGHT + SPACING_ABOVE_INPUT + 80; // Fallback when keyboard height not detected
  
  const finalHeight = containerHeight > 0 ? containerHeight : 200;

  return (
    <View 
      style={[
        styles.container, 
        { 
          bottom: bottomPosition,
          height: finalHeight,
        }, 
        style
      ]}
    >
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
          nestedScrollEnabled={true}
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
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
    zIndex: 9999,
    overflow: 'hidden',
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
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
