
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { scaleFontSize } from '@/utils/androidScaling';

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
 * ✅ POST LIKES AVATARS v317.0 - ANDROID PERFORMANCE FIX
 * 
 * CRITICAL FIXES v317.0:
 * - ✅ DISABLED REALTIME SUBSCRIPTIONS ON ANDROID: Eliminates CHANNEL_ERROR spam
 * - ✅ OPTIMISTIC UI ONLY: Instant feedback without WebSocket overhead on Android
 * - ✅ PERFORMANCE: Fixes severe slowdown when logged in on Android
 * - ✅ iOS UNAFFECTED: Real-time subscriptions still work on iOS (no performance issues)
 * 
 * Previous changes v316.0:
 * - ✅ Removed modal - now navigates to full-screen /social/likes page
 * - ✅ Cleaner component with less state management
 * - ✅ Better UX with dedicated full-screen page for likes list
 */

export default function PostLikesAvatars({ postId, totalLikes, localLikes = [] }: PostLikesAvatarsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const channelRef = useRef<any>(null);
  
  const [tempProfiles, setTempProfiles] = useState<LikeUser[]>([]);
  const initialProfilesRef = useRef<LikeUser[]>([]);
  

  
  const [currentTotalLikes, setCurrentTotalLikes] = useState(totalLikes);
  const [currentUserHasLiked, setCurrentUserHasLiked] = useState(false);

  // ✅ v316.0: Navigate to full-screen likes page
  const handleOpenLikesPage = useCallback(() => {
    console.log('[PostLikesAvatars v316.0] ❤️ Opening likes full-screen page for post:', postId);
    router.push({
      pathname: '/social/likes',
      params: { postId },
    });
  }, [postId, router]);

  // ✅ CRITICAL FIX v101.0: Update state immediately when localLikes changes
  // This effect ONLY updates state, does NOT fetch data
  useEffect(() => {
    console.log('[PostLikesAvatars v101.0] 🔄 localLikes changed for post:', postId, {
      count: localLikes.length,
      users: localLikes.map(l => l.usuario_id),
    });

    setCurrentTotalLikes(localLikes.length);

    const userLiked = user ? localLikes.some(like => like.usuario_id === user.id) : false;
    setCurrentUserHasLiked(userLiked);

    console.log('[PostLikesAvatars v101.0] ✅ State updated:', {
      userLiked,
      totalLikes: localLikes.length,
    });
  }, [postId, localLikes, user]); // ✅ FIXED: Include user to satisfy exhaustive-deps

  // ✅ CRITICAL FIX v101.0: Separate effect for loading profile data
  // This effect ONLY runs when localLikes changes, NOT when tempProfiles changes
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const userIds = localLikes.map(like => like.usuario_id).slice(0, 3);
        
        if (userIds.length === 0) {
          console.log('[PostLikesAvatars v101.0] ℹ️ No likes to display, clearing tempProfiles');
          setTempProfiles([]);
          initialProfilesRef.current = [];
          return;
        }
        
        // ✅ OPTIMISTIC UPDATE: If current user just liked, add their profile IMMEDIATELY
        if (user && userIds.includes(user.id)) {
          const userAlreadyInProfiles = tempProfiles.some(p => p.id === user.id);
          
          if (!userAlreadyInProfiles) {
            console.log('[PostLikesAvatars v101.0] ➕ OPTIMISTIC: Adding current user profile IMMEDIATELY');
            
            const optimisticUserProfile: LikeUser = {
              id: user.id,
              nombre: user.nombre || 'Usuario',
              username: user.username,
              avatar: user.avatar,
              tipo: 'usuario',
            };
            
            setTempProfiles(prev => [optimisticUserProfile, ...prev.filter(p => p.id !== user.id)]);
            console.log('[PostLikesAvatars v101.0] ✅ OPTIMISTIC: User avatar added instantly');
          }
        } else if (user) {
          // User unliked - remove immediately
          const userInProfiles = tempProfiles.some(p => p.id === user.id);
          
          if (userInProfiles) {
            console.log('[PostLikesAvatars v101.0] ➖ OPTIMISTIC: Removing current user profile IMMEDIATELY');
            setTempProfiles(prev => prev.filter(p => p.id !== user.id));
            console.log('[PostLikesAvatars v101.0] ✅ OPTIMISTIC: User avatar removed instantly');
          }
        }
        
        // Fetch full profile data in background
        console.log('[PostLikesAvatars v101.0] 🔍 Fetching user data in background for:', userIds);
        
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
          
          console.log('[PostLikesAvatars v101.0] ✅ Loaded', orderedUsers.length, 'like users');
          
          setTempProfiles(orderedUsers);
          initialProfilesRef.current = orderedUsers;
        } else if (error) {
          console.error('[PostLikesAvatars v101.0] ❌ Error loading like users:', error);
        }
      } catch (error) {
        console.error('[PostLikesAvatars v101.0] ❌ Exception loading like users:', error);
      }
    };

    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, localLikes, user]); // ✅ FIXED: Include user, tempProfiles intentionally excluded to prevent loop

  // ✅ CRITICAL FIX v317.0: DISABLED REALTIME SUBSCRIPTIONS ON ANDROID
  // Real-time subscriptions cause CHANNEL_ERROR spam and severe performance degradation
  // on Android when users are logged in. Using optimistic UI updates instead.
  useEffect(() => {
    if (!user) return;

    // ✅ v317.0: Real-time subscriptions DISABLED on Android for performance
    // Optimistic UI updates provide instant feedback without WebSocket overhead
    if (Platform.OS === 'android') {
      return;
    }

    // iOS can still use real-time subscriptions (no performance issues)
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
          const changedByUserId = payload.new?.usuario_id || payload.old?.usuario_id;
          
          if (changedByUserId === user.id) {
            return;
          }
          
          const { count, error: countError } = await supabase
            .from('likes')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', postId);
          
          if (!countError && count !== null) {
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
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [postId, user]);

  // ✅ CRITICAL FIX v101.0: Update from prop when localLikes is empty
  useEffect(() => {
    if (localLikes.length === 0) {
      setCurrentTotalLikes(totalLikes);
    }
  }, [totalLikes, localLikes.length]);

  // ✅ v316.0: Handle user press for inline username links
  const handleUserPress = useCallback((userId: string, tipo: 'usuario' | 'local') => {
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

  // ✅ CRITICAL FIX v318.0: Show avatar and name even when there's only 1 like
  const getLikesText = useMemo(() => {
    const otherUsers = tempProfiles.filter(u => u.id !== user?.id);
    
    console.log('[PostLikesAvatars v318.0] 📊 Generating text:', {
      currentUserHasLiked,
      currentTotalLikes,
      tempProfilesCount: tempProfiles.length,
      otherUsersCount: otherUsers.length,
    });

    if (currentUserHasLiked) {
      if (currentTotalLikes === 1) {
        return (
          <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
            A <Text style={styles.usernameLink}>ti</Text> te gusta esto
          </Text>
        );
      } else if (currentTotalLikes === 2 && otherUsers.length > 0) {
        const otherUser = otherUsers[0];
        const username = otherUser.username || otherUser.nombre;
        return (
          <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
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
          <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
            A <Text style={styles.usernameLink}>ti</Text> y a{' '}
            <Text style={styles.moreLink} onPress={handleOpenLikesPage}>
              {others} {others === 1 ? 'persona más' : 'personas más'}
            </Text>
            {' '}les gusta esto
          </Text>
        );
      }
    }

    // ✅ FIX v318.0: Show avatar and name even when there's only 1 like
    if (currentTotalLikes === 1 && otherUsers.length > 0) {
      const username = otherUsers[0].username || otherUsers[0].nombre;
      return (
        <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
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
        <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
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
        <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>
          A{' '}
          <Text 
            style={styles.usernameLink}
            onPress={() => handleUserPress(otherUsers[0].id, otherUsers[0].tipo)}
          >
            {firstUser}
          </Text>
          {' '}y a{' '}
          <Text style={styles.moreLink} onPress={handleOpenLikesPage}>
            {others} {others === 1 ? 'persona más' : 'personas más'}
          </Text>
          {' '}les gusta esto
        </Text>
      );
    }
    
    // ✅ FIX v318.0: Fallback - show generic text if no profiles loaded yet
    if (currentTotalLikes === 1) {
      return <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>1 me gusta</Text>;
    }
    
    return <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>{currentTotalLikes} me gusta</Text>;
  }, [currentUserHasLiked, currentTotalLikes, tempProfiles, user?.id, handleUserPress, handleOpenLikesPage]); // ✅ FIXED: Stable dependencies

  // ✅ CRITICAL FIX v101.0: Memoize avatar rendering
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
            <Text style={[styles.avatarText, { fontSize: scaleFontSize(10) }]}>
              {likeUser.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    ));
  }, [tempProfiles]); // ✅ FIXED: Only depend on tempProfiles

  if (currentTotalLikes === 0) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handleOpenLikesPage}
      activeOpacity={0.7}
    >
      <View style={styles.avatarsContainer}>
        {avatarsDisplay}
      </View>
      {getLikesText}
    </TouchableOpacity>
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
    fontWeight: 'bold',
    color: colors.headerText,
  },
  likesText: {
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
});
