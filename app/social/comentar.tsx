
import React, { useState, useEffect } from 'react';
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
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import MentionAutocomplete, { MentionSuggestion } from '@/components/social/MentionAutocomplete';
import { processCommentMentions } from '@/utils/postHelpers';

export default function ComentarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocalProfileId, isInteractingAsLocal } = useMode();
  const params = useLocalSearchParams();
  const postId = params.postId as string;
  const parentCommentId = params.parentCommentId as string | undefined;
  
  const [comentario, setComentario] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [post, setPost] = useState<any>(null);
  const [parentComment, setParentComment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    loadData();
  }, [postId, parentCommentId]);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        console.log('[Comentar] ⌨️ Keyboard shown, height:', e.endCoordinates.height);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        console.log('[Comentar] ⌨️ Keyboard hidden');
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*, autor:usuarios(nombre, avatar, username)')
        .eq('id', postId)
        .single();

      if (postError) throw postError;
      setPost(postData);

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

  const handleSelectMention = (mention: MentionSuggestion, mentionText: string) => {
    console.log('[Comentar] ✅ Selected mention:', mention);
    
    const textBeforeCursor = comentario.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) return;

    const mentionUsername = mention.tipo === 'local' ? mention.nombre : mention.username;
    const newText = 
      comentario.substring(0, lastAtIndex) + 
      `@${mentionUsername} ` + 
      comentario.substring(cursorPosition);
    
    setComentario(newText);
    
    const newCursorPosition = lastAtIndex + mentionUsername.length + 2;
    setCursorPosition(newCursorPosition);
  };

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

      const authorId = user.id;
      
      const { data: commentData, error: commentError } = await supabase
        .from('comentarios')
        .insert({
          post_id: postId,
          autor_id: authorId,
          texto: comentario,
          parent_comment_id: parentCommentId || null,
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

      // Process mentions in the comment
      if (commentData && comentario) {
        console.log('[Comentar] 🏷️ Processing mentions in comment...');
        await processCommentMentions(commentData.id, comentario, postId);
        console.log('[Comentar] ✅ Mentions processed');
      }

      await supabase.rpc('increment_post_comments', { post_id: postId });

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
    <View style={commonStyles.container}>
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
            style={[styles.publishButton, !comentario.trim() && styles.publishButtonDisabled]}
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

      <View style={{ flex: 1 }}>
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {post && (
            <View style={styles.postPreview}>
              <View style={styles.postHeader}>
                {post.autor?.avatar ? (
                  <Image source={{ uri: post.autor.avatar }} style={styles.postAvatar} />
                ) : (
                  <View style={[styles.postAvatar, styles.avatarPlaceholder]}>
                    <IconSymbol name="person.fill" size={20} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.postAutorInfo}>
                  <Text style={styles.postAutorNombre}>{post.autor?.nombre || 'Usuario'}</Text>
                  <Text style={styles.postAutorUsername}>@{post.autor?.username || 'usuario'}</Text>
                </View>
              </View>
              {post.contenido && (
                <Text style={styles.postContenido} numberOfLines={3}>
                  {post.contenido}
                </Text>
              )}
            </View>
          )}

          {parentComment && (
            <View style={styles.parentCommentPreview}>
              <Text style={styles.replyingToLabel}>Respondiendo a</Text>
              <View style={styles.commentHeader}>
                {parentComment.autor?.avatar ? (
                  <Image source={{ uri: parentComment.autor.avatar }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                    <IconSymbol name="person.fill" size={16} color={colors.textSecondary} />
                  </View>
                )}
                <View style={styles.commentAutorInfo}>
                  <Text style={styles.commentAutorNombre}>{parentComment.autor?.nombre || 'Usuario'}</Text>
                  <Text style={styles.commentAutorUsername}>@{parentComment.autor?.username || 'usuario'}</Text>
                </View>
              </View>
              <Text style={styles.commentTexto} numberOfLines={2}>
                {parentComment.texto}
              </Text>
            </View>
          )}

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Tu comentario</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={parentComment ? 'Escribe tu respuesta...' : 'Escribe tu comentario...'}
                placeholderTextColor={colors.textSecondary}
                value={comentario}
                onChangeText={(text) => {
                  console.log('[Comentar] 📝 Text changed:', text);
                  setComentario(text);
                }}
                onSelectionChange={(event) => {
                  const newPosition = event.nativeEvent.selection.start;
                  console.log('[Comentar] 📍 Cursor position changed to:', newPosition);
                  setCursorPosition(newPosition);
                }}
                multiline
                maxLength={500}
                editable={!publishing}
                autoFocus
              />
              <Text style={styles.charCount}>{comentario.length}/500</Text>
            </View>
            <View style={styles.helperContainer}>
              <IconSymbol name="info.circle" size={14} color={colors.primary} />
              <Text style={styles.helperText}>
                Escribe @ para mencionar usuarios o locales
              </Text>
            </View>
          </View>

          {isInteractingAsLocal && activeLocalProfileId && (
            <View style={styles.contextIndicator}>
              <IconSymbol name="building.2.fill" size={16} color={colors.primary} />
              <Text style={styles.contextText}>
                Comentando como local
              </Text>
            </View>
          )}

          {/* Add extra padding at bottom to ensure content is visible above keyboard */}
          <View style={{ height: keyboardHeight > 0 ? 320 : 40 }} />
        </ScrollView>

        {/* Autocomplete Component - Fixed position above keyboard */}
        {keyboardHeight > 0 && (
          <View 
            style={[
              styles.autocompleteContainer, 
              { 
                bottom: keyboardHeight + 8,
              }
            ]}
            pointerEvents="box-none"
          >
            <MentionAutocomplete
              text={comentario}
              cursorPosition={cursorPosition}
              onSelectMention={handleSelectMention}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  publishButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    minWidth: 90,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.headerText,
  },
  publishButtonTextDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  postPreview: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  postAutorInfo: {
    flex: 1,
  },
  postAutorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  postAutorUsername: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postContenido: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  parentCommentPreview: {
    backgroundColor: colors.background,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  replyingToLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  commentAutorInfo: {
    flex: 1,
  },
  commentAutorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentAutorUsername: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  commentTexto: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  inputSection: {
    backgroundColor: colors.cardBackground,
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  helperText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  autocompleteContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 9999,
    elevation: 9999,
  },
  contextIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  contextText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
