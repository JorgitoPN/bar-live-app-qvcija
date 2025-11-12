
import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useMode } from '@/contexts/ModeContext';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

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
  'Murcia',
  'Palma',
  'Las Palmas',
  'Granada',
  'Córdoba',
  'Valladolid',
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

export default function EmpleoScreen() {
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

  const userRole = user?.rol_app || 'cliente';
  const isPropietarioMode = currentMode === 'propietario';

  const cargarOfertas = useCallback(async () => {
    try {
      console.log('[Empleo] Cargando ofertas...');
      
      const { data, error } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          local:locales(nombre, imagen_url, latitud, longitud),
          propietario:usuarios(nombre)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[Empleo] Ofertas cargadas:', data?.length);
      
      const ofertasConImagenes = (data || []).map(oferta => ({
        ...oferta,
        imagen_url: oferta.imagen_url || oferta.local?.imagen_url,
      }));
      
      setOfertas(ofertasConImagenes);
    } catch (error) {
      console.error('[Empleo] Error cargando ofertas:', error);
      Alert.alert('Error', 'No se pudieron cargar las ofertas de trabajo');
    }
  }, []);

  const cargarPerfiles = useCallback(async () => {
    try {
      console.log('[Empleo] Cargando perfiles profesionales...');
      
      const { data, error } = await supabase
        .from('perfiles_profesionales')
        .select(`
          *,
          usuario:usuarios(nombre, avatar, username)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[Empleo] Perfiles cargados:', data?.length);
      setPerfiles(data || []);
    } catch (error) {
      console.error('[Empleo] Error cargando perfiles:', error);
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
              console.error('[Empleo] Error eliminando perfil:', error);
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
      console.log('[Empleo] Contactando perfil:', perfilId, 'Usuario:', usuarioId);

      const { data: chatExistente, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(usuario1_id.eq.${user.id},usuario2_id.eq.${usuarioId}),and(usuario1_id.eq.${usuarioId},usuario2_id.eq.${user.id})`)
        .maybeSingle();

      if (chatError && chatError.code !== 'PGRST116') {
        console.error('[Empleo] Error buscando chat:', chatError);
        throw chatError;
      }

      let chatId = chatExistente?.id;

      if (!chatId) {
        console.log('[Empleo] Creando nuevo chat...');
        const { data: nuevoChat, error: nuevoChatError } = await supabase
          .from('chats')
          .insert({
            usuario1_id: user.id,
            usuario2_id: usuarioId,
          })
          .select()
          .single();

        if (nuevoChatError) {
          console.error('[Empleo] Error creando chat:', nuevoChatError);
          throw nuevoChatError;
        }
        chatId = nuevoChat.id;
        console.log('[Empleo] Chat creado:', chatId);
      } else {
        console.log('[Empleo] Chat existente encontrado:', chatId);
      }

      const { error: interesError } = await supabase
        .from('intereses_empleo')
        .insert({
          perfil_id: perfilId,
          propietario_id: user.id,
          estado: 'pendiente',
        });

      if (interesError && !interesError.message.includes('duplicate')) {
        console.error('[Empleo] Error registrando interés:', interesError);
      } else {
        console.log('[Empleo] Interés registrado correctamente');
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
        console.error('[Empleo] Error creando notificación:', notifError);
      } else {
        console.log('[Empleo] Notificación creada correctamente');
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
      console.error('[Empleo] Error contactando perfil:', error);
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
              <IconSymbol name="person.circle" size={40} color={colors.textSecondary} />
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

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Bolsa de Trabajo</Text>

        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ofertas o profesionales..."
            placeholderTextColor={colors.white}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          <TouchableOpacity onPress={() => setMostrarFiltros(true)}>
            <IconSymbol name="slider.horizontal.3" size={20} color={colors.white} />
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
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.ofertasContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {tabActual === 'ofertas' ? (
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
        </ScrollView>
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
            <IconSymbol name="plus" size={28} color={colors.white} />
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros</Text>
              <TouchableOpacity onPress={() => setMostrarFiltros(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
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

      <Modal
        visible={showProfileDetail}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfileDetail(false)}
      >
        {selectedProfile && (
          <View style={commonStyles.container}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.detailHeader}
            >
              <TouchableOpacity onPress={() => setShowProfileDetail(false)}>
                <IconSymbol name="chevron.left" size={24} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Perfil Profesional</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView style={styles.detailContent}>
              <View style={styles.detailProfileHeader}>
                {(selectedProfile.foto_url || selectedProfile.usuario?.avatar) ? (
                  <Image 
                    source={{ uri: selectedProfile.foto_url || selectedProfile.usuario?.avatar }} 
                    style={styles.detailProfilePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.detailProfilePhoto, styles.perfilFotoPlaceholder]}>
                    <IconSymbol name="person.circle" size={60} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={styles.detailProfileName}>{selectedProfile.nombre_completo}</Text>
                <Text style={styles.detailProfileJob}>{selectedProfile.puesto_deseado}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Experiencia</Text>
                <Text style={styles.detailSectionText}>{selectedProfile.experiencia}</Text>
              </View>

              {selectedProfile.habilidades && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Habilidades</Text>
                  <Text style={styles.detailSectionText}>{selectedProfile.habilidades}</Text>
                </View>
              )}

              {selectedProfile.disponibilidad && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Disponibilidad</Text>
                  <Text style={styles.detailSectionText}>{selectedProfile.disponibilidad}</Text>
                </View>
              )}

              {selectedProfile.provincia && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Provincia</Text>
                  <Text style={styles.detailSectionText}>{selectedProfile.provincia}</Text>
                </View>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>

            {user && selectedProfile.usuario_id === user.id ? (
              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.detailActionButton, styles.editButton]}
                  onPress={() => {
                    setShowProfileDetail(false);
                    handleEditarPerfil(selectedProfile.id);
                  }}
                >
                  <Text style={styles.detailActionButtonText}>Editar Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.detailActionButton, styles.deleteButton]}
                  onPress={() => handleEliminarPerfil(selectedProfile.id)}
                >
                  <Text style={styles.detailActionButtonText}>Eliminar Perfil</Text>
                </TouchableOpacity>
              </View>
            ) : isPropietarioMode && selectedProfile.usuario_id && (
              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={styles.detailActionButton}
                  onPress={() => {
                    setShowProfileDetail(false);
                    handleContactarPerfil(selectedProfile.id, selectedProfile.usuario_id!);
                  }}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.secondary]}
                    style={styles.detailActionButtonGradient}
                  >
                    <Text style={[styles.detailActionButtonText, { color: colors.white }]}>
                      Contactar Profesional
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </Modal>

      <Modal
        visible={showOfferDetail}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowOfferDetail(false)}
      >
        {selectedOffer && (
          <View style={commonStyles.container}>
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.detailHeader}
            >
              <TouchableOpacity onPress={() => setShowOfferDetail(false)}>
                <IconSymbol name="chevron.left" size={24} color={colors.white} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Oferta de Trabajo</Text>
              <View style={{ width: 24 }} />
            </LinearGradient>

            <ScrollView style={styles.detailContent}>
              {selectedOffer.imagen_url && (
                <Image 
                  source={{ uri: selectedOffer.imagen_url }} 
                  style={styles.detailOfferImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.detailOfferHeader}>
                <Text style={styles.detailOfferTitle}>{selectedOffer.titulo}</Text>
                <Text style={styles.detailOfferLocal}>
                  {selectedOffer.local?.nombre || selectedOffer.propietario?.nombre || 'Local'}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Descripción</Text>
                <Text style={styles.detailSectionText}>{selectedOffer.descripcion}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Tipo de Contrato</Text>
                <Text style={styles.detailSectionText}>{selectedOffer.tipo}</Text>
              </View>

              {selectedOffer.salario && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Salario</Text>
                  <Text style={styles.detailSectionText}>{selectedOffer.salario}</Text>
                </View>
              )}

              {selectedOffer.requisitos && selectedOffer.requisitos.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Requisitos</Text>
                  {selectedOffer.requisitos.map((requisito, index) => (
                    <Text key={index} style={styles.detailListItem}>
                      - {requisito}
                    </Text>
                  ))}
                </View>
              )}

              {selectedOffer.provincia && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Provincia</Text>
                  <Text style={styles.detailSectionText}>{selectedOffer.provincia}</Text>
                </View>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.detailActions}>
              <TouchableOpacity 
                style={styles.detailActionButton}
                onPress={() => setShowOfferDetail(false)}
              >
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  style={styles.detailActionButtonGradient}
                >
                  <Text style={[styles.detailActionButtonText, { color: colors.white }]}>
                    Aplicar a esta Oferta
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  detailHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  detailContent: {
    flex: 1,
  },
  detailProfileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  detailProfilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  detailProfileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  detailProfileJob: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  detailSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  detailSectionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  detailListItem: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    marginLeft: 8,
  },
  detailActions: {
    padding: 16,
    paddingBottom: 34,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    flexDirection: 'row',
    gap: 12,
  },
  detailActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  editButton: {
    backgroundColor: colors.primary,
  },
  detailActionButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  detailActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  detailOfferImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
  },
  detailOfferHeader: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  detailOfferTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  detailOfferLocal: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
