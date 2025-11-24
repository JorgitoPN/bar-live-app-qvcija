
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

interface Seguidor {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
  tipo: 'usuario' | 'local';
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
  userFullName: {
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

export default function SeguidoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [seguidores, setSeguidores] = useState<Seguidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = params.userId as string || user?.id;

  const loadSeguidores = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[Seguidores] ⚡ Loading followers (users + locals) for user:', userId);

      // Load user followers (from seguidores table)
      const { data: userFollowers, error: userError } = await supabase
        .from('seguidores')
        .select(`
          seguidor_id,
          usuarios!seguidores_seguidor_id_fkey(
            id,
            nombre,
            username,
            avatar,
            bio
          )
        `)
        .eq('seguido_id', userId);

      if (userError) {
        console.error('[Seguidores] Error loading user followers:', userError);
      }

      // Load local followers (users who favorited locals owned by this user)
      const { data: ownedLocals, error: localsError } = await supabase
        .from('locales')
        .select('id')
        .eq('propietario_id', userId);

      let localFollowers: any[] = [];
      if (!localsError && ownedLocals && ownedLocals.length > 0) {
        const localIds = ownedLocals.map(l => l.id);
        
        const { data: localFavs, error: localFavsError } = await supabase
          .from('locales_favoritos')
          .select(`
            usuario_id,
            usuarios!locales_favoritos_usuario_id_fkey(
              id,
              nombre,
              username,
              avatar,
              bio
            )
          `)
          .in('local_id', localIds);

        if (!localFavsError && localFavs) {
          localFollowers = localFavs;
        }
      }

      // Combine and deduplicate followers
      const allFollowers = new Map<string, Seguidor>();

      // Add user followers
      if (userFollowers) {
        userFollowers
          .filter(s => s.usuarios)
          .forEach((s: any) => {
            allFollowers.set(s.usuarios.id, {
              id: s.usuarios.id,
              nombre: s.usuarios.nombre,
              username: s.usuarios.username,
              avatar: s.usuarios.avatar,
              bio: s.usuarios.bio,
              tipo: 'usuario',
            });
          });
      }

      // Add local followers (deduplicate if user already follows directly)
      if (localFollowers) {
        localFollowers
          .filter(s => s.usuarios)
          .forEach((s: any) => {
            if (!allFollowers.has(s.usuarios.id)) {
              allFollowers.set(s.usuarios.id, {
                id: s.usuarios.id,
                nombre: s.usuarios.nombre,
                username: s.usuarios.username,
                avatar: s.usuarios.avatar,
                bio: s.usuarios.bio,
                tipo: 'usuario',
              });
            }
          });
      }

      const formattedSeguidores = Array.from(allFollowers.values());
      setSeguidores(formattedSeguidores);
      console.log('[Seguidores] ⚡ Loaded followers:', formattedSeguidores.length);
    } catch (error) {
      console.error('[Seguidores] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSeguidores();

    // Subscribe to real-time changes for INSTANT updates
    if (userId) {
      const channel = supabase
        .channel(`seguidores-changes-${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'seguidores',
            filter: `seguido_id=eq.${userId}`,
          },
          () => {
            console.log('[Seguidores] ⚡ INSTANT update - followers changed');
            loadSeguidores();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locales_favoritos',
          },
          () => {
            console.log('[Seguidores] ⚡ INSTANT update - local favorites changed');
            loadSeguidores();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [loadSeguidores, userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSeguidores();
    setRefreshing(false);
  };

  const handleUserPress = (userId: string, tipo: 'usuario' | 'local') => {
    if (tipo === 'local') {
      router.push(`/perfil/local?localId=${userId}`);
    } else if (user && userId === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${userId}`);
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
          <Text style={styles.headerTitle}>Seguidores</Text>
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
        <Text style={styles.headerTitle}>Seguidores</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <FlatList
        data={seguidores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // ✅ UPDATED: Display username as primary identifier
          const displayUsername = item.username || item.nombre;
          const showFullName = item.username && item.nombre !== item.username;
          
          return (
            <TouchableOpacity
              style={styles.userItem}
              onPress={() => handleUserPress(item.id, item.tipo)}
              activeOpacity={0.7}
            >
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {displayUsername.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.userName}>{displayUsername}</Text>
                </View>
                {showFullName && (
                  <Text style={styles.userFullName}>{item.nombre}</Text>
                )}
                {item.bio && (
                  <Text style={styles.userBio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay seguidores aún</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}
