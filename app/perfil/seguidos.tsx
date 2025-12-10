
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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

interface Seguido {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
  tipo: 'usuario' | 'local'; // ✅ NEW: Track type
}

export default function SeguidosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const [seguidos, setSeguidos] = useState<Seguido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const userId = params.userId as string;
  const isOwnProfile = user?.id === userId;

  const loadSeguidos = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[Seguidos] Loading seguidos for user:', userId);

      // ✅ FIXED: Load BOTH users and locals that the user follows
      const [usersResult, localsResult] = await Promise.all([
        // Load followed users
        supabase
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
          .eq('seguidor_id', userId),
        
        // ✅ NEW: Load followed locals
        supabase
          .from('locales_favoritos')
          .select(`
            local_id,
            locales!locales_favoritos_local_id_fkey(
              id,
              nombre,
              imagen_url,
              descripcion_google
            )
          `)
          .eq('usuario_id', userId)
      ]);

      if (usersResult.error) {
        console.error('[Seguidos] Error loading followed users:', usersResult.error);
      }

      if (localsResult.error) {
        console.error('[Seguidos] Error loading followed locals:', localsResult.error);
      }

      // Format followed users
      const formattedUsers: Seguido[] = (usersResult.data || [])
        .filter(s => s.usuarios)
        .map((s: any) => ({
          id: s.usuarios.id,
          nombre: s.usuarios.nombre,
          username: s.usuarios.username,
          avatar: s.usuarios.avatar,
          bio: s.usuarios.bio,
          tipo: 'usuario' as const,
        }));

      // ✅ NEW: Format followed locals
      const formattedLocals: Seguido[] = (localsResult.data || [])
        .filter(s => s.locales)
        .map((s: any) => ({
          id: s.locales.id,
          nombre: s.locales.nombre,
          username: undefined, // Locals don't have usernames
          avatar: s.locales.imagen_url,
          bio: s.locales.descripcion_google,
          tipo: 'local' as const,
        }));

      // ✅ FIXED: Combine both users and locals
      const allSeguidos = [...formattedUsers, ...formattedLocals];

      setSeguidos(allSeguidos);
      console.log('[Seguidos] ✅ Loaded', formattedUsers.length, 'users and', formattedLocals.length, 'locals');
    } catch (error) {
      console.error('[Seguidos] Error loading seguidos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSeguidos();
  }, [loadSeguidos]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSeguidos();
  };

  const handleUserPress = (seguido: Seguido) => {
    if (seguido.tipo === 'local') {
      // Navigate to local profile
      router.push(`/perfil/local?localId=${seguido.id}`);
    } else {
      // Navigate to user profile
      if (user && seguido.id === user.id) {
        router.push('/(tabs)/perfil');
      } else {
        router.push(`/perfil/usuario?userId=${seguido.id}`);
      }
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/perfil');
    }
  };

  const renderSeguido = ({ item }: { item: Seguido }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
      ) : (
        <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
          {item.tipo === 'local' ? (
            <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={24} color={colors.primary} />
          ) : (
            <Text style={styles.avatarText}>
              {item.nombre.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
      )}
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.nombre}</Text>
          {/* ✅ NEW: Show badge for locals */}
          {item.tipo === 'local' && (
            <View style={styles.localBadge}>
              <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={12} color={colors.primary} />
              <Text style={styles.localBadgeText}>Local</Text>
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
      <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isOwnProfile ? 'Siguiendo' : 'Siguiendo'}
        </Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={seguidos}
          keyExtractor={(item) => `${item.tipo}-${item.id}`}
          renderItem={renderSeguido}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {isOwnProfile ? 'No sigues a nadie aún' : 'No sigue a nadie aún'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
  backButton: {
    padding: 8,
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
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  listContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  localBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
