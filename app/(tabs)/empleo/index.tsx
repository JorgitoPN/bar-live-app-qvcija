
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

  const userRole = user?.rol_app || 'cliente';
  const isPropietarioMode = currentMode === 'propietario';

  const cargarOfertas = useCallback(async () => {
    try {
      console.log('[Empleo] Cargando ofertas...');
      const { data, error } = await supabase
        .from('ofertas_trabajo')
        .select(`
          *,
          local:locales(nombre),
          propietario:usuarios(nombre)
        `)
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[Empleo] Ofertas cargadas:', data?.length);
      setOfertas(data || []);
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

    // Solo propietarios pueden crear ofertas
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

    // Clientes pueden crear perfil profesional
    router.push('/crear/perfil-profesional');
  };

  const handleContactarPerfil = async (perfilId: string, usuarioId: string) => {
    if (!user) {
      setShowLoginModal(true);
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
        console.error('[Empleo] Error registrando interés:', interesError);
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
        console.error('[Empleo] Error creando notificación:', notifError);
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

  const renderOferta = (oferta: OfertaTrabajo) => {
    const diasPublicado = calcularDiasPublicado(oferta.created_at);

    return (
      <TouchableOpacity
        key={oferta.id}
        style={[styles.ofertaCard, commonStyles.cardShadow]}
        onPress={() => {
          // TODO: Navigate to job detail page
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
          // TODO: Navigate to profile detail page
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

  const canCreateOffer = isPropietarioMode && (userRole === 'propietario' || userRole === 'admin');
  const canCreateProfile = !isPropietarioMode || userRole === 'cliente';

  return (
    <View style={commonStyles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={commonStyles.headerGradient}
      >
        <Text style={[commonStyles.headerTitle, { color: colors.white }]}>Bolsa de Trabajo</Text>

        {/* Search */}
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

        {/* Tabs */}
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

      {/* Content */}
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

      {/* FAB - Create Offer/Profile */}
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

      {/* Modal de filtros */}
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

      {/* Login Required Modal */}
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
    padding: 16,
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
});
