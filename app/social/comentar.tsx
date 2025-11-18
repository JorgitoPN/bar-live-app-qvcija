
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';

export default function ComentarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocalProfileId, isInteractingAsLocal } = useMode();
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  const parentCommentId = params.parentCommentId as string | undefined;
  
  const [comentario, setComentario] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [post, setPost] = useState<any>(null);
  const [parentComment, setParentComment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load post
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*, autor:usuarios(nombre, avatar, username)')
          .eq('id', postId)
          .single();

        if (postError) throw postError;
        setPost(postData);

        // Load parent comment if replying
        if (parentCommentId) {
          const { data: commentData, error: commentError } = await supabase
            .from('comentarios')
            .select('*, autor:usuarios(nombre, avatar, username)')
            .eq('id', parentCommentId)
            .single();

          if (commentError) throw commentError;
          setParentComment(commentData);
        }
      } catch (error) {
        console.error('[Comentar] Error loading data:', error);
        Alert.alert('Error', 'No se pudo cargar la información');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [postId, parentCommentId, router]);

  const publicarComentario = async () => {
    if (!comentario.trim()) {
      Alert.alert('Error', 'Debes escribir un comentario');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para comentar');
      return;
    }

    setPublishing(true);

    try {
      console.log('[Comentar] Creating comment...');
      console.log('[Comentar] Active local profile:', activeLocalProfileId);
      console.log('[Comentar] Is interacting as local:', isInteractingAsLocal);

      // FIXED: Use correct author ID based on context
      // If interacting as local, use the local's owner ID but mark it as local comment
      const authorId = user.id; // Always the logged-in user
      
      const { data: commentData, error: commentError } = await supabase
        .from('comentarios')
        .insert({
          post_id: postId,
          autor_id: authorId,
          texto: comentario,
          parent_comment_id: parentCommentId || null,
          // FIXED: Add tipo and local_id fields if commenting as local
          ...(isInteractingAsLocal && activeLocalProfileId ? {
            tipo: 'local',
            local_id: activeLocalProfileId,
          } : {
            tipo: 'usuario',
          }),
        })
        .select()
        .single();

      if (commentError) throw commentError;

      console.log('[Comentar] Comment created successfully');

      // Update post comment count
      await supabase.rpc('increment_post_comments', { post_id: postId });

      // Create notification for post author
      if (post.autor_id !== user.id) {
        await supabase.from('notificaciones').insert({
          usuario_id: post.autor_id,
          tipo: 'comentario',
          titulo: 'Nuevo comentario',
          mensaje: `${user.nombre} comentó tu publicación`,
          usuario_origen_id: user.id,
          post_id: postId,
        });
      }

      // Create notification for parent comment author if replying
      if (parentComment && parentComment.autor_id !== user.id) {
        await supabase.from('notificaciones').insert({
          usuario_id: parentComment.autor_id,
          tipo: 'comentario',
          titulo: 'Nueva respuesta',
          mensaje: `${user.nombre} respondió a tu comentario`,
          usuario_origen_id: user.id,
          post_id: postId,
        });
      }

      Alert.alert('Éxito', 'Comentario publicado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('[Comentar] Error publicando comentario:', error);
      Alert.alert('Error', 'No se pudo publicar el comentario');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={commonStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <IconSymbol name="xmark" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {parentComment ? 'Responder' : 'Comentar'}
          </Text>
          <TouchableOpacity 
            onPress={publicarComentario} 
            style={styles.publishButton}
            disabled={publishing || !comentario.trim()}
            activeOpacity={0.7}
          >
            {publishing ? (
              <ActivityIndicator size="small" color={colors.headerText} />
            ) : (
              <Text style={[styles.publishButtonText, !comentario.trim() && styles.publishButtonTextDisabled]}>
                Publicar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Post preview */}
        {post && (
          <View style={styles.postPreview}>
            <View style={styles.postHeader}>
              {post.autor?.avatar ? (
                <Image source={{ uri: post.autor.avatar }} style={styles.postAvatar} />
              ) : (
                <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {post.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.postAutorInfo}>
                <Text style={styles.postAutorNombre}>{post.autor?.nombre || 'Usuario'}</Text>
              </View>
            </View>
            {post.contenido && (
              <Text style={styles.postContenido} numberOfLines={3}>
                {post.contenido}
              </Text>
            )}
          </View>
        )}

        {/* Parent comment preview if replying */}
        {parentComment && (
          <View style={styles.parentCommentPreview}>
            <Text style={styles.replyingToLabel}>Respondiendo a:</Text>
            <View style={styles.commentHeader}>
              {parentComment.autor?.avatar ? (
                <Image source={{ uri: parentComment.autor.avatar }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {parentComment.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <Text style={styles.commentAutorNombre}>{parentComment.autor?.nombre || 'Usuario'}</Text>
            </View>
            <Text style={styles.commentTexto} numberOfLines={2}>
              {parentComment.texto}
            </Text>
          </View>
        )}

        {/* Comment input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={parentComment ? 'Escribe tu respuesta...' : 'Escribe tu comentario...'}
            placeholderTextColor={colors.textSecondary}
            value={comentario}
            onChangeText={setComentario}
            multiline
            maxLength={500}
            editable={!publishing}
            autoFocus
          />
          <Text style={styles.charCount}>{comentario.length}/500</Text>
        </View>

        {/* Context indicator */}
        {isInteractingAsLocal && activeLocalProfileId && (
          <View style={styles.contextIndicator}>
            <IconSymbol name="building.2" size={16} color={colors.primary} />
            <Text style={styles.contextText}>
              Comentando como local
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.headerText,
  },
  publishButtonTextDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  postPreview: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  postAutorInfo: {
    flex: 1,
  },
  postAutorNombre: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  postContenido: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  parentCommentPreview: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  replyingToLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentAutorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentTexto: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  inputContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  contextIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
