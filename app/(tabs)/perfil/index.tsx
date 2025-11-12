
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

const { width, height } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 3) / 3;

interface Post {
  id: string;
  autor_id: string;
  contenido: string;
  imagen?: string;
  likes: number;
  created_at: string;
  autor?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
  liked?: boolean;
  saved?: boolean;
  comentarios?: number;
}

interface OfertaTrabajo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  salario?: string;
  requisitos?: string[];
  provincia?: string;
  imagen_url?: string;
  created_at: string;
  local?: {
    nombre: string;
    imagen_url?: string;
  };
  propietario?: {
    nombre: string;
  };
}

interface PerfilProfesional {
  id: string;
  usuario_id?: string;
  nombre_completo: string;
  puesto_deseado: string;
  experiencia: string;
  habilidades?: string;
  disponibilidad?: string;
  foto_url?: string;
  provincia?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    avatar?: string;
    username?: string;
  };
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
}

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

export default function PerfilScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currentMode } = useMode();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  
  const [seguidores, setSeguidores] = useState(0);
  const [seguidos, setSeguidos] = useState(0);
  const [publicaciones, setPublicaciones] = useState(0);
  const [hasActiveStory, setHasActiveStory] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'posts' | 'favoritos' | 'etiquetados' | 'empleo'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  
  const [empleoTab, setEmpleoTab] = useState<'ofertas' | 'perfiles'>('ofertas');
  const [ofertas, setOfertas] = useState<OfertaTrabajo[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilProfesional[]>([]);
  const [loadingEmpleo, setLoadingEmpleo] = useState(false);

  // Story viewer states
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [userStories, setUserStories] = useState<HistoriaConAutor[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        cargarDatosPerfil();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const cargarDatosPerfil = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { count: seguidoresCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', user.id);

      const { count: seguidosCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', user.id);

      const { count: publicacionesCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('autor_id', user.id);

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
      setPublicaciones(publicacionesCount || 0);

      const { data: storiesData } = await supabase
        .from('historias')
        .select('id')
        .eq('autor_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

      setHasActiveStory((storiesData?.length || 0) > 0);

      const { data: userStoriesData } = await supabase
        .from('historias')
        .select(`
          id,
          autor_id,
          tipo,
          imagen,
          created_at,
          expires_at,
          visto
        `)
        .eq('autor_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (userStoriesData) {
        const storyIds = userStoriesData.map(s => s.id);
        
        // Load views count and likes for own stories
        const [viewedData, viewsCountData, likesCountData] = await Promise.all([
          supabase
            .from('historia_views')
            .select('historia_id')
            .eq('usuario_id', user.id)
            .in('historia_id', storyIds),
          supabase
            .from('historia_views')
            .select('historia_id')
            .in('historia_id', storyIds),
          supabase
            .from('historia_likes')
            .select('historia_id')
            .in('historia_id', storyIds),
        ]);

        const viewedStoryIds = new Set(viewedData.data?.map(v => v.historia_id) || []);
        
        const viewsCounts = viewsCountData.data?.reduce((acc, v) => {
          acc[v.historia_id] = (acc[v.historia_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};
        
        const likesCounts = likesCountData.data?.reduce((acc, l) => {
          acc[l.historia_id] = (acc[l.historia_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const storiesWithStatus = userStoriesData.map(story => ({
          ...story,
          visto_por_usuario: viewedStoryIds.has(story.id),
          views_count: viewsCounts[story.id] || 0,
          likes_count: likesCounts[story.id] || 0,
          autor: {
            nombre: user.nombre,
            avatar: user.avatar,
            username: user.username,
          },
        }));

        setUserStories(storiesWithStatus);
      }

      await cargarContenido();
    } catch (error) {
      console.error('[Perfil] Error cargando datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cargarContenido = async () => {
    if (!user) return;

    setLoadingPosts(true);
    try {
      if (activeTab === 'posts') {
        await cargarPosts();
      } else if (activeTab === 'favoritos') {
        await cargarFavoritos();
      } else if (activeTab === 'etiquetados') {
        await cargarEtiquetados();
      } else if (activeTab === 'empleo') {
        await cargarDatosEmpleo();
      }
    } catch (error) {
      console.error('[Perfil] Error cargando contenido:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const cargarPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          autor:usuarios!posts_autor_id_fkey (
            id,
            nombre,
            avatar,
            username
          )
        `)
        .eq('autor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const postIds = data?.map(p => p.id) || [];
      if (postIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('usuario_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('comentarios')
            .select('post_id')
            .in('post_id', postIds),
        ]);

        const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
        const commentCounts = commentsResult.data?.reduce((acc, c) => {
          acc[c.post_id] = (acc[c.post_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const postsWithStatus = (data || []).map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          comentarios: commentCounts[post.id] || 0,
        }));

        setPosts(postsWithStatus);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('[Perfil] Error cargando posts:', error);
    }
  };

  const cargarFavoritos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('posts_guardados')
        .select(`
          post_id,
          posts (
            *,
            autor:usuarios!posts_autor_id_fkey (
              id,
              nombre,
              avatar,
              username
            )
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const savedPostsData = data?.map(item => item.posts).filter(Boolean) || [];
      
      const postIds = savedPostsData.map(p => p.id);
      if (postIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          supabase
            .from('likes')
            .select('post_id')
            .eq('usuario_id', user.id)
            .in('post_id', postIds),
          supabase
            .from('comentarios')
            .select('post_id')
            .in('post_id', postIds),
        ]);

        const likedPostIds = new Set(likesResult.data?.map(l => l.post_id) || []);
        const commentCounts = commentsResult.data?.reduce((acc, c) => {
          acc[c.post_id] = (acc[c.post_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const postsWithStatus = savedPostsData.map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          saved: true,
          comentarios: commentCounts[post.id] || 0,
        }));

        setSavedPosts(postsWithStatus);
      } else {
        setSavedPosts([]);
      }
    } catch (error) {
      console.error('[Perfil] Error cargando favoritos:', error);
    }
  };

  const cargarEtiquetados = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('post_tags')
        .select(`
          post_id,
          posts (
            *,
            autor:usuarios!posts_autor_id_fkey (
              id,
              nombre,
              avatar,
              username
            )
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const taggedPostsData = data?.map(item => item.posts).filter(Boolean) || [];
      
      const postIds = taggedPostsData.map(p => p.id);
      if (postIds.length > 0) {
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

        const postsWithStatus = taggedPostsData.map(post => ({
          ...post,
          liked: likedPostIds.has(post.id),
          saved: savedPostIds.has(post.id),
          comentarios: commentCounts[post.id] || 0,
        }));

        setTaggedPosts(postsWithStatus);
      } else {
        setTaggedPosts([]);
      }
    } catch (error) {
      console.error('[Perfil] Error cargando etiquetados:', error);
    }
  };

  const cargarDatosEmpleo = async () => {
    if (!user) return;

    try {
      setLoadingEmpleo(true);
      console.log('[Perfil] Cargando datos de empleo para usuario:', user.id);

      // Load job offers created by the user (if owner)
      if (isPropietario) {
        const { data: ofertasData, error: ofertasError } = await supabase
          .from('ofertas_trabajo')
          .select(`
            *,
            local:locales(nombre, imagen_url),
            propietario:usuarios(nombre)
          `)
          .eq('propietario_id', user.id)
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(10);

        if (ofertasError) {
          console.error('[Perfil] Error cargando ofertas:', ofertasError);
        } else {
          console.log('[Perfil] Ofertas cargadas:', ofertasData?.length || 0);
          const ofertasConImagenes = (ofertasData || []).map(oferta => ({
            ...oferta,
            imagen_url: oferta.imagen_url || oferta.local?.imagen_url,
          }));
          setOfertas(ofertasConImagenes);
        }
      }

      // Load professional profile created by the user
      const { data: perfilesData, error: perfilesError } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('usuario_id', user.id)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (perfilesError) {
        console.error('[Perfil] Error cargando perfiles:', perfilesError);
      } else {
        console.log('[Perfil] Perfiles cargados:', perfilesData?.length || 0);
        setPerfiles(perfilesData || []);
      }
    } catch (error) {
      console.error('[Perfil] Error en cargarDatosEmpleo:', error);
    } finally {
      setLoadingEmpleo(false);
    }
  };

  useEffect(() => {
    if (user) {
      cargarContenido();
    }
  }, [activeTab, user]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatosPerfil();
  };

  const handleEditProfile = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/editar/perfil');
  };

  const handleSettings = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/configuracion');
  };

  const handleNotifications = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/notificaciones');
  };

  const handleChats = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/(tabs)/perfil/chats');
  };

  const handleSeguidores = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/perfil/seguidores?userId=${user.id}`);
  };

  const handleSeguidos = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push(`/perfil/seguidos?userId=${user.id}`);
  };

  const handleCrearOferta = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/oferta-trabajo');
  };

  const handleCrearPerfil = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/crear/perfil-profesional');
  };

  const handleEditarPerfil = (perfilId: string) => {
    router.push('/crear/perfil-profesional');
  };

  const handleEliminarPerfil = async (perfilId: string) => {
    Alert.alert(
      'Eliminar Perfil',
      '¿Estás seguro de que quieres eliminar tu perfil profesional?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('perfiles_profesionales')
                .update({ activo: false })
                .eq('id', perfilId);

              if (error) throw error;

              Alert.alert('Éxito', 'Perfil eliminado correctamente');
              await cargarDatosEmpleo();
            } catch (error) {
              console.error('[Perfil] Error eliminando perfil:', error);
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  const handleVerOferta = (oferta: OfertaTrabajo) => {
    router.push(`/(tabs)/empleo?id=${oferta.id}`);
  };

  const handleVerPerfil = (perfil: PerfilProfesional) => {
    router.push(`/(tabs)/empleo?id=${perfil.id}`);
  };

  const handleWebsite = () => {
    if (user?.sitio_web) {
      Linking.openURL(user.sitio_web);
    }
  };

  const calcularDiasPublicado = (fecha: string): string => {
    const ahora = new Date();
    const fechaPublicacion = new Date(fecha);
    const diffMs = ahora.getTime() - fechaPublicacion.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`;
    return `Hace ${Math.floor(diffDias / 30)} meses`;
  };

  // Story viewer functions
  const stopStoryTimer = useCallback(() => {
    if (storyTimerRef.current) {
      clearTimeout(storyTimerRef.current);
      storyTimerRef.current = null;
    }
    progressAnim.stopAnimation();
  }, [progressAnim]);

  const handleNextStory = useCallback(async () => {
    const currentStory = userStories[currentStoryIndex];
    
    if (currentStory && user) {
      try {
        const { data: existingView } = await supabase
          .from('historia_views')
          .select('id')
          .eq('historia_id', currentStory.id)
          .eq('usuario_id', user.id)
          .single();

        if (!existingView) {
          await supabase.from('historia_views').insert({
            historia_id: currentStory.id,
            usuario_id: user.id,
          });
        }
      } catch (error) {
        console.error('[Perfil] Error marking story as viewed:', error);
      }
    }
    
    if (currentStoryIndex < userStories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      progressAnim.setValue(0);
    } else {
      await cargarDatosPerfil();
      setShowStoryViewer(false);
      stopStoryTimer();
    }
  }, [currentStoryIndex, userStories, stopStoryTimer, user, cargarDatosPerfil, progressAnim]);

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

  const handleAvatarPress = useCallback(() => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (userStories.length > 0) {
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
      setIsPaused(false);
      startStoryTimer();
    } else {
      router.push('/crear/historia');
    }
  }, [user, userStories, startStoryTimer, router]);

  const handleDeleteStory = useCallback(async () => {
    const currentStory = userStories[currentStoryIndex];
    
    if (!currentStory || !user || currentStory.autor_id !== user.id) {
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

              const newStories = userStories.filter((_, i) => i !== currentStoryIndex);
              setUserStories(newStories);

              if (newStories.length === 0) {
                setShowStoryViewer(false);
                stopStoryTimer();
                setHasActiveStory(false);
              } else if (currentStoryIndex >= newStories.length) {
                setCurrentStoryIndex(newStories.length - 1);
              }

              Alert.alert('Éxito', 'Historia eliminada correctamente');
            } catch (error) {
              console.error('[Perfil] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  }, [userStories, currentStoryIndex, user, stopStoryTimer]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    }
    return () => {
      stopStoryTimer();
    };
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const renderGridPost = (post: Post) => (
    <TouchableOpacity
      key={post.id}
      style={styles.gridItem}
      onPress={() => router.push(`/social/post?id=${post.id}`)}
      activeOpacity={0.9}
    >
      {post.imagen ? (
        <Image source={{ uri: post.imagen }} style={styles.gridImage} />
      ) : (
        <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
          <IconSymbol name="photo" size={32} color={colors.textSecondary} />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderOferta = (oferta: OfertaTrabajo) => (
    <TouchableOpacity
      key={oferta.id}
      style={styles.empleoCard}
      onPress={() => handleVerOferta(oferta)}
      activeOpacity={0.7}
    >
      {oferta.imagen_url && (
        <Image 
          source={{ uri: oferta.imagen_url }} 
          style={styles.ofertaImagen}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.empleoContent}>
        <View style={styles.ofertaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.empleoTitulo} numberOfLines={1}>
              {oferta.titulo}
            </Text>
            <Text style={styles.empleoLocal} numberOfLines={1}>
              {oferta.local?.nombre || oferta.propietario?.nombre || 'Local'}
            </Text>
          </View>
          {oferta.salario && (
            <View style={styles.salarioContainer}>
              <Text style={styles.salarioTexto}>{oferta.salario}</Text>
            </View>
          )}
        </View>

        <Text style={styles.empleoDescripcion} numberOfLines={2}>
          {oferta.descripcion}
        </Text>

        <View style={styles.empleoFooter}>
          <View style={styles.empleoTag}>
            <Text style={styles.empleoTagText}>{oferta.tipo}</Text>
          </View>
          {oferta.provincia && (
            <View style={styles.empleoTag}>
              <IconSymbol name="mappin" size={12} color={colors.textSecondary} />
              <Text style={styles.empleoTagText}>{oferta.provincia}</Text>
            </View>
          )}
          <Text style={styles.empleoFecha}>
            {calcularDiasPublicado(oferta.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPerfil = (perfil: PerfilProfesional) => {
    const fotoUrl = perfil.foto_url || perfil.usuario?.avatar || user?.avatar;
    
    return (
      <TouchableOpacity
        key={perfil.id}
        style={styles.perfilCard}
        onPress={() => handleVerPerfil(perfil)}
        activeOpacity={0.7}
      >
        <View style={styles.perfilHeader}>
          {fotoUrl ? (
            <Image
              source={{ uri: fotoUrl }}
              style={styles.perfilAvatar}
            />
          ) : (
            <View style={[styles.perfilAvatar, styles.perfilAvatarPlaceholder]}>
              <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.perfilNombre} numberOfLines={1}>
              {perfil.nombre_completo}
            </Text>
            <Text style={styles.perfilPuesto} numberOfLines={1}>
              {perfil.puesto_deseado}
            </Text>
          </View>
        </View>

        <Text style={styles.perfilExperiencia} numberOfLines={2}>
          {perfil.experiencia}
        </Text>

        {perfil.habilidades && (
          <View style={styles.habilidadesContainer}>
            {perfil.habilidades.split(',').slice(0, 3).map((habilidad, index) => (
              <View key={index} style={styles.habilidadTag}>
                <Text style={styles.habilidadText}>{habilidad.trim()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.perfilFooter}>
          {perfil.provincia && (
            <View style={styles.perfilTag}>
              <IconSymbol name="mappin" size={12} color={colors.textSecondary} />
              <Text style={styles.perfilTagText}>{perfil.provincia}</Text>
            </View>
          )}
          {perfil.disponibilidad && (
            <View style={styles.perfilTag}>
              <IconSymbol name="clock" size={12} color={colors.textSecondary} />
              <Text style={styles.perfilTagText}>{perfil.disponibilidad}</Text>
            </View>
          )}
          <View style={styles.perfilActions}>
            <TouchableOpacity 
              style={styles.perfilActionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEditarPerfil(perfil.id);
              }}
            >
              <IconSymbol name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.perfilActionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleEliminarPerfil(perfil.id);
              }}
            >
              <IconSymbol name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <View style={[commonStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Mi Perfil</Text>
        </LinearGradient>

        <View style={styles.notLoggedInContainer}>
          <IconSymbol name="person.circle" size={80} color={colors.textSecondary} />
          <Text style={styles.notLoggedInTitle}>Inicia sesión</Text>
          <Text style={styles.notLoggedInText}>
            Inicia sesión para ver tu perfil y acceder a todas las funciones
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowLoginModal(true)}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <LoginRequiredModal
          visible={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      </View>
    );
  }

  const currentPosts = activeTab === 'posts' ? posts : activeTab === 'favoritos' ? savedPosts : taggedPosts;
  const currentStory = userStories[currentStoryIndex];
  const hasUnviewedUserStories = userStories.some(s => !s.visto_por_usuario);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Mi Perfil</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleChats}>
              <IconSymbol name="message.fill" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
              <IconSymbol name="bell.fill" size={24} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleSettings}>
              <IconSymbol name="gearshape.fill" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handleAvatarPress}
              activeOpacity={0.7}
            >
              {hasActiveStory && hasUnviewedUserStories && (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.storyRing}
                />
              )}
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <IconSymbol name="person.fill" size={40} color={colors.textSecondary} />
                </View>
              )}
              {!hasActiveStory && (
                <View style={styles.addStoryIcon}>
                  <IconSymbol name="plus" size={18} color={colors.white} />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.nombre || 'Usuario'}</Text>
              {user.username && (
                <Text style={styles.profileUsername}>@{user.username}</Text>
              )}
            </View>
          </View>

          {user.bio && (
            <Text style={styles.profileBio}>{user.bio}</Text>
          )}

          {user.sitio_web && (
            <TouchableOpacity style={styles.websiteContainer} onPress={handleWebsite} activeOpacity={0.7}>
              <IconSymbol name="link" size={16} color={colors.primary} />
              <Text style={styles.websiteText}>{user.sitio_web}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{publicaciones}</Text>
              <Text style={styles.statLabel}>Publicaciones</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleSeguidores}>
              <Text style={styles.statNumber}>{seguidores}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleSeguidos}>
              <Text style={styles.statNumber}>{seguidos}</Text>
              <Text style={styles.statLabel}>Seguidos</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
              <IconSymbol name="pencil" size={18} color={colors.text} />
              <Text style={styles.actionButtonText}>Editar Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.createButton]} 
              onPress={() => setShowCreateOptions(true)}
            >
              <IconSymbol name="plus.circle.fill" size={18} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <IconSymbol 
              name="square.grid.3x3" 
              size={24} 
              color={activeTab === 'posts' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'favoritos' && styles.tabActive]}
            onPress={() => setActiveTab('favoritos')}
          >
            <IconSymbol 
              name="bookmark" 
              size={24} 
              color={activeTab === 'favoritos' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'etiquetados' && styles.tabActive]}
            onPress={() => setActiveTab('etiquetados')}
          >
            <IconSymbol 
              name="person.crop.square" 
              size={24} 
              color={activeTab === 'etiquetados' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'empleo' && styles.tabActive]}
            onPress={() => setActiveTab('empleo')}
          >
            <IconSymbol 
              name="briefcase" 
              size={24} 
              color={activeTab === 'empleo' ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {loadingPosts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {activeTab === 'empleo' ? (
              <View style={styles.empleoSection}>
                <View style={styles.empleoTabs}>
                  {isPropietario && (
                    <TouchableOpacity
                      style={[styles.empleoTab, empleoTab === 'ofertas' && styles.empleoTabActive]}
                      onPress={() => setEmpleoTab('ofertas')}
                    >
                      <Text
                        style={[
                          styles.empleoTabText,
                          empleoTab === 'ofertas' && styles.empleoTabTextActive,
                        ]}
                      >
                        Mis Ofertas
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.empleoTab, empleoTab === 'perfiles' && styles.empleoTabActive]}
                    onPress={() => setEmpleoTab('perfiles')}
                  >
                    <Text
                      style={[
                        styles.empleoTabText,
                        empleoTab === 'perfiles' && styles.empleoTabTextActive,
                      ]}
                    >
                      Mi Perfil
                    </Text>
                  </TouchableOpacity>
                </View>

                {loadingEmpleo ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <View style={styles.empleoContent}>
                    {empleoTab === 'ofertas' && isPropietario ? (
                      ofertas.length > 0 ? (
                        ofertas.map(renderOferta)
                      ) : (
                        <View style={styles.emptyState}>
                          <IconSymbol name="briefcase" size={48} color={colors.textSecondary} />
                          <Text style={styles.emptyStateText}>No has creado ofertas de trabajo</Text>
                          <TouchableOpacity style={styles.emptyStateButton} onPress={handleCrearOferta}>
                            <Text style={styles.emptyStateButtonText}>Crear Oferta</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    ) : (
                      perfiles.length > 0 ? (
                        perfiles.map(renderPerfil)
                      ) : (
                        <View style={styles.emptyState}>
                          <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
                          <Text style={styles.emptyStateText}>No has creado tu perfil profesional</Text>
                          <TouchableOpacity style={styles.emptyStateButton} onPress={handleCrearPerfil}>
                            <Text style={styles.emptyStateButtonText}>Crear Perfil</Text>
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.postsGrid}>
                {currentPosts.length > 0 ? (
                  currentPosts.map(renderGridPost)
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol 
                      name={
                        activeTab === 'posts' ? 'photo.on.rectangle' : 
                        activeTab === 'favoritos' ? 'bookmark' : 
                        'person.crop.square'
                      } 
                      size={48} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.emptyStateText}>
                      {activeTab === 'posts' ? 'No hay publicaciones aún' :
                       activeTab === 'favoritos' ? 'No hay publicaciones guardadas' :
                       'No hay publicaciones etiquetadas'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

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
                  router.push('/crear/historia');
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
                  router.push('/crear/publicacion');
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

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={async () => {
          const currentStory = userStories[currentStoryIndex];
          
          if (currentStory && user) {
            try {
              const { data: existingView } = await supabase
                .from('historia_views')
                .select('id')
                .eq('historia_id', currentStory.id)
                .eq('usuario_id', user.id)
                .single();

              if (!existingView) {
                await supabase.from('historia_views').insert({
                  historia_id: currentStory.id,
                  usuario_id: user.id,
                });
              }
            } catch (error) {
              console.error('[Perfil] Error marking story as viewed on modal close:', error);
            }
          }
          
          await cargarDatosPerfil();
          setShowStoryViewer(false);
          stopStoryTimer();
        }}
      >
        <View style={styles.storyViewerModal}>
          {currentStory && (
            <>
              <View style={styles.storyViewerHeader}>
                <View style={styles.storyProgressContainer}>
                  {userStories.map((_, index) => (
                    <View key={index} style={styles.storyProgressBar}>
                      {index < currentStoryIndex && (
                        <View style={[styles.storyProgressFill, { width: '100%' }]} />
                      )}
                      {index === currentStoryIndex && (
                        <Animated.View
                          style={[styles.storyProgressFill, { width: progressWidth }]}
                        />
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.storyAutorInfo}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.storyAutorAvatar} />
                  ) : (
                    <View style={[styles.storyAutorAvatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {user.nombre?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.storyAutorNombre}>{user.nombre}</Text>
                  
                  {/* FIXED: Show view count only to story creator */}
                  <View style={styles.storyViewsContainer}>
                    <IconSymbol name="eye" size={18} color="#fff" />
                    <Text style={styles.storyViewsText}>{currentStory.views_count || 0}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.storyDeleteButton}
                    onPress={handleDeleteStory}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="trash" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.storyCloseButton}
                    onPress={async () => {
                      const currentStory = userStories[currentStoryIndex];
                      
                      if (currentStory && user) {
                        try {
                          const { data: existingView } = await supabase
                            .from('historia_views')
                            .select('id')
                            .eq('historia_id', currentStory.id)
                            .eq('usuario_id', user.id)
                            .single();

                          if (!existingView) {
                            await supabase.from('historia_views').insert({
                              historia_id: currentStory.id,
                              usuario_id: user.id,
                            });
                          }
                        } catch (error) {
                          console.error('[Perfil] Error marking story as viewed on close:', error);
                        }
                      }
                      
                      await cargarDatosPerfil();
                      setShowStoryViewer(false);
                      stopStoryTimer();
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.storyContent}>
                <Image
                  source={{ uri: currentStory.imagen }}
                  style={styles.storyImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.storyTouchZones}>
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handlePreviousStory}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPressIn={() => {
                    setIsPaused(true);
                    stopStoryTimer();
                  }}
                  onPressOut={() => {
                    setIsPaused(false);
                    startStoryTimer();
                  }}
                />
                <Pressable
                  style={styles.storyTouchZone}
                  onPress={handleNextStory}
                />
              </View>
            </>
          )}
        </View>
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notLoggedInTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notLoggedInText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  profileSection: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  storyRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 44,
    zIndex: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.cardBackground,
    zIndex: 1,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  addStoryIcon: {
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
    borderColor: colors.cardBackground,
    zIndex: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileBio: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  websiteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  websiteText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.cardBorder,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    backgroundColor: colors.cardBorder,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background,
  },
  gridImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    width: '100%',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  empleoSection: {
    padding: 20,
  },
  empleoTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  empleoTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  empleoTabActive: {
    backgroundColor: colors.cardBackground,
  },
  empleoTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  empleoTabTextActive: {
    color: colors.primary,
  },
  empleoContent: {
    gap: 12,
  },
  empleoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ofertaImagen: {
    width: '100%',
    height: 160,
    backgroundColor: colors.cardBorder,
  },
  empleoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  empleoLocal: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  salarioContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  salarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  empleoDescripcion: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  empleoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  empleoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  empleoTagText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  empleoFecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  ofertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  empleoContent: {
    padding: 16,
  },
  perfilCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  perfilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  perfilAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  perfilAvatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilNombre: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  perfilPuesto: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  perfilExperiencia: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  habilidadesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  habilidadTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  habilidadText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  perfilFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perfilTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfilTagText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  perfilActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
  perfilActionButton: {
    padding: 6,
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
    paddingBottom: 34,
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
    paddingTop: 50,
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
  storyViewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  storyViewsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  storyDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
});
