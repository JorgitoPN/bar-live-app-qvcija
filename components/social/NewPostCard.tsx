
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import FoodPlateAvatar from '@/components/common/FoodPlateAvatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Post {
  id: string;
  autor_id: string;
  tipo: 'usuario' | 'local';
  local_id?: string;
  contenido?: string;
  imagenes: string[];
  video_url?: string;
  ubicacion?: string;
  likes_count: number;
  comentarios_count: number;
  guardados_count: number;
  user_has_liked: boolean;
  user_has_saved: boolean;
  created_at: string;
  autor: {
    id: string;
    nombre: string;
    username: string;
    avatar?: string;
  };
  local?: {
    id: string;
    nombre: string;
  };
}

interface NewPostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
  onSave: (postId: string) => void;
}

export default function NewPostCard({
  post,
  onLike,
  onComment,
  onShare,
  onSave,
}: NewPostCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleProfilePress = () => {
    if (post.tipo === 'local' && post.local_id) {
      router.push(`/detalle/local?id=${post.local_id}`);
    } else {
      router.push(`/perfil/usuario?id=${post.autor_id}`);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)}d`;
    return `Hace ${Math.floor(seconds / 604800)}sem`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.authorInfo} onPress={handleProfilePress}>
          <FoodPlateAvatar
            imageUrl={post.autor.avatar}
            size={40}
            nombre={post.autor.nombre}
          />
          <View style={styles.authorText}>
            <Text style={styles.authorName}>{post.autor.nombre}</Text>
            {post.tipo === 'local' && post.local && (
              <Text style={styles.localName}>{post.local.nombre}</Text>
            )}
            <Text style={styles.timeAgo}>{formatTimeAgo(post.created_at)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {post.contenido && (
        <Text style={styles.content}>{post.contenido}</Text>
      )}

      {/* Images */}
      {post.imagenes.length > 0 && (
        <View style={styles.imagesContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setCurrentImageIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {post.imagenes.map((imagen, index) => (
              <Image
                key={index}
                source={{ uri: imagen }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>

          {post.imagenes.length > 1 && (
            <View style={styles.imageIndicator}>
              {post.imagenes.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicatorDot,
                    index === currentImageIndex && styles.indicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* Location */}
      {post.ubicacion && (
        <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.locationText}>{post.ubicacion}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onLike(post.id)}
          >
            <Ionicons
              name={post.user_has_liked ? 'heart' : 'heart-outline'}
              size={28}
              color={post.user_has_liked ? '#ff3b30' : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onComment(post.id)}
          >
            <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onShare(post.id)}
          >
            <Ionicons name="paper-plane-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onSave(post.id)}
        >
          <Ionicons
            name={post.user_has_saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        {post.likes_count > 0 && (
          <Text style={styles.statsText}>
            <Text style={styles.statsBold}>{formatNumber(post.likes_count)}</Text> me gusta
          </Text>
        )}
        {post.comentarios_count > 0 && (
          <TouchableOpacity onPress={() => onComment(post.id)}>
            <Text style={styles.commentsText}>
              Ver los {post.comentarios_count} comentarios
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorText: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  localName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  imagesContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  indicatorDotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
  },
  stats: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  statsText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  statsBold: {
    fontWeight: '600',
  },
  commentsText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
