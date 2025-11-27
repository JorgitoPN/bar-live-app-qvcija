
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView, Platform, TextInput, FlatList, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
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
  const { currentMode, setCurrentMode } = useMode();
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // ✅ NEW: Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const userRole = user?.rol_app || 'cliente';
  const canSwitchMode = userRole === 'propietario' || userRole === 'admin';

  const getModeLabel = (mode: 'cliente' | 'propietario' | 'admin') => {
    switch (mode) {
      case 'cliente':
        return 'Cliente';
      case 'propietario':
        return 'Propietario';
      case 'admin':
        return 'Admin';
      default:
        return 'Cliente';
    }
  };

  const getModeIcon = (mode: 'cliente' | 'propietario' | 'admin') => {
    switch (mode) {
      case 'cliente':
        return 'person.fill';
      case 'propietario':
        return 'building.2.fill';
      case 'admin':
        return 'shield.fill';
      default:
        return 'person.fill';
    }
  };

  const availableModes: ('cliente' | 'propietario' | 'admin')[] = [];
  availableModes.push('cliente');
  if (userRole === 'propietario' || userRole === 'admin') {
    availableModes.push('propietario');
  }
  if (userRole === 'admin') {
    availableModes.push('admin');
  }

  const handleModeChange = async (mode: 'cliente' | 'propietario' | 'admin') => {
    await setCurrentMode(mode);
    setShowModeSelector(false);
  };

  const formatBadgeCount = (count: number): string => {
    if (count > 99) return '99+';
    return count.toString();
  };

  // ✅ FIXED: Search functionality with correct query for locales with active subscriptions
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
      // Join with suscripciones_locales and planes_suscripcion to filter by active plans
      const { data: localsData, error: localsError } = await supabase
        .from('locales')
        .select(`
          id, 
          nombre, 
          imagen_url, 
          barlive_type, 
          provincia,
          suscripciones_locales!inner(
            estado,
            planes_suscripcion!inner(
              nombre
            )
          )
        `)
        .ilike('nombre', `%${cleanQuery}%`)
        .eq('activo', true)
        .eq('suscripciones_locales.estado', 'activa')
        .in('suscripciones_locales.planes_suscripcion.nombre', ['estandar', 'premium'])
        .limit(10);

      if (localsError) {
        console.error('[HeaderSocial] Error searching locals:', localsError);
      }

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
          imagen_url: l.imagen_url,
          barlive_type: l.barlive_type,
          provincia: l.provincia,
          plan_activo: l.suscripciones_locales?.[0]?.planes_suscripcion?.nombre || '',
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

  // ✅ Handle search result press
  const handleSearchResultPress = (result: SearchResult) => {
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
      router.push(`/perfil/local?localId=${result.id}`);
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
            {canSwitchMode && (
              <TouchableOpacity
                style={styles.modeSelectorButton}
                onPress={() => setShowModeSelector(true)}
                activeOpacity={0.7}
              >
                <IconSymbol ios_icon_name={getModeIcon(currentMode)} android_material_icon_name={getModeIcon(currentMode)} size={16} color={colors.headerText} />
                <Text style={styles.modeSelectorText}>{getModeLabel(currentMode)}</Text>
                <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={14} color={colors.headerText} />
              </TouchableOpacity>
            )}
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

      {/* Mode Selector Modal */}
      <Modal
        visible={showModeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModeSelector(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowModeSelector(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Modo</Text>
              <TouchableOpacity onPress={() => setShowModeSelector(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {availableModes.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeOption,
                    currentMode === mode && styles.modeOptionActive,
                  ]}
                  onPress={() => handleModeChange(mode)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.modeIconContainer,
                    currentMode === mode && styles.modeIconContainerActive,
                  ]}>
                    <IconSymbol 
                      ios_icon_name={getModeIcon(mode)} 
                      android_material_icon_name={getModeIcon(mode)}
                      size={24} 
                      color={currentMode === mode ? colors.headerText : colors.primary} 
                    />
                  </View>
                  <View style={styles.modeInfo}>
                    <Text style={[
                      styles.modeLabel,
                      currentMode === mode && styles.modeLabelActive,
                    ]}>
                      {getModeLabel(mode)}
                    </Text>
                    <Text style={styles.modeDescription}>
                      {mode === 'cliente' && 'Vista de usuario normal'}
                      {mode === 'propietario' && 'Gestiona tus locales'}
                      {mode === 'admin' && 'Panel de administración'}
                    </Text>
                  </View>
                  {currentMode === mode && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
  modeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 16,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modeOptionActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeIconContainerActive: {
    backgroundColor: colors.primary,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  modeLabelActive: {
    color: colors.primary,
  },
  modeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
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
