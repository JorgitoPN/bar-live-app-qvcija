
import { useRouter, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import { socialCache } from '@/utils/socialCache';
import InitialLoadingScreen from '@/components/common/InitialLoadingScreen';
import { LinearGradient } from 'expo-linear-gradient';
import ParsedText from '@/components/social/ParsedText';
import StoryViewer from '@/components/social/StoryViewer';
import { preloadStoryImages } from '@/utils/storyPreloader';
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
  Alert,
  ActivityIndicator,
  Pressable,
  FlatList,
  Keyboard,
  Animated,
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
  autorNombre?: string;
  autorAvatar?: string;
  autorUsername?: string;
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

  const displayName = post.tipo === 'local'
    ? (post.autor?.nombre || 'Local')
    : (post.autor?.username || post.autor?.nombre || 'Usuario').replace(/^@/, '');

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
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.postAutorInfo}>
            <Text style={styles.postAutorNombre}>{displayName}</Text>
            <Text style={styles.postFecha}>{formatearFecha(post.created_at)}</Text>
          </View>
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity 
            style={styles.postOptionsButton}
            onPress={() => handleDeletePost(post.id)}
            activeOpacity={0.7}
          >
            <IconSymbol ios_icon_name="trash" android_material_icon_name="delete" size={22} color={colors.text} />
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
          <IconSymbol ios_icon_name="mappin.circle.fill" android_material_icon_name="location_on" size={16} color={colors.primary} />
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
            ios_icon_name={post.liked ? 'heart.fill' : 'heart'}
            android_material_icon_name={post.liked ? 'favorite' : 'favorite_border'}
            size={26} 
            color={post.liked ? '#EF4444' : colors.text} 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postActionButton}
          onPress={() => router.push(`/social/post?id=${post.id}`)}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="message" android_material_icon_name="chat_bubble_outline" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.postActionButton}
          onPress={() => router.push(`/social/post?id=${post.id}&share=true`)}
          activeOpacity={0.7}
        >
          <IconSymbol ios_icon_name="paperplane" android_material_icon_name="send" size={26} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.postActionButtonRight}
          onPress={() => toggleSave(post.id)}
          activeOpacity={0.7}
        >
          <IconSymbol 
            ios_icon_name={post.saved ? 'bookmark.fill' : 'bookmark'}
            android_material_icon_name={post.saved ? 'bookmark' : 'bookmark_border'}
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
            <Text style={{ fontWeight: '600' }}>{displayName}</Text>{' '}
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
  
  const { posts: globalPosts, stories: globalStories, isInitialLoading, hasLoadedOnce, refreshData } = useGlobalData();
  
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
  const [viewingOwnStories, setViewingOwnStories] = useState(false);

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
          
          // ✅ CRITICAL: Preload story images in background
          if (otherStoriesWithStatus.length > 0) {
            console.log('[Social] 🚀 Preloading story images in background...');
            preloadStoryImages(otherStoriesWithStatus, 0, 5).catch(() => {
              console.log('[Social] ⚠️ Story preload failed, continuing anyway');
            });
          }
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
      console.log('[Social] ⚡ Screen focused - refreshing data');
      
      refreshData(false).then(() => {
        loadData();
      });
      
      loadUnreadCounts();
    }, [loadData, loadUnreadCounts, refreshData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData(false);
    await loadData();
    setRefreshing(false);
  }, [loadData, refreshData]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('[Social] 🔍 Searching for:', query);
      
      let searchTerm = query.trim();
      if (searchTerm.startsWith('@')) {
        searchTerm = searchTerm.substring(1);
      }
      
      const results: SearchResult[] = [];
      
      if (query.trim().startsWith('#')) {
        const hashtagTerm = searchTerm.toLowerCase();
        
        const { data: hashtagsData, error: hashtagsError } = await supabase
          .from('hashtags')
          .select(`
            id, 
            tag,
            post_hashtags!inner(post_id)
          `)
          .ilike('tag', `%${hashtagTerm}%`)
          .limit(50);

        if (!hashtagsError && hashtagsData) {
          const hashtagsWithCounts = hashtagsData.map((h: any) => {
            const postCount = h.post_hashtags?.length || 0;
            return {
              id: h.id,
              tag: h.tag,
              uso_count: postCount,
            };
          }).filter((h: any) => h.uso_count > 0);

          hashtagsWithCounts.sort((a: any, b: any) => b.uso_count - a.uso_count);

          const topHashtags = hashtagsWithCounts.slice(0, 10);

          results.push(...topHashtags.map((h: any) => ({
            id: h.id,
            nombre: `#${h.tag}`,
            tipo: 'hashtag' as const,
            uso_count: h.uso_count,
          })));
        }
      } else {
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

  const handleStoryPress = useCallback(async (index: number, isOwnStory: boolean = false) => {
    console.log('[Social] 📖 Story pressed - index:', index, 'isOwnStory:', isOwnStory);
    const stories = isOwnStory ? userStories : historias;
    console.log('[Social] 📖 Stories available:', stories.length);
    
    console.log('[Social] 🚀 Preloading story images before opening viewer...');
    await preloadStoryImages(stories, index, 4);
    
    setCurrentStoryIndex(index);
    setViewingOwnStories(isOwnStory);
    setShowStoryViewer(true);
  }, [userStories, historias]);

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

  const hasUserStories = userStories.length > 0;
  const hasUnviewedUserStories = userStories.some(s => !s.visto_por_usuario);

  const displayAvatar = user?.avatar;
  const displayName = user?.nombre || 'Usuario';
  const displayInitial = displayName.charAt(0).toUpperCase();

  // ✅ CRITICAL FIX: Show loading only if data has never been loaded
  if (isInitialLoading && !hasLoadedOnce) {
    return <InitialLoadingScreen />;
  }

  // ✅ CRITICAL FIX: Show empty state only if data has been loaded at least once
  const showEmptyState = hasLoadedOnce && posts.length === 0;

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
              <IconSymbol ios_icon_name="message.fill" android_material_icon_name="message" size={24} color={colors.headerText} />
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
              <IconSymbol ios_icon_name="bell.fill" android_material_icon_name="notifications" size={24} color={colors.headerText} />
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
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePress}
              activeOpacity={0.7}
            >
              <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={24} color={colors.headerText} />
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
                    <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={20} color={colors.headerText} />
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
                <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={20} color={colors.text} />
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
                        <IconSymbol ios_icon_name="plus" android_material_icon_name="add" size={18} color={colors.headerText} />
                      </View>
                    </>
                  )}
                </View>
                <Text style={styles.historiaNombre}>
                  {isOwnerMode && activeLocalData ? activeLocalData.nombre : 'Tu historia'}
                </Text>
              </TouchableOpacity>
            )}

            {groupedStories.map(({ firstStory, allViewed, firstStoryIndex }, groupIndex) => {
              const storyDisplayName = firstStory.tipo === 'local'
                ? (firstStory.autor?.nombre || 'Local')
                : (firstStory.autor?.username || firstStory.autor?.nombre || 'Usuario').replace(/^@/, '');

              return (
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
                              {storyDisplayName.charAt(0).toUpperCase()}
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
                              {storyDisplayName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                  <Text style={styles.historiaNombre} numberOfLines={1}>
                    {storyDisplayName}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
          ) : showEmptyState ? (
            <View style={styles.emptyContainer}>
              <IconSymbol ios_icon_name="photo.on.rectangle" android_material_icon_name="photo_library" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {activeProfileType === 'local' && activeLocalProfileId 
                  ? 'Este local no tiene publicaciones aún'
                  : 'No hay publicaciones para mostrar'}
              </Text>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.text, marginTop: 12 }}>Cargando publicaciones...</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <StoryViewer
        visible={showStoryViewer}
        stories={viewingOwnStories ? userStories : historias}
        initialIndex={currentStoryIndex}
        onClose={() => {
          console.log('[Social] Closing story viewer');
          setShowStoryViewer(false);
        }}
        onStoryChange={(index) => {
          console.log('[Social] Story changed to index:', index);
          setCurrentStoryIndex(index);
        }}
        onStoryDelete={async (storyId) => {
          console.log('[Social] Story deleted:', storyId);
          await refreshData(false);
          await loadData();
        }}
        activeLocalProfileId={activeLocalProfileId}
      />

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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
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
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={colors.secondary} />
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
                      <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={24} color={colors.headerText} />
                    </View>
                  )}
                  <View style={styles.localSelectorItemInfo}>
                    <Text style={[styles.localSelectorItemName, activeLocalProfileId === local.id && styles.localSelectorItemNameActive]}>
                      {local.nombre}
                    </Text>
                    <Text style={styles.localSelectorItemType}>{local.tipo}</Text>
                  </View>
                  {activeLocalProfileId === local.id && (
                    <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={24} color={colors.primary} />
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
              <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <View style={styles.searchInputContainer}>
              <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
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
                    <IconSymbol ios_icon_name="number" android_material_icon_name="tag" size={24} color={colors.primary} />
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
                    <Text style={styles.searchResultUsername}>{result.username}</Text>
                  )}
                  {result.bio && (
                    <Text style={styles.searchResultUsername}>{result.bio}</Text>
                  )}
                  {result.tipo === 'local' && (
                    <View style={styles.searchResultBadge}>
                      <IconSymbol ios_icon_name="building.2" android_material_icon_name="business" size={14} color={colors.primary} />
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
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
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
                  <IconSymbol ios_icon_name="camera.fill" android_material_icon_name="camera_alt" size={24} color={colors.headerText} />
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
                  <IconSymbol ios_icon_name="photo.fill" android_material_icon_name="photo" size={24} color={colors.headerText} />
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
