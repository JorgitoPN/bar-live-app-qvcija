
import React, { useState, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { Post } from '@/types';
import { colors } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PublicacionCardProps {
  post: Post;
}

// ✅ ULTRA-OPTIMIZED: Memoized image component
const PostImage = memo(({ uri }: { uri: string }) => (
  <Image 
    source={{ uri }} 
    style={styles.imagen} 
    resizeMode="cover"
    fadeDuration={0}
    progressiveRenderingEnabled={true}
    cache="force-cache"
  />
));

PostImage.displayName = 'PostImage';

// ✅ ULTRA-OPTIMIZED: Memoized avatar component
const Avatar = memo(({ uri, name }: { uri?: string; name: string }) => {
  if (uri) {
    return <Image source={{ uri }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarPlaceholder]}>
      <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
});

Avatar.displayName = 'Avatar';

// ✅ ULTRA-OPTIMIZED: Main card component with aggressive memoization
const PublicacionCard = memo(function PublicacionCard({ post }: PublicacionCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked || false);
  const [likesCount, setLikesCount] = useState(post.likes);

  const handleLike = useCallback(() => {
    setLiked(!liked);
    setLikesCount(liked ? likesCount - 1 : likesCount + 1);
  }, [liked, likesCount]);

  const handleNavigateToProfile = useCallback(() => {
    if (post.tipo === 'local' && post.localId) {
      router.push(`/perfil/local?localId=${post.localId}`);
    } else {
      router.push(`/perfil/usuario?userId=${post.autorId}`);
    }
  }, [post.tipo, post.localId, post.autorId, router]);

  const handleNavigateToPost = useCallback(() => {
    router.push(`/social/post?id=${post.id}`);
  }, [post.id, router]);

  const displayName = post.autorUsername 
    ? post.autorUsername.replace(/^@/, '') 
    : (post.autorNombre || 'Usuario').replace(/^@/, '');

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={handleNavigateToProfile}
        activeOpacity={0.7}
      >
        <Avatar uri={post.autorAvatar} name={displayName} />
        <View style={styles.headerContent}>
          <Text style={styles.autorNombre}>{displayName}</Text>
          <Text style={styles.fecha}>{formatTime(post.fecha)}</Text>
        </View>
      </TouchableOpacity>

      {post.contenido && (
        <View style={styles.contenidoContainer}>
          <Text style={styles.contenido} numberOfLines={3}>
            {post.contenido}
          </Text>
        </View>
      )}

      {images.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={handleNavigateToPost}
          style={styles.imageContainer}
        >
          <PostImage uri={images[0]} />
          {images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>+{images.length - 1}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.acciones}>
        <TouchableOpacity style={styles.accionButton} onPress={handleLike} activeOpacity={0.7}>
          <IconSymbol
            ios_icon_name={liked ? 'heart.fill' : 'heart'}
            android_material_icon_name={liked ? 'favorite' : 'favorite_border'}
            size={24}
            color={liked ? '#EF4444' : colors.text}
          />
          <Text style={[styles.accionText, liked && styles.accionTextLiked]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.accionButton} onPress={handleNavigateToPost} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="bubble.left" android_material_icon_name="chat_bubble_outline" size={24} color={colors.text} />
          <Text style={styles.accionText}>{post.comentarios}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison for better performance
  return (
    prevProps.post.id === nextProps.post.id &&
    prevProps.post.likes === nextProps.post.likes &&
    prevProps.post.liked === nextProps.post.liked &&
    prevProps.post.comentarios === nextProps.post.comentarios
  );
});

// ✅ Optimized time formatting
function formatTime(fecha: string): string {
  const date = new Date(fecha);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardBorder,
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
  headerContent: {
    flex: 1,
  },
  autorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  fecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contenidoContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  contenido: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  imagen: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 16,
  },
  accionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  accionTextLiked: {
    color: '#EF4444',
  },
});

export default PublicacionCard;
