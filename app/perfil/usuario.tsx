
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

const { width } = Dimensions.get('window');

export default function UsuarioPerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuario, setUsuario] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [stats, setStats] = useState({
    posts: 0,
    seguidores: 0,
    seguidos: 0,
  });

  const userId = params.userId as string;

  const loadUserData = useCallback(async () => {
    if (!userId) {
      router.back();
      return;
    }

    try {
      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('[UsuarioPerfil] Error loading user:', userError);
        Alert.alert('Error', 'No se pudo cargar el perfil del usuario');
        router.back();
        return;
      }

      setUsuario(userData);

      // Load user posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('autor_id', userId)
        .order('created_at', { ascending: false });

      if (!postsError) {
        setPosts(postsData || []);
      }

      // Load stats
      const { count: postsCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', userId);

      setStats({
        posts: postsCount || 0,
        seguidores: userData.seguidores || 0,
        seguidos: userData.seguidos || 0,
      });

      // Check if current user is following this user
      if (currentUser) {
        const { data: followData } = await supabase
          .from('seguidores')
          .select('id')
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', userId)
          .single();

        setIsFollowing(!!followData);

        // Check if user is blocked
        const { data: blockData } = await supabase
          .from('usuarios_bloqueados')
          .select('id')
          .eq('usuario_id', currentUser.id)
          .eq('bloqueado_id', userId)
          .single();

        setIsBlocked(!!blockData);
      }
    } catch (error) {
      console.error('[UsuarioPerfil] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser, router]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para seguir usuarios');
      return;
    }

    try {
      if (isFollowing) {
        // Unfollow
        await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', currentUser.id)
          .eq('seguido_id', userId);

        // Update counters
        await supabase
          .from('usuarios')
          .update({ seguidores: Math.max(0, stats.seguidores - 1) })
          .eq('id', userId);

        await supabase
          .from('usuarios')
          .update({ seguidos: Math.max(0, (currentUser as any).seguidos - 1) })
          .eq('id', currentUser.id);

        setIsFollowing(false);
        setStats(prev => ({ ...prev, seguidores: Math.max(0, prev.seguidores - 1) }));
      } else {
        // Follow
        await supabase
          .from('seguidores')
          .insert({
            seguidor_id: currentUser.id,
            seguido_id: userId,
          });

        // Update counters
        await supabase
          .from('usuarios')
          .update({ seguidores: stats.seguidores + 1 })
          .eq('id', userId);

        await supabase
          .from('usuarios')
          .update({ seguidos: ((currentUser as any).seguidos || 0) + 1 })
          .eq('id', currentUser.id);

        // Create notification
        await supabase
          .from('notificaciones')
          .insert({
            usuario_id: userId,
            tipo: 'seguidor',
            titulo: 'Nuevo seguidor',
            mensaje: `${currentUser.nombre} ha comenzado a seguirte`,
            usuario_origen_id: currentUser.id,
          });

        setIsFollowing(true);
        setStats(prev => ({ ...prev, seguidores: prev.seguidores + 1 }));
      }
    } catch (error) {
      console.error('[UsuarioPerfil] Error toggling follow:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const handleMessage = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para enviar mensajes');
      return;
    }

    // Navigate directly to conversation with this user (DIRECT MESSAGE)
    router.push(`/chat/conversacion?userId=${userId}`);
  };

  const handleBlock = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Debes iniciar sesión para bloquear usuarios');
      return;
    }

    Alert.alert(
      isBlocked ? 'Desbloquear usuario' : 'Bloquear usuario',
      isBlocked
        ? `¿Deseas desbloquear a ${usuario?.nombre}?`
        : `¿Estás seguro de que quieres bloquear a ${usuario?.nombre}? No podrás ver su contenido ni interactuar con él.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isBlocked ? 'Desbloquear' : 'Bloquear',
          style: isBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (isBlocked) {
                // Unblock
                await supabase
                  .from('usuarios_bloqueados')
                  .delete()
                  .eq('usuario_id', currentUser.id)
                  .eq('bloqueado_id', userId);

                setIsBlocked(false);
                Alert.alert('Éxito', 'Usuario desbloqueado');
              } else {
                // Block
                await supabase
                  .from('usuarios_bloqueados')
                  .insert({
                    usuario_id: currentUser.id,
                    bloqueado_id: userId,
                  });

                // Unfollow if following
                if (isFollowing) {
                  await supabase
                    .from('seguidores')
                    .delete()
                    .eq('seguidor_id', currentUser.id)
                    .eq('seguido_id', userId);

                  setIsFollowing(false);
                }

                setIsBlocked(true);
                Alert.alert('Éxito', 'Usuario bloqueado');
              }
            } catch (error) {
              console.error('[UsuarioPerfil] Error toggling block:', error);
              Alert.alert('Error', 'No se pudo completar la acción');
            }
          },
        },
      ]
    );
  };

  const handleVerPost = (postId: string) => {
    router.push(`/social/post?id=${postId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!usuario) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.text }}>Usuario no encontrado</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>{usuario.username || usuario.nombre}</Text>
          <TouchableOpacity onPress={handleBlock} style={styles.headerButton}>
            <IconSymbol
              name={isBlocked ? 'person.fill.checkmark' : 'person.fill.xmark'}
              size={24}
              color={colors.headerText}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          {usuario.avatar ? (
            <Image source={{ uri: usuario.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{usuario.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/perfil/seguidores?userId=${userId}`)}
            >
              <Text style={styles.statNumber}>{stats.seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => router.push(`/perfil/seguidos?userId=${userId}`)}
            >
              <Text style={styles.statNumber}>{stats.seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{usuario.nombre}</Text>
          {usuario.username && (
            <Text style={styles.userUsername}>@{usuario.username}</Text>
          )}
        </View>

        {usuario.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{usuario.bio}</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, isFollowing && styles.actionButtonFollowing]}
            onPress={handleFollow}
          >
            <Text style={[styles.actionButtonText, isFollowing && styles.actionButtonTextFollowing]}>
              {isFollowing ? 'Siguiendo' : 'Seguir'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <Text style={styles.actionButtonText}>Mensaje</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {posts.length > 0 ? (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.postItem}
                onPress={() => handleVerPost(post.id)}
              >
                {post.imagen && (
                  <Image source={{ uri: post.imagen }} style={styles.postImage} resizeMode="cover" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="photo.on.rectangle" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay publicaciones</Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    marginRight: 20,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  userInfo: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  userUsername: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  bioSection: {
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  bioText: {
    fontSize: 14,
    color: colors.headerText,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonFollowing: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.headerText,
  },
  actionButtonTextFollowing: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postItem: {
    width: (width - 3) / 3,
    height: (width - 3) / 3,
    padding: 0.5,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
});
