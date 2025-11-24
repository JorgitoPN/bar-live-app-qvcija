
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Seguido {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
  tipo: 'usuario' | 'local'; // ✅ NEW: Distinguish between users and locals
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
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
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userBio: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  typeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default function SeguidosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [seguidos, setSeguidos] = useState<Seguido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = params.userId as string || user?.id;

  // ✅ UPDATED: Load both user following and local following
  const loadSeguidos = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[Seguidos] ⚡ Loading following (users + locals) for user:', userId);

      // Load user following (from seguidores table)
      const { data: userFollowing, error: userError } = await supabase
        .from('seguidores')
        .select(`
          seguido_id,
          usuarios!seguidores_seguido_id_fkey(
            id,
            nombre,
            username,
            avatar,
            bio
          )
        `)
        .eq('seguidor_id', userId);

      if (userError) {
        console.error('[Seguidos] Error loading user following:', userError);
      }

      // ✅ NEW: Load local following (locals favorited by this user)
      const { data: localFollowing, error: localError } = await supabase
        .from('locales_favoritos')
        .select(`
          local_id,
          locales!locales_favoritos_local_id_fkey(
            id,
            nombre,
            imagen_url,
            descripcion
          )
        `)
        .eq('usuario_id', userId);

      if (localError) {
        console.error('[Seguidos] Error loading local following:', localError);
      }

      // Combine users and locals
      const allSeguidos: Seguido[] = [];

      // Add user following
      if (userFollowing) {
        userFollowing
          .filter(s => s.usuarios)
          .forEach((s: any) => {
            allSeguidos.push({
              id: s.usuarios.id,
              nombre: s.usuarios.nombre,
              username: s.usuarios.username,
              avatar: s.usuarios.avatar,
              bio: s.usuarios.bio,
              tipo: 'usuario',
            });
          });
      }

      // ✅ NEW: Add local following
      if (localFollowing) {
        localFollowing
          .filter(s => s.locales)
          .forEach((s: any) => {
            allSeguidos.push({
              id: s.locales.id,
              nombre: s.locales.nombre,
              avatar: s.locales.imagen_url,
              bio: s.locales.descripcion,
              tipo: 'local',
            });
          });
      }

      setSeguidos(allSeguidos);
      console.log('[Seguidos] ⚡ Loaded following:', allSeguidos.length, '(users + locals)');
    } catch (error) {
      console.error('[Seguidos] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSeguidos();

    // ✅ Subscribe to real-time changes for INSTANT updates
    if (userId) {
      const channel = supabase
        .channel(`seguidos-changes-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seguidores',
            filter: `seguidor_id=eq.${userId}`,
          },
          () => {
            console.log('[Seguidos] ⚡ INSTANT update - following changed');
            loadSeguidos();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locales_favoritos',
            filter: `usuario_id=eq.${userId}`,
          },
          () => {
            console.log('[Seguidos] ⚡ INSTANT update - local favorites changed');
            loadSeguidos();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadSeguidos, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeguidos();
    setRefreshing(false);
  };

  const handleItemPress = (id: string, tipo: 'usuario' | 'local') => {
    if (tipo === 'local') {
      router.push(`/perfil/local?localId=${id}`);
    } else if (user && id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${id}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Siguiendo</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Siguiendo</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <FlatList
        data={seguidos}
        keyExtractor={(item) => `${item.tipo}-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleItemPress(item.id, item.tipo)}
            activeOpacity={0.7}
          >
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {item.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.userName}>{item.nombre}</Text>
                {item.tipo === 'local' && (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>Local</Text>
                  </View>
                )}
              </View>
              {item.username && (
                <Text style={styles.userUsername}>@{item.username}</Text>
              )}
              {item.bio && (
                <Text style={styles.userBio} numberOfLines={2}>
                  {item.bio}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No sigues a nadie aún</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
