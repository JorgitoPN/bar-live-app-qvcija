
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
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

interface Seguidor {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
  tipo: 'usuario' | 'local';
}

export default function SeguidoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [seguidores, setSeguidores] = useState<Seguidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = params.userId as string || user?.id;
  const isOwnProfile = user && userId === user.id;

  const loadSeguidores = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[Seguidores] ⚡ Loading followers for user:', userId);

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
        console.error('[Seguidores] Error loading followers:', userError);
      }

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

      const allFollowers = new Map<string, Seguidor>();

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

  const handleRemoveFollower = useCallback(async (followerId: string, followerName: string) => {
    if (!user || !isOwnProfile) return;

    Alert.alert(
      'Eliminar seguidor',
      `¿Estás seguro de que quieres eliminar a ${followerName} de tus seguidores?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('seguidores')
                .delete()
                .eq('seguidor_id', followerId)
                .eq('seguido_id', user.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Seguidor eliminado');
              await loadSeguidores();
            } catch (error) {
              console.error('[Seguidores] Error removing follower:', error);
              Alert.alert('Error', 'No se pudo eliminar el seguidor');
            }
          },
        },
      ]
    );
  }, [user, isOwnProfile, loadSeguidores]);

  // ✅ ANDROID SCALING: Icon sizes
  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const emptyIconSize = Platform.OS === 'android' ? scaleIconSize(64) : 64;
  const avatarSize = Platform.OS === 'android' ? scaleIconSize(56) : 56;
  const avatarRadius = avatarSize / 2;
  const avatarTextSize = Platform.OS === 'android' ? scaleFontSize(20) : 20;

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={backIconSize} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Seguidores</Text>
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
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={backIconSize} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>Seguidores</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <FlatList
        data={seguidores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.userItem}
            onPress={() => handleUserPress(item.id, item.tipo)}
            activeOpacity={0.7}
          >
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]}>
                <Text style={[styles.avatarText, { fontSize: avatarTextSize }]}>
                  {item.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.userName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
              </View>
              {item.username && (
                <Text style={[styles.userUsername, { fontSize: scaleFontSize(14) }]}>@{item.username}</Text>
              )}
              {item.bio && (
                <Text style={[styles.userBio, { fontSize: scaleFontSize(13) }]} numberOfLines={2}>
                  {item.bio}
                </Text>
              )}
            </View>
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFollower(item.id, item.nombre)}
                activeOpacity={0.7}
              >
                <Text style={[styles.removeButtonText, { fontSize: scaleFontSize(13) }]}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={emptyIconSize} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>No hay seguidores aún</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
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
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: colors.headerText,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  userUsername: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userBio: {
    color: colors.text,
    lineHeight: 18,
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.error + '20',
    borderRadius: 16,
    marginLeft: 8,
  },
  removeButtonText: {
    fontWeight: '600',
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
