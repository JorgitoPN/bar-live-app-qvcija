
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { supabase } from '@/utils/supabase';
import { colors } from '@/styles/commonStyles';

interface PostLikesAvatarsProps {
  postId: string;
  totalLikes: number;
}

interface LikeUser {
  id: string;
  nombre: string;
  avatar?: string;
}

export default function PostLikesAvatars({ postId, totalLikes }: PostLikesAvatarsProps) {
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([]);

  const loadLikeUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select(`
          usuario_id,
          usuarios!likes_usuario_id_fkey(id, nombre, avatar)
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
            avatar: like.usuarios.avatar,
          }));
        setLikeUsers(users);
      }
    } catch (error) {
      console.error('Error loading like users:', error);
    }
  }, [postId]);

  useEffect(() => {
    loadLikeUsers();
  }, [loadLikeUsers]);

  if (totalLikes === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatarsContainer}>
        {likeUsers.map((user, index) => (
          <View
            key={user.id}
            style={[
              styles.avatarWrapper,
              index > 0 && { marginLeft: -8 }, // Overlap effect
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
      <Text style={styles.likesText}>
        {totalLikes === 1
          ? 'Le gusta a 1 persona'
          : `Les gusta a ${totalLikes} personas`}
      </Text>
    </View>
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
});
