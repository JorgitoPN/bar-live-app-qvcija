
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { socialCache } from '@/utils/socialCache';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import StoryStatsModal from '@/components/social/StoryStatsModal';
import ParsedText from '@/components/social/ParsedText';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  ActivityIndicator,
  Pressable,
  FlatList,
  Keyboard,
} from 'react-native';
import { supabase } from '@/utils/supabase';
import { useGlobalData } from '@/contexts/GlobalDataContext';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';

interface Comentario {
  id: string;
  autor_id: string;
  texto: string;
  created_at: string;
  likes: number;
  parent_comment_id?: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  liked?: boolean;
  replies?: Comentario[];
}

interface HistoriaConAutor {
  id: string;
  autor_id: string;
  tipo: string;
  imagen: string;
  created_at: string;
  expires_at: string;
  visto: boolean;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  visto_por_usuario?: boolean;
  views_count?: number;
  likes_count?: number;
  liked_by_user?: boolean;
  comments_count?: number;
  local_id?: string;
}

interface SearchResult {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
  tipo: 'usuario' | 'local' | 'hashtag';
  bio?: string;
  seguidores?: number;
  uso_count?: number;
}

interface ChatUser {
  id: string;
  nombre: string;
  username?: string;
  avatar?: string;
}

interface LocalProfile {
  id: string;
  nombre: string;
  tipo: string;
  imagen_url?: string;
}

const HEADER_HEIGHT = 120;
const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.headerText,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  localSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  localSelectorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  localSelectorImagePlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localSelectorText: {
    flex: 1,
  },
  localSelectorLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  localSelectorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  localSelectorModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  localSelectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localSelectorModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  localSelectorModalContent: {
    padding: 16,
  },
  localSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  localSelectorItemActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  localSelectorItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 16,
  },
  localSelectorItemInfo: {
    flex: 1,
  },
  localSelectorItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  localSelectorItemNameActive: {
    color: colors.primary,
  },
  localSelectorItemType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchToClientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.secondary + '20',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.secondary,
    gap: 8,
  },
  switchToClientButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.secondary,
  },
  searchModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchModalHeader: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 8,
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
  },
  searchResultAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  searchResultUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  searchResultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  searchResultBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  historiasContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.cardBorder,
    minHeight: 130,
    backgroundColor: colors.background,
  },
  historiasScrollContent: {
    alignItems: 'center',
  },
  historiaItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  historiaAvatarContainer: {
    position: 'relative',
  },
  historiaGradientBorder: {
    padding: 3,
    borderRadius: 48,
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historiaAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.background,
  },
  historiaAvatarVisto: {
    borderColor: colors.cardBorder,
  },
  historiaAddButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    position: 'relative',
  },
  historiaUserAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  historiaAddIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  historiaNombre: {
    fontSize: 12,
    color: colors.text,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 90,
  },
  feedContainer: {
    flex: 1,
  },
  postCard: {
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
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
  postFecha: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postOptionsButton: {
    padding: 8,
  },
  imageCarouselContainer: {
    position: 'relative',
  },
  imageCarousel: {
    width: SCREEN_WIDTH,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  postImagen: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBorder,
  },
  imageIndicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  imageIndicatorDotActive: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    width: 8,
    height: 8,
    borderRadius: 4,
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
  multipleImagesIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postActionButton: {
    marginRight: 18,
    padding: 4,
  },
  postActionButtonRight: {
    marginLeft: 'auto',
    padding: 4,
  },
  postLikes: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  postLikesText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  postDescripcion: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postDescripcionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  postComentarios: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  postComentariosText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  storyViewerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  storyProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  storyAutorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyAutorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  storyAutorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  storyCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  storyBottomLeftControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    flexDirection: 'row',
    gap: 16,
    zIndex: 10,
  },
  storyStatsButtonBottom: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyDeleteButtonBottom: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: width,
    height: height,
  },
  storyTouchZones: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  storyTouchZone: {
    flex: 1,
  },
  storyInteractionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  storyInteractionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  storyInteractionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  storyMessageInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  storySendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInStory: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  createOptionsModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  createOptionsContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  createOptionsHeader: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  createOptionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  createOptionsButtons: {
    padding: 16,
    gap: 12,
  },
  createOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  createOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createOptionInfo: {
    flex: 1,
  },
  createOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  createOptionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
});

function formatearFecha(fecha: string): string {
  const ahora = new Date();
  const fechaPost = new Date(fecha);
  const diffMs = ahora.getTime() - fechaPost.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMs / 3600000);
  const diffDias = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  return fechaPost.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function PostCardWithSwipe({ post, user, activeLocalProfileId, router, toggleLike, toggleSave, handleDeletePost }: any) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  const canDelete = user && (
    (post.tipo === 'usuario' && post.autor_id === user.id) ||
    (post.tipo === 'local' && activeLocalProfileId === post.local_id)
  );

  const images = post.imagenes && post.imagenes.length > 0 
    ? post.imagenes 
    : post.imagen 
      ? [post.imagen] 
      : [];

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleNavigateToProfile = () => {
    if (post.tipo === 'local' && post.local_id) {
      router.push(`/perfil/local?localId=${post.local_id}`);
    } else if (user && post.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${post.autor_id}`);
    }
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={handleNavigateToProfile}
          activeOpacity={0.7}
        >
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
            <Text style={styles.postFecha}>{formatearFecha(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity 
            style={styles.postOptionsButton}
            onPress={() => handleDeletePost(post.id)}
            activeOpacity={0.7}
          >
            <IconSymbol name="trash" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {images.length > 0 && (
        <View style={styles.imageCarouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={styles.imageCarousel}
            scrollEnabled={true}
            bounces={false}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH}
            snapToAlignment="center"
          >
            {images.map((imageUrl: string, index: number) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.95}
                onPress={() => router.push(`/social/post?id=${post.id}`)}
                style={styles.imageContainer}
              >
                <Image 
                  source={{ uri: imageUrl }} 
                  style={styles.postImagen} 
                  resizeMode="cover" 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {images.length > 1 && (
            <View style={styles.imageIndicatorContainer}>
              {images.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicatorDot,
                    currentImageIndex === index && styles.imageIndicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>
                {currentImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}
        </View>
      )}

      {post.ubicacion && (
        <View style={styles.locationContainer}>
          <IconSymbol name="mappin.circle.fill" size={16} color={colors.primary} />
          <Text style={styles.locationText}>{post.ubicacion}</Text>
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.postActionButton}
          onPress={() => toggleLike(post.id)}
          activeOpacity={0.7}
        >
          <IconSymbol 
            name={post.liked ? 'heart.fill' : 'heart'} 
            size={26} 
            color={post.liked ? '#EF4444' : colors.text} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postActionButton}
          onPress={() => router.push(`/social/post?id=${post.id}`)}
          activeOpacity={0.7}
        >
          <IconSymbol name="message" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.postActionButton}
          onPress={() => router.push(`/social/post?id=${post.id}&share=true`)}
          activeOpacity={0.7}
        >
          <IconSymbol name="paperplane" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.postActionButtonRight}
          onPress={() => toggleSave(post.id)}
          activeOpacity={0.7}
        >
          <IconSymbol 
            name={post.saved ? 'bookmark.fill' : 'bookmark'} 
            size={26} 
            color={post.saved ? colors.primary : colors.text} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.postLikes}>
        <Text style={styles.postLikesText}>{post.likes || 0} me gusta</Text>
      </View>

      {post.contenido && (
        <View style={styles.postDescripcion}>
          <Text style={styles.postDescripcionText}>
            <Text style={{ fontWeight: '600' }}>{post.autor?.nombre || 'Usuario'}</Text>{' '}
            <ParsedText text={post.contenido} style={styles.postDescripcionText} />
          </Text>
        </View>
      )}

      {post.comentarios > 0 && (
        <TouchableOpacity
          style={styles.postComentarios}
          onPress={() => router.push(`/social/post?id=${post.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.postComentariosText}>
            Ver {post.comentarios === 1 ? 'el comentario' : `los ${post.comentarios} comentarios`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
  const { 
    currentMode,
    activeProfileId,
    activeProfileType,
    activeLocalData,
    ownedLocals,
    switchToClientProfile,
    switchToLocalProfile,
    setCurrentMode,
  } = useMode();
  
  const { posts: globalPosts, stories: globalStories, isInitialLoading, refreshData } = useGlobalData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [historias, setHistorias] = useState<HistoriaConAutor[]>([]);
  const [userStories, setUserStories] = useState<HistoriaConAutor[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  const [showLocalSelector, setShowLocalSelector] = useState(false);
  
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewingOwnStories, setViewingOwnStories] = useState(false);
  const [storyMessage, setStoryMessage] = useState('');
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [showStoryStats, setShowStoryStats] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');
  const headerTranslateY = useRef(new Animated.Value(0)).current;

  const isLoadingRef = useRef(false);
  const likingPostsRef = useRef<Set<string>>(new Set());

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');
  const isOwnerMode = currentMode === 'propietario' && isPropietario;

  const isInteractingAsLocal = activeProfileType === 'local';
  const activeLocalProfileId = activeProfileType === 'local' ? activeProfileId : null;

  const markStoryAsViewed = useCallback(async (storyId: string) => {
    if (!user) return;

    try {
      console.log('[Social] ⚡ INSTANT - Marking story as viewed:', storyId);
      
      const { data: existingView } = await supabase
        .from('historia_views')
        .select('id')
        .eq('historia_id', storyId)
        .eq('usuario_id', user.id)
        .single();

      if (!existingView) {
        await supabase.from('historia_views').insert({
          historia_id: storyId,
          usuario_id: user.id,
        });
        
        console.log('[Social] ✅ Story marked as viewed in database');
      } else {
        console.log('[Social] ℹ️ Story already viewed');
      }

      if (viewingOwnStories) {
        setUserStories(prev => prev.map(s => 
          s.id === storyId ? { ...s, visto_por_usuario: true } : s
        ));
      } else {
        setHistorias(prev => prev.map(s => 
          s.id === storyId ? { ...s, visto_por_usuario: true } : s
        ));
      }
      
      console.log('[Social] ✅ INSTANT - UI updated, border removed');
    } catch (error) {
      console.error('[Social] Error marking story as viewed:', error);
    }
  }, [user, viewingOwnStories]);

  const loadData = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('[Social] ⚡ Already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;

    try {
      console.log('[Social] ⚡ Loading user-specific data...');
      console.log('[Social] 📍 Current mode:', currentMode);
      console.log('[Social] 📍 Is owner mode:', isOwnerMode);
      console.log('[Social] 📍 Active profile ID:', activeProfileId);
      console.log('[Social] 📍 Active profile type:', activeProfileType);
      console.log('[Social] 📍 Active local data:', activeLocalData?.nombre);
      console.log('[Social] 📍 Is interacting as local:', isInteractingAsLocal);
      console.log('[Social] 📍 User role:', user?.rol_app);

      if (globalPosts.length > 0) {
        console.log('[Social] ⚡ INSTANT posts from global data:', globalPosts.length);
        console.log('[Social] 📍 Current context - Mode:', currentMode, 'Type:', activeProfileType, 'Interacting:', isInteractingAsLocal, 'Active Local:', activeLocalProfileId);
        
        let filteredPosts = globalPosts;
        
        if (isOwnerMode && activeLocalProfileId) {
          filteredPosts = globalPosts.filter(p => p.tipo === 'local' && p.local_id === activeLocalProfileId);
          console.log('[Social] 🏢 Owner mode - Filtered posts for local:', activeLocalProfileId, 'Count:', filteredPosts.length);
        } else {
          if (user) {
            const { data: followedLocals } = await supabase
              .from('locales_favoritos')
              .select('local_id')
              .eq('usuario_id', user.id);

            const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
            
            filteredPosts = globalPosts.filter(p => 
              p.tipo === 'usuario' || 
              (p.tipo === 'local' && p.local_id && followedLocalIds.has(p.local_id))
            );
            console.log('[Social] 👤 User mode - Filtered user posts + followed locals, Count:', filteredPosts.length);
          } else {
            filteredPosts = globalPosts.filter(p => p.tipo === 'usuario');
            console.log('[Social] 👤 User mode - Filtered user posts only (not logged in), Count:', filteredPosts.length);
          }
        }
        
        if (user && filteredPosts.length > 0) {
          const postIds = filteredPosts.map(p => p.id);
          
          const [likesResult, savesResult, commentsResult] = await Promise.all([
            supabase
              .from('likes')
              .select('post_id')
              .eq('usuario_id', user.id)
              .in('post_id', postIds),
            supabase
              .from('posts_guardados')
              .select('post_id')
              .eq('usuario_id', user.id)
              .in('post_id', postIds),
            supabase
              .from('comentarios')
              .select('post_id')
              .in('post_id', postIds),
          ]);

          const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
          const savedPostIds = new Set(savesResult.data?.map(s => s.post_id) || []);
          
          const commentCounts = commentsResult.data?.reduce((acc, c) => {
            acc[c.post_id] = (acc[c.post_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};

          const postsWithStatus = filteredPosts.map(post => ({
            ...post,
            liked: likedPostIds.has(post.id),
            saved: savedPostIds.has(post.id),
            comentarios: commentCounts[post.id] || 0,
          }));
          
          setPosts(postsWithStatus);
        } else {
          setPosts(filteredPosts);
        }
      }

      if (globalStories.length > 0) {
        console.log('[Social] ⚡ INSTANT stories from global data:', globalStories.length);
        console.log('[Social] 📍 Current context - Mode:', currentMode, 'Owner Mode:', isOwnerMode, 'Active Local:', activeLocalProfileId);
        
        let userOwnStories: typeof globalStories = [];
        let otherStories: typeof globalStories = [];

        if (isOwnerMode && activeLocalProfileId) {
          userOwnStories = globalStories.filter(s => s.tipo === 'local' && s.local_id === activeLocalProfileId);
          otherStories = globalStories.filter(s => s.tipo === 'usuario');
          console.log('[Social] 🏢 Owner mode - Filtered stories for local:', activeLocalProfileId, 'Own:', userOwnStories.length, 'Others:', otherStories.length);
        } else if (user) {
          const { data: followedLocals } = await supabase
            .from('locales_favoritos')
            .select('local_id')
            .eq('usuario_id', user.id);

          const followedLocalIds = new Set(followedLocals?.map(f => f.local_id) || []);
          
          userOwnStories = globalStories.filter(s => s.tipo === 'usuario' && s.autor_id === user.id);
          otherStories = globalStories.filter(s => 
            (s.tipo === 'usuario' && s.autor_id !== user.id) ||
            (s.tipo === 'local' && s.local_id && followedLocalIds.has(s.local_id))
          );
          console.log('[Social] 👤 User mode - Own stories:', userOwnStories.length, 'Others (users + followed locals):', otherStories.length);
        } else {
          otherStories = globalStories.filter(s => s.tipo === 'usuario');
          console.log('[Social] 🔓 Not logged in - Showing all user stories:', otherStories.length);
        }
        
        if (user) {
          const allStoryIds = globalStories.map(s => s.id);
          
          const [viewedData, likesData, viewsCountData, commentsCountData] = await Promise.all([
            supabase
              .from('historia_views')
              .select('historia_id')
              .eq('usuario_id', user.id)
              .in('historia_id', allStoryIds),
            supabase
              .from('historia_likes')
              .select('historia_id')
              .eq('usuario_id', user.id)
              .in('historia_id', allStoryIds),
            supabase
              .from('historia_views')
              .select('historia_id')
              .in('historia_id', allStoryIds),
            supabase
              .from('historia_comentarios')
              .select('historia_id')
              .in('historia_id', allStoryIds),
          ]);
          
          const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
          const likedStoryIds = new Set(likesData.data?.map(l => l.historia_id) || []);
          
          const viewsCounts = viewsCountData.data?.reduce((acc, v) => {
            acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const commentsCounts = commentsCountData.data?.reduce((acc, c) => {
            acc[c.historia_id] = (acc[c.historia_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>) || {};
          
          const userStoriesWithStatus = userOwnStories.map(story => ({
            ...story,
            visto_por_usuario: viewedStoryIds.has(story.id),
            liked_by_user: likedStoryIds.has(story.id),
            views_count: viewsCounts[story.id] || 0,
            comments_count: commentsCounts[story.id] || 0,
          }));
          
          const otherStoriesWithStatus = otherStories.map(story => ({
            ...story,
            visto_por_usuario: viewedStoryIds.has(story.id),
            liked_by_user: likedStoryIds.has(story.id),
            views_count: viewsCounts[story.id] || 0,
            comments_count: commentsCounts[story.id] || 0,
          }));
          
          setUserStories(userStoriesWithStatus);
          setHistorias(otherStoriesWithStatus);
        } else {
          setHistorias(otherStories);
        }
      }

      console.log('[Social] ⚡ User-specific data loaded');
    } catch (error) {
      console.error('[Social] Error loading data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [user, globalPosts, globalStories, isOwnerMode, activeLocalProfileId, isInteractingAsLocal, activeProfileType, currentMode, activeProfileId, activeLocalData]);

  const loadUnreadCounts = useCallback(async () => {
    if (!user) return;

    try {
      const { count: notifCount } = await supabase
        .from('notificaciones')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', user.id)
        .eq('leida', false);

      setUnreadNotifications(notifCount || 0);

      const { data: chatsData } = await supabase
        .from('chats')
        .select('id')
        .or(`usuario1_id.eq.${user.id},usuario2_id.eq.${user.id}`);

      if (chatsData) {
        let totalUnread = 0;
        for (const chat of chatsData) {
          const { count } = await supabase
            .from('mensajes')
            .select('*', { count: 'exact', head: true })
            .eq('chat_id', chat.id)
            .eq('leido', false)
            .neq('remitente_id', user.id);
          
          totalUnread += count || 0;
        }
        setUnreadMessages(totalUnread);
      }
    } catch (error) {
      console.error('[Social] Error loading unread counts:', error);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      console.log('[Social] ⚡ Screen focused');
      loadData();
      loadUnreadCounts();
    }, [loadData, loadUnreadCounts])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData(false);
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

  // ENHANCED: Search with hashtag support
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('[Social] 🔍 Searching for:', query);
      
      const searchTerm = query.trim();
      const results: SearchResult[] = [];
      
      // Check if searching for hashtag
      if (searchTerm.startsWith('#')) {
        const hashtagTerm = searchTerm.substring(1).toLowerCase();
        
        // Search hashtags
        const { data: hashtagsData, error: hashtagsError } = await supabase
          .from('hashtags')
          .select('id, tag, uso_count')
          .ilike('tag', `%${hashtagTerm}%`)
          .order('uso_count', { ascending: false })
          .limit(10);

        if (!hashtagsError && hashtagsData) {
          results.push(...hashtagsData.map(h => ({
            id: h.id,
            nombre: `#${h.tag}`,
            tipo: 'hashtag' as const,
            uso_count: h.uso_count,
          })));
        }
      } else {
        // Search users
        const { data: usersData, error: usersError } = await supabase
          .from('usuarios')
          .select('id, nombre, username, avatar')
          .or(`nombre.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
          .eq('activo', true)
          .limit(10);

        if (!usersError && usersData) {
          results.push(...usersData.map(u => ({
            id: u.id,
            nombre: u.nombre,
            username: u.username,
            avatar: u.avatar,
            tipo: 'usuario' as const,
          })));
        }

        // Search locals with active subscriptions
        const { data: localsWithSubs, error: localsError } = await supabase
          .from('locales')
          .select(`
            id,
            nombre,
            imagen_url,
            tipo,
            provincia,
            suscripciones_locales!suscripciones_locales_local_id_fkey(
              estado,
              plan_id,
              planes_suscripcion!suscripciones_locales_plan_id_fkey(
                nombre
              )
            )
          `)
          .ilike('nombre', `%${searchTerm}%`)
          .eq('activo', true)
          .limit(20);

        if (!localsError && localsWithSubs) {
          const localsData = localsWithSubs.filter((local: any) => {
            const subscription = local.suscripciones_locales;
            if (!subscription || subscription.estado !== 'activa') {
              return false;
            }
            const planName = subscription.planes_suscripcion?.nombre;
            return planName === 'estandar' || planName === 'premium';
          });

          results.push(...localsData.map((l: any) => ({
            id: l.id,
            nombre: l.nombre,
            avatar: l.imagen_url,
            tipo: 'local' as const,
            bio: `${l.tipo} • ${l.provincia}`,
          })));
        }
      }

      console.log('[Social] ✅ Total search results:', results.length);
      setSearchResults(results);
    } catch (error) {
      console.error('[Social] ❌ Error searching:', error);
      setSearchResults([]);
    }
  }, []);

  const handleScroll = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const delta = currentScrollY - lastScrollY.current;

    if (delta > 0 && currentScrollY > 50) {
      if (scrollDirection.current !== 'down') {
        scrollDirection.current = 'down';
        Animated.timing(headerTranslateY, {
          toValue: -HEADER_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else if (delta < -5) {
      if (scrollDirection.current !== 'up') {
        scrollDirection.current = 'up';
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }

    lastScrollY.current = currentScrollY;
  }, [headerTranslateY]);

  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const handleNextStory = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (currentStory && user && !viewingOwnStories) {
      await markStoryAsViewed(currentStory.id);
    }
    
    if (currentStory && user && viewingOwnStories) {
      await markStoryAsViewed(currentStory.id);
    }
    
    if (currentStoryIndex < currentStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      progressAnim.setValue(0);
    } else {
      socialCache.clearStories();
      socialCache.clearStories(user?.id);
      await loadData();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, historias, userStories, viewingOwnStories, stopStoryTimer, user, loadData, progressAnim, markStoryAsViewed]);

  const startStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
    }

    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    storyTimerRef.current = setTimeout(() => {
      handleNextStory();
    }, 5000);
  }, [handleNextStory, progressAnim]);

  const findFirstUnviewedStoryIndex = useCallback((stories: HistoriaConAutor[]): number => {
    const firstUnviewedIndex = stories.findIndex(story => !story.visto_por_usuario);
    return firstUnviewedIndex === -1 ? 0 : firstUnviewedIndex;
  }, []);

  const handleStoryPress = useCallback(async (index: number, isOwnStory: boolean = false) => {
    console.log('[Social] 📖 Story pressed - index:', index, 'isOwnStory:', isOwnStory);
    const stories = isOwnStory ? userStories : historias;
    console.log('[Social] 📖 Stories available:', stories.length);
    
    const firstUnviewedIndex = findFirstUnviewedStoryIndex(stories);
    console.log('[Social] 📖 First unviewed index:', firstUnviewedIndex);
    
    setCurrentStoryIndex(firstUnviewedIndex);
    setViewingOwnStories(isOwnStory);
    setShowStoryViewer(true);
    setIsPaused(false);
    
    const firstStory = stories[firstUnviewedIndex];
    if (firstStory && user) {
      await markStoryAsViewed(firstStory.id);
    }
    
    startStoryTimer();
  }, [startStoryTimer, userStories, historias, findFirstUnviewedStoryIndex, user, markStoryAsViewed]);

  const handlePreviousStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      progressAnim.setValue(0);
      startStoryTimer();
    } else {
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, startStoryTimer, stopStoryTimer, progressAnim]);

  const handleDeleteStory = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user) {
      return;
    }

    const isOwner = currentStory.tipo === 'usuario' 
      ? currentStory.autor_id === user.id
      : currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id;

    if (!isOwner) {
      return;
    }

    Alert.alert(
      'Eliminar historia',
      '¿Estás seguro de que quieres eliminar esta historia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('historias')
                .delete()
                .eq('id', currentStory.id);

              if (error) throw error;

              if (viewingOwnStories) {
                const newStories = userStories.filter((_, i) => i !== currentStoryIndex);
                setUserStories(newStories);
                socialCache.setStories(newStories, user.id);
              } else {
                const newHistorias = historias.filter((_, i) => i !== currentStoryIndex);
                setHistorias(newHistorias);
                socialCache.setStories(newHistorias);
              }

              setShowStoryViewer(false);
              stopStoryTimer();
              setCurrentStoryIndex(0);

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[Social] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [historias, userStories, currentStoryIndex, user, viewingOwnStories, stopStoryTimer, activeLocalProfileId]);

  const handleStoryLike = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user) {
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    const isLiked = currentStory.liked_by_user;

    try {
      if (isLiked) {
        await supabase
          .from('historia_likes')
          .delete()
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('historia_likes').insert({
          historia_id: currentStory.id,
          usuario_id: user.id,
        });
      }

      if (viewingOwnStories) {
        setUserStories(prev => prev.map((s, i) => 
          i === currentStoryIndex 
            ? { ...s, liked_by_user: !isLiked }
            : s
        ));
      } else {
        setHistorias(prev => prev.map((s, i) => 
          i === currentStoryIndex 
            ? { ...s, liked_by_user: !isLiked }
            : s
        ));
      }
    } catch (error) {
      console.error('[Social] Error toggling story like:', error);
    }
  }, [user, currentStoryIndex, viewingOwnStories, userStories, historias]);

  const handleViewStoryStats = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user) {
      return;
    }

    const isOwner = currentStory.tipo === 'usuario' 
      ? currentStory.autor_id === user.id
      : currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id;

    if (!isOwner) {
      return;
    }

    setIsPaused(true);
    stopStoryTimer();

    setLoadingStats(true);
    setShowStoryStats(true);

    try {
      const { data: viewsData, error: viewsError } = await supabase
        .from('historia_views')
        .select(`
          id,
          usuario_id,
          viewed_at,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('historia_id', currentStory.id)
        .order('viewed_at', { ascending: false });

      if (viewsError) throw viewsError;

      const { data: likesData, error: likesError } = await supabase
        .from('historia_likes')
        .select(`
          id,
          usuario_id,
          created_at,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('historia_id', currentStory.id)
        .order('created_at', { ascending: false });

      if (likesError) throw likesError;

      setStoryViews(viewsData || []);
      setStoryLikes(likesData || []);
    } catch (error) {
      console.error('[Social] Error loading story stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [userStories, historias, currentStoryIndex, user, viewingOwnStories, stopStoryTimer, activeLocalProfileId]);

  const handleSendStoryMessage = useCallback(async () => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory || !user || !storyMessage.trim()) {
      return;
    }

    try {
      console.log('[Social] Sending story message...');
      
      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${currentStory.autor_id}),and(usuario1_id.eq.${currentStory.autor_id},usuario2_id.eq.${user.id})`)
        .single();

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[Social] Creating new chat...');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: currentStory.autor_id,
          })
          .select()
          .single();

        if (nuevoChatError) throw nuevoChatError;
        chatId = nuevoChat.id;
        console.log('[Social] Chat created:', chatId);
      }

      const { error: mensajeError } = await supabase
        .from('mensajes')
        .insert({
          chat_id: chatId,
          remitente_id: user.id,
          contenido: storyMessage,
          historia_id: currentStory.id,
          historia_imagen: currentStory.imagen,
          tipo_mensaje: 'texto',
        });

      if (mensajeError) throw mensajeError;

      console.log('[Social] Message sent successfully');

      await supabase.from('notificaciones').insert({
        usuario_id: currentStory.autor_id,
        tipo: 'mensaje_privado',
        titulo: 'Mensaje sobre tu historia',
        mensaje: `${user.nombre} te envió un mensaje sobre tu historia`,
        usuario_origen_id: user.id,
      });

      setStoryMessage('');
      Alert.alert('Éxito', 'Mensaje enviado correctamente');
    } catch (error) {
      console.error('[Social] Error sending story message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    }
  }, [user, currentStoryIndex, viewingOwnStories, userStories, historias, storyMessage]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!user) {
      setLoginMessage('Para dar me gusta necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    if (likingPostsRef.current.has(postId)) {
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isLiked = post.liked;
    const currentLikes = post.likes || 0;

    likingPostsRef.current.add(postId);

    const updatedPost = {
      ...post,
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    };
    
    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId ? updatedPost : p
    ));
    
    socialCache.updatePost(postId, {
      liked: !isLiked,
      likes: isLiked ? currentLikes - 1 : currentLikes + 1,
    });

    try {
      if (isLiked) {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
        
        if (deleteError) throw deleteError;
        
        await supabase
          .from('posts')
          .update({ likes: Math.max(0, currentLikes - 1) })
          .eq('id', postId);
      } else {
        const { data: existingLike } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('usuario_id', user.id)
          .single();
        
        if (existingLike) {
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId 
              ? { ...p, liked: true, likes: currentLikes }
              : p
          ));
          socialCache.updatePost(postId, { liked: true, likes: currentLikes });
          likingPostsRef.current.delete(postId);
          return;
        }
        
        const { error: insertError } = await supabase.from('likes').insert({
          post_id: postId,
          usuario_id: user.id,
        });
        
        if (insertError) throw insertError;
        
        await supabase
          .from('posts')
          .update({ likes: currentLikes + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('[Social] Error toggling like:', error);
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { ...p, liked: isLiked, likes: currentLikes }
          : p
      ));
      socialCache.updatePost(postId, { liked: isLiked, likes: currentLikes });
    } finally {
      likingPostsRef.current.delete(postId);
    }
  }, [user, posts]);

  const toggleSave = useCallback(async (postId: string) => {
    if (!user) {
      setLoginMessage('Para guardar publicaciones necesitas registrarte en BarLive');
      setShowLoginModal(true);
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const isSaved = post.saved;

    setPosts(prevPosts => prevPosts.map(p => 
      p.id === postId 
        ? { ...p, saved: !isSaved }
        : p
    ));
    
    socialCache.updatePost(postId, { saved: !isSaved });

    try {
      if (isSaved) {
        await supabase
          .from('posts_guardados')
          .delete()
          .eq('post_id', postId)
          .eq('usuario_id', user.id);
      } else {
        await supabase.from('posts_guardados').insert({
          post_id: postId,
          usuario_id: user.id,
        });
      }
    } catch (error) {
      console.error('[Social] Error toggling save:', error);
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === postId 
          ? { ...p, saved: isSaved }
          : p
      ));
      socialCache.updatePost(postId, { saved: isSaved });
    }
  }, [user, posts]);

  const handleDeletePost = useCallback(async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post || !user) {
      return;
    }

    const isOwner = post.tipo === 'usuario' 
      ? post.autor_id === user.id
      : post.tipo === 'local' && activeLocalProfileId === post.local_id;

    if (!isOwner) {
      return;
    }

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
                .eq('id', postId);

              if (error) throw error;

              setPosts(posts.filter(p => p.id !== postId));
              socialCache.clearPost(postId);
              socialCache.clearFeed();
              Alert.alert('Éxito', 'Publicación eliminada correctamente');
            } catch (error) {
              console.error('[Social] Error deleting post:', error);
              Alert.alert('Error', 'No se pudo eliminar la publicación');
            }
          },
        },
      ]
    );
  }, [posts, user, activeLocalProfileId]);

  const handleCreatePress = useCallback(() => {
    if (!user) {
      setLoginMessage('Para crear contenido necesitas registrarte en BarLive');
      setShowLoginModal(true);
    } else {
      setShowCreateOptions(true);
    }
  }, [user]);

  const handleSwitchToClientMode = useCallback(async () => {
    try {
      console.log('[Social] 🔄 Switching to client mode...');
      
      await switchToClientProfile();
      await setCurrentMode('cliente');
      
      await loadData();
      
      Alert.alert('Modo Cliente', 'Has cambiado al modo cliente');
    } catch (error) {
      console.error('[Social] Error switching to client mode:', error);
      Alert.alert('Error', 'No se pudo cambiar al modo cliente');
    }
  }, [switchToClientProfile, setCurrentMode, loadData]);

  const handleNavigateToStoryAuthorProfile = useCallback(() => {
    const currentStories = viewingOwnStories ? userStories : historias;
    const currentStory = currentStories[currentStoryIndex];
    
    if (!currentStory) return;

    setShowStoryViewer(false);
    stopStoryTimer();

    if (currentStory.tipo === 'local' && currentStory.local_id) {
      router.push(`/perfil/local?localId=${currentStory.local_id}`);
    } else if (user && currentStory.autor_id === user.id) {
      router.push('/(tabs)/perfil');
    } else {
      router.push(`/perfil/usuario?userId=${currentStory.autor_id}`);
    }
  }, [currentStoryIndex, viewingOwnStories, userStories, historias, user, router, stopStoryTimer]);

  const handleCloseStoryViewerAndNavigate = useCallback(() => {
    console.log('[Social] ✅ Closing story viewer before navigation from stats modal');
    setShowStoryStats(false);
    setShowStoryViewer(false);
    stopStoryTimer();
  }, [stopStoryTimer]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const groupedStories = useMemo(() => {
    const storyGroups = historias.reduce((acc, historia) => {
      const authorId = historia.autor_id;
      if (!acc[authorId]) {
        acc[authorId] = [];
      }
      acc[authorId].push(historia);
      return acc;
    }, {} as Record<string, typeof historias>);

    return Object.values(storyGroups).map((authorStories) => {
      const firstStory = authorStories[0];
      const allViewed = authorStories.every(s => s.visto_por_usuario);
      const firstStoryIndex = historias.findIndex(h => h.id === firstStory.id);

      return {
        firstStory,
        allViewed,
        firstStoryIndex,
      };
    });
  }, [historias]);

  const currentStories = viewingOwnStories ? userStories : historias;
  const currentStory = currentStories[currentStoryIndex];
  const hasUserStories = userStories.length > 0;
  const hasUnviewedUserStories = userStories.some(s => !s.visto_por_usuario);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const displayAvatar = user?.avatar;
  const displayName = user?.nombre || 'Usuario';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const isCurrentStoryOwner = currentStory && user && (
    (currentStory.tipo === 'usuario' && currentStory.autor_id === user.id) ||
    (currentStory.tipo === 'local' && activeLocalProfileId === currentStory.local_id)
  );

  if (isInitialLoading) {
    return <InitialLoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ translateY: headerTranslateY }],
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Social</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/chats')}
              activeOpacity={0.7}
            >
              <IconSymbol name="message.fill" size={24} color={colors.headerText} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/notificaciones')}
              activeOpacity={0.7}
            >
              <IconSymbol name="bell.fill" size={24} color={colors.headerText} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowSearchModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol name="magnifyingglass" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePress}
              activeOpacity={0.7}
            >
              <IconSymbol name="plus" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {isOwnerMode && ownedLocals.length > 0 && (
          <View style={styles.localSelectorContainer}>
            <TouchableOpacity
              style={styles.localSelectorButton}
              onPress={() => ownedLocals.length > 1 && setShowLocalSelector(true)}
              activeOpacity={ownedLocals.length > 1 ? 0.7 : 1}
            >
              <View style={styles.localSelectorContent}>
                {activeLocalData?.imagen_url ? (
                  <Image source={{ uri: activeLocalData.imagen_url }} style={styles.localSelectorImage} />
                ) : (
                  <View style={[styles.localSelectorImage, styles.localSelectorImagePlaceholder]}>
                    <IconSymbol name="building.2" size={20} color={colors.headerText} />
                  </View>
                )}
                <View style={styles.localSelectorText}>
                  <Text style={styles.localSelectorLabel}>Interactuando como:</Text>
                  <Text style={styles.localSelectorName} numberOfLines={1}>
                    {activeLocalData?.nombre || 'Seleccionar local'}
                  </Text>
                </View>
              </View>
              {ownedLocals.length > 1 && (
                <IconSymbol name="chevron.down" size={20} color={colors.text} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: isOwnerMode && ownedLocals.length > 0 ? HEADER_HEIGHT + 70 : HEADER_HEIGHT }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.historiasContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.historiasScrollContent}
          >
            {user && (
              <TouchableOpacity
                style={styles.historiaItem}
                onPress={() => {
                  if (hasUserStories) {
                    handleStoryPress(0, true);
                  } else {
                    if (isOwnerMode && activeLocalProfileId) {
                      router.push(`/crear/historia?localId=${activeLocalProfileId}`);
                    } else {
                      router.push('/crear/historia');
                    }
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.historiaAddButton}>
                  {hasUserStories ? (
                    hasUnviewedUserStories ? (
                      <LinearGradient
                        colors={['#FFD700', '#00FF00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.historiaGradientBorder}
                      >
                        {(isOwnerMode && activeLocalData?.imagen_url) ? (
                          <Image source={{ uri: activeLocalData.imagen_url }} style={styles.historiaAvatar} />
                        ) : displayAvatar ? (
                          <Image source={{ uri: displayAvatar }} style={styles.historiaAvatar} />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder]}>
                            <Text style={styles.avatarText}>{isOwnerMode && activeLocalData ? activeLocalData.nombre.charAt(0).toUpperCase() : displayInitial}</Text>
                          </View>
                        )}
                      </LinearGradient>
                    ) : (
                      <>
                        {(isOwnerMode && activeLocalData?.imagen_url) ? (
                          <Image source={{ uri: activeLocalData.imagen_url }} style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]} />
                        ) : displayAvatar ? (
                          <Image source={{ uri: displayAvatar }} style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]} />
                        ) : (
                          <View style={[styles.historiaAvatar, styles.avatarPlaceholder, { borderWidth: 2, borderColor: colors.cardBorder }]}>
                            <Text style={styles.avatarText}>{isOwnerMode && activeLocalData ? activeLocalData.nombre.charAt(0).toUpperCase() : displayInitial}</Text>
                          </View>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {(isOwnerMode && activeLocalData?.imagen_url) ? (
                        <Image source={{ uri: activeLocalData.imagen_url }} style={styles.historiaUserAvatar} />
                      ) : displayAvatar ? (
                        <Image source={{ uri: displayAvatar }} style={styles.historiaUserAvatar} />
                      ) : (
                        <View style={[styles.historiaUserAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>{isOwnerMode && activeLocalData ? activeLocalData.nombre.charAt(0).toUpperCase() : displayInitial}</Text>
                        </View>
                      )}
                      <View style={styles.historiaAddIcon}>
                        <IconSymbol name="plus" size={18} color={colors.headerText} />
                      </View>
                    </>
                  )}
                </View>
                <Text style={styles.historiaNombre}>
                  {isOwnerMode && activeLocalData ? activeLocalData.nombre : 'Tu historia'}
                </Text>
              </TouchableOpacity>
            )}

            {groupedStories.map(({ firstStory, allViewed, firstStoryIndex }, groupIndex) => (
              <TouchableOpacity
                key={firstStory.id}
                style={styles.historiaItem}
                onPress={() => handleStoryPress(firstStoryIndex, false)}
                activeOpacity={0.7}
              >
                <View style={styles.historiaAvatarContainer}>
                  {!allViewed ? (
                    <LinearGradient
                      colors={['#FFD700', '#00FF00']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.historiaGradientBorder}
                    >
                      {firstStory.autor?.avatar ? (
                        <Image
                          source={{ uri: firstStory.autor.avatar }}
                          style={styles.historiaAvatar}
                        />
                      ) : (
                        <View style={[styles.historiaAvatar, styles.avatarPlaceholder]}>
                          <Text style={styles.avatarText}>
                            {firstStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <>
                      {firstStory.autor?.avatar ? (
                        <Image
                          source={{ uri: firstStory.autor.avatar }}
                          style={[styles.historiaAvatar, { borderWidth: 2, borderColor: colors.cardBorder }]}
                        />
                      ) : (
                        <View style={[styles.historiaAvatar, styles.avatarPlaceholder, { borderWidth: 2, borderColor: colors.cardBorder }]}>
                          <Text style={styles.avatarText}>
                            {firstStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
                <Text style={styles.historiaNombre} numberOfLines={1}>
                  {firstStory.autor?.nombre || 'Usuario'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.feedContainer}>
          {posts.length > 0 ? (
            posts.map((post) => {
              return <PostCardWithSwipe 
                key={post.id} 
                post={post} 
                user={user}
                activeLocalProfileId={activeLocalProfileId}
                router={router}
                toggleLike={toggleLike}
                toggleSave={toggleSave}
                handleDeletePost={handleDeletePost}
              />;
            })
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="photo.on.rectangle" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {activeProfileType === 'local' && activeLocalProfileId 
                  ? 'Este local no tiene publicaciones aún'
                  : 'No hay publicaciones aún'}
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={() => {
          setShowStoryStats(false);
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.storyViewerModal}>
            {currentStory && (
              <>
                <View style={styles.storyViewerHeader}>
                  <View style={styles.storyProgressContainer}>
                    {currentStories.map((_, index) => (
                      <View key={index} style={styles.storyProgressBar}>
                        {index < currentStoryIndex && (
                          <View style={[styles.storyProgressFill, { width: '100%' }]} />
                        )}
                        {index === currentStoryIndex && (
                          <Animated.View style={[styles.storyProgressFill, { width: progressWidth }]} />
                        )}
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity 
                    style={styles.storyAutorInfo}
                    onPress={handleNavigateToStoryAuthorProfile}
                    activeOpacity={0.7}
                  >
                    {currentStory.autor?.avatar ? (
                      <Image source={{ uri: currentStory.autor.avatar }} style={styles.storyAutorAvatar} />
                    ) : (
                      <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarText}>
                          {currentStory.autor?.nombre?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.storyAutorNombre}>
                      {currentStory.autor?.nombre || 'Usuario'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.storyCloseButton}
                  onPress={() => {
                    setShowStoryStats(false);
                    setShowStoryViewer(false);
                    stopStoryTimer();
                  }}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="xmark" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.storyContent}>
                  <Image source={{ uri: currentStory.imagen }} style={styles.storyImage} resizeMode="contain" />
                </View>

                <View style={styles.storyTouchZones}>
                  <TouchableOpacity
                    style={styles.storyTouchZone}
                    onPress={handlePreviousStory}
                    activeOpacity={1}
                  />
                  <TouchableOpacity
                    style={styles.storyTouchZone}
                    onPress={handleNextStory}
                    activeOpacity={1}
                  />
                </View>

                {isCurrentStoryOwner && (
                  <View style={styles.storyBottomLeftControls}>
                    <TouchableOpacity
                      style={styles.storyStatsButtonBottom}
                      onPress={handleViewStoryStats}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="eye.fill" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.storyDeleteButtonBottom}
                      onPress={handleDeleteStory}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="trash.fill" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {!isCurrentStoryOwner && (
                  <View style={styles.storyInteractionBar}>
                    <TouchableOpacity
                      style={styles.storyInteractionButton}
                      onPress={handleStoryLike}
                      activeOpacity={0.7}
                    >
                      <IconSymbol
                        name={currentStory.liked_by_user ? 'heart.fill' : 'heart'}
                        size={20}
                        color={currentStory.liked_by_user ? '#EF4444' : '#fff'}
                      />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.storyMessageInput}
                      placeholder="Enviar mensaje..."
                      placeholderTextColor="rgba(255, 255, 255, 0.6)"
                      value={storyMessage}
                      onChangeText={setStoryMessage}
                      onFocus={() => setIsPaused(true)}
                      onBlur={() => setIsPaused(false)}
                    />

                    {storyMessage.trim().length > 0 && (
                      <TouchableOpacity
                        style={styles.storySendButton}
                        onPress={handleSendStoryMessage}
                        activeOpacity={0.7}
                      >
                        <IconSymbol name="paperplane.fill" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <StoryStatsModal
                  visible={showStoryStats}
                  onClose={() => {
                    setShowStoryStats(false);
                    setIsPaused(false);
                    startStoryTimer();
                  }}
                  onNavigateToProfile={handleCloseStoryViewerAndNavigate}
                  storyId={currentStory.id}
                  viewsCount={currentStory.views_count || 0}
                  likesCount={storyLikes.length}
                  views={storyViews}
                  likes={storyLikes}
                  loading={loadingStats}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showLocalSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocalSelector(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowLocalSelector(false)}
        >
          <Pressable style={styles.localSelectorModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.localSelectorModalHeader}>
              <Text style={styles.localSelectorModalTitle}>Seleccionar Local</Text>
              <TouchableOpacity onPress={() => setShowLocalSelector(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.localSelectorModalContent}>
              <TouchableOpacity
                style={styles.switchToClientButton}
                onPress={() => {
                  setShowLocalSelector(false);
                  handleSwitchToClientMode();
                }}
              >
                <IconSymbol name="person.fill" size={20} color={colors.secondary} />
                <Text style={styles.switchToClientButtonText}>
                  Volver a modo cliente
                </Text>
              </TouchableOpacity>

              {ownedLocals.map((local) => (
                <TouchableOpacity
                  key={local.id}
                  style={[styles.localSelectorItem, activeLocalProfileId === local.id && styles.localSelectorItemActive]}
                  onPress={async () => {
                    console.log('[Social] 🏢 Selecting local:', local.id, local.nombre);
                    
                    await switchToLocalProfile(local.id);
                    
                    await loadData();
                    
                    setShowLocalSelector(false);
                  }}
                >
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.localSelectorItemImage} />
                  ) : (
                    <View style={[styles.localSelectorItemImage, styles.localSelectorImagePlaceholder]}>
                      <IconSymbol name="building.2" size={24} color={colors.headerText} />
                    </View>
                  )}
                  <View style={styles.localSelectorItemInfo}>
                    <Text style={[styles.localSelectorItemName, activeLocalProfileId === local.id && styles.localSelectorItemNameActive]}>
                      {local.nombre}
                    </Text>
                    <Text style={styles.localSelectorItemType}>{local.tipo}</Text>
                  </View>
                  {activeLocalProfileId === local.id && (
                    <IconSymbol name="checkmark.circle.fill" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showSearchModal}
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.searchModal}>
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            style={styles.searchModalHeader}
          >
            <TouchableOpacity onPress={() => setShowSearchModal(false)} activeOpacity={0.7}>
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar usuarios, locales o #hashtags..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>
          </LinearGradient>

          <ScrollView style={styles.searchResults}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={`${result.tipo}-${result.id}`}
                style={styles.searchResultItem}
                onPress={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchModal(false);
                  if (result.tipo === 'hashtag') {
                    // Navigate to hashtag page
                    router.push(`/social/hashtag?tag=${encodeURIComponent(result.nombre.substring(1))}`);
                  } else if (result.tipo === 'local') {
                    router.push(`/perfil/local?localId=${result.id}`);
                  } else if (user && result.id === user.id) {
                    router.push('/(tabs)/perfil');
                  } else {
                    router.push(`/perfil/usuario?userId=${result.id}`);
                  }
                }}
                activeOpacity={0.7}
              >
                {result.tipo === 'hashtag' ? (
                  <View style={[styles.searchResultAvatar, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                    <IconSymbol name="number" size={24} color={colors.primary} />
                  </View>
                ) : result.avatar ? (
                  <Image source={{ uri: result.avatar }} style={styles.searchResultAvatar} />
                ) : (
                  <View style={[styles.searchResultAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>
                      {result.nombre.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{result.nombre}</Text>
                  {result.tipo === 'hashtag' && result.uso_count !== undefined && (
                    <Text style={styles.searchResultUsername}>
                      {result.uso_count} {result.uso_count === 1 ? 'publicación' : 'publicaciones'}
                    </Text>
                  )}
                  {result.username && result.tipo !== 'hashtag' && (
                    <Text style={styles.searchResultUsername}>@{result.username}</Text>
                  )}
                  {result.bio && (
                    <Text style={styles.searchResultUsername}>{result.bio}</Text>
                  )}
                  {result.tipo === 'local' && (
                    <View style={styles.searchResultBadge}>
                      <IconSymbol name="building.2" size={14} color={colors.primary} />
                      <Text style={styles.searchResultBadgeText}>Local con plan activo</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showCreateOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateOptions(false)}
      >
        <Pressable 
          style={styles.createOptionsModal}
          onPress={() => setShowCreateOptions(false)}
        >
          <Pressable style={styles.createOptionsContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.createOptionsHeader}>
              <Text style={styles.createOptionsTitle}>Crear</Text>
              <TouchableOpacity onPress={() => setShowCreateOptions(false)} activeOpacity={0.7}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.createOptionsButtons}>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  if (isOwnerMode && activeLocalProfileId) {
                    router.push(`/crear/historia?localId=${activeLocalProfileId}`);
                  } else {
                    router.push('/crear/historia');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol name="camera.fill" size={24} color={colors.headerText} />
                </View>
                <View style={styles.createOptionInfo}>
                  <Text style={styles.createOptionTitle}>Historia</Text>
                  <Text style={styles.createOptionDescription}>
                    Comparte un momento que desaparece en 24 horas
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createOptionButton}
                onPress={() => {
                  setShowCreateOptions(false);
                  if (isOwnerMode && activeLocalProfileId) {
                    router.push(`/crear/publicacion?localId=${activeLocalProfileId}`);
                  } else {
                    router.push('/crear/publicacion');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.createOptionIcon}>
                  <IconSymbol name="photo.fill" size={24} color={colors.headerText} />
                </View>
                <View style={styles.createOptionInfo}>
                  <Text style={styles.createOptionTitle}>Publicación</Text>
                  <Text style={styles.createOptionDescription}>
                    Comparte una foto o video en tu perfil
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={loginMessage}
      />
    </View>
  );
}
