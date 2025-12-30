
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform, TextInput, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, HEADER_DIMENSIONS } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useDebounce } from '@/hooks/useDebounce';

interface HeaderSocialProps {
  unreadNotifications?: number;
  unreadMessages?: number;
  onSearchPress?: () => void;
  onCreatePress?: () => void;
  onCreatePost?: () => void;
  onCreateStory?: () => void;
}

interface SearchResult {
  id: string;
  type: 'user' | 'local';
  nombre: string;
  username?: string;
  avatar?: string;
  imagen_url?: string;
  plan_activo?: string;
  barlive_type?: string;
  provincia?: string;
}

/**
 * ✅ HEADER SOCIAL v68.0 - STANDARDIZED DIMENSIONS
 * 
 * CRITICAL FIXES v68.0:
 * - ✅ Uses HEADER_DIMENSIONS from commonStyles for consistency
 * - ✅ All text and icon sizes reduced on Android (50% smaller)
 * - ✅ Exact same header height as all other pages
 * - ✅ Android: Search box height REDUCED by 50% (paddingVertical: 6px vs iOS 12px)
 * - ✅ Android: All badges and buttons reduced by 50%
 */

export default function HeaderSocial({
  unreadNotifications: propUnreadNotifications,
  unreadMessages: propUnreadMessages,
  onSearchPress,
  onCreatePress,
  onCreatePost,
  onCreateStory,
}: HeaderSocialProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(propUnreadNotifications || 0);
  const [unreadMessages, setUnreadMessages] = useState(propUnreadMessages || 0);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const loadUnreadCounts = useCallback(async () => {
    if (!user) {
      console.log('[HeaderSocial v68.0] ℹ️ No user, resetting counts to 0');
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }

    try {
      console.log('[HeaderSocial v68.0] 🔄 Loading unread counts from database...');
      
      const { count: notifCount, error: notifError } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      if (notifError) {
        console.error('[HeaderSocial v68.0] ❌ Error loading notifications count:', notifError);
      } else {
        setUnreadNotifications(notifCount || 0);
        console.log('[HeaderSocial v68.0] ✅ Unread notifications:', notifCount || 0);
      }

      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id}`);

      if (chatsError) {
        console.error('[HeaderSocial v68.0] ❌ Error loading chats:', chatsError);
      } else if (chatsData) {
        let totalUnread = 0;
        for (const chat of chatsData) {
          const { count, error: countError } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('leido', false)
            .is('leido_at', null)
            .neq('remitente_id', user.id);
          
          if (!countError) {
            totalUnread += count || 0;
          }
        }
        setUnreadMessages(totalUnread);
        console.log('[HeaderSocial v68.0] ✅ Unread messages:', totalUnread);
      }
    } catch (error) {
      console.error('[HeaderSocial v68.0] ❌ Error loading unread counts:', error);
    }
  }, [user]);

  useEffect(() => {
    loadUnreadCounts();
  }, [loadUnreadCounts]);

  useEffect(() => {
    if (propUnreadNotifications !== undefined) {
      setUnreadNotifications(propUnreadNotifications);
    }
  }, [propUnreadNotifications]);

  useEffect(() => {
    if (propUnreadMessages !== undefined) {
      setUnreadMessages(propUnreadMessages);
    }
  }, [propUnreadMessages]);

  useEffect(() => {
    if (!user) return;

    console.log('[HeaderSocial v68.0] 🔄 Setting up real-time subscriptions for user:', user.id);

    const subscription = supabase
      .channel('header-social-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          console.log('[HeaderSocial v68.0] 🔔 Notification update detected, reloading count...');
          loadUnreadCounts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensajes',
        },
        (payload) => {
          console.log('[HeaderSocial v68.0] 💬 Message UPDATE detected:', payload.new);
          if (payload.new && (payload.new as any).leido === true) {
            console.log('[HeaderSocial v68.0] ✅ Message marked as read, reloading counts...');
            loadUnreadCounts();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
        },
        () => {
          console.log('[HeaderSocial v68.0] 💬 New message INSERT detected, reloading count...');
          loadUnreadCounts();
        }
      )
      .subscribe((status) => {
        console.log('[HeaderSocial v68.0] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[HeaderSocial v68.0] 🔄 Cleaning up subscriptions');
      supabase.removeChannel(subscription);
    };
  }, [user, loadUnreadCounts]);

  const formatBadgeCount = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log('[HeaderSocial v68.0] 🔍 Searching for:', query);

      const cleanQuery = query.replace('@', '').trim().toLowerCase();
      
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
        .limit(10);

      if (usersError) {
        console.error('[HeaderSocial v68.0] ❌ Error searching users:', usersError);
      }

      console.log('[HeaderSocial v68.0] 🔍 Searching locals with query:', cleanQuery);
      
      const { data: localsData, error: localsError } = await supabase
        .from('locales')
        .select(`
          id,
          nombre,
          username,
          imagen_url,
          barlive_type,
          provincia,
          activo,
          perfil_visible,
          suscripciones_locales!inner(
            id,
            estado
          )
        `)
        .or(`nombre.ilike.%${cleanQuery}%,username.ilike.%${cleanQuery}%`)
        .eq('activo', true)
        .eq('perfil_visible', true)
        .eq('suscripciones_locales.estado', 'activa')
        .limit(10);

      if (localsError) {
        console.error('[HeaderSocial v68.0] ❌ Error searching locals:', localsError);
      }

      console.log('[HeaderSocial v68.0] ✅ Found locals:', localsData?.length || 0);

      const results: SearchResult[] = [
        ...(usersData || []).map(u => ({
          id: u.id,
          type: 'user' as const,
          nombre: u.nombre,
          username: u.username,
          avatar: u.avatar,
        })),
        ...(localsData || []).map((l: any) => ({
          id: l.id,
          type: 'local' as const,
          nombre: l.nombre,
          username: l.username,
          imagen_url: l.imagen_url,
          barlive_type: l.barlive_type,
          provincia: l.provincia,
          plan_activo: 'activo',
        })),
      ];

      console.log('[HeaderSocial v68.0] 📊 Search results:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('[HeaderSocial v68.0] ❌ Error searching:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, performSearch]);

  const handleSearchResultPress = (result: SearchResult) => {
    try {
      console.log('[HeaderSocial v68.0] 🔗 Navigating to:', result.type, result.id);
      
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);

      if (result.type === 'user') {
        if (user && result.id === user.id) {
          router.push('/(tabs)/perfil');
        } else {
          router.push(`/perfil/usuario?userId=${result.id}`);
        }
      } else {
        console.log('[HeaderSocial v68.0] 🏢 Navigating to local profile:', result.id);
        router.push(`/perfil/local?localId=${result.id}`);
      }
    } catch (error) {
      console.error('[HeaderSocial v68.0] ❌ Error navigating to profile:', error);
      Alert.alert('Error', 'No se pudo abrir el perfil');
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSearchResultPress(item)}
      activeOpacity={0.7}
    >
      {item.avatar || item.imagen_url ? (
        <Image
          source={{ uri: item.avatar || item.imagen_url }}
          style={styles.searchResultAvatar}
        />
      ) : (
        <View style={styles.searchResultAvatarPlaceholder}>
          <IconSymbol
            ios_icon_name={item.type === 'user' ? 'person.fill' : 'building.2.fill'}
            android_material_icon_name={item.type === 'user' ? 'person' : 'business'}
            size={Platform.OS === 'ios' ? 24 : 13.2}
            color={colors.textSecondary}
          />
        </View>
      )}
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.nombre}</Text>
        {item.username && (
          <Text style={styles.searchResultUsername}>@{item.username}</Text>
        )}
        {item.type === 'local' && item.barlive_type && (
          <Text style={styles.searchResultType}>{item.barlive_type}</Text>
        )}
        {item.type === 'local' && item.provincia && (
          <Text style={styles.searchResultLocation}>{item.provincia}</Text>
        )}
      </View>
      <View style={[styles.searchResultBadge, item.type === 'local' && styles.searchResultBadgeLocal]}>
        <Text style={[styles.searchResultBadgeText, item.type === 'local' && styles.searchResultBadgeTextLocal]}>
          {item.type === 'user' ? 'Usuario' : 'Local'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <Text style={styles.headerTitle}>Social</Text>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/chats')}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={Platform.OS === 'ios' ? 22 : 12.1} color={colors.headerText} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {formatBadgeCount(unreadMessages)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/notificaciones')}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={Platform.OS === 'ios' ? 22 : 12.1} color={colors.headerText} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {formatBadgeCount(unreadNotifications)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearch(true)}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={Platform.OS === 'ios' ? 22 : 12.1} color={colors.headerText} />
            </TouchableOpacity>

            {(onCreatePress || onCreatePost) && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onCreatePress || onCreatePost}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={Platform.OS === 'ios' ? 22 : 12.1} color={colors.headerText} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <Modal
        visible={showSearch}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.searchHeader}
          >
            <TouchableOpacity
              style={styles.searchBackButton}
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={Platform.OS === 'ios' ? 24 : 13.2} color={colors.headerText} />
            </TouchableOpacity>
            
            <View style={styles.searchInputContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={Platform.OS === 'ios' ? 20 : 11} color={colors.headerText} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuarios o locales..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={Platform.OS === 'ios' ? 20 : 11} color={colors.headerText} />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>

          <View style={styles.searchContent}>
            {searchLoading ? (
              <View style={styles.searchLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.searchLoadingText}>Buscando...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                contentContainerStyle={styles.searchResultsList}
              />
            ) : searchQuery.trim().length > 0 ? (
              <View style={styles.searchEmptyState}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={Platform.OS === 'ios' ? 64 : 35.2} color={colors.textSecondary} />
                <Text style={styles.searchEmptyText}>No se encontraron resultados</Text>
                <Text style={styles.searchEmptySubtext}>
                  Intenta buscar por nombre de usuario o nombre de local
                </Text>
              </View>
            ) : (
              <View style={styles.searchEmptyState}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={Platform.OS === 'ios' ? 64 : 35.2} color={colors.textSecondary} />
                <Text style={styles.searchEmptyText}>Buscar en BarLive</Text>
                <Text style={styles.searchEmptySubtext}>
                  Busca usuarios por nombre de usuario (sin @) o locales con plan activo
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // ✅ CRITICAL v68.0: Uses HEADER_DIMENSIONS for consistency
  header: {
    paddingTop: HEADER_DIMENSIONS.paddingTop,
    paddingBottom: HEADER_DIMENSIONS.paddingBottom,
    paddingHorizontal: HEADER_DIMENSIONS.paddingHorizontal,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  // ✅ ANDROID FIX v68.0: Significantly reduced font size on Android (50% smaller)
  headerTitle: {
    fontSize: Platform.OS === 'ios' ? 32 : 16,
    fontWeight: 'bold',
    color: colors.headerText,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
    position: 'relative',
  },
  // ✅ ANDROID FIX v68.0: Badge sizes reduced by 50% on Android
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: Platform.OS === 'ios' ? 22 : 11,
    height: Platform.OS === 'ios' ? 22 : 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'ios' ? 6 : 3,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'ios' ? 10 : 5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 7 : 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  searchContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ✅ CRITICAL v68.0: Uses HEADER_DIMENSIONS for consistency
  searchHeader: {
    paddingTop: HEADER_DIMENSIONS.paddingTop,
    paddingBottom: HEADER_DIMENSIONS.paddingBottom,
    paddingHorizontal: HEADER_DIMENSIONS.paddingHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBackButton: {
    padding: 4,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: Platform.OS === 'ios' ? 16 : 8,
    color: colors.headerText,
    fontWeight: '500',
  },
  searchContent: {
    flex: 1,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  searchLoadingText: {
    marginTop: 16,
    fontSize: Platform.OS === 'ios' ? 16 : 8,
    color: colors.textSecondary,
  },
  searchResultsList: {
    padding: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'ios' ? 16 : 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  // ✅ ANDROID FIX v68.0: Avatar sizes reduced by 50% on Android
  searchResultAvatar: {
    width: Platform.OS === 'ios' ? 56 : 28,
    height: Platform.OS === 'ios' ? 56 : 28,
    borderRadius: Platform.OS === 'ios' ? 28 : 14,
    marginRight: Platform.OS === 'ios' ? 16 : 10,
  },
  searchResultAvatarPlaceholder: {
    width: Platform.OS === 'ios' ? 56 : 28,
    height: Platform.OS === 'ios' ? 56 : 28,
    borderRadius: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Platform.OS === 'ios' ? 16 : 10,
  },
  searchResultInfo: {
    flex: 1,
  },
  // ✅ ANDROID FIX v68.0: Search result text sizes reduced by 50% on Android
  searchResultName: {
    fontSize: Platform.OS === 'ios' ? 16 : 8,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultUsername: {
    fontSize: Platform.OS === 'ios' ? 14 : 7,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  searchResultType: {
    fontSize: Platform.OS === 'ios' ? 13 : 6.5,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchResultLocation: {
    fontSize: Platform.OS === 'ios' ? 12 : 6,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchResultBadge: {
    paddingHorizontal: Platform.OS === 'ios' ? 12 : 6,
    paddingVertical: Platform.OS === 'ios' ? 6 : 3,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
  },
  searchResultBadgeLocal: {
    backgroundColor: '#10B981' + '20',
  },
  searchResultBadgeText: {
    fontSize: Platform.OS === 'ios' ? 12 : 6,
    fontWeight: '700',
    color: colors.primary,
  },
  searchResultBadgeTextLocal: {
    color: '#10B981',
  },
  searchEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  searchEmptyText: {
    fontSize: Platform.OS === 'ios' ? 20 : 10,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  searchEmptySubtext: {
    fontSize: Platform.OS === 'ios' ? 15 : 7.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 22 : 11,
  },
});
