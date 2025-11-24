
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useRouter } from 'expo-router';

interface PostLikesAvatarsProps {
  postId: string;
  likesCount: number;
}

interface LikeUser {
  id: string;
  nombre: string;
  avatar?: string;
}

export default function PostLikesAvatars({ postId, likesCount }: PostLikesAvatarsProps) {
  const router = useRouter();
  const [likeUsers, setLikeUsers] = useState<LikeUser[]>([]);

  useEffect(() => {
    const loadLikeUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('likes')
          .select(`
            usuario_id,
            usuarios:usuario_id(nombre, avatar)
          `)
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) {
          console.error('[PostLikesAvatars] Error loading like users:', error);
          return;
        }

        const users: LikeUser[] = (data || [])
          .filter((like: any) => like.usuarios)
          .map((like: any) => ({
            id: like.usuario_id,
            nombre: like.usuarios.nombre,
            avatar: like.usuarios.avatar,
          }));

        setLikeUsers(users);
      } catch (error) {
        console.error('[PostLikesAvatars] Error:', error);
      }
    };

    if (likesCount > 0) {
      loadLikeUsers();
    }
  }, [postId, likesCount]);

  if (likesCount === 0) {
    return null;
  }

  const displayUsers = likeUsers.slice(0, 3);
  const remainingCount = likesCount - displayUsers.length;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/social/post?id=${postId}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarsContainer}>
        {displayUsers.map((user, index) => (
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
      <Text style={styles.likesText}>
        {likesCount === 1 
          ? '1 me gusta' 
          : `${likesCount.toLocaleString()} me gusta`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cardBorder,
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
