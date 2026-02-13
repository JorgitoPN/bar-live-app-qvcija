
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
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';

/**
 * ✅ SEGUIDOS SCREEN v2.0 - UNFOLLOW BUTTON ADDED
 * 
 * NEW CHANGES v2.0:
 * - ✅ ADDED: "Dejar de seguir" button for each followed user
 * - ✅ ADDED: Confirmation before unfollowing
 * - ✅ ADDED: Optimistic UI update (instant feedback)
 * - ✅ RESULT: Users can now unfollow directly from this screen
 */

interface Seguido {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  bio?: string;
  tipo: 'usuario' | 'local';
  localId?: string;
  hasPaymentPlan?: boolean;
}

export default function SeguidosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  
  const [seguidos, setSeguidos] = useState<Seguido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());
  
  const userId = params.userId as string;
  const isOwnProfile = user?.id === userId;

  const loadSeguidos = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('[Seguidos v2.0] 📥 Loading ONLY FOLLOWED profiles (social network) for user:', userId);
      console.log('[Seguidos v2.0] ⚠️ EXCLUDING saved locals from "Locales favoritos"');

      const { data, error } = await supabase
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

      if (error) {
        console.error('[Seguidos v2.0] ❌ Error loading seguidos:', error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('[Seguidos v2.0] Raw data from seguidores table:', data);

      const formattedSeguidos: Seguido[] = [];

      if (data) {
        for (const item of data) {
          if (item.usuarios) {
            const { data: ownedLocals } = await supabase
              .from('locales')
              .select('id, nombre, imagen_url')
              .eq('propietario_id', item.usuarios.id)
              .limit(1);

            let hasPaymentPlan = false;
            let localData = null;

            if (ownedLocals && ownedLocals.length > 0) {
              const localId = ownedLocals[0].id;
              localData = ownedLocals[0];

              const { data: subscription } = await supabase
                .from('suscripciones_locales')
                .select('id')
                .eq('local_id', localId)
                .eq('estado', 'activa')
                .single();

              hasPaymentPlan = !!subscription;
            }

            if (hasPaymentPlan && localData) {
              formattedSeguidos.push({
                id: localData.id,
                nombre: localData.nombre,
                username: undefined,
                avatar: localData.imagen_url,
                bio: undefined,
                tipo: 'local' as const,
                localId: localData.id,
                hasPaymentPlan: true,
              });
            } else {
              formattedSeguidos.push({
                id: item.usuarios.id,
                nombre: item.usuarios.nombre,
                username: item.usuarios.username,
                avatar: item.usuarios.avatar,
                bio: item.usuarios.bio,
                tipo: 'usuario' as const,
                localId: undefined,
                hasPaymentPlan: false,
              });
            }
          }
        }
      }

      setSeguidos(formattedSeguidos);
      
      const localCount = formattedSeguidos.filter(s => s.tipo === 'local').length;
      const userCount = formattedSeguidos.filter(s => s.tipo === 'usuario').length;
      
      console.log('[Seguidos v2.0] ✅ Loaded', formattedSeguidos.length, 'seguidos from SOCIAL NETWORK ONLY');
      console.log('[Seguidos v2.0] 🏪 Local profiles:', localCount);
      console.log('[Seguidos v2.0] 👤 User profiles:', userCount);
      console.log('[Seguidos v2.0] ✅ Favorites (locales_guardados) are NOT included here');
    } catch (error) {
      console.error('[Seguidos v2.0] ❌ Error:', error);
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
    try {
      if (seguido.tipo === 'local' && seguido.localId) {
        console.log('[Seguidos v2.0] 🏪 Opening local profile:', seguido.nombre, seguido.localId);
        router.push(`/perfil/local?localId=${seguido.localId}`);
      } else {
        console.log('[Seguidos v2.0] 👤 Opening user profile:', seguido.nombre);
        if (user && seguido.id === user.id) {
          router.push('/(tabs)/perfil');
        } else {
          router.push(`/perfil/usuario?userId=${seguido.id}`);
        }
      }
    } catch (error) {
      console.error('[Seguidos v2.0] ❌ Error navigating to profile:', error);
      alert('No se pudo abrir el perfil. Por favor, intenta de nuevo.');
    }
  };

  const handleUnfollow = useCallback(async (seguido: Seguido) => {
    if (!user || !userId) return;

    const displayName = seguido.username 
      ? `@${seguido.username}` 
      : seguido.nombre;

    Alert.alert(
      'Dejar de seguir',
      `¿Estás seguro de que quieres dejar de seguir a ${displayName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dejar de seguir',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Seguidos v2.0] 🔄 Unfollowing user:', seguido.id);
              
              setUnfollowingIds(prev => new Set(prev).add(seguido.id));
              
              setSeguidos(prev => prev.filter(s => s.id !== seguido.id));

              const { error } = await supabase
                .from('seguidores')
                .delete()
                .eq('seguidor_id', userId)
                .eq('seguido_id', seguido.id);

              if (error) {
                console.error('[Seguidos v2.0] ❌ Error unfollowing:', error);
                
                setSeguidos(prev => [...prev, seguido].sort((a, b) => a.nombre.localeCompare(b.nombre)));
                
                Alert.alert('Error', 'No se pudo dejar de seguir. Intenta de nuevo.');
              } else {
                console.log('[Seguidos v2.0] ✅ Successfully unfollowed');
              }
            } catch (error) {
              console.error('[Seguidos v2.0] ❌ Error:', error);
              Alert.alert('Error', 'Ocurrió un error. Intenta de nuevo.');
            } finally {
              setUnfollowingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(seguido.id);
                return newSet;
              });
            }
          },
        },
      ]
    );
  }, [user, userId]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/perfil');
    }
  };

  const backIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const emptyIconSize = Platform.OS === 'android' ? scaleIconSize(64) : 64;
  const avatarSize = Platform.OS === 'android' ? scaleIconSize(56) : 56;
  const avatarRadius = avatarSize / 2;
  const avatarTextSize = Platform.OS === 'android' ? scaleFontSize(20) : 20;
  const storeIconSize = Platform.OS === 'android' ? scaleIconSize(24) : 24;
  const verifiedIconSize = Platform.OS === 'android' ? scaleIconSize(18) : 18;
  const localBadgeIconSize = Platform.OS === 'android' ? scaleIconSize(12) : 12;
  const chevronIconSize = Platform.OS === 'android' ? scaleIconSize(20) : 20;
  const unfollowIconSize = Platform.OS === 'android' ? scaleIconSize(18) : 18;

  const renderSeguido = ({ item }: { item: Seguido }) => {
    const isUnfollowing = unfollowingIds.has(item.id);

    return (
      <View style={styles.userItemContainer}>
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => handleUserPress(item)}
          activeOpacity={0.7}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={[styles.userAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]} />
          ) : (
            <View style={[styles.userAvatar, styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]}>
              {item.tipo === 'local' ? (
                <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={storeIconSize} color={colors.primary} />
              ) : (
                <Text style={[styles.avatarText, { fontSize: avatarTextSize }]}>
                  {item.nombre.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          )}
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { fontSize: scaleFontSize(16) }]}>{item.nombre}</Text>
              {item.tipo === 'local' && item.hasPaymentPlan && (
                <View style={styles.verifiedBadge}>
                  <IconSymbol 
                    ios_icon_name="checkmark.seal.fill" 
                    android_material_icon_name="verified" 
                    size={verifiedIconSize} 
                    color={colors.primary} 
                  />
                </View>
              )}
              {item.tipo === 'local' && (
                <View style={styles.localBadge}>
                  <IconSymbol ios_icon_name="building.2" android_material_icon_name="store" size={localBadgeIconSize} color={colors.primary} />
                  <Text style={[styles.localBadgeText, { fontSize: scaleFontSize(11) }]}>Local</Text>
                </View>
              )}
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
          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron_right" size={chevronIconSize} color={colors.textSecondary} />
        </TouchableOpacity>

        {isOwnProfile && (
          <TouchableOpacity
            style={styles.unfollowButton}
            onPress={() => handleUnfollow(item)}
            disabled={isUnfollowing}
            activeOpacity={0.7}
          >
            {isUnfollowing ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <IconSymbol 
                  ios_icon_name="person.fill.xmark" 
                  android_material_icon_name="person_remove" 
                  size={unfollowIconSize} 
                  color={colors.danger} 
                />
                <Text style={[styles.unfollowButtonText, { fontSize: scaleFontSize(14) }]}>
                  Dejar de seguir
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={backIconSize} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: scaleFontSize(20) }]}>
          {isOwnProfile ? 'Siguiendo' : 'Siguiendo'}
        </Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { fontSize: scaleFontSize(14) }]}>Cargando seguidos...</Text>
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
              <IconSymbol ios_icon_name="person.2" android_material_icon_name="people" size={emptyIconSize} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { fontSize: scaleFontSize(16) }]}>
                {isOwnProfile ? 'No sigues a nadie aún' : 'No sigue a nadie aún'}
              </Text>
              <Text style={[styles.emptySubtext, { fontSize: scaleFontSize(14) }]}>
                Sigue a usuarios y perfiles de locales para ver su contenido aquí
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
    fontWeight: 'bold',
    color: colors.headerText,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  listContent: {
    flexGrow: 1,
  },
  userItemContainer: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userName: {
    fontWeight: '600',
    color: colors.text,
  },
  verifiedBadge: {
    marginLeft: 2,
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
    fontWeight: '600',
    color: colors.primary,
  },
  userUsername: {
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userBio: {
    color: colors.text,
    lineHeight: 18,
  },
  unfollowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.danger + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  unfollowButtonText: {
    fontWeight: '600',
    color: colors.danger,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
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
  },
});
