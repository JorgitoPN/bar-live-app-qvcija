
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
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
  keyboardHeight: number;
}

/**
 * ✅ MENTION SYSTEM v6.0 - KEYBOARD-AWARE BOTTOM SHEET WITH ADMIN PANEL BEHAVIOR
 * 
 * Revolutionary improvements:
 * - ✅ NEW: KeyboardAvoidingView wrapper for proper keyboard handling
 * - ✅ NEW: ScrollView with keyboardShouldPersistTaps="handled"
 * - ✅ NEW: TouchableWithoutFeedback to dismiss keyboard on overlay tap
 * - ✅ NEW: Proper content padding for text input visibility
 * - ✅ NEW: Matches Admin Panel Comment Modal behavior
 * - ✅ FIXED: Text inputs remain visible when keyboard appears
 * - ✅ FIXED: Improved UX with proper scroll and keyboard handling
 */

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function generateMentionUsername(nombre: string): string {
  const words = nombre
    .replace(/[^\w\sáéíóúñÁÉÍÓÚÑ]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0);
  
  return words
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

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
  keyboardHeight,
}: MentionAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMentionText, setCurrentMentionText] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const { height: SCREEN_HEIGHT } = useWindowDimensions();

  const detectMention = useCallback(() => {
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setCurrentMentionText(null);
      setIsVisible(false);
      setShowHint(false);
      setSuggestions([]);
      return;
    }

    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      setCurrentMentionText(null);
      setIsVisible(false);
      setShowHint(false);
      setSuggestions([]);
      return;
    }

    if (textAfterAt.length < 2) {
      setCurrentMentionText(textAfterAt);
      setIsVisible(true);
      setShowHint(true);
      setSuggestions([]);
      return;
    }

    setCurrentMentionText(textAfterAt);
    setIsVisible(true);
    setShowHint(false);
  }, [text, cursorPosition]);

  const searchMentions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      const results: MentionSuggestion[] = [];
      const cleanQuery = query.trim();

      // Search users
      try {
        const usersQuery = supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .eq('activo', true)
          .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
          .limit(10);

        const { data: usersData, error: usersError } = await usersQuery;

        if (!usersError && usersData) {
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
        console.error('[MentionAutocomplete v6.0] Error in user search:', error);
      }

      // Search locals
      try {
        const localsQuery = supabase
          .from('locales')
          .select('id, nombre, imagen_url')
          .eq('activo', true)
          .ilike('nombre', `%${cleanQuery}%`)
          .limit(20);

        const { data: localsData, error: localsError } = await localsQuery;

        if (!localsError && localsData && localsData.length > 0) {
          const localIds = localsData.map(l => l.id);
          
          const { data: subscriptionsData } = await supabase
            .from('suscripciones_locales')
            .select(`
              local_id,
              estado,
              plan_id,
              planes_suscripcion!suscripciones_locales_plan_id_fkey(nombre)
            `)
            .in('local_id', localIds)
            .eq('estado', 'activa');

          if (subscriptionsData) {
            const validLocalIds = subscriptionsData
              .filter(sub => {
                const planName = (sub.planes_suscripcion as any)?.nombre;
                return planName === 'estandar' || planName === 'premium';
              })
              .map(sub => sub.local_id);

            const filteredLocalsData = localsData.filter(local => validLocalIds.includes(local.id));

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
        console.error('[MentionAutocomplete v6.0] Error in local search:', error);
      }

      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id && t.tipo === item.tipo)
      );
      
      setSuggestions(uniqueResults);
    } catch (error) {
      console.error('[MentionAutocomplete v6.0] Error in searchMentions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detectMention();
  }, [detectMention]);

  useEffect(() => {
    if (currentMentionText !== null && currentMentionText.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchMentions(currentMentionText);
      }, 300);

      return () => clearTimeout(timeoutId);
    } else if (currentMentionText !== null && currentMentionText.length < 2) {
      setSuggestions([]);
      setShowHint(true);
    } else {
      setSuggestions([]);
      setIsVisible(false);
      setShowHint(false);
    }
  }, [currentMentionText, searchMentions]);

  const handleSelectMention = (mention: MentionSuggestion) => {
    onSelectMention(mention, currentMentionText || '');
    setIsVisible(false);
    setSuggestions([]);
    setCurrentMentionText(null);
    setShowHint(false);
  };

  if (!isVisible || currentMentionText === null || keyboardHeight === 0) {
    return null;
  }

  // ✅ Calculate maximum available height to avoid header overlap
  // Reserve space for: status bar (50) + header (100) + safe margin (20)
  const HEADER_RESERVED_SPACE = Platform.OS === 'ios' ? 170 : 150;
  const maxAvailableHeight = SCREEN_HEIGHT - keyboardHeight - HEADER_RESERVED_SPACE;
  
  // ✅ Modal height should be minimum of 280px or available space
  const modalHeight = Math.min(280, maxAvailableHeight);

  console.log('[MentionAutocomplete v6.0] 📐 Screen height:', SCREEN_HEIGHT);
  console.log('[MentionAutocomplete v6.0] ⌨️ Keyboard height:', keyboardHeight);
  console.log('[MentionAutocomplete v6.0] 📏 Max available height:', maxAvailableHeight);
  console.log('[MentionAutocomplete v6.0] 📦 Modal height:', modalHeight);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container, 
        { 
          bottom: keyboardHeight,
          maxHeight: modalHeight,
        }
      ]}
      keyboardVerticalOffset={0}
      pointerEvents="box-none"
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlayTouchable} pointerEvents="box-none">
          <View style={[styles.content, { maxHeight: modalHeight }]} pointerEvents="auto">
            <View style={styles.header}>
              <IconSymbol 
                ios_icon_name="at" 
                android_material_icon_name="alternate_email" 
                size={16} 
                color={colors.primary} 
              />
              <Text style={styles.headerText}>Etiquetar usuarios/locales</Text>
            </View>

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
                  size={18} 
                  color={colors.primary} 
                />
                <Text style={styles.hintText}>
                  Escribe al menos 2 letras para buscar
                </Text>
              </View>
            ) : suggestions.length > 0 ? (
              <ScrollView 
                style={styles.list}
                contentContainerStyle={styles.listContent}
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
                          size={16}
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
                              size={9} 
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
                  size={18} 
                  color={colors.textSecondary} 
                />
                <Text style={styles.emptyText}>Sin resultados para "@{currentMentionText}"</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  overlayTouchable: {
    flex: 1,
  },
  content: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.primary + '40',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    gap: 8,
    backgroundColor: colors.cardBackground,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 20,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
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
    gap: 6,
  },
  suggestionUsername: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  localBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  suggestionName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  hintContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary + '08',
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
});
