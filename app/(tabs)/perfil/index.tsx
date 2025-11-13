
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
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import { supabase } from '@/utils/supabase';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import StoryStatsModal from '@/components/social/StoryStatsModal';
import ProfileSwitcher from '@/components/perfil/ProfileSwitcher';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width, height } = Dimensions.get('window');
const GRID_ITEM_SIZE = (width - 3) / 3;

const PROVINCIAS = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz',
  'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real',
  'Córdoba', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva',
  'Huesca', 'Islas Baleares', 'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León',
  'Lleida', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
];

interface Post {
  id: string;
  autor_id: string;
  contenido: string;
  imagen?: string;
  likes: number;
  created_at: string;
  tipo: string;
  local_id?: string;
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
  local_id?: string;
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

interface LocalProfile {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  imagen_url?: string;
  descripcion?: string;
  telefono?: string;
  website?: string;
  seguidores?: number;
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
  const { 
    currentMode, 
    activeProfileId,
    activeProfileType,
    activeLocalData,
    ownedLocals,
  } = useMode();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
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

  const [searchQuery, setSearchQuery] = useState('');
  const [provinciaFiltro, setProvinciaFiltro] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<Date | null>(null);
  const [fechaHasta, setFechaHasta] = useState<Date | null>(null);
  const [showDatePickerDesde, setShowDatePickerDesde] = useState(false);
  const [showDatePickerHasta, setShowDatePickerHasta] = useState(false);

  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [userStories, setUserStories] = useState<HistoriaConAutor[]>([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [showStoryStats, setShowStoryStats] = useState(false);
  const [storyViews, setStoryViews] = useState<any[]>([]);
  const [storyLikes, setStoryLikes] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const userRole = user?.rol_app || 'cliente';
  const isPropietario = userRole === 'propietario' || (userRole === 'admin' && currentMode === 'propietario');
  const isOwnerMode = currentMode === 'propietario' && isPropietario;

  // FIXED: Determine what profile to show based on active profile
  // If activeProfileType is 'local', redirect to the local profile page
  // Otherwise, show the user's own profile
  const shouldShowLocalProfile = activeProfileType === 'local' && activeLocalData;
  
  // Display information based on active profile
  const displayName = activeProfileType === 'local' && activeLocalData 
    ? activeLocalData.nombre 
    : user?.nombre || 'Usuario';
  const displayAvatar = activeProfileType === 'local' && activeLocalData
    ? activeLocalData.imagen_url
    : user?.avatar;

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadUnreadCounts();
        
        const notificationsChannel = supabase
          .channel('notifications-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notificaciones',
              filter: `usuario_id=eq.${user.id}`,
            },
            () => {
              loadUnreadCounts();
            }
          )
          .subscribe();

        const messagesChannel = supabase
          .channel('messages-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'mensajes',
            },
            () => {
              loadUnreadCounts();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(notificationsChannel);
          supabase.removeChannel(messagesChannel);
        };
      }
    }, [user])
  );

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        // FIXED: Redirect to local profile page when viewing a local profile
        if (shouldShowLocalProfile && activeLocalData) {
          console.log('[Perfil] ✅ Redirecting to local profile page:', activeLocalData.id);
          router.replace(`/perfil/local?localId=${activeLocalData.id}`);
        } else {
          // Load user profile when on this page
          console.log('[Perfil] ✅ Loading user profile');
          cargarDatosPerfil();
        }
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading, shouldShowLocalProfile, activeLocalData]);

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
      console.error('[Perfil] Error loading unread counts:', error);
    }
  }, [user]);

  const cargarDatosPerfil = async () => {
    if (!user) return;

    try {
      setLoading(true);

      await loadUnreadCounts();

      // Always load user profile data
      console.log('[Perfil] ✅ Loading user profile');
      
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
        .eq('autor_id', user.id)
        .eq('tipo', 'usuario');

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
      setPublicaciones(publicacionesCount || 0);

      const { data: storiesData } = await supabase
        .from('historias')
        .select('id')
        .eq('autor_id', user.id)
        .eq('tipo', 'usuario')
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
        .eq('tipo', 'usuario')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (userStoriesData) {
        const storyIds = userStoriesData.map(s => s.id);
        
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
        .eq('tipo', 'usuario')
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

      if (isPropietario) {
        let query = supabase
          .from('ofertas_trabajo')
          .select(`
            *,
            local:locales(nombre, imagen_url),
            propietario:usuarios(nombre)
          `)
          .eq('propietario_id', user.id)
          .eq('activo', true);

        if (searchQuery) {
          query = query.or(`titulo.ilike.%${searchQuery}%,descripcion.ilike.%${searchQuery}%`);
        }

        if (provinciaFiltro) {
          query = query.eq('provincia', provinciaFiltro);
        }

        if (fechaDesde) {
          query = query.gte('created_at', fechaDesde.toISOString());
        }
        if (fechaHasta) {
          const endOfDay = new Date(fechaHasta);
          endOfDay.setHours(23, 59, 59, 999);
          query = query.lte('created_at', endOfDay.toISOString());
        }

        const { data: ofertasData, error: ofertasError } = await query
          .order('created_at', { ascending: false })
          .limit(20);

        if (ofertasError) {
          console.error('[Perfil] Error cargando ofertas:', ofertasError);
        } else {
          const ofertasConImagenes = (ofertasData || []).map(oferta => ({
            ...oferta,
            imagen_url: oferta.imagen_url || oferta.local?.imagen_url,
          }));
          setOfertas(ofertasConImagenes);
        }
      }

      let perfilQuery = supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('usuario_id', user.id)
        .eq('activo', true);

      if (searchQuery) {
        perfilQuery = perfilQuery.or(`nombre_completo.ilike.%${searchQuery}%,puesto_deseado.ilike.%${searchQuery}%,experiencia.ilike.%${searchQuery}%`);
      }

      if (provinciaFiltro) {
        perfilQuery = perfilQuery.eq('provincia', provinciaFiltro);
      }

      const { data: perfilesData, error: perfilesError } = await perfilQuery
        .order('created_at', { ascending: false })
        .limit(20);

      if (perfilesError) {
        console.error('[Perfil] Error cargando perfiles:', perfilesError);
      } else {
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
  }, [activeTab, user, searchQuery, provinciaFiltro, empleoTab, fechaDesde, fechaHasta]);

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
    router.push(`/empleo/oferta-detalle?id=${oferta.id}`);
  };

  const handleVerPerfil = (perfil: PerfilProfesional) => {
    router.push(`/empleo/perfil-detalle?id=${perfil.id}`);
  };

  const handleWebsite = () => {
    if (user?.sitio_web) {
      Linking.openURL(user.sitio_web);
    }
  };

  const limpiarFiltros = () => {
    setSearchQuery('');
    setProvinciaFiltro('');
    setFechaDesde(null);
    setFechaHasta(null);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Seleccionar';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    
    if (!currentStory || !user) {
      return;
    }

    const isOwner = currentStory.tipo === 'usuario' && currentStory.autor_id === user.id;

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

  const handleViewStoryStats = useCallback(async () => {
    const currentStory = userStories[currentStoryIndex];
    
    if (!currentStory || !user) {
      return;
    }

    const isOwner = currentStory.tipo === 'usuario' && currentStory.autor_id === user.id;

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
      console.error('[Perfil] Error loading story stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoadingStats(false);
    }
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
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
        style={styles.ofertaGradient}
      >
        {oferta.imagen_url && (
          <Image 
            source={{ uri: oferta.imagen_url }} 
            style={styles.ofertaImagen}
            resizeMode="cover"
          />
        )}
        
        <View style={styles.ofertaContent}>
          <View style={styles.ofertaHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.empleoTitulo} numberOfLines={2}>
                {oferta.titulo}
              </Text>
              <Text style={styles.empleoLocal} numberOfLines={1}>
                {oferta.local?.nombre || oferta.propietario?.nombre || 'Local'}
              </Text>
            </View>
            {oferta.salario && (
              <View style={styles.salarioContainer}>
                <IconSymbol name="eurosign.circle.fill" size={16} color={colors.white} />
                <Text style={styles.salarioTexto}>{oferta.salario}</Text>
              </View>
            )}
          </View>

          <View style={styles.empleoFooter}>
            <View style={styles.empleoTag}>
              <IconSymbol name="briefcase.fill" size={14} color={colors.primary} />
              <Text style={styles.empleoTagText}>{oferta.tipo}</Text>
            </View>
            {oferta.provincia && (
              <View style={styles.empleoTag}>
                <IconSymbol name="mappin.circle.fill" size={14} color={colors.primary} />
                <Text style={styles.empleoTagText}>{oferta.provincia}</Text>
              </View>
            )}
            <Text style={styles.empleoFecha}>
              {calcularDiasPublicado(oferta.created_at)}
            </Text>
          </View>
        </View>
      </LinearGradient>
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
        <LinearGradient
          colors={[colors.primary + '15', colors.secondary + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.perfilGradient}
        >
          <View style={styles.perfilHeader}>
            {fotoUrl ? (
              <Image
                source={{ uri: fotoUrl }}
                style={styles.perfilAvatar}
              />
            ) : (
              <View style={[styles.perfilAvatar, styles.perfilAvatarPlaceholder]}>
                <IconSymbol name="person.fill" size={28} color={colors.textSecondary} />
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

          <Text style={styles.perfilExperiencia} numberOfLines={3}>
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
                <IconSymbol name="mappin.circle.fill" size={14} color={colors.primary} />
                <Text style={styles.perfilTagText}>{perfil.provincia}</Text>
              </View>
            )}
            {perfil.disponibilidad && (
              <View style={styles.perfilTag}>
                <IconSymbol name="clock.fill" size={14} color={colors.primary} />
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
                <IconSymbol name="pencil.circle.fill" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.perfilActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEliminarPerfil(perfil.id);
                }}
              >
                <IconSymbol name="trash.circle.fill" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
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

  const renderProfileHeader = () => {
    return (
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
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatar} />
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
            <Text style={styles.profileName}>{displayName}</Text>
            {user.username && (
              <Text style={styles.profileUsername}>@{user.username}</Text>
            )}
          </View>
          {/* Profile Switcher Button */}
          {(isPropietario || ownedLocals.length > 0) && (
            <TouchableOpacity 
              style={styles.switchProfileButton}
              onPress={() => setShowProfileSwitcher(true)}
              activeOpacity={0.7}
            >
              <IconSymbol name="arrow.triangle.2.circlepath" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
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
    );
  };

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Text style={[commonStyles.headerTitle, { color: colors.white }]}>
            Mi Perfil
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleChats}>
              <IconSymbol name="message.fill" size={24} color={colors.white} />
              {unreadMessages > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleNotifications}>
              <IconSymbol name="bell.fill" size={24} color={colors.white} />
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
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
        {renderProfileHeader()}

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
                <View style={styles.searchContainer}>
                  <View style={styles.searchBar}>
                    <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholderTextColor={colors.textSecondary}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.filterButton}
                    onPress={() => setShowFilters(true)}
                  >
                    <IconSymbol 
                      name="line.3.horizontal.decrease.circle" 
                      size={24} 
                      color={provinciaFiltro ? colors.primary : colors.text} 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.empleoTabs}>
                  {isOwnerMode && (
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
                    {empleoTab === 'ofertas' && isOwnerMode ? (
                      ofertas.length > 0 ? (
                        ofertas.map(renderOferta)
                      ) : (
                        <View style={styles.emptyState}>
                          <IconSymbol name="briefcase" size={48} color={colors.textSecondary} />
                          <Text style={styles.emptyStateText}>
                            {searchQuery || provinciaFiltro 
                              ? 'No se encontraron ofertas con los filtros aplicados'
                              : 'No has creado ofertas de trabajo'}
                          </Text>
                          {!searchQuery && !provinciaFiltro && (
                            <TouchableOpacity style={styles.emptyStateButton} onPress={handleCrearOferta}>
                              <Text style={styles.emptyStateButtonText}>Crear Oferta</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )
                    ) : (
                      perfiles.length > 0 ? (
                        perfiles.map(renderPerfil)
                      ) : (
                        <View style={styles.emptyState}>
                          <IconSymbol name="person.2" size={48} color={colors.textSecondary} />
                          <Text style={styles.emptyStateText}>
                            {searchQuery || provinciaFiltro 
                              ? 'No se encontraron perfiles con los filtros aplicados'
                              : 'No has creado tu perfil profesional'}
                          </Text>
                          {!searchQuery && !provinciaFiltro && (
                            <TouchableOpacity style={styles.emptyStateButton} onPress={handleCrearPerfil}>
                              <Text style={styles.emptyStateButtonText}>Crear Perfil</Text>
                            </TouchableOpacity>
                          )}
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
                    {activeTab === 'posts' && (
                      <TouchableOpacity 
                        style={styles.emptyStateButton} 
                        onPress={() => router.push('/crear/publicacion')}
                      >
                        <Text style={styles.emptyStateButtonText}>Crear Publicación</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowFilters(false)}
        >
          <Pressable style={styles.filtersModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersContent}>
              <Text style={styles.filterLabel}>Rango de Fechas</Text>
              <View style={styles.dateFilters}>
                <View style={styles.dateFilterItem}>
                  <Text style={styles.dateFilterLabel}>Desde:</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePickerDesde(true)}
                  >
                    <IconSymbol name="calendar" size={18} color={colors.primary} />
                    <Text style={styles.datePickerText}>{formatDate(fechaDesde)}</Text>
                  </TouchableOpacity>
                  {fechaDesde && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setFechaDesde(null)}
                    >
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.dateFilterItem}>
                  <Text style={styles.dateFilterLabel}>Hasta:</Text>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePickerHasta(true)}
                  >
                    <IconSymbol name="calendar" size={18} color={colors.primary} />
                    <Text style={styles.datePickerText}>{formatDate(fechaHasta)}</Text>
                  </TouchableOpacity>
                  {fechaHasta && (
                    <TouchableOpacity
                      style={styles.clearDateButton}
                      onPress={() => setFechaHasta(null)}
                    >
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={[styles.filterLabel, { marginTop: 20 }]}>Provincia</Text>
              <ScrollView style={styles.provinciasList} nestedScrollEnabled>
                <TouchableOpacity
                  style={[styles.provinciaItem, !provinciaFiltro && styles.provinciaItemActive]}
                  onPress={() => setProvinciaFiltro('')}
                >
                  <Text style={[styles.provinciaText, !provinciaFiltro && styles.provinciaTextActive]}>
                    Todas las provincias
                  </Text>
                </TouchableOpacity>
                {PROVINCIAS.map((provincia) => (
                  <TouchableOpacity
                    key={provincia}
                    style={[styles.provinciaItem, provinciaFiltro === provincia && styles.provinciaItemActive]}
                    onPress={() => setProvinciaFiltro(provincia)}
                  >
                    <Text style={[styles.provinciaText, provinciaFiltro === provincia && styles.provinciaTextActive]}>
                      {provincia}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            {showDatePickerDesde && (
              <DateTimePicker
                value={fechaDesde || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePickerDesde(false);
                  if (selectedDate) {
                    setFechaDesde(selectedDate);
                  }
                }}
              />
            )}
            {showDatePickerHasta && (
              <DateTimePicker
                value={fechaHasta || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePickerHasta(false);
                  if (selectedDate) {
                    setFechaHasta(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.filtersFooter}>
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  limpiarFiltros();
                  setShowFilters(false);
                }}
              >
                <Text style={styles.clearFiltersText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
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
                  
                  <TouchableOpacity
                    style={styles.storyViewsContainer}
                    onPress={handleViewStoryStats}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="eye" size={18} color="#fff" />
                    <Text style={styles.storyViewsText}>{currentStory.views_count || 0}</Text>
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

              <View style={styles.storyInteractionBar}>
                {user && currentStory.tipo === 'usuario' && currentStory.autor_id === user.id && (
                  <TouchableOpacity
                    style={styles.storyDeleteButtonBottom}
                    onPress={handleDeleteStory}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="trash.fill" size={22} color="#fff" />
                    <Text style={styles.storyDeleteText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
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

      <StoryStatsModal
        visible={showStoryStats}
        onClose={() => {
          setShowStoryStats(false);
          setIsPaused(false);
          startStoryTimer();
        }}
        storyId={currentStory?.id || ''}
        viewsCount={currentStory?.views_count || 0}
        likesCount={currentStory?.likes_count || 0}
        views={storyViews}
        likes={storyLikes}
        loading={loadingStats}
      />

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <ProfileSwitcher
        visible={showProfileSwitcher}
        onClose={() => setShowProfileSwitcher(false)}
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.headerGradientStart,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
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
  switchProfileButton: {
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    textAlign: 'center',
    paddingHorizontal: 20,
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
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    gap: 16,
  },
  empleoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ofertaGradient: {
    position: 'relative',
  },
  ofertaImagen: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardBorder,
  },
  ofertaContent: {
    padding: 16,
  },
  empleoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  empleoLocal: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  salarioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  salarioTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  empleoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  empleoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  empleoTagText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
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
    marginBottom: 12,
  },
  perfilCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  perfilGradient: {
    padding: 16,
  },
  perfilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  perfilAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 14,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  perfilAvatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perfilNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  perfilPuesto: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  perfilExperiencia: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 14,
  },
  habilidadesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  habilidadTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  habilidadText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  perfilFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perfilTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  perfilTagText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  perfilActions: {
    flexDirection: 'row',
    gap: 12,
    marginLeft: 'auto',
  },
  perfilActionButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersModal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  filtersContent: {
    padding: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  dateFilters: {
    gap: 16,
    marginBottom: 16,
  },
  dateFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateFilterLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    width: 60,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  datePickerText: {
    fontSize: 15,
    color: colors.text,
  },
  clearDateButton: {
    padding: 4,
  },
  provinciasList: {
    maxHeight: 300,
  },
  provinciaItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.cardBackground,
  },
  provinciaItemActive: {
    backgroundColor: colors.primary,
  },
  provinciaText: {
    fontSize: 15,
    color: colors.text,
  },
  provinciaTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  filtersFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
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
  storyInteractionBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    zIndex: 10,
  },
  storyDeleteButtonBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  storyDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
