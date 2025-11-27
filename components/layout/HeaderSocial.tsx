
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Platform, TextInput, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
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

export default function HeaderSocial({
  unreadNotifications = 0,
  unreadMessages = 0,
  onSearchPress,
  onCreatePress,
  onCreatePost,
  onCreateStory,
}: HeaderSocialProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  // ✅ NEW: Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const formatBadgeCount = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  // ✅ FIXED: Search functionality with correct query to avoid ambiguous relationships
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log('[HeaderSocial] Searching for:', query);

      // Search users by username or name (without @ symbol)
      const cleanQuery = query.replace('@', '').trim().toLowerCase();
      
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`username.ilike.%${cleanQuery}%,nombre.ilike.%${cleanQuery}%`)
        .limit(10);

      if (usersError) {
        console.error('[HeaderSocial] Error searching users:', usersError);
      }

      // ✅ FIXED: Search locals with active standard or premium subscriptions
      const { data: activeSubscriptionsData, error: subsError } = await supabase
        .from('suscripciones_locales')
        .select('local_id, plan_id')
        .eq('estado', 'activa');

      if (subsError) {
        console.error('[HeaderSocial] Error fetching active subscriptions:', subsError);
      }

      // Get plan IDs for estandar and premium
      const { data: plansData, error: plansError } = await supabase
        .from('planes_suscripcion')
        .select('id, nombre')
        .in('nombre', ['estandar', 'premium']);

      if (plansError) {
        console.error('[HeaderSocial] Error fetching plans:', plansError);
      }

      const validPlanIds = (plansData || []).map(p => p.id);
      const activeLocalIds = (activeSubscriptionsData || [])
        .filter(sub => validPlanIds.includes(sub.plan_id))
        .map(sub => sub.local_id);

      console.log('[HeaderSocial] Active local IDs with valid plans:', activeLocalIds.length);

      // Now search locales with these IDs
      let localsData: any[] = [];
      if (activeLocalIds.length > 0) {
        const { data, error: localsError } = await supabase
          .from('locales')
          .select('id, nombre, imagen_url, barlive_type, provincia')
          .ilike('nombre', `%${cleanQuery}%`)
          .eq('activo', true)
          .in('id', activeLocalIds)
          .limit(10);

        if (localsError) {
          console.error('[HeaderSocial] Error searching locals:', localsError);
        } else {
          localsData = data || [];
        }
      }

      const results: SearchResult[] = [
        ...(usersData || []).map(u => ({
          id: u.id,
          type: 'user' as const,
          nombre: u.nombre,
          username: u.username,
          avatar: u.avatar,
        })),
        ...localsData.map((l: any) => ({
          id: l.id,
          type: 'local' as const,
          nombre: l.nombre,
          imagen_url: l.imagen_url,
          barlive_type: l.barlive_type,
          provincia: l.provincia,
          plan_activo: 'activo',
        })),
      ];

      console.log('[HeaderSocial] Search results:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('[HeaderSocial] Error searching:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // ✅ Debounced search
  useEffect(() => {
    if (debouncedSearchQuery) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, performSearch]);

  // ✅ FIXED: Handle search result press with proper error handling
  const handleSearchResultPress = (result: SearchResult) => {
    try {
      console.log('[HeaderSocial] Navigating to:', result.type, result.id);
      
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
        console.log('[HeaderSocial] Navigating to local profile:', result.id);
        router.push(`/perfil/local?localId=${result.id}`);
      }
    } catch (error) {
      console.error('[HeaderSocial] Error navigating to profile:', error);
      Alert.alert('Error', 'No se pudo abrir el perfil');
    }
  };

  // ✅ Render search result item
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
            size={24}
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
        <Text style={styles.searchResultBadgeText}>
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
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={24} color={colors.headerText} />
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
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={24} color={colors.headerText} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {formatBadgeCount(unreadNotifications)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* ✅ NEW: Search button */}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearch(true)}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={24} color={colors.headerText} />
            </TouchableOpacity>

            {(onCreatePress || onCreatePost) && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onCreatePress || onCreatePost}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ✅ NEW: Search Modal */}
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
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            
            <View style={styles.searchInputContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.headerText} />
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
                  <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.headerText} />
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
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={64} color={colors.textSecondary} />
                <Text style={styles.searchEmptyText}>No se encontraron resultados</Text>
                <Text style={styles.searchEmptySubtext}>
                  Intenta buscar por nombre de usuario o nombre de local
                </Text>
              </View>
            ) : (
              <View style={styles.searchEmptyState}>
                <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={64} color={colors.textSecondary} />
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
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
  headerTitle: {
    fontSize: 32,
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 12 : 10,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  // ✅ NEW: Search modal styles
  searchContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 12,
    paddingHorizontal: 16,
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
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
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
    fontSize: 16,
    color: colors.textSecondary,
  },
  searchResultsList: {
    padding: 16,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchResultAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  searchResultAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  searchResultUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  searchResultType: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  searchResultLocation: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchResultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.primary + '20',
  },
  searchResultBadgeLocal: {
    backgroundColor: '#10B981' + '20',
  },
  searchResultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  searchEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  searchEmptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  searchEmptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
