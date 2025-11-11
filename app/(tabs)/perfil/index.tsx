
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Alert,
  Linking,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import TarjetaLocal from '@/components/home/TarjetaLocal';
import { useMode } from '@/contexts/ModeContext';

type UserMode = 'cliente' | 'propietario';

const { width } = Dimensions.get('window');

const PROVINCIAS = [
  'Todas',
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'Málaga',
  'Bilbao',
  'Alicante',
  'Zaragoza',
];

const PUESTOS_LABORALES = [
  'Todos',
  'Camarero/a',
  'Cocinero/a',
  'Ayudante de cocina',
  'Barman/Coctelero/a',
  'DJ',
  'Bailarín/a',
  'Go-go',
  'Metre/Jefe de sala',
  'Relaciones Públicas',
  'Seguridad',
  'Personal de Limpieza',
];

const TIPOS_CONTRATO = [
  'Todos',
  'Jornada completa',
  'Media Jornada',
  'Fines de semana',
  'Temporal',
  'Prácticas',
];

interface OfertaTrabajo {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  salario?: string;
  requisitos?: string[];
  provincia?: string;
  created_at: string;
  local?: {
    nombre: string;
  };
  propietario?: {
    nombre: string;
  };
}

interface PerfilProfesional {
  id: string;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addStoryButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.headerGradientEnd,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  verificationBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  verificationGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  verificationSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
  },
  verificationArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bioText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  websiteText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 1,
  },
  postItem: {
    width: (Dimensions.get('window').width - 2) / 3,
    height: (Dimensions.get('window').width - 2) / 3,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.cardBackground,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
  localesContainer: {
    padding: 16,
  },
  storyViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  storyProgressContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 16,
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
    backgroundColor: '#FFFFFF',
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  storyUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  storyUserTime: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  storyCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyImage: {
    width: '100%',
    height: '100%',
  },
  storyNavigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  storyNavButton: {
    flex: 1,
  },
  storyActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 40,
    flexDirection: 'row',
    gap: 12,
  },
  storyDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storyDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  empleoContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  empleoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  empleoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  empleoSubtabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  empleoSubtab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  empleoSubtabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  empleoSubtabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  empleoSubtabTextActive: {
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  ofertaCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ofertaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ofertaTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  ofertaLocal: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  badgeNuevo: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ofertaDescripcion: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  ofertaDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detalleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  detalleTexto: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  requisitosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  requisitoChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  requisitoTexto: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  ofertaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  fechaTexto: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  aplicarButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  aplicarTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  limpiarButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  limpiarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  aplicarButtonModal: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aplicarButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  aplicarButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});

function formatearFecha(fecha: string): string {
  const date = new Date(fecha);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  if (minutes > 0) return `hace ${minutes}m`;
  return 'ahora';
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'locales' | 'empleo'>('posts');
  const [empleoSubtab, setEmpleoSubtab] = useState<'ofertas' | 'profesionales'>('ofertas');
  const [posts, setPosts] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [ofertas, setOfertas] = useState<OfertaTrabajo[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilProfesional[]>([]);
  const [seguidores, setSeguidores] = useState(0);
  const [seguidos, setSeguidos] = useState(0);
  const [historias, setHistorias] = useState<any[]>([]);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const storyProgress = useRef(new Animated.Value(0)).current;
  const storyTimer = useRef<NodeJS.Timeout | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [busquedaEmpleo, setBusquedaEmpleo] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [puestoSeleccionado, setPuestoSeleccionado] = useState('Todos');
  const [tipoContratoSeleccionado, setTipoContratoSeleccionado] = useState('Todos');

  const userRole = user?.rol_app || 'cliente';
  const isPropietarioMode = currentMode === 'propietario';

  const loadUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Load posts
      const { data: postsData } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('autor_id', user.id)
        .order('created_at', { ascending: false });

      setPosts(postsData || []);

      // Load locales if propietario
      if (currentMode === 'propietario') {
        const { data: localesData } = await supabase
          .from('locales')
          .select('*')
          .eq('propietario_id', user.id)
          .order('created_at', { ascending: false });

        setLocales(localesData || []);
      }

      // Load historias
      const { data: historiasData } = await supabase
        .from('historias')
        .select('*')
        .eq('autor_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      setHistorias(historiasData || []);

      // Load verification status
      const { data: statusData } = await supabase
        .rpc('get_user_verification_status', { user_id: user.id });

      if (statusData && statusData.length > 0 && statusData[0].has_request) {
        setVerificationStatus(statusData[0]);
      }

      // Load ofertas de trabajo
      const { data: ofertasData } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          local:locales(nombre),
          propietario:usuarios(nombre)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      setOfertas(ofertasData || []);

      // Load perfiles profesionales
      const { data: perfilesData } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      setPerfiles(perfilesData || []);
    } catch (error) {
      console.error('[Perfil] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, currentMode]);

  const loadFollowerCounts = useCallback(async () => {
    if (!user) return;

    try {
      const { count: seguidoresCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguido_id', user.id);

      const { count: seguidosCount } = await supabase
        .from('seguidores')
        .select('*', { count: 'exact', head: true })
        .eq('seguidor_id', user.id);

      setSeguidores(seguidoresCount || 0);
      setSeguidos(seguidosCount || 0);
    } catch (error) {
      console.error('[Perfil] Error loading follower counts:', error);
    }
  }, [user]);

  useEffect(() => {
    loadUserData();
    loadFollowerCounts();
  }, [loadUserData, loadFollowerCounts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
    loadFollowerCounts();
  };

  const startStoryTimer = useCallback(() => {
    if (storyTimer.current) {
      clearInterval(storyTimer.current);
    }

    storyProgress.setValue(0);

    Animated.timing(storyProgress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !isPaused) {
        handleNextStory();
      }
    });
  }, [isPaused, storyProgress]);

  const stopStoryTimer = useCallback(() => {
    if (storyTimer.current) {
      clearInterval(storyTimer.current);
      storyTimer.current = null;
    }
    storyProgress.stopAnimation();
  }, [storyProgress]);

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < historias.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
    } else {
      setShowStoryViewer(false);
    }
  }, [currentStoryIndex, historias.length]);

  useEffect(() => {
    if (showStoryViewer && !isPaused) {
      startStoryTimer();
    } else {
      stopStoryTimer();
    }

    return () => stopStoryTimer();
  }, [showStoryViewer, currentStoryIndex, isPaused, startStoryTimer, stopStoryTimer]);

  const handlePreviousStory = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
    } else {
      setShowStoryViewer(false);
    }
  };

  const togglePauseStory = () => {
    setIsPaused(!isPaused);
  };

  const handleDeleteStory = async () => {
    const historia = historias[currentStoryIndex];
    if (!historia) return;

    Alert.alert(
      'Eliminar Historia',
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
                .eq('id', historia.id);

              if (error) throw error;

              const newHistorias = historias.filter((h) => h.id !== historia.id);
              setHistorias(newHistorias);

              if (newHistorias.length === 0) {
                setShowStoryViewer(false);
              } else if (currentStoryIndex >= newHistorias.length) {
                setCurrentStoryIndex(newHistorias.length - 1);
              }

              Alert.alert('Éxito', 'Historia eliminada');
            } catch (error) {
              console.error('[Perfil] Error deleting story:', error);
              Alert.alert('Error', 'No se pudo eliminar la historia');
            }
          },
        },
      ]
    );
  };

  const handleCrearHistoria = () => {
    router.push('/crear/historia');
  };

  const handleCreatePress = () => {
    if (activeTab === 'posts') {
      router.push('/crear/publicacion');
    } else if (activeTab === 'locales') {
      router.push('/crear/local');
    } else if (activeTab === 'empleo') {
      if (empleoSubtab === 'ofertas') {
        if (userRole !== 'propietario' && userRole !== 'admin') {
          Alert.alert(
            'Acceso Restringido',
            'Solo los propietarios de locales pueden publicar ofertas de trabajo.',
            [{ text: 'OK' }]
          );
          return;
        }
        router.push('/crear/oferta-trabajo');
      } else {
        router.push('/crear/perfil-profesional');
      }
    }
  };

  const handleVerPost = (postId: string) => {
    router.push({
      pathname: '/social/post',
      params: { id: postId },
    });
  };

  const handleAvatarPress = () => {
    if (historias.length > 0) {
      setCurrentStoryIndex(0);
      setShowStoryViewer(true);
    }
  };

  const handleWebsitePress = () => {
    if (user?.sitio_web) {
      Linking.openURL(user.sitio_web);
    }
  };

  const handleContactarPerfil = async (perfilId: string, usuarioId: string) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para contactar perfiles');
      return;
    }

    // Solo propietarios pueden contactar perfiles
    if (userRole !== 'propietario' && userRole !== 'admin') {
      Alert.alert(
        'Acceso Restringido',
        'Solo los propietarios pueden contactar con profesionales.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Crear o encontrar chat existente
      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${usuarioId}),and(usuario1_id.eq.${usuarioId},usuario2_id.eq.${user.id})`)
        .single();

      let chatId = chatExistente?.id;

      if (!chatId) {
        // Crear nuevo chat
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: usuarioId,
          })
          .select()
          .single();

        if (nuevoChatError) throw nuevoChatError;
        chatId = nuevoChat.id;
      }

      // Registrar interés en el perfil
      const { error: interesError } = await supabase
        .from('intereses_empleo')
        .insert({
          perfil_id: perfilId,
          propietario_id: user.id,
          estado: 'pendiente',
        });

      if (interesError && !interesError.message.includes('duplicate')) {
        console.error('[Perfil] Error registrando interés:', interesError);
      }

      // Crear notificación para el profesional
      const { error: notifError } = await supabase
        .from('notificaciones')
        .insert({
          usuario_id: usuarioId,
          tipo: 'sistema',
          titulo: 'Interés en tu perfil profesional',
          mensaje: 'Un propietario está interesado en tu perfil. Revisa tus mensajes.',
          usuario_origen_id: user.id,
        });

      if (notifError) {
        console.error('[Perfil] Error creando notificación:', notifError);
      }

      Alert.alert(
        'Mensaje Enviado',
        'Se ha enviado una notificación al profesional. Puedes continuar la conversación en tus chats.',
        [
          { text: 'Ver Chats', onPress: () => router.push('/(tabs)/perfil/chats') },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('[Perfil] Error contactando perfil:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
    }
  };

  const calcularDiasPublicado = (fecha: string): number => {
    const fechaPublicacion = new Date(fecha);
    const hoy = new Date();
    const diff = hoy.getTime() - fechaPublicacion.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const limpiarFiltros = () => {
    setProvinciaSeleccionada('Todas');
    setPuestoSeleccionado('Todos');
    setTipoContratoSeleccionado('Todos');
  };

  const ofertasFiltradas = ofertas.filter((oferta) => {
    const matchBusqueda = oferta.titulo.toLowerCase().includes(busquedaEmpleo.toLowerCase());
    const matchProvincia = provinciaSeleccionada === 'Todas' || oferta.provincia === provinciaSeleccionada;
    const matchPuesto = puestoSeleccionado === 'Todos' || oferta.titulo.includes(puestoSeleccionado);
    const matchTipoContrato = tipoContratoSeleccionado === 'Todos' || oferta.tipo.includes(tipoContratoSeleccionado);
    
    return matchBusqueda && matchProvincia && matchPuesto && matchTipoContrato;
  });

  const perfilesFiltrados = perfiles.filter((perfil) => {
    const matchBusqueda = perfil.nombre_completo.toLowerCase().includes(busquedaEmpleo.toLowerCase()) ||
                          perfil.puesto_deseado.toLowerCase().includes(busquedaEmpleo.toLowerCase());
    const matchProvincia = provinciaSeleccionada === 'Todas' || perfil.provincia === provinciaSeleccionada;
    const matchPuesto = puestoSeleccionado === 'Todos' || perfil.puesto_deseado.includes(puestoSeleccionado);
    
    return matchBusqueda && matchProvincia && matchPuesto;
  });

  const renderOferta = (oferta: OfertaTrabajo) => {
    const diasPublicado = calcularDiasPublicado(oferta.created_at);

    return (
      <TouchableOpacity
        key={oferta.id}
        style={[styles.ofertaCard, commonStyles.cardShadow]}
        onPress={() => {
          console.log('Ver oferta:', oferta.id);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.ofertaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ofertaTitulo}>{oferta.titulo}</Text>
            <Text style={styles.ofertaLocal}>
              {oferta.local?.nombre || oferta.propietario?.nombre || 'Local'}
            </Text>
          </View>
          {diasPublicado < 7 && (
            <View style={[styles.badgeNuevo, commonStyles.badgeNuevo]}>
              <Text style={commonStyles.badgeNuevoText}>Nuevo</Text>
            </View>
          )}
        </View>

        <Text style={styles.ofertaDescripcion} numberOfLines={2}>
          {oferta.descripcion}
        </Text>

        <View style={styles.ofertaDetalles}>
          <View style={styles.detalleChip}>
            <IconSymbol name="briefcase" size={14} color={colors.primary} />
            <Text style={styles.detalleTexto}>{oferta.tipo}</Text>
          </View>
          {oferta.salario && (
            <View style={styles.detalleChip}>
              <IconSymbol name="eurosign.circle" size={14} color={colors.primary} />
              <Text style={styles.detalleTexto}>{oferta.salario}</Text>
            </View>
          )}
          {oferta.provincia && (
            <View style={styles.detalleChip}>
              <IconSymbol name="mappin" size={14} color={colors.primary} />
              <Text style={styles.detalleTexto}>{oferta.provincia}</Text>
            </View>
          )}
        </View>

        {oferta.requisitos && oferta.requisitos.length > 0 && (
          <View style={styles.requisitosContainer}>
            {oferta.requisitos.slice(0, 2).map((requisito, index) => (
              <View key={index} style={styles.requisitoChip}>
                <Text style={styles.requisitoTexto}>{requisito}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.ofertaFooter}>
          <Text style={styles.fechaTexto}>
            Publicado hace {diasPublicado} {diasPublicado === 1 ? 'día' : 'días'}
          </Text>
          <TouchableOpacity style={styles.aplicarButton}>
            <Text style={styles.aplicarTexto}>Aplicar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPerfil = (perfil: PerfilProfesional) => {
    const diasPublicado = calcularDiasPublicado(perfil.created_at);

    return (
      <TouchableOpacity
        key={perfil.id}
        style={[styles.ofertaCard, commonStyles.cardShadow]}
        onPress={() => {
          console.log('Ver perfil:', perfil.id);
        }}
        activeOpacity={0.8}
      >
        <View style={styles.ofertaHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ofertaTitulo}>{perfil.nombre_completo}</Text>
            <Text style={styles.ofertaLocal}>{perfil.puesto_deseado}</Text>
          </View>
          {diasPublicado < 7 && (
            <View style={[styles.badgeNuevo, commonStyles.badgeNuevo]}>
              <Text style={commonStyles.badgeNuevoText}>Nuevo</Text>
            </View>
          )}
        </View>

        <Text style={styles.ofertaDescripcion} numberOfLines={2}>
          {perfil.experiencia}
        </Text>

        <View style={styles.ofertaDetalles}>
          {perfil.disponibilidad && (
            <View style={styles.detalleChip}>
              <IconSymbol name="clock" size={14} color={colors.primary} />
              <Text style={styles.detalleTexto}>{perfil.disponibilidad}</Text>
            </View>
          )}
          {perfil.provincia && (
            <View style={styles.detalleChip}>
              <IconSymbol name="mappin" size={14} color={colors.primary} />
              <Text style={styles.detalleTexto}>{perfil.provincia}</Text>
            </View>
          )}
        </View>

        {perfil.habilidades && (
          <View style={styles.requisitosContainer}>
            {perfil.habilidades.split(',').slice(0, 2).map((habilidad, index) => (
              <View key={index} style={styles.requisitoChip}>
                <Text style={styles.requisitoTexto}>{habilidad.trim()}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.ofertaFooter}>
          <Text style={styles.fechaTexto}>
            Publicado hace {diasPublicado} {diasPublicado === 1 ? 'día' : 'días'}
          </Text>
          {isPropietarioMode && (
            <TouchableOpacity 
              style={styles.aplicarButton}
              onPress={() => handleContactarPerfil(perfil.id, perfil.usuario_id!)}
            >
              <Text style={styles.aplicarTexto}>Contactar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getVerificationStatusColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return ['#F59E0B', '#F97316'];
      case 'en_revision':
        return ['#3B82F6', '#2563EB'];
      case 'documentacion_solicitada':
        return ['#8B5CF6', '#7C3AED'];
      case 'documentacion_recibida':
        return ['#10B981', '#059669'];
      case 'aprobada':
        return ['#10B981', '#059669'];
      case 'rechazada':
        return ['#EF4444', '#DC2626'];
      default:
        return [colors.primary, colors.primary];
    }
  };

  const getVerificationStatusLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Solicitud Recibida';
      case 'en_revision':
        return 'En Revisión';
      case 'documentacion_solicitada':
        return 'Documentación Solicitada';
      case 'documentacion_recibida':
        return 'Documentación Recibida';
      case 'aprobada':
        return 'Aprobada';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <IconSymbol name="person.circle" size={64} color={colors.textSecondary} />
        <Text style={styles.loadingText}>Inicia sesión para ver tu perfil</Text>
        <TouchableOpacity
          style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          onPress={() => router.push('/auth/login-popup')}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleCreatePress}
            >
              <IconSymbol name="plus" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/(tabs)/perfil/configuracion')}
            >
              <IconSymbol name="gearshape.fill" size={24} color={colors.headerText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarPress}>
            <Image
              source={{
                uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
              }}
              style={styles.avatar}
            />
            {historias.length === 0 && (
              <TouchableOpacity style={styles.addStoryButton} onPress={handleCrearHistoria}>
                <IconSymbol name="plus" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.nombre || 'Usuario'}</Text>
            <Text style={styles.profileUsername}>@{user.username || 'username'}</Text>
            <View style={styles.profileStats}>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/perfil/seguidores')}
              >
                <Text style={styles.statValue}>{seguidores}</Text>
                <Text style={styles.statLabel}>Seguidores</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => router.push('/perfil/seguidos')}
              >
                <Text style={styles.statValue}>{seguidos}</Text>
                <Text style={styles.statLabel}>Seguidos</Text>
              </TouchableOpacity>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Verification Status Banner */}
        {verificationStatus && verificationStatus.estado !== 'aprobada' && (
          <TouchableOpacity
            style={styles.verificationBanner}
            onPress={() => router.push('/auth/propietario-request-status')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={getVerificationStatusColor(verificationStatus.estado)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.verificationGradient}
            >
              <View style={styles.verificationIcon}>
                <IconSymbol name="clock.fill" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.verificationContent}>
                <Text style={styles.verificationTitle}>
                  {getVerificationStatusLabel(verificationStatus.estado)}
                </Text>
                <Text style={styles.verificationSubtitle}>
                  {verificationStatus.estado_detalle || 'Toca para ver más detalles'}
                </Text>
              </View>
              <View style={styles.verificationArrow}>
                <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push('/editar/perfil')}
          >
            <IconSymbol name="pencil" size={18} color="#FFFFFF" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
              Editar Perfil
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/perfil/chats')}
          >
            <IconSymbol name="message" size={18} color={colors.text} />
            <Text style={styles.actionButtonText}>Mensajes</Text>
          </TouchableOpacity>
        </View>

        {user.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{user.bio}</Text>
            {user.sitio_web && (
              <TouchableOpacity style={styles.websiteLink} onPress={handleWebsitePress}>
                <IconSymbol name="link" size={16} color={colors.primary} />
                <Text style={styles.websiteText}>{user.sitio_web}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
              Publicaciones
            </Text>
          </TouchableOpacity>
          {currentMode === 'propietario' && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'locales' && styles.tabActive]}
              onPress={() => setActiveTab('locales')}
            >
              <Text style={[styles.tabText, activeTab === 'locales' && styles.tabTextActive]}>
                Mis Locales
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.tab, activeTab === 'empleo' && styles.tabActive]}
            onPress={() => setActiveTab('empleo')}
          >
            <Text style={[styles.tabText, activeTab === 'empleo' && styles.tabTextActive]}>
              Empleo
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'posts' ? (
          posts.length > 0 ? (
            <View style={styles.postsGrid}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postItem}
                  onPress={() => handleVerPost(post.id)}
                >
                  <Image source={{ uri: post.imagen }} style={styles.postImage} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="photo.on.rectangle" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                Aún no has publicado nada.{'\n'}¡Comparte tu primera publicación!
              </Text>
            </View>
          )
        ) : activeTab === 'locales' ? (
          locales.length > 0 ? (
            <View style={styles.localesContainer}>
              {locales.map((local) => (
                <TarjetaLocal key={local.id} local={local} userLocation={null} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <IconSymbol name="building.2" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateText}>
                No tienes locales registrados.{'\n'}¡Crea tu primer local!
              </Text>
            </View>
          )
        ) : (
          <View style={styles.empleoContainer}>
            <View style={styles.empleoHeader}>
              <Text style={styles.empleoTitle}>Bolsa de Trabajo</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
                <IconSymbol name="slider.horizontal.3" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar ofertas o profesionales..."
                placeholderTextColor={colors.textSecondary}
                value={busquedaEmpleo}
                onChangeText={setBusquedaEmpleo}
              />
            </View>

            <View style={styles.empleoSubtabs}>
              <TouchableOpacity
                style={[styles.empleoSubtab, empleoSubtab === 'ofertas' && styles.empleoSubtabActive]}
                onPress={() => setEmpleoSubtab('ofertas')}
              >
                <Text
                  style={[
                    styles.empleoSubtabText,
                    empleoSubtab === 'ofertas' && styles.empleoSubtabTextActive,
                  ]}
                >
                  Ofertas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.empleoSubtab, empleoSubtab === 'profesionales' && styles.empleoSubtabActive]}
                onPress={() => setEmpleoSubtab('profesionales')}
              >
                <Text
                  style={[
                    styles.empleoSubtabText,
                    empleoSubtab === 'profesionales' && styles.empleoSubtabTextActive,
                  ]}
                >
                  Profesionales
                </Text>
              </TouchableOpacity>
            </View>

            {empleoSubtab === 'ofertas' ? (
              ofertasFiltradas.length > 0 ? (
                ofertasFiltradas.map(renderOferta)
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol name="briefcase" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>
                    No hay ofertas de trabajo disponibles
                  </Text>
                </View>
              )
            ) : (
              perfilesFiltrados.length > 0 ? (
                perfilesFiltrados.map(renderPerfil)
              ) : (
                <View style={styles.emptyState}>
                  <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
                  <Text style={styles.emptyStateText}>
                    No hay perfiles profesionales disponibles
                  </Text>
                </View>
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB - Create */}
      {activeTab === 'empleo' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreatePress}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.fabGradient}
          >
            <IconSymbol name="plus" size={28} color={colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Story Viewer Modal */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        onRequestClose={() => setShowStoryViewer(false)}
      >
        <View style={styles.storyViewerOverlay}>
          <View style={styles.storyViewerHeader}>
            <View style={styles.storyProgressContainer}>
              {historias.map((_, index) => (
                <View key={index} style={styles.storyProgressBar}>
                  {index === currentStoryIndex && (
                    <Animated.View
                      style={[
                        styles.storyProgressFill,
                        {
                          width: storyProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  )}
                  {index < currentStoryIndex && (
                    <View style={[styles.storyProgressFill, { width: '100%' }]} />
                  )}
                </View>
              ))}
            </View>

            <View style={styles.storyUserInfo}>
              <View style={styles.storyUserLeft}>
                <Image
                  source={{
                    uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
                  }}
                  style={styles.storyUserAvatar}
                />
                <View>
                  <Text style={styles.storyUserName}>{user.nombre}</Text>
                  <Text style={styles.storyUserTime}>
                    {historias[currentStoryIndex] &&
                      formatearFecha(historias[currentStoryIndex].created_at)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.storyCloseButton}
                onPress={() => setShowStoryViewer(false)}
              >
                <IconSymbol name="xmark" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Pressable style={styles.storyContent} onPress={togglePauseStory}>
            {historias[currentStoryIndex] && (
              <Image
                source={{ uri: historias[currentStoryIndex].imagen }}
                style={styles.storyImage}
                resizeMode="contain"
              />
            )}
          </Pressable>

          <View style={styles.storyNavigation}>
            <TouchableOpacity style={styles.storyNavButton} onPress={handlePreviousStory} />
            <TouchableOpacity style={styles.storyNavButton} onPress={handleNextStory} />
          </View>

          <View style={styles.storyActions}>
            <TouchableOpacity style={styles.storyDeleteButton} onPress={handleDeleteStory}>
              <IconSymbol name="trash" size={20} color="#FFFFFF" />
              <Text style={styles.storyDeleteButtonText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filtros Modal */}
      <Modal
        visible={mostrarFiltros}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarFiltros(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Provincia */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Provincia</Text>
                <View style={styles.filterChips}>
                  {PROVINCIAS.map((provincia) => (
                    <TouchableOpacity
                      key={provincia}
                      style={[
                        styles.filterChip,
                        provinciaSeleccionada === provincia && styles.filterChipActive,
                      ]}
                      onPress={() => setProvinciaSeleccionada(provincia)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          provinciaSeleccionada === provincia && styles.filterChipTextActive,
                        ]}
                      >
                        {provincia}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Puesto Laboral */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Puesto Laboral</Text>
                <View style={styles.filterChips}>
                  {PUESTOS_LABORALES.map((puesto) => (
                    <TouchableOpacity
                      key={puesto}
                      style={[
                        styles.filterChip,
                        puestoSeleccionado === puesto && styles.filterChipActive,
                      ]}
                      onPress={() => setPuestoSeleccionado(puesto)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          puestoSeleccionado === puesto && styles.filterChipTextActive,
                        ]}
                      >
                        {puesto}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tipo de Contrato - Solo para ofertas */}
              {empleoSubtab === 'ofertas' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterTitle}>Tipo de Contrato</Text>
                  <View style={styles.filterChips}>
                    {TIPOS_CONTRATO.map((tipo) => (
                      <TouchableOpacity
                        key={tipo}
                        style={[
                          styles.filterChip,
                          tipoContratoSeleccionado === tipo && styles.filterChipActive,
                        ]}
                        onPress={() => setTipoContratoSeleccionado(tipo)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            tipoContratoSeleccionado === tipo && styles.filterChipTextActive,
                          ]}
                        >
                          {tipo}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.limpiarButton}
                onPress={limpiarFiltros}
              >
                <Text style={styles.limpiarButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.aplicarButtonModal}
                onPress={() => setMostrarFiltros(false)}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.aplicarButtonGradient}
                >
                  <Text style={styles.aplicarButtonText}>Aplicar</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
