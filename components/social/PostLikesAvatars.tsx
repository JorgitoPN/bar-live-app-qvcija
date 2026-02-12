
import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, InteractionManager } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { IconSymbol } from '@/components/IconSymbol';
import { scaleFontSize } from '@/utils/androidScaling';

interface PostLikesAvatarsProps {
  postId: string;
  totalLikes: number;
  localLikes?: { id: string; usuario_id: string }[];
}

interface LikeWithUser {
  id: string;
  usuario_id: string;
  usuarios: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

/**
 * ✅ POST LIKES AVATARS v335.0 - ANDROID "MAP-LEVEL" PERFORMANCE OPTIMIZATION
 * 
 * CRITICAL OPTIMIZATIONS v335.0:
 * - ✅ EXPO-IMAGE: All avatars use expo-image with cachePolicy="disk"
 * - ✅ RECYCLING KEY: Based on usuario_id for memory optimization
 * - ✅ INTERACTION MANAGER: Data loading deferred until UI is idle
 * - ✅ NO REALTIME ON ANDROID: Disabled WebSocket subscriptions (v317.0 fix maintained)
 * - ✅ AGGRESSIVE MEMOIZATION: React.memo with custom comparison
 * 
 * Previous fixes v317.0:
 * - ✅ DISABLED REALTIME SUBSCRIPTIONS ON ANDROID: Eliminates CHANNEL_ERROR spam
 * - ✅ OPTIMISTIC UI ONLY: Uses localLikes prop for instant updates
 * - ✅ PERFORMANCE: Fixes severe slowdown when logged in on Android
 */

const PostLikesAvatars = memo<PostLikesAvatarsProps>(({ postId, totalLikes, localLikes = [] }) => {
  const router = useRouter();
  const [likes, setLikes] = useState<LikeWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLikes = useCallback(async () => {
    // ✅ v335.0: Defer data loading with InteractionManager
    InteractionManager.runAfterInteractions(async () => {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select(`
            id,
            usuario_id,
            usuarios!likes_usuario_id_fkey(id, nombre, username, avatar)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data) {
          setLikes(data as LikeWithUser[]);
        }
      } catch (error) {
        if (Platform.OS !== 'android') {
          console.error('[PostLikesAvatars v335.0] Error loading likes:', error);
        }
      } finally {
        setLoading(false);
      }
    });
  }, [postId]);

  useEffect(() => {
    loadLikes();
  }, [loadLikes]);

  // ✅ v335.0: Real-time subscriptions DISABLED on Android (maintained from v317.0)
  useEffect(() => {
    if (Platform.OS === 'android') {
      return;
    }

    const channel = supabase.channel(`post-likes-avatars:${postId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `post_id=eq.${postId}`,
        },
        () => {
          loadLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, loadLikes]);

  const handlePress = () => {
    router.push({
      pathname: '/social/likes',
      params: { postId },
    });
  };

  const displayLikes = localLikes.length > 0 ? localLikes : likes;

  if (totalLikes === 0) {
    return null;
  }

  const visibleAvatars = displayLikes.slice(0, 3);
  const remainingCount = totalLikes - visibleAvatars.length;

  const likesText = totalLikes === 1 ? '1 me gusta' : `${totalLikes} me gusta`;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarsContainer}>
        {visibleAvatars.map((like, index) => {
          const usuario = 'usuarios' in like ? like.usuarios : null;
          const avatarUrl = usuario?.avatar;
          
          return (
            <View
              key={like.id}
              style={[
                styles.avatarWrapper,
                { marginLeft: index > 0 ? -8 : 0, zIndex: visibleAvatars.length - index },
              ]}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  priority="normal"
                  cachePolicy="disk"
                  transition={150}
                  recyclingKey={like.usuario_id}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol
                    ios_icon_name="person.fill"
                    android_material_icon_name="person"
                    size={12}
                    color={colors.white}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text style={[styles.likesText, { fontSize: scaleFontSize(14) }]}>{likesText}</Text>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // ✅ v335.0: Custom comparison - only re-render if likes actually changed
  return (
    prevProps.postId === nextProps.postId &&
    prevProps.totalLikes === nextProps.totalLikes &&
    JSON.stringify(prevProps.localLikes) === JSON.stringify(nextProps.localLikes)
  );
});

PostLikesAvatars.displayName = 'PostLikesAvatars';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likesText: {
    fontWeight: '600',
    color: colors.text,
  },
});
