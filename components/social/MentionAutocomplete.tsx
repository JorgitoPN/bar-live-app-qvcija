
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
  Animated,
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
  inputRef?: React.RefObject<any>;
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
  inputRef,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMentionText, setCurrentMentionText] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputLayout, setInputLayout] = useState({ y: 0, height: 0 });
  
  // ✅ Animation for smooth appearance
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

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

  // ✅ Measure input position when it becomes available
  useEffect(() => {
    if (inputRef?.current && isVisible) {
      inputRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        console.log('[MentionAutocomplete] 📏 Input measured - y:', pageY, 'height:', height);
        setInputLayout({ y: pageY, height });
      });
    }
  }, [inputRef, isVisible]);

  // ✅ Animate appearance/disappearance
  useEffect(() => {
    if (isVisible && suggestions.length > 0) {
      // Slide up and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, suggestions.length, slideAnim, opacityAnim]);

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

    // ✅ FIX: Allow spaces in mention search for locals
    // Only stop if there's a newline after @
    if (textAfterAt.includes('\n')) {
      console.log('[MentionAutocomplete] ❌ Newline found after @');
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

      // ✅ FIX: Search locals with spaces in names
      console.log('[MentionAutocomplete] 🏢 Searching locals with active subscriptions...');
      
      let localsData: any[] = [];
      
      if (cleanQuery.length > 0) {
        // ✅ Split query by spaces and search for each word
        const queryWords = cleanQuery.split(/\s+/).filter(w => w.length > 0);
        console.log('[MentionAutocomplete] 🔍 Query words:', queryWords);
        
        // Build a flexible search pattern that matches all words in any order
        let searchPattern = '';
        if (queryWords.length === 1) {
          searchPattern = `%${queryWords[0]}%`;
        } else {
          // For multiple words, search for locals that contain all words
          searchPattern = `%${queryWords.join('%')}%`;
        }
        
        console.log('[MentionAutocomplete] 🔍 Search pattern:', searchPattern);
        
        // First get all active locals matching the search
        const { data: allLocals, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', searchPattern)
          .limit(100);

        if (localsError) {
          console.error('[MentionAutocomplete] ❌ Error searching locals:', localsError);
        } else if (allLocals && allLocals.length > 0) {
          console.log('[MentionAutocomplete] 📊 Found', allLocals.length, 'active locals matching search');
          
          // Now filter by active subscriptions with premium or estandar plans
          const localIds = allLocals.map(l => l.id);
          
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
        {item.tipo === 'local' && (
          <View style={styles.localBadge}>
            <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="business" size={14} color={colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ✅ Calculate optimal positioning - directly above keyboard, attached to input
  const MARGIN_FROM_KEYBOARD = 8; // Small margin between list and keyboard
  const ITEM_HEIGHT = 64; // Height of each suggestion item
  const MAX_ITEMS = 4; // Show up to 4 items
  
  // Calculate height based on number of suggestions
  const itemsToShow = Math.min(suggestions.length, MAX_ITEMS);
  const containerHeight = loading ? 80 : itemsToShow * ITEM_HEIGHT;
  
  // ✅ Position directly above keyboard, attached to the text input
  const bottomPosition = keyboardHeight > 0 
    ? keyboardHeight + MARGIN_FROM_KEYBOARD 
    : 100; // Fallback when keyboard height not detected

  // ✅ Animation transforms
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0], // Slide up from 20px below
  });

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          bottom: bottomPosition,
          height: containerHeight,
          opacity: opacityAnim,
          transform: [{ translateY }],
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
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No se encontraron resultados</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  localBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    flexDirection: 'row',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
