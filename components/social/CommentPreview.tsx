
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/commonStyles';
import { scaleFontSize } from '@/utils/androidScaling';
import { useRouter } from 'expo-router';

interface CommentPreviewProps {
  postId: string;
}

interface CommentPreviewData {
  firstCommenterName: string;
  totalComments: number;
}

/**
 * ✅ COMMENT PREVIEW COMPONENT v1.0
 * 
 * Displays comment preview information for a post, showing ONLY comments
 * from users that the current user follows.
 * 
 * Business Rule: Comment information should only appear when a user follows
 * the commenter, as it doesn't make sense to show information about comments
 * from users the current user doesn't follow.
 * 
 * Display Format:
 * - Single comment: "Jorge ha escrito un comentario."
 * - Multiple comments: "Jorge y otras 2 personas han comentado esta publicación."
 */
export default function CommentPreview({ postId }: CommentPreviewProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [previewData, setPreviewData] = useState<CommentPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCommentPreview = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[CommentPreview v1.0] 🔄 Loading comment preview for post:', postId);

      // Step 1: Get all users that the current user follows
      const { data: followingData, error: followingError } = await supabase
        .from('seguidores')
        .select('seguido_id')
        .eq('seguidor_id', user.id);

      if (followingError) {
        console.error('[CommentPreview v1.0] ❌ Error fetching following list:', followingError);
        setLoading(false);
        return;
      }

      const followedUserIds = followingData?.map(f => f.seguido_id) || [];

      if (followedUserIds.length === 0) {
        console.log('[CommentPreview v1.0] ℹ️ User is not following anyone, no preview to show');
        setPreviewData(null);
        setLoading(false);
        return;
      }

      console.log('[CommentPreview v1.0] ✅ User follows', followedUserIds.length, 'users');

      // Step 2: Get comments from followed users only
      const { data: commentsData, error: commentsError } = await supabase
        .from('comentarios')
        .select(`
          id,
          usuario_id,
          created_at,
          usuario:usuarios!comentarios_usuario_id_fkey(nombre)
        `)
        .eq('post_id', postId)
        .in('usuario_id', followedUserIds)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('[CommentPreview v1.0] ❌ Error fetching comments:', commentsError);
        setLoading(false);
        return;
      }

      if (!commentsData || commentsData.length === 0) {
        console.log('[CommentPreview v1.0] ℹ️ No comments from followed users');
        setPreviewData(null);
        setLoading(false);
        return;
      }

      // Step 3: Get the first commenter's name and total count
      const firstCommenter = commentsData[0];
      const firstCommenterName = firstCommenter.usuario?.nombre || 'Usuario';
      const totalComments = commentsData.length;

      console.log('[CommentPreview v1.0] ✅ Found', totalComments, 'comments from followed users');
      console.log('[CommentPreview v1.0] ✅ First commenter:', firstCommenterName);

      setPreviewData({
        firstCommenterName,
        totalComments,
      });
      setLoading(false);
    } catch (error) {
      console.error('[CommentPreview v1.0] ❌ Error loading comment preview:', error);
      setLoading(false);
    }
  }, [postId, user]);

  useEffect(() => {
    loadCommentPreview();
  }, [loadCommentPreview]);

  // Don't render anything if no data or still loading
  if (loading || !previewData || !user) {
    return null;
  }

  const { firstCommenterName, totalComments } = previewData;

  const handlePress = () => {
    console.log('[CommentPreview v1.0] 💬 Opening comments for post:', postId);
    router.push({
      pathname: '/social/comentarios',
      params: { postId },
    });
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { fontSize: scaleFontSize(13) }]}>
        <Text style={styles.name}>{firstCommenterName}</Text>
        {totalComments === 1 
          ? ' ha escrito un comentario.'
          : ` y otras ${totalComments - 1} personas han comentado esta publicación.`
        }
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  text: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  name: {
    fontWeight: '600',
    color: colors.text,
  },
});
