
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

export default function MentionAutocomplete({
  text,
  cursorPosition,
  onSelectMention,
  style,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMentionText, setCurrentMentionText] = useState<string | null>(null);

  // Detect if user is typing a mention
  const detectMention = useCallback(() => {
    // Find the last @ before cursor position
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setCurrentMentionText(null);
      setSuggestions([]);
      return;
    }

    // Check if there's a space between @ and cursor (mention ended)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      setCurrentMentionText(null);
      setSuggestions([]);
      return;
    }

    // Check if @ is at start or preceded by space/newline (valid mention start)
    if (lastAtIndex > 0) {
      const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
      if (charBeforeAt !== ' ' && charBeforeAt !== '\n') {
        setCurrentMentionText(null);
        setSuggestions([]);
        return;
      }
    }

    // Valid mention detected
    setCurrentMentionText(textAfterAt);
  }, [text, cursorPosition]);

  // Search for users and locals
  const searchMentions = useCallback(async (query: string) => {
    if (query.length === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      console.log('[MentionAutocomplete] 🔍 Searching for:', query);

      // Create fuzzy search pattern
      const fuzzyPattern = query.split('').join('%');

      // Search users
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar, perfil_privado, permitir_etiquetas')
        .or(`nombre.ilike.%${query}%,username.ilike.%${query}%,nombre.ilike.%${fuzzyPattern}%,username.ilike.%${fuzzyPattern}%`)
        .eq('activo', true)
        .eq('permitir_etiquetas', true)
        .limit(5);

      if (usersError) {
        console.error('[MentionAutocomplete] ❌ Error searching users:', usersError);
      }

      // FIXED: Search locals with active subscriptions using explicit relationship naming
      // The issue was the ambiguous relationship between suscripciones_locales and planes_suscripcion
      // We need to explicitly specify which foreign key to use: plan_id (not plan_pendiente_id)
      console.log('[MentionAutocomplete] 🏢 Searching locals with active subscriptions...');
      
      // Step 1: Get locals matching the search query
      const { data: localsData, error: localsError } = await supabase
        .from('locales')
        .select('id, nombre, imagen_url')
        .or(`nombre.ilike.%${query}%,nombre.ilike.%${fuzzyPattern}%`)
        .eq('activo', true)
        .limit(10);

      if (localsError) {
        console.error('[MentionAutocomplete] ❌ Error searching locals:', localsError);
      }

      // Step 2: Filter locals by active subscription with estandar or premium plan
      let filteredLocals: any[] = [];
      if (localsData && localsData.length > 0) {
        const localIds = localsData.map(l => l.id);
        
        // Get subscriptions for these locals
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
          // Filter subscriptions with estandar or premium plans
          const validLocalIds = subscriptionsData
            .filter(sub => {
              const planName = (sub.planes_suscripcion as any)?.nombre;
              return planName === 'estandar' || planName === 'premium';
            })
            .map(sub => sub.local_id);

          // Filter locals to only include those with valid subscriptions
          filteredLocals = localsData.filter(local => validLocalIds.includes(local.id));
          
          console.log('[MentionAutocomplete] ✅ Found locals with valid subscriptions:', filteredLocals.length);
        }
      }

      const results: MentionSuggestion[] = [];

      // Add users with relevance scoring
      if (!usersError && usersData) {
        const scoredUsers = usersData.map(u => {
          const nombre = u.nombre.toLowerCase();
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

        results.push(...scoredUsers.map(u => ({
          id: u.id,
          nombre: u.nombre,
          username: u.username || u.nombre,
          avatar: u.avatar,
          tipo: 'usuario' as const,
        })));
      }

      // Add locals with relevance scoring (only those with active estandar or premium plans)
      if (filteredLocals.length > 0) {
        const scoredLocals = filteredLocals.map(l => {
          const nombre = l.nombre.toLowerCase();
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

      console.log('[MentionAutocomplete] ✅ Total suggestions:', results.length);
      setSuggestions(results);
    } catch (error) {
      console.error('[MentionAutocomplete] ❌ Error searching:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Detect mention when text or cursor changes
  useEffect(() => {
    detectMention();
  }, [detectMention]);

  // Search when mention text changes
  useEffect(() => {
    if (currentMentionText !== null) {
      searchMentions(currentMentionText);
    }
  }, [currentMentionText, searchMentions]);

  // Don't render if no active mention
  if (currentMentionText === null) {
    return null;
  }

  const handleSelectMention = (mention: MentionSuggestion) => {
    onSelectMention(mention, currentMentionText);
  };

  const renderSuggestion = ({ item, index }: { item: MentionSuggestion; index: number }) => (
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
            size={20}
            color={colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.suggestionInfo}>
        <Text style={styles.suggestionName}>{item.nombre}</Text>
        <Text style={styles.suggestionType}>
          {item.tipo === 'local' ? '🏢 Local' : `👤 @${item.username}`}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.map((item, index) => renderSuggestion({ item, index }))}
        </View>
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
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
    color: colors.text,
    marginBottom: 2,
  },
  suggestionType: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
