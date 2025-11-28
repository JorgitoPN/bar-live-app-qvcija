
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import FoodPlateAvatar from '@/components/common/FoodPlateAvatar';

interface Comment {
  id: string;
  post_id: string;
  usuario_id: string;
  contenido: string;
  created_at: string;
  usuario: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
}

interface CommentsModalProps {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentsModal({
  visible,
  postId,
  onClose,
  onCommentAdded,
}: CommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comentarios')
        .select(`
          *,
          usuario:usuarios(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComments(data || []);
    } catch (error) {
      console.error('[CommentsModal] Error loading comments:', error);
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async () => {
    if (!user || !commentText.trim() || sending) {
      return;
    }

    const text = commentText.trim();
    setCommentText('');
    setSending(true);

    try {
      const { data: newComment, error } = await supabase
        .from('comentarios')
        .insert({
          post_id: postId,
          usuario_id: user.id,
          contenido: text,
        })
        .select(`
          *,
          usuario:usuarios(
            id,
            nombre,
            username,
            avatar
          )
        `)
        .single();

      if (error) throw error;

      setComments(prev => [newComment, ...prev]);
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('[CommentsModal] Error sending comment:', error);
      Alert.alert('Error', 'No se pudo enviar el comentario');
      setCommentText(text);
    } finally {
      setSending(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}sem`;
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <FoodPlateAvatar
        imageUrl={item.usuario.avatar}
        size={36}
        nombre={item.usuario.nombre}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentUsername}>
            {item.usuario.username || item.usuario.nombre}
          </Text>
          <Text style={styles.commentText}>{item.contenido}</Text>
        </View>
        <Text style={styles.commentTime}>{formatTimeAgo(item.created_at)}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <IconSymbol
        ios_icon_name="bubble.left"
        android_material_icon_name="chat_bubble_outline"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyText}>No hay comentarios aún</Text>
      <Text style={styles.emptySubtext}>Sé el primero en comentar</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <Text style={styles.headerTitle}>Comentarios</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </BlurView>

        {/* Comments List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input */}
        {user && (
          <BlurView intensity={80} tint="light" style={styles.inputContainer}>
            <FoodPlateAvatar
              imageUrl={user.avatar}
              size={36}
              nombre={user.nombre}
            />
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Añade un comentario..."
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                editable={!sending}
              />
              {commentText.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendComment}
                  activeOpacity={0.7}
                  disabled={sending}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sendButtonGradient}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <IconSymbol
                        ios_icon_name="paperplane.fill"
                        android_material_icon_name="send"
                        size={18}
                        color="#fff"
                      />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </BlurView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 12,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
    overflow: 'hidden',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
