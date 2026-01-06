
import { useRouter } from 'expo-router';
import MiniFoodPlateAvatar from '@/components/common/MiniFoodPlateAvatar';
import OptimizedImage from '@/components/common/OptimizedImage';
import { scaleFontSize, scaleIconSize } from '@/utils/androidScaling';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { IconSymbol } from '@/components/IconSymbol';
import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import CommentsModal from '@/components/social/CommentsModal';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { colors } from '@/styles/commonStyles';
import ReportModal from '@/components/social/ReportModal';
import TagDisplay from '@/components/social/TagDisplay';
import { useAuth } from '@/contexts/AuthContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  ActionSheetIOS,
  ScrollView,
  Share,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import PostLikesAvatars from '@/components/social/PostLikesAvatars';
import ParsedText from '@/components/social/ParsedText';
import { LinearGradient } from 'expo-linear-gradient';
import SharePostModal from '@/components/social/SharePostModal';
import TaggingModalV5, { TaggableUser } from '@/components/social/TaggingModalV5';
import { supabase } from '@/utils/supabase';

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  compartidos_count: number;
  created_at: string;
  autor?: {
    id: string;
    nombre: string;
    username?: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
    imagen_url?: string;
  };
  user_has_liked?: boolean;
  user_has_saved?: boolean;
}

interface PublicacionCardProps {
  post: Post;
  onUpdate?: () => void;
}

const PublicacionCard = memo(({ post, onUpdate }: PublicacionCardProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTagging, setShowTagging] = useState(false);
  const [liked, setLiked] = useState(post.user_has_liked || false);
  const [saved, setSaved] = useState(post.user_has_saved || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);

  const handlePostOptions = useCallback((post: Post) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para realizar esta acción');
      return;
    }

    const isOwnPost = post.autor_id === user.id;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: isOwnPost 
            ? ['Cancelar', 'Editar', 'Gestionar etiquetas', 'Eliminar']
            : ['Cancelar', 'Reportar'],
          destructiveButtonIndex: isOwnPost ? 3 : undefined,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (isOwnPost) {
            if (buttonIndex === 1) {
              router.push(`/editar/publicacion?id=${post.id}`);
            } else if (buttonIndex === 2) {
              setShowTagging(true);
            } else if (buttonIndex === 3) {
              handleDeletePost(post);
            }
          } else {
            if (buttonIndex === 1) {
              setShowReport(true);
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Opciones',
        '',
        isOwnPost
          ? [
              { text: 'Editar', onPress: () => router.push(`/editar/publicacion?id=${post.id}`) },
              { text: 'Gestionar etiquetas', onPress: () => setShowTagging(true) },
              { text: 'Eliminar', onPress: () => handleDeletePost(post), style: 'destructive' },
              { text: 'Cancelar', style: 'cancel' },
            ]
          : [
              { text: 'Reportar', onPress: () => setShowReport(true) },
              { text: 'Cancelar', style: 'cancel' },
            ]
      );
    }
  }, [user, router]);

  const handleDeletePost = useCallback(async (post: Post) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Estás seguro de que quieres eliminar esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Publicación eliminada');
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [onUpdate]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.authorInfo}>
          <MiniFoodPlateAvatar
            userId={post.autor_id}
            size={40}
            showMomento={true}
          />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>{post.autor?.nombre || 'Usuario'}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => handlePostOptions(post)}>
          {/* ✅ FIX v103.0: Changed from invalid "ellipsis" to valid "more-vert" for Android */}
          <IconSymbol
            ios_icon_name="ellipsis"
            android_material_icon_name="more-vert"
            size={scaleIconSize(24)}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {post.contenido && (
        <View style={styles.content}>
          <ParsedText text={post.contenido} />
        </View>
      )}

      {post.imagenes && post.imagenes.length > 0 && (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {post.imagenes.map((imagen, index) => (
            <OptimizedImage
              key={index}
              source={{ uri: imagen }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => setLiked(!liked)}>
          <IconSymbol
            ios_icon_name={liked ? 'heart.fill' : 'heart'}
            android_material_icon_name={liked ? 'favorite' : 'favorite_border'}
            size={scaleIconSize(24)}
            color={liked ? '#EF4444' : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowComments(true)}>
          <IconSymbol
            ios_icon_name="bubble.left"
            android_material_icon_name="chat_bubble_outline"
            size={scaleIconSize(24)}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowShare(true)}>
          <IconSymbol
            ios_icon_name="paperplane"
            android_material_icon_name="send"
            size={scaleIconSize(24)}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSaved(!saved)} style={styles.saveButton}>
          <IconSymbol
            ios_icon_name={saved ? 'bookmark.fill' : 'bookmark'}
            android_material_icon_name={saved ? 'bookmark' : 'bookmark_border'}
            size={scaleIconSize(24)}
            color={saved ? colors.primary : colors.text}
          />
        </TouchableOpacity>
      </View>

      <PostLikesAvatars postId={post.id} likesCount={likesCount} />

      <CommentsModal
        visible={showComments}
        postId={post.id}
        onClose={() => setShowComments(false)}
      />

      <ReportModal
        visible={showReport}
        contentType="post"
        contentId={post.id}
        onClose={() => setShowReport(false)}
      />

      <SharePostModal
        visible={showShare}
        post={post}
        onClose={() => setShowShare(false)}
      />

      <TaggingModalV5
        visible={showTagging}
        postId={post.id}
        onClose={() => setShowTagging(false)}
      />
    </View>
  );
});

const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Ahora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}sem`;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: scaleFontSize(15),
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    fontSize: scaleFontSize(13),
    color: colors.textSecondary,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
  },
  saveButton: {
    marginLeft: 'auto',
  },
});

export default PublicacionCard;
