
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  localLikes?: { id: string; usuario_id: string }[];
}

interface LikeUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local';
}

/**
 * ✅ POST LIKES AVATARS v8.1 - FIXED INFINITE LOOP
 * 
 * CRITICAL FIXES:
 * - ✅ FIXED: Removed circular dependencies in useEffect
 * - ✅ FIXED: Proper memoization of callbacks
 * - ✅ FIXED: Separated data loading from state updates
 */

export default function PostLikesAvatars({ postId, totalLikes, localLikes = [] }: PostLikesAvatarsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  
  // ✅ CRITICAL: tempProfiles is the single source of truth for rendering
  const [tempProfiles, setTempProfiles] = useState<LikeUser[]>([]);
  const initialProfilesRef = useRef<LikeUser[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [allLikes, setAllLikes] = useState<LikeUser[]>([]);
  const [loadingModal, setLoadingModal] = useState(false);
  
  const [currentTotalLikes, setCurrentTotalLikes] = useState(totalLikes);
  const [currentUserHasLiked, setCurrentUserHasLiked] = useState(false);

  const handleUserPress = useCallback((userId: string, tipo: 'usuario' | 'local') => {
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
  }, [user, router]);

  const handleOpenModal = useCallback(() => {
    loadAllLikes();
    setShowModal(true);
  }, []);

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

  // ✅ FIXED: Update state immediately when localLikes changes
  useEffect(() => {
    console.log('[PostLikesAvatars] 🔄 localLikes changed for post:', postId, {
      count: localLikes.length,
      users: localLikes.map(l => l.usuario_id),
    });

    setCurrentTotalLikes(localLikes.length);

    const userLiked = user ? localLikes.some(like => like.usuario_id === user.id) : false;
    setCurrentUserHasLiked(userLiked);

    console.log('[PostLikesAvatars] ✅ State updated:', {
      userLiked,
      totalLikes: localLikes.length,
    });

    // ✅ CRITICAL: Update tempProfiles IMMEDIATELY with optimistic data
    const updateProfilesOptimistically = async () => {
      try {
        const userIds = localLikes.map(like => like.usuario_id).slice(0, 3);
        
        if (userIds.length === 0) {
          console.log('[PostLikesAvatars] ℹ️ No likes to display, clearing tempProfiles');
          setTempProfiles([]);
          initialProfilesRef.current = [];
          return;
        }
        
        // ✅ STEP 1: Check if current user is in the list
        const currentUserInList = user && userIds.includes(user.id);
        
        // ✅ STEP 2: If current user just liked, add their profile IMMEDIATELY
        if (currentUserInList && user) {
          const userAlreadyInProfiles = tempProfiles.some(p => p.id === user.id);
          
          if (!userAlreadyInProfiles) {
            console.log('[PostLikesAvatars] ➕ OPTIMISTIC: Adding current user profile IMMEDIATELY');
            
            const optimisticUserProfile: LikeUser = {
              id: user.id,
              nombre: user.nombre || 'Usuario',
              username: user.username,
              avatar: user.avatar,
              tipo: 'usuario',
            };
            
            setTempProfiles(prev => [optimisticUserProfile, ...prev.filter(p => p.id !== user.id)]);
            console.log('[PostLikesAvatars] ✅ OPTIMISTIC: User avatar added instantly');
          }
        } else if (!currentUserInList && user) {
          const userInProfiles = tempProfiles.some(p => p.id === user.id);
          
          if (userInProfiles) {
            console.log('[PostLikesAvatars] ➖ OPTIMISTIC: Removing current user profile IMMEDIATELY');
            setTempProfiles(prev => prev.filter(p => p.id !== user.id));
            console.log('[PostLikesAvatars] ✅ OPTIMISTIC: User avatar removed instantly');
          }
        }
        
        // ✅ STEP 4: Fetch full profile data in background (non-blocking)
        console.log('[PostLikesAvatars] 🔍 Fetching user data in background for:', userIds);
        
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .in('id', userIds);

        if (!error && data) {
          const orderedUsers = userIds
            .map(userId => data.find(u => u.id === userId))
            .filter(Boolean)
            .map((user: any) => ({
              id: user.id,
              nombre: user.nombre,
              username: user.username,
              avatar: user.avatar,
              tipo: 'usuario' as const,
            }));
          
          console.log('[PostLikesAvatars] ✅ Loaded', orderedUsers.length, 'like users:', orderedUsers.map(u => u.username || u.nombre));
          
          setTempProfiles(orderedUsers);
          initialProfilesRef.current = orderedUsers;
        } else if (error) {
          console.error('[PostLikesAvatars] ❌ Error loading like users:', error);
        }
      } catch (error) {
        console.error('[PostLikesAvatars] ❌ Exception loading like users:', error);
      }
    };

    updateProfilesOptimistically();
  }, [postId, localLikes, user?.id]); // ✅ FIXED: Removed tempProfiles from dependencies

  // ✅ FIXED: Real-time subscription for OTHER users' changes
  useEffect(() => {
    if (!user) return;

    console.log('[PostLikesAvatars] 🔄 Setting up real-time subscription for post:', postId);

    if (channelRef.current?.state === 'subscribed') {
      console.log('[PostLikesAvatars] ⚠️ Already subscribed, skipping');
      return;
    }

    const channel = supabase.channel(`post-likes-avatars:${postId}:${user.id}`);

    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        async (payload) => {
          console.log('[PostLikesAvatars] 🔄 Real-time like change detected:', payload.eventType, 'by user:', payload.new?.usuario_id || payload.old?.usuario_id);
          
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            console.log('[PostLikesAvatars] ⏭️ Change made by current user, skipping (already handled optimistically)');
            return;
          }
          
          console.log('[PostLikesAvatars] 🔄 Change made by another user, reloading...');
          
          // ✅ Fetch updated count from database
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          if (!countError && count !== null) {
            console.log('[PostLikesAvatars] ✅ Updated likes count via real-time:', count);
            setCurrentTotalLikes(count);
          }
          
          const { data: userLike, error: likeError } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('usuario_id', user.id)
            .maybeSingle();
          
          if (!likeError) {
            setCurrentUserHasLiked(!!userLike);
          }
        }
      )
      .subscribe((status) => {
        console.log('[PostLikesAvatars] 📡 Subscription status:', status);
      });

    return () => {
      console.log('[PostLikesAvatars] 🔄 Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [postId, user?.id]); // ✅ FIXED: Only essential dependencies

  useEffect(() => {
    if (localLikes.length === 0) {
      setCurrentTotalLikes(totalLikes);
    }
  }, [totalLikes, localLikes.length]);

  // ✅ CRITICAL FIX: Memoize text generation using tempProfiles
  const getLikesText = useMemo(() => {
    const otherUsers = tempProfiles.filter(u => u.id !== user?.id);
    
    console.log('[PostLikesAvatars] 📊 Generating text:', {
      currentUserHasLiked,
      currentTotalLikes,
      tempProfilesCount: tempProfiles.length,
      otherUsersCount: otherUsers.length,
    });

    if (currentUserHasLiked) {
      if (currentTotalLikes === 1) {
        return (
          <Text style={styles.likesText}>
            A <Text style={styles.usernameLink}>ti</Text> te gusta esto
          </Text>
        );
      } else if (currentTotalLikes === 2 && otherUsers.length > 0) {
        const otherUser = otherUsers[0];
        const username = otherUser.username || otherUser.nombre;
        return (
          <Text style={styles.likesText}>
            A <Text style={styles.usernameLink}>ti</Text> y a{' '}
            <Text 
              style={styles.usernameLink}
              onPress={() => handleUserPress(otherUser.id, otherUser.tipo)}
            >
              {username}
            </Text>
            {' '}les gusta esto
          </Text>
        );
      } else {
        const others = currentTotalLikes - 1;
        return (
          <Text style={styles.likesText}>
            A <Text style={styles.usernameLink}>ti</Text> y a{' '}
            <Text style={styles.moreLink} onPress={handleOpenModal}>
              {others} {others === 1 ? 'persona más' : 'personas más'}
            </Text>
            {' '}les gusta esto
          </Text>
        );
      }
    }

    if (currentTotalLikes === 1 && otherUsers.length > 0) {
      const username = otherUsers[0].username || otherUsers[0].nombre;
      return (
        <Text style={styles.likesText}>
          A{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(otherUsers[0].id, otherUsers[0].tipo)}
          >
            {username}
          </Text>
          {' '}le gusta esto
        </Text>
      );
    }
    
    if (currentTotalLikes === 2 && otherUsers.length >= 2) {
      const user1 = otherUsers[0].username || otherUsers[0].nombre;
      const user2 = otherUsers[1].username || otherUsers[1].nombre;
      return (
        <Text style={styles.likesText}>
          A{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(otherUsers[0].id, otherUsers[0].tipo)}
          >
            {user1}
          </Text>
          {' '}y a{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(otherUsers[1].id, otherUsers[1].tipo)}
          >
            {user2}
          </Text>
          {' '}les gusta esto
        </Text>
      );
    }
    
    if (currentTotalLikes >= 3 && otherUsers.length >= 1) {
      const firstUser = otherUsers[0].username || otherUsers[0].nombre;
      const others = currentTotalLikes - 1;
      return (
        <Text style={styles.likesText}>
          A{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(otherUsers[0].id, otherUsers[0].tipo)}
          >
            {firstUser}
          </Text>
          {' '}y a{' '}
          <Text style={styles.moreLink} onPress={handleOpenModal}>
            {others} {others === 1 ? 'persona más' : 'personas más'}
          </Text>
          {' '}les gusta esto
        </Text>
      );
    }
    
    if (currentTotalLikes === 1) {
      return <Text style={styles.likesText}>1 me gusta</Text>;
    }
    
    return <Text style={styles.likesText}>{currentTotalLikes} me gusta</Text>;
  }, [currentUserHasLiked, currentTotalLikes, tempProfiles, user?.id, handleUserPress, handleOpenModal]);

  // ✅ CRITICAL FIX: Memoize avatar rendering using tempProfiles
  const avatarsDisplay = useMemo(() => {
    return tempProfiles.slice(0, 3).map((likeUser, index) => (
      <View
        key={`${likeUser.id}-${index}`}
        style={[
          styles.avatarWrapper,
          index > 0 && { marginLeft: -8 },
        ]}
      >
        {likeUser.avatar ? (
          <Image source={{ uri: likeUser.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {likeUser.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    ));
  }, [tempProfiles]);

  const renderLikeUser = useCallback(({ item }: { item: LikeUser }) => (
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
          <Text style={styles.modalUsername}>@{item.username}</Text>
        )}
      </View>
      {user && item.id === user.id && (
        <View style={styles.youBadge}>
          <Text style={styles.youBadgeText}>Tú</Text>
        </View>
      )}
    </TouchableOpacity>
  ), [user, handleUserPress]);

  if (currentTotalLikes === 0) {
    return null;
  }

  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <View style={styles.avatarsContainer}>
          {avatarsDisplay}
        </View>
        {getLikesText}
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
  youBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  youBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
