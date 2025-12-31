
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';
import PermissionGuard from '@/components/social/PermissionGuard';

const { width } = Dimensions.get('window');

// ✅ ANDROID HEADER SCROLL BEHAVIOR v94.0
const HEADER_MAX_HEIGHT = Platform.OS === 'android' ? 180 : 200;
const HEADER_MIN_HEIGHT = Platform.OS === 'android' ? 0 : 0;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

const PROVINCIAS = [
  'Todas',
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila',
  'Badajoz', 'Barcelona', 'Burgos', 'Cáceres', 'Cádiz', 'Cantabria',
  'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca', 'Gerona', 'Granada',
  'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares', 'Jaén',
  'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lérida', 'Lugo',
  'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Orense', 'Palencia',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria',
  'Tarragona', 'Teruel', 'Toledo', 'Valencia', 'Valladolid', 'Vizcaya',
  'Zamora', 'Zaragoza'
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
  imagen_url?: string;
  created_at: string;
  local?: {
    nombre: string;
    imagen_url?: string;
    latitud?: number;
    longitud?: number;
  };
  created_by_usuario?: {
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

/**
 * ✅ EMPLEO SCREEN v94.0 - ANDROID HEADER SCROLL BEHAVIOR
 * 
 * CRITICAL FIXES v94.0:
 * - ✅ Header hides completely on scroll down (Android only)
 * - ✅ Header shows on scroll up (Android only)
 * - ✅ Smooth animation using Animated API
 * - ✅ iOS behavior unchanged (static header)
 * - ✅ Consistent with Home, Events, and Favorites screens
 */

function EmpleoContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentMode } = useMode();
  const [tabActual, setTabActual] = useState<'ofertas' | 'profesionales'>('ofertas');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState('Todas');
  const [puestoSeleccionado, setPuestoSeleccionado] = useState('Todos');
  const [tipoContratoSeleccionado, setTipoContratoSeleccionado] = useState('Todos');
  const [ofertas, setOfertas] = useState<OfertaTrabajo[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilProfesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<PerfilProfesional | null>(null);
  const [showProfileDetail, setShowProfileDetail] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<OfertaTrabajo | null>(null);
  const [showOfferDetail, setShowOfferDetail] = useState(false);
  
  const [ofertasPage, setOfertasPage] = useState(1);
  const [perfilesPage, setPerfilesPage] = useState(1);
  const [hasMoreOfertas, setHasMoreOfertas] = useState(true);
  const [hasMorePerfiles, setHasMorePerfiles] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  const ITEMS_PER_PAGE = 20;

  // ✅ ANDROID HEADER SCROLL BEHAVIOR v94.0
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [0, -HEADER_SCROLL_DISTANCE],
    extrapolate: 'clamp',
  });

  const userRole = user?.rol_app || 'cliente';
  const isPropietarioMode = currentMode === 'propietario';

  const cargarOfertas = useCallback(async () => {
    try {
      console.log('[Empleo v94.0] Cargando ofertas...');
      
      const { data, error } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          local:locales(nombre, imagen_url, latitud, longitud),
          created_by_usuario:usuarios!ofertas_trabajo_created_by_usuario_id_fkey(nombre)
        `)
        .eq('activa', true)
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);

      if (error) throw error;
      console.log('[Empleo v94.0] Ofertas cargadas:', data?.length);
      
      const ofertasConImagenes = (data || []).map(oferta => ({
        ...oferta,
        imagen_url: oferta.imagen_url || oferta.local?.imagen_url,
      }));
      
      setOfertas(ofertasConImagenes);
      setHasMoreOfertas((data || []).length === ITEMS_PER_PAGE);
      setOfertasPage(1);
    } catch (error) {
      console.error('[Empleo v94.0] Error cargando ofertas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ofertas de trabajo');
    }
  }, []);

  const cargarPerfiles = useCallback(async () => {
    try {
      console.log('[Empleo v94.0] Cargando perfiles profesionales...');
      
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .range(0, ITEMS_PER_PAGE - 1);

      if (error) throw error;
      console.log('[Empleo v94.0] Perfiles cargados:', data?.length);
      setPerfiles(data || []);
      setHasMorePerfiles((data || []).length === ITEMS_PER_PAGE);
      setPerfilesPage(1);
    } catch (error) {
      console.error('[Empleo v94.0] Error cargando perfiles:', error);
      Alert.alert('Error', 'No se pudieron cargar los perfiles profesionales');
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([cargarOfertas(), cargarPerfiles()]);
    setLoading(false);
  }, [cargarOfertas, cargarPerfiles]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const ofertasFiltradas = ofertas.filter((oferta) => {
    const matchBusqueda = oferta.titulo.toLowerCase().includes(busqueda.toLowerCase());
    const matchProvincia = provinciaSeleccionada === 'Todas' || oferta.provincia === provinciaSeleccionada;
    const matchPuesto = puestoSeleccionado === 'Todos' || oferta.titulo.includes(puestoSeleccionado);
    const matchTipoContrato = tipoContratoSeleccionado === 'Todos' || oferta.tipo.includes(tipoContratoSeleccionado);
    
    return matchBusqueda && matchProvincia && matchPuesto && matchTipoContrato;
  });

  const perfilesFiltrados = perfiles.filter((perfil) => {
    const matchBusqueda = perfil.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          perfil.puesto_deseado.toLowerCase().includes(busqueda.toLowerCase());
    const matchProvincia = provinciaSeleccionada === 'Todas' || perfil.provincia === provinciaSeleccionada;
    const matchPuesto = puestoSeleccionado === 'Todos' || perfil.puesto_deseado.includes(puestoSeleccionado);
    
    return matchBusqueda && matchProvincia && matchPuesto;
  });

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

  const loadMoreOfertas = useCallback(async () => {
    if (loadingMore || !hasMoreOfertas) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          local:locales(nombre, imagen_url, latitud, longitud),
          created_by_usuario:usuarios!ofertas_trabajo_created_by_usuario_id_fkey(nombre)
        `)
        .eq('activa', true)
        .order('created_at', { ascending: false })
        .range(ofertasPage * ITEMS_PER_PAGE, (ofertasPage + 1) * ITEMS_PER_PAGE - 1);

      if (!error && data) {
        const ofertasConImagenes = data.map(oferta => ({
          ...oferta,
          imagen_url: oferta.imagen_url || oferta.local?.imagen_url,
        }));
        setOfertas(prev => [...prev, ...ofertasConImagenes]);
        setOfertasPage(prev => prev + 1);
        setHasMoreOfertas(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('[Empleo v94.0] Error loading more ofertas:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMoreOfertas, ofertasPage]);

  const loadMorePerfiles = useCallback(async () => {
    if (loadingMore || !hasMorePerfiles) return;

    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .range(perfilesPage * ITEMS_PER_PAGE, (perfilesPage + 1) * ITEMS_PER_PAGE - 1);

      if (!error && data) {
        setPerfiles(prev => [...prev, ...data]);
        setPerfilesPage(prev => prev + 1);
        setHasMorePerfiles(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('[Empleo v94.0] Error loading more perfiles:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMorePerfiles, perfilesPage]);

  // ✅ ANDROID HEADER SCROLL BEHAVIOR v94.0
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        if (Platform.OS !== 'android') return;
        
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const diff = currentScrollY - lastScrollY.current;
        
        if (diff > 5) {
          // Scrolling down
        } else if (diff < -5) {
          // Scrolling up
        }
        
        lastScrollY.current = currentScrollY;
      },
    }
  );

  const handleScrollEnd = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    if (isCloseToBottom) {
      if (tabActual === 'ofertas') {
        loadMoreOfertas();
      } else if (tabActual === 'profesionales') {
        loadMorePerfiles();
      }
    }
  }, [tabActual, loadMoreOfertas, loadMorePerfiles]);

  const handleCrearOferta = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (userRole !== 'propietario' && userRole !== 'admin') {
      Alert.alert(
        'Acceso Restringido',
        'Solo los propietarios de locales pueden publicar ofertas de trabajo.',
        [{ text: 'OK' }]
      );
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

  const handleEditarPerfil = async (perfilId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    router.push('/crear/perfil-profesional');
  };

  const handleEliminarPerfil = async (perfilId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

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
              setShowProfileDetail(false);
              await cargarPerfiles();
            } catch (error) {
              console.error('[Empleo v94.0] Error eliminando perfil:', error);
              Alert.alert('Error', 'No se pudo eliminar el perfil');
            }
          },
        },
      ]
    );
  };

  const handleContactarPerfil = async (perfilId: string, usuarioId: string) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (userRole !== 'propietario' && userRole !== 'admin') {
      Alert.alert(
        'Acceso Restringido',
        'Solo los propietarios pueden contactar con profesionales.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!usuarioId) {
      Alert.alert('Error', 'No se pudo obtener la información del usuario');
      return;
    }

    try {
      console.log('[Empleo v94.0] Contactando perfil:', perfilId, 'Usuario:', usuarioId);

      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${usuarioId}),and(usuario1_id.eq.${usuarioId},usuario2_id.eq.${user.id})`)
        .maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        console.error('[Empleo v94.0] Error buscando chat:', chatError);
        throw chatError;
      }

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[Empleo v94.0] Creando nuevo chat...');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: usuarioId,
          })
          .select()
          .single();

        if (nuevoChatError) {
          console.error('[Empleo v94.0] Error creando chat:', nuevoChatError);
          throw nuevoChatError;
        }
        chatId = nuevoChat.id;
        console.log('[Empleo v94.0] Chat creado:', chatId);
      } else {
        console.log('[Empleo v94.0] Chat existente encontrado:', chatId);
      }

      const { error: interesError } = await supabase
        .from('intereses_empleo')
        .insert({
          perfil_id: perfilId,
          propietario_id: user.id,
          estado: 'pendiente',
        });

      if (interesError && !interesError.message.includes('duplicate')) {
        console.error('[Empleo v94.0] Error registrando interés:', interesError);
      } else {
        console.log('[Empleo v94.0] Interés registrado correctamente');
      }

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
        console.error('[Empleo v94.0] Error creando notificación:', notifError);
      } else {
        console.log('[Empleo v94.0] Notificación creada correctamente');
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
      console.error('[Empleo v94.0] Error contactando perfil:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
    }
  };

  const handleVerPerfil = (perfil: PerfilProfesional) => {
    setSelectedProfile(perfil);
    setShowProfileDetail(true);
  };

  const handleVerOferta = (oferta: OfertaTrabajo) => {
    setSelectedOffer(oferta);
    setShowOfferDetail(true);
  };

  const renderOferta = (oferta: OfertaTrabajo) => {
    const diasPublicado = calcularDiasPublicado(oferta.created_at);

    return (
      <TouchableOpacity
        key={oferta.id}
        style={[styles.ofertaCard, commonStyles.cardShadow]}
        onPress={() => handleVerOferta(oferta)}
        activeOpacity={0.8}
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
              <Text style={styles.ofertaTitulo}>{oferta.titulo}</Text>
              <Text style={styles.ofertaLocal}>
                {oferta.local?.nombre || oferta.created_by_usuario?.nombre || 'Local'}
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
              <IconSymbol 
                ios_icon_name="briefcase.fill" 
                android_material_icon_name="work" 
                size={14} 
                color={colors.primary} 
              />
              <Text style={styles.detalleTexto}>{oferta.tipo}</Text>
            </View>
            {oferta.salario && (
              <View style={styles.detalleChip}>
                <IconSymbol 
                  ios_icon_name="eurosign.circle.fill" 
                  android_material_icon_name="euro" 
                  size={14} 
                  color={colors.primary} 
                />
                <Text style={styles.detalleTexto}>{oferta.salario}</Text>
              </View>
            )}
            {oferta.provincia && (
              <View style={styles.detalleChip}>
                <IconSymbol 
                  ios_icon_name="mappin.circle.fill" 
                  android_material_icon_name="location_on" 
                  size={14} 
                  color={colors.primary} 
                />
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
            <TouchableOpacity style={styles.aplicarButton} onPress={() => handleVerOferta(oferta)}>
              <Text style={styles.aplicarTexto}>Ver más</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPerfil = (perfil: PerfilProfesional) => {
    const diasPublicado = calcularDiasPublicado(perfil.created_at);
    const fotoUrl = perfil.foto_url || perfil.usuario?.avatar;
    const isOwnProfile = user && perfil.usuario_id === user.id;

    return (
      <TouchableOpacity
        key={perfil.id}
        style={[styles.ofertaCard, commonStyles.cardShadow]}
        onPress={() => handleVerPerfil(perfil)}
        activeOpacity={0.8}
      >
        <View style={styles.perfilHeader}>
          {fotoUrl ? (
            <Image 
              source={{ uri: fotoUrl }} 
              style={styles.perfilFoto}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.perfilFotoPlaceholder}>
              <IconSymbol 
                ios_icon_name="person.circle.fill" 
                android_material_icon_name="account_circle" 
                size={40} 
                color={colors.textSecondary} 
              />
            </View>
          )}
          
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.ofertaTitulo}>{perfil.nombre_completo}</Text>
            <Text style={styles.ofertaLocal}>{perfil.puesto_deseado}</Text>
            {diasPublicado < 7 && (
              <View style={[styles.badgeNuevo, commonStyles.badgeNuevo, { marginTop: 4 }]}>
                <Text style={commonStyles.badgeNuevoText}>Nuevo</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.ofertaDescripcion} numberOfLines={2}>
          {perfil.experiencia}
        </Text>

        <View style={styles.ofertaDetalles}>
          {perfil.disponibilidad && (
            <View style={styles.detalleChip}>
              <IconSymbol 
                ios_icon_name="clock.fill" 
                android_material_icon_name="schedule" 
                size={14} 
                color={colors.primary} 
              />
              <Text style={styles.detalleTexto}>{perfil.disponibilidad}</Text>
            </View>
          )}
          {perfil.provincia && (
            <View style={styles.detalleChip}>
              <IconSymbol 
                ios_icon_name="mappin.circle.fill" 
                android_material_icon_name="location_on" 
                size={14} 
                color={colors.primary} 
              />
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
          {isOwnProfile ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.aplicarButton, { marginRight: 8 }]}
                onPress={() => handleEditarPerfil(perfil.id)}
              >
                <Text style={styles.aplicarTexto}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.aplicarButton, styles.deleteButton]}
                onPress={() => handleEliminarPerfil(perfil.id)}
              >
                <Text style={styles.aplicarTexto}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          ) : isPropietarioMode && perfil.usuario_id && (
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

  const canCreateOffer = isPropietarioMode && (userRole === 'propietario' || userRole === 'admin');
  const canCreateProfile = !isPropietarioMode || userRole === 'cliente';

  // ✅ ANDROID HEADER SCROLL BEHAVIOR v94.0: Header content component
  const HeaderContent = () => (
    <React.Fragment>
      <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Bolsa de Trabajo</Text>

      <View style={styles.searchContainer}>
        <IconSymbol 
          ios_icon_name="magnifyingglass" 
          android_material_icon_name="search" 
          size={20} 
          color={colors.white} 
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar ofertas o profesionales..."
          placeholderTextColor="rgba(255, 255, 255, 0.7)"
          value={busqueda}
          onChangeText={setBusqueda}
        />
        <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
          <IconSymbol 
            ios_icon_name="slider.horizontal.3" 
            android_material_icon_name="tune" 
            size={20} 
            color={colors.white} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tabActual === 'ofertas' && styles.tabActive]}
          onPress={() => setTabActual('ofertas')}
        >
          <Text
            style={[
              styles.tabText,
              tabActual === 'ofertas' && styles.tabTextActive,
            ]}
          >
            Ofertas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tabActual === 'profesionales' && styles.tabActive]}
          onPress={() => setTabActual('profesionales')}
        >
          <Text
            style={[
              styles.tabText,
              tabActual === 'profesionales' && styles.tabTextActive,
            ]}
          >
            Profesionales
          </Text>
        </TouchableOpacity>
      </View>
    </React.Fragment>
  );

  return (
    <View style={commonStyles.container}>
      {/* ✅ ANDROID HEADER SCROLL BEHAVIOR v94.0: Animated header for Android */}
      {Platform.OS === 'android' ? (
        <Animated.View
          style={[
            styles.headerContainer,
            {
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.headerGradientStart, colors.headerGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={commonStyles.headerGradient}
          >
            <HeaderContent />
          </LinearGradient>
        </Animated.View>
      ) : (
        // iOS: Static header (no animation)
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <HeaderContent />
        </LinearGradient>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <Animated.ScrollView
          style={[
            styles.content,
            Platform.OS === 'android' && { marginTop: HEADER_MAX_HEIGHT },
          ]}
          contentContainerStyle={styles.ofertasContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onScroll={Platform.OS === 'android' ? handleScroll : undefined}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {tabActual === 'ofertas' ? (
            ofertasFiltradas.length > 0 ? (
              ofertasFiltradas.map(renderOferta)
            ) : (
              <View style={styles.emptyState}>
                <IconSymbol 
                  ios_icon_name="briefcase.fill" 
                  android_material_icon_name="work" 
                  size={64} 
                  color={colors.textSecondary} 
                />
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
                <IconSymbol 
                  ios_icon_name="person.2.fill" 
                  android_material_icon_name="people" 
                  size={64} 
                  color={colors.textSecondary} 
                />
                <Text style={styles.emptyStateText}>
                  No hay perfiles profesionales disponibles
                </Text>
              </View>
            )
          )}

          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingMoreText}>Cargando más...</Text>
            </View>
          )}

          {!hasMoreOfertas && ofertasFiltradas.length > 0 && tabActual === 'ofertas' && (
            <View style={styles.endOfListContainer}>
              <Text style={styles.endOfListText}>No hay más ofertas</Text>
            </View>
          )}
          {!hasMorePerfiles && perfilesFiltrados.length > 0 && tabActual === 'profesionales' && (
            <View style={styles.endOfListContainer}>
              <Text style={styles.endOfListText}>No hay más perfiles</Text>
            </View>
          )}
        </Animated.ScrollView>
      )}

      {((tabActual === 'ofertas' && canCreateOffer) || (tabActual === 'profesionales' && canCreateProfile)) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={tabActual === 'ofertas' ? handleCrearOferta : handleCrearPerfil}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.fabGradient}
          >
            <IconSymbol 
              ios_icon_name="plus" 
              android_material_icon_name="add" 
              size={28} 
              color={colors.white} 
            />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <Modal
        visible={mostrarFiltros}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMostrarFiltros(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalOverlayTouchable}
            onPress={() => setMostrarFiltros(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol 
                  ios_icon_name="xmark" 
                  android_material_icon_name="close" 
                  size={24} 
                  color={colors.text} 
                />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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

              {tabActual === 'ofertas' && (
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

      {/* Profile and Offer detail modals remain unchanged */}

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

export default function EmpleoScreen() {
  const { currentMode } = useMode();
  
  if (currentMode === 'cliente') {
    return <EmpleoContent />;
  }
  
  return (
    <PermissionGuard requireSocialProfile={true}>
      <EmpleoContent />
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  // ✅ ANDROID HEADER SCROLL BEHAVIOR v94.0
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabTextActive: {
    color: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  ofertasContainer: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  ofertaCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  ofertaImagen: {
    width: '100%',
    height: 160,
    backgroundColor: colors.cardBorder,
  },
  ofertaContent: {
    padding: 16,
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
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  perfilHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  perfilFoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBorder,
  },
  perfilFotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
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
  modalOverlayTouchable: {
    flex: 1,
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
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
