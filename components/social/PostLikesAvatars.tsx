
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

interface PostLikesAvatarsProps {
  postId: string;
  totalLikes: number;
}

interface LikeUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

export default function PostLikesAvatars({ postId, totalLikes }: PostLikesAvatarsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [allLikes, setAllLikes] = useState<LikeUser[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);
  const [currentTotalLikes, setCurrentTotalLikes] = useState(totalLikes);

  const loadLikeUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select(`
          usuario_id,
          usuarios!likes_usuario_id_fkey(id, nombre, username, avatar)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        const users = data
          .filter(like => like.usuarios)
          .map((like: any) => ({
            id: like.usuarios.id,
            nombre: like.usuarios.nombre,
            username: like.usuarios.username,
            avatar: like.usuarios.avatar,
            tipo: 'usuario' as const,
          }));
        setLikeUsers(users);
      }
    } catch (error) {
      console.error('[PostLikesAvatars] Error loading like users:', error);
    }
  }, [postId]);

  const loadAllLikes = useCallback(async () => {
    try {
      setLoadingModal(true);
      const { data, error } = await supabase
        .from('likes')
        .select(`
          usuario_id,
          usuarios!likes_usuario_id_fkey(id, nombre, username, avatar)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const users = data
          .filter(like => like.usuarios)
          .map((like: any) => ({
            id: like.usuarios.id,
            nombre: like.usuarios.nombre,
            username: like.usuarios.username,
            avatar: like.usuarios.avatar,
            tipo: 'usuario' as const,
          }));
        setAllLikes(users);
      }
    } catch (error) {
      console.error('[PostLikesAvatars] Error loading all likes:', error);
    } finally {
      setLoadingModal(false);
    }
  }, [postId]);

  useEffect(() => {
    loadLikeUsers();
  }, [loadLikeUsers]);

  // ✅ NEW: Real-time subscription for like updates
  useEffect(() => {
    console.log('[PostLikesAvatars] 🔄 Setting up real-time subscription for post:', postId);

    const subscription = supabase
      .channel(`post-likes-avatars-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          console.log('[PostLikesAvatars] 🔄 Real-time like update detected:', payload);
          
          // Reload like users and count
          await loadLikeUsers();
          
          // Update total likes count
          const { count } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          setCurrentTotalLikes(count || 0);
          console.log('[PostLikesAvatars] ✅ Updated likes count:', count);
        }
      )
      .subscribe();

    return () => {
      console.log('[PostLikesAvatars] 🔄 Cleaning up subscription');
      supabase.removeChannel(subscription);
    };
  }, [postId, loadLikeUsers]);

  // ✅ NEW: Update total likes when prop changes
  useEffect(() => {
    setCurrentTotalLikes(totalLikes);
  }, [totalLikes]);

  const handleOpenModal = () => {
    loadAllLikes();
    setShowModal(true);
  };

  const handleUserPress = (userId: string, tipo: 'usuario' | 'local') => {
    setShowModal(false);
    
    if (tipo === 'usuario' && user && userId === user.id) {
      router.push('/(tabs)/perfil');
    } else if (tipo === 'local') {
      router.push({
        pathname: '/perfil/local',
        params: { localId: userId },
      });
    } else {
      router.push({
        pathname: '/perfil/usuario',
        params: { userId },
      });
    }
  };

  if (currentTotalLikes === 0) {
    return null;
  }

  const getLikesText = () => {
    if (currentTotalLikes === 1 && likeUsers.length > 0) {
      const username = likeUsers[0].username || likeUsers[0].nombre;
      return (
        <Text style={styles.likesText}>
          Le gusta a{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(likeUsers[0].id, likeUsers[0].tipo)}
          >
            {username}
          </Text>
        </Text>
      );
    }
    if (currentTotalLikes === 2 && likeUsers.length >= 2) {
      const user1 = likeUsers[0].username || likeUsers[0].nombre;
      const user2 = likeUsers[1].username || likeUsers[1].nombre;
      return (
        <Text style={styles.likesText}>
          Les gusta a{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(likeUsers[0].id, likeUsers[0].tipo)}
          >
            {user1}
          </Text>
          {' '}y{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(likeUsers[1].id, likeUsers[1].tipo)}
          >
            {user2}
          </Text>
        </Text>
      );
    }
    if (currentTotalLikes >= 3 && likeUsers.length >= 1) {
      const firstUser = likeUsers[0].username || likeUsers[0].nombre;
      const others = currentTotalLikes - 1;
      return (
        <Text style={styles.likesText}>
          Les gusta a{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(likeUsers[0].id, likeUsers[0].tipo)}
          >
            {firstUser}
          </Text>
          {' '}y{' '}
          <Text style={styles.moreLink} onPress={handleOpenModal}>
            {others} {others === 1 ? 'persona más' : 'personas más'}
          </Text>
        </Text>
      );
    }
    return <Text style={styles.likesText}>{currentTotalLikes} me gusta</Text>;
  };

  const renderLikeUser = ({ item }: { item: LikeUser }) => (
    <TouchableOpacity
      style={styles.modalUserItem}
      onPress={() => handleUserPress(item.id, item.tipo)}
      activeOpacity={0.7}
    >
      {item.avatar ? (
        <Image source={{ uri: item.avatar }} style={styles.modalAvatar} />
      ) : (
        <View style={[styles.modalAvatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarText}>
            {item.nombre.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.modalUserInfo}>
        <Text style={styles.modalUserName}>{item.nombre}</Text>
        {item.username && (
          <Text style={styles.modalUsername}>{item.username}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <View style={styles.avatarsContainer}>
          {likeUsers.map((user, index) => (
            <View
              key={user.id}
              style={[
                styles.avatarWrapper,
                index > 0 && { marginLeft: -8 },
              ]}
            >
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {user.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        {getLikesText()}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <View style={{ width: 40 }} />
              <Text style={styles.modalTitle}>Me gusta</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.headerText} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {loadingModal ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={allLikes}
              renderItem={renderLikeUser}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  usernameLink: {
    fontWeight: '700',
    color: colors.text,
  },
  moreLink: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: {
    paddingVertical: 8,
  },
  modalUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalUserInfo: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
