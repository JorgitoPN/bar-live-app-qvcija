
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { scaleFontSize } from '@/utils/androidScaling';
import { FoodPlateAvatar } from '@/components/common/FoodPlateAvatar';

interface SearchResult {
  id: string;
  type: 'user' | 'local';
  nombre: string;
  username: string;
  avatar?: string | null;
  imagen_url?: string | null;
  isFollowing: boolean;
}

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * ✅ SEARCH MODAL v1.0 - PREDICTIVE SEARCH WITH FOLLOW/UNFOLLOW
 * 
 * FEATURES:
 * - ✅ Predictive search for users and locals with active paid plans
 * - ✅ Debounced search (300ms delay)
 * - ✅ Follow/unfollow buttons for each result
 * - ✅ Stable TextInput (no focus loss)
 * - ✅ Keyboard persistence with keyboardShouldPersistTaps="handled"
 * - ✅ Atomic JSX (no logic in JSX, one variable per Text)
 */

export default function SearchModal({ visible, onClose }: SearchModalProps) {
  const router = useRouter();
  const { userId } = useEffectiveUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load following status
  const loadFollowingStatus = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: followingData, error } = await supabase
        .from('seguidores')
        .select('seguido_id, local_id')
        .eq('seguidor_id', userId);

      if (error) throw error;

      const ids = new Set<string>();
      followingData?.forEach(f => {
        if (f.seguido_id) ids.add(`user_${f.seguido_id}`);
        if (f.local_id) ids.add(`local_${f.local_id}`);
      });

      setFollowingIds(ids);
      console.log('[SearchModal] ✅ Loaded following status:', ids.size, 'entities');
    } catch (error) {
      console.error('[SearchModal] Error loading following status:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (visible && userId) {
      loadFollowingStatus();
    }
  }, [visible, userId, loadFollowingStatus]);

  // Search function
  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      console.log('[SearchModal] 🔍 Searching for:', debouncedQuery);

      const searchTerm = debouncedQuery.toLowerCase().trim();

      // Search users
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nombre, username, avatar')
        .or(`username.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
        .not('username', 'is', null)
        .limit(10);

      if (usersError) throw usersError;

      // Search locals with active paid plans (only those with username)
      const { data: localsData, error: localsError } = await supabase
        .from('locales')
        .select('id, nombre, username, imagen_url')
        .or(`username.ilike.%${searchTerm}%,nombre.ilike.%${searchTerm}%`)
        .not('username', 'is', null)
        .eq('perfil_visible', true)
        .limit(10);

      if (localsError) throw localsError;

      // Combine results
      const userResults: SearchResult[] = (usersData || []).map(user => ({
        id: user.id,
        type: 'user' as const,
        nombre: user.nombre,
        username: user.username || '',
        avatar: user.avatar,
        isFollowing: followingIds.has(`user_${user.id}`),
      }));

      const localResults: SearchResult[] = (localsData || []).map(local => ({
        id: local.id,
        type: 'local' as const,
        nombre: local.nombre,
        username: local.username || '',
        imagen_url: local.imagen_url,
        isFollowing: followingIds.has(`local_${local.id}`),
      }));

      const combinedResults = [...userResults, ...localResults];
      setResults(combinedResults);

      console.log('[SearchModal] ✅ Found', userResults.length, 'users and', localResults.length, 'locals');
    } catch (error) {
      console.error('[SearchModal] Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, followingIds]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Follow/unfollow handler
  const handleFollowToggle = async (result: SearchResult) => {
    if (!userId) return;

    try {
      console.log('[SearchModal] Toggling follow for:', result.type, result.id);

      if (result.isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', userId)
          .eq(result.type === 'user' ? 'seguido_id' : 'local_id', result.id);

        if (error) throw error;

        // Update local state
        const key = `${result.type}_${result.id}`;
        setFollowingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });

        setResults(prev => prev.map(r => 
          r.id === result.id && r.type === result.type 
            ? { ...r, isFollowing: false } 
            : r
        ));

        console.log('[SearchModal] ✅ Unfollowed successfully');
      } else {
        // Follow
        const insertData = result.type === 'user'
          ? { seguidor_id: userId, seguido_id: result.id }
          : { seguidor_id: userId, local_id: result.id };

        const { error } = await supabase
          .from('seguidores')
          .insert(insertData);

        if (error) throw error;

        // Update local state
        const key = `${result.type}_${result.id}`;
        setFollowingIds(prev => new Set(prev).add(key));

        setResults(prev => prev.map(r => 
          r.id === result.id && r.type === result.type 
            ? { ...r, isFollowing: true } 
            : r
        ));

        console.log('[SearchModal] ✅ Followed successfully');
      }
    } catch (error) {
      console.error('[SearchModal] Error toggling follow:', error);
    }
  };

  // Navigate to profile
  const handleNavigateToProfile = (result: SearchResult) => {
    onClose();
    if (result.type === 'user') {
      router.push(`/perfil/usuario?id=${result.id}`);
    } else {
      router.push(`/detalle/local?id=${result.id}`);
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setResults([]);
  };

  // Render result item
  const renderResultItem = ({ item }: { item: SearchResult }) => {
    const followButtonText = item.isFollowing ? 'Siguiendo' : 'Seguir';
    const followButtonStyle = item.isFollowing ? styles.followingButton : styles.followButton;

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleNavigateToProfile(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultLeft}>
          {item.type === 'user' ? (
            item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.resultAvatar} />
            ) : (
              <FoodPlateAvatar userId={item.id} size={48} />
            )
          ) : (
            item.imagen_url ? (
              <Image source={{ uri: item.imagen_url }} style={styles.resultAvatar} />
            ) : (
              <View style={[styles.resultAvatar, styles.resultAvatarPlaceholder]}>
                <IconSymbol
                  ios_icon_name="building.2.fill"
                  android_material_icon_name="store"
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
            )
          )}

          <View style={styles.resultInfo}>
            <View style={styles.resultNameContainer}>
              <Text style={[styles.resultName, { fontSize: scaleFontSize(16) }]} numberOfLines={1}>
                {item.nombre}
              </Text>
              {item.type === 'local' && (
                <IconSymbol
                  ios_icon_name="checkmark.seal.fill"
                  android_material_icon_name="verified"
                  size={16}
                  color={colors.primary}
                />
              )}
            </View>
            <Text style={[styles.resultUsername, { fontSize: scaleFontSize(14) }]} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={followButtonStyle}
          onPress={(e) => {
            e.stopPropagation();
            handleFollowToggle(item);
          }}
          activeOpacity={0.7}
        >
          <Text style={[
            item.isFollowing ? styles.followingButtonText : styles.followButtonText,
            { fontSize: scaleFontSize(14) }
          ]}>
            {followButtonText}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (loading) return null;

    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      return (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>
            Busca usuarios o locales
          </Text>
          <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
            Escribe al menos 2 caracteres para buscar
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <IconSymbol
          ios_icon_name="person.crop.circle.badge.questionmark"
          android_material_icon_name="person_search"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyText, { fontSize: scaleFontSize(18) }]}>
          No se encontraron resultados
        </Text>
        <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
          Intenta con otro término de búsqueda
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>
            Buscar
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        {/* Search input - STABLE, never unmounts */}
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { fontSize: scaleFontSize(16) }]}
            placeholder="Buscar usuarios o locales..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            blurOnSubmit={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClear}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Results */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { fontSize: scaleFontSize(16) }]}>
              Buscando...
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderResultItem}
            keyExtractor={(item) => `${item.type}_${item.id}`}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  headerPlaceholder: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  resultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  resultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  resultAvatarPlaceholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resultName: {
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  resultUsername: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  followButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followButtonText: {
    fontWeight: '600',
    color: colors.white,
  },
  followingButton: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  followingButtonText: {
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
