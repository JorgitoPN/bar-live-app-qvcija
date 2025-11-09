
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

const USERS_PER_PAGE = 30;

interface Usuario {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

export default function SeguidoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [seguidores, setSeguidores] = useState<Usuario[]>([]);
  const [filteredSeguidores, setFilteredSeguidores] = useState<Usuario[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const userId = params.userId as string || currentUser?.id;

  const loadSeguidores = useCallback(async (pageNum: number = 0, search: string = '') => {
    if (!userId) return;

    try {
      if (pageNum === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let query = supabase
        .from('seguidores')
        .select(`
          seguidor_id,
          usuarios!seguidores_seguidor_id_fkey(id, nombre, username, avatar)
        `)
        .eq('seguido_id', userId)
        .range(pageNum * USERS_PER_PAGE, (pageNum + 1) * USERS_PER_PAGE - 1);

      if (search) {
        query = query.or(`usuarios.nombre.ilike.%${search}%,usuarios.username.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Seguidores] Error loading:', error);
        return;
      }

      const users = data?.map((item: any) => item.usuarios).filter(Boolean) || [];

      if (pageNum === 0) {
        setSeguidores(users);
        setFilteredSeguidores(users);
      } else {
        setSeguidores(prev => [...prev, ...users]);
        setFilteredSeguidores(prev => [...prev, ...users]);
      }

      setHasMore(users.length === USERS_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error('[Seguidores] Error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSeguidores(0, searchQuery);
  }, [loadSeguidores, searchQuery]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(0);
    setHasMore(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadSeguidores(page + 1, searchQuery);
    }
  };

  const handleUserPress = (userId: string) => {
    if (userId === currentUser?.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${userId}`);
    }
  };

  const renderUser = ({ item }: { item: Usuario }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => handleUserPress(item.id)}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>{item.nombre.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.nombre}</Text>
        {item.username && (
          <Text style={styles.userUsername}>@{item.username}</Text>
        )}
      </View>
      <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
        <Text style={styles.emptyText}>
          {searchQuery ? 'No se encontraron usuarios' : 'No hay seguidores'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Seguidores</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar usuarios..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </LinearGradient>

      <FlatList
        data={filteredSeguidores}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
