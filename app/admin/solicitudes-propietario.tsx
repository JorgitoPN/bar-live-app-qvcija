
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface Solicitud {
  id: string;
  usuario_id: string;
  local_id?: string;
  nombre_local: string;
  direccion_local?: string;
  ciudad_local?: string;
  provincia_local?: string;
  codigo_postal_local?: string;
  telefono_contacto?: string;
  telefono_local?: string;
  email_contacto?: string;
  mensaje?: string;
  descripcion?: string;
  tipo_local?: string;
  latitud_local?: number;
  longitud_local?: number;
  horarios_local?: Record<string, any>;
  servicios_local?: string[];
  imagen_portada_url?: string;
  galeria_urls?: string[];
  documento_propiedad_url?: string;
  documento_propiedad_tipo?: string;
  estado: 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada';
  tipo_solicitud: 'reclamar_local' | 'nuevo_local';
  motivo_denegacion?: string;
  notas_admin?: string;
  created_at: string;
  usuario?: {
    nombre: string;
    email: string;
    avatar?: string;
    username?: string;
    rol_app?: string;
  };
}

/**
 * ✅ SOLICITUDES PROPIETARIO v56.0 - COMPACT REDESIGN
 * 
 * COMPLETE REDESIGN v56.0:
 * - ✅ Compact horizontal filter chips (no large sections)
 * - ✅ Streamlined card layout with better spacing
 * - ✅ Fixed document download/viewing functionality
 * - ✅ Improved visual hierarchy
 * - ✅ Better mobile UX with less scrolling
 */

export default function AdminSolicitudesPropietarioScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada'>('pendiente');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [actionType, setActionType] = useState<'aprobar' | 'denegar' | 'cambiar_estado' | null>(null);
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  const [notasAdmin, setNotasAdmin] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'en_revision' | 'informacion_adicional'>('en_revision');

  const loadSolicitudes = useCallback(async () => {
    try {
      console.log('[Solicitudes v56.0] Loading owner requests...');
      
      let query = supabase
        .from('solicitudes_propietario')
        .select(`
          *,
          usuario:usuarios!solicitudes_propietario_usuario_id_fkey (
            nombre,
            email,
            avatar,
            username,
            rol_app
          )
        `)
        .order('created_at', { ascending: false });

      if (filtro !== 'todas') {
        query = query.eq('estado', filtro);
      }

      if (searchQuery.trim()) {
        query = query.or(`nombre_local.ilike.%${searchQuery}%,direccion_local.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Solicitudes v56.0] Error loading requests:', error);
        throw error;
      }

      console.log('[Solicitudes v56.0] Loaded requests:', data?.length || 0);
      setSolicitudes(data || []);
    } catch (error) {
      console.error('[Solicitudes v56.0] Error:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro, searchQuery]);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSolicitudes();
  };

  const handleViewDetails = (solicitud: Solicitud) => {
    console.log('[Solicitudes v56.0] Navigating to details:', solicitud.id);
    router.push({
      pathname: '/admin/solicitud-detalle',
      params: { id: solicitud.id },
    });
  };

  const handleAprobar = async (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud);
    setActionType('aprobar');
    setShowActionModal(true);
  };

  const handleDenegar = async (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud);
    setActionType('denegar');
    setMotivoDenegacion('');
    setShowActionModal(true);
  };

  const handleCambiarEstado = async (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud);
    setActionType('cambiar_estado');
    setNotasAdmin('');
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedSolicitud) return;

    try {
      if (actionType === 'aprobar') {
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ estado: 'aprobada' })
          .eq('id', selectedSolicitud.id);

        if (updateError) throw updateError;

        const { error: roleError } = await supabase
          .from('usuarios')
          .update({ rol_app: 'propietario' })
          .eq('id', selectedSolicitud.usuario_id);

        if (roleError) throw roleError;

        if (selectedSolicitud.tipo_solicitud === 'reclamar_local' && selectedSolicitud.local_id) {
          const { data: localData } = await supabase
            .from('locales')
            .select('propietario_id')
            .eq('id', selectedSolicitud.local_id)
            .single();

          const previousOwnerId = localData?.propietario_id;

          if (previousOwnerId && previousOwnerId !== selectedSolicitud.usuario_id) {
            console.log('[Solicitudes v56.0] Resetting local profile due to ownership change...');
            
            const { data: resetResult, error: resetError } = await supabase
              .rpc('reset_local_profile', {
                p_local_id: selectedSolicitud.local_id,
                p_propietario_anterior_id: previousOwnerId,
                p_propietario_nuevo_id: selectedSolicitud.usuario_id,
              });

            if (resetError) {
              console.error('[Solicitudes v56.0] Error resetting profile:', resetError);
            } else {
              console.log('[Solicitudes v56.0] ✅ Profile reset:', resetResult);
            }
          }

          const { error: localError } = await supabase
            .from('locales')
            .update({ propietario_id: selectedSolicitud.usuario_id })
            .eq('id', selectedSolicitud.local_id);

          if (localError) throw localError;

          const { error: propError } = await supabase
            .from('propietarios_locales')
            .insert({
              propietario_id: selectedSolicitud.usuario_id,
              local_id: selectedSolicitud.local_id,
              rol: 'propietario',
            });

          if (propError && propError.code !== '23505') {
            throw propError;
          }
        } else if (selectedSolicitud.tipo_solicitud === 'nuevo_local') {
          const { data: newLocal, error: createError } = await supabase
            .from('locales')
            .insert({
              nombre: selectedSolicitud.nombre_local,
              tipo: selectedSolicitud.tipo_local,
              descripcion: selectedSolicitud.descripcion,
              direccion: selectedSolicitud.direccion_local,
              ciudad: selectedSolicitud.ciudad_local,
              provincia: selectedSolicitud.provincia_local,
              codigo_postal: selectedSolicitud.codigo_postal_local,
              telefono: selectedSolicitud.telefono_local,
              email: selectedSolicitud.email_contacto,
              latitud: selectedSolicitud.latitud_local,
              longitud: selectedSolicitud.longitud_local,
              horarios_completos: selectedSolicitud.horarios_local,
              servicios: selectedSolicitud.servicios_local,
              imagen_url: selectedSolicitud.imagen_portada_url,
              galeria_urls: selectedSolicitud.galeria_urls,
              propietario_id: selectedSolicitud.usuario_id,
              source_type: 'manual',
              estado_solicitud: 'aprobado',
              activo: true,
            })
            .select()
            .single();

          if (createError) throw createError;

          const { error: propError } = await supabase
            .from('propietarios_locales')
            .insert({
              propietario_id: selectedSolicitud.usuario_id,
              local_id: newLocal.id,
              rol: 'propietario',
            });

          if (propError && propError.code !== '23505') {
            throw propError;
          }

          console.log('[Solicitudes v56.0] ✅ New local created:', newLocal.id);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: selectedSolicitud.usuario_id,
          tipo: 'sistema',
          titulo: '🎉 Solicitud aprobada',
          mensaje: 'Tu solicitud para ser propietario ha sido aprobada. Ahora tienes acceso a todas las funcionalidades de propietario.',
        });

        Alert.alert('✅ Éxito', 'Solicitud aprobada correctamente. El usuario ha recibido una notificación.');
      } else if (actionType === 'denegar') {
        if (!motivoDenegacion.trim()) {
          Alert.alert('Error', 'Debes proporcionar un motivo de denegación');
          return;
        }

        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: 'denegada',
            motivo_denegacion: motivoDenegacion,
          })
          .eq('id', selectedSolicitud.id);

        if (updateError) throw updateError;

        await supabase.from('notificaciones').insert({
          usuario_id: selectedSolicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Solicitud denegada',
          mensaje: `Tu solicitud para ser propietario ha sido denegada. Motivo: ${motivoDenegacion}`,
        });

        Alert.alert('✅ Éxito', 'Solicitud denegada. El usuario ha recibido una notificación.');
      } else if (actionType === 'cambiar_estado') {
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: nuevoEstado,
            notas_admin: notasAdmin || null,
          })
          .eq('id', selectedSolicitud.id);

        if (updateError) throw updateError;

        const estadoTexto = nuevoEstado === 'en_revision' ? 'en revisión' : 'requiere información adicional';
        await supabase.from('notificaciones').insert({
          usuario_id: selectedSolicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Estado de solicitud actualizado',
          mensaje: `Tu solicitud está ahora ${estadoTexto}.${notasAdmin ? ' Nota: ' + notasAdmin : ''}`,
        });

        Alert.alert('✅ Éxito', 'Estado actualizado correctamente.');
      }

      setShowActionModal(false);
      setSelectedSolicitud(null);
      setActionType(null);
      setMotivoDenegacion('');
      setNotasAdmin('');
      loadSolicitudes();
    } catch (error) {
      console.error('[Solicitudes v56.0] Error executing action:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#F59E0B';
      case 'en_revision':
        return '#3B82F6';
      case 'informacion_adicional':
        return '#8B5CF6';
      case 'aprobada':
        return '#10B981';
      case 'denegada':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_revision':
        return 'Revisión';
      case 'informacion_adicional':
        return 'Info';
      case 'aprobada':
        return 'Aprobada';
      case 'denegada':
        return 'Denegada';
      default:
        return estado;
    }
  };

  const getTipoDocumentoLabel = (tipo?: string) => {
    switch (tipo) {
      case 'factura_luz':
        return 'Factura de Luz';
      case 'factura_agua':
        return 'Factura de Agua';
      case 'contrato_alquiler':
        return 'Contrato de Alquiler';
      case 'escritura':
        return 'Escritura de Propiedad';
      case 'licencia_actividad':
        return 'Licencia de Actividad';
      case 'otro':
        return 'Otro Documento';
      default:
        return 'Documento';
    }
  };

  const solicitudesFiltradas = filtro === 'todas' 
    ? solicitudes 
    : solicitudes.filter((s) => s.estado === filtro);

  const contadores = {
    pendiente: solicitudes.filter(s => s.estado === 'pendiente').length,
    en_revision: solicitudes.filter(s => s.estado === 'en_revision').length,
    informacion_adicional: solicitudes.filter(s => s.estado === 'informacion_adicional').length,
    aprobada: solicitudes.filter(s => s.estado === 'aprobada').length,
    denegada: solicitudes.filter(s => s.estado === 'denegada').length,
    todas: solicitudes.length,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Solicitudes</Text>
          <Text style={styles.headerSubtitle}>Gestión de propietarios</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Compact Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchContainer}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Compact Horizontal Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {[
          { key: 'pendiente', label: 'Pendientes', icon: 'schedule', count: contadores.pendiente },
          { key: 'en_revision', label: 'Revisión', icon: 'search', count: contadores.en_revision },
          { key: 'informacion_adicional', label: 'Info', icon: 'info', count: contadores.informacion_adicional },
          { key: 'aprobada', label: 'Aprobadas', icon: 'check_circle', count: contadores.aprobada },
          { key: 'denegada', label: 'Denegadas', icon: 'cancel', count: contadores.denegada },
          { key: 'todas', label: 'Todas', icon: 'list', count: contadores.todas },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip, 
              filtro === f.key && [styles.filterChipActive, { backgroundColor: getEstadoColor(f.key) }]
            ]}
            onPress={() => setFiltro(f.key as any)}
          >
            <IconSymbol 
              ios_icon_name={f.icon} 
              android_material_icon_name={f.icon} 
              size={14} 
              color={filtro === f.key ? '#fff' : colors.textSecondary} 
            />
            <Text style={[
              styles.filterChipText,
              filtro === f.key && styles.filterChipTextActive
            ]}>
              {f.label}
            </Text>
            <View style={[
              styles.filterChipBadge,
              filtro === f.key && styles.filterChipBadgeActive
            ]}>
              <Text style={[
                styles.filterChipBadgeText,
                filtro === f.key && styles.filterChipBadgeTextActive
              ]}>
                {f.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {solicitudesFiltradas.length > 0 ? (
            solicitudesFiltradas.map((solicitud) => (
              <View key={solicitud.id} style={styles.solicitudCard}>
                {/* Compact Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.userSection}>
                    {solicitud.usuario?.avatar ? (
                      <Image source={{ uri: solicitud.usuario.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={16} color={colors.white} />
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.nombre} numberOfLines={1}>{solicitud.usuario?.nombre || 'Usuario'}</Text>
                      {solicitud.usuario?.username && (
                        <Text style={styles.username} numberOfLines={1}>@{solicitud.usuario.username}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={[styles.estadoBadge, { backgroundColor: getEstadoColor(solicitud.estado) }]}>
                    <Text style={styles.estadoText}>{getEstadoLabel(solicitud.estado)}</Text>
                  </View>
                </View>

                {/* Local Info - Compact */}
                <View style={styles.localSection}>
                  <View style={styles.localHeader}>
                    <IconSymbol 
                      ios_icon_name="building.2.fill" 
                      android_material_icon_name="store" 
                      size={16} 
                      color={colors.primary} 
                    />
                    <Text style={styles.localTitle} numberOfLines={1}>{solicitud.nombre_local}</Text>
                    <View style={styles.tipoChip}>
                      <Text style={styles.tipoChipText}>
                        {solicitud.tipo_solicitud === 'reclamar_local' ? 'Reclamar' : 'Nuevo'}
                      </Text>
                    </View>
                  </View>
                  
                  {solicitud.direccion_local && (
                    <View style={styles.infoRow}>
                      <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={12} color={colors.textSecondary} />
                      <Text style={styles.infoText} numberOfLines={1}>{solicitud.direccion_local}</Text>
                    </View>
                  )}

                  {solicitud.documento_propiedad_url && (
                    <View style={styles.documentBadge}>
                      <IconSymbol ios_icon_name="doc.fill" android_material_icon_name="description" size={12} color="#10B981" />
                      <Text style={styles.documentBadgeText}>
                        {getTipoDocumentoLabel(solicitud.documento_propiedad_tipo)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Compact Footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.metadataText}>
                    {new Date(solicitud.created_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>

                  <TouchableOpacity 
                    style={styles.viewDetailsButton}
                    onPress={() => handleViewDetails(solicitud)}
                  >
                    <Text style={styles.viewDetailsButtonText}>Ver detalles</Text>
                    <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow_forward" size={12} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Compact Actions */}
                {(solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision' || solicitud.estado === 'informacion_adicional') && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.aprobarButton]}
                      onPress={() => handleAprobar(solicitud)}
                    >
                      <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cambiarEstadoButton]}
                      onPress={() => handleCambiarEstado(solicitud)}
                    >
                      <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Estado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rechazarButton]}
                      onPress={() => handleDenegar(solicitud)}
                    >
                      <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={14} color="#fff" />
                      <Text style={styles.actionButtonText}>Denegar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol 
                ios_icon_name="doc.text" 
                android_material_icon_name="description" 
                size={48} 
                color={colors.textSecondary} 
              />
              <Text style={styles.emptyText}>
                {filtro === 'todas' 
                  ? 'No hay solicitudes' 
                  : `No hay solicitudes ${getEstadoLabel(filtro).toLowerCase()}s`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'aprobar' && '✅ Aprobar'}
                {actionType === 'denegar' && '❌ Denegar'}
                {actionType === 'cambiar_estado' && '🔄 Cambiar Estado'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {actionType === 'aprobar' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  ¿Aprobar esta solicitud?
                </Text>
                <Text style={styles.modalSubtext}>
                  El usuario recibirá el rol de propietario.
                </Text>
              </View>
            )}

            {actionType === 'denegar' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>Motivo de denegación:</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ej: No se pudo verificar..."
                  placeholderTextColor={colors.textSecondary}
                  value={motivoDenegacion}
                  onChangeText={setMotivoDenegacion}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            {actionType === 'cambiar_estado' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>Nuevo estado:</Text>
                <View style={styles.estadoOptions}>
                  <TouchableOpacity
                    style={[
                      styles.estadoOption,
                      nuevoEstado === 'en_revision' && styles.estadoOptionActive,
                    ]}
                    onPress={() => setNuevoEstado('en_revision')}
                  >
                    <Text style={[
                      styles.estadoOptionText,
                      nuevoEstado === 'en_revision' && { color: '#3B82F6' }
                    ]}>
                      En Revisión
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.estadoOption,
                      nuevoEstado === 'informacion_adicional' && styles.estadoOptionActive,
                    ]}
                    onPress={() => setNuevoEstado('informacion_adicional')}
                  >
                    <Text style={[
                      styles.estadoOptionText,
                      nuevoEstado === 'informacion_adicional' && { color: '#8B5CF6' }
                    ]}>
                      Info. Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notas (opcional)..."
                  placeholderTextColor={colors.textSecondary}
                  value={notasAdmin}
                  onChangeText={setNotasAdmin}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={executeAction}
              >
                <Text style={styles.modalConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  searchBar: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  filtersContainer: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filtersContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipBadge: {
    backgroundColor: colors.cardBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  filterChipBadgeTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  solicitudCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder + '30',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary + '30',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  nombre: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  username: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  estadoBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  localSection: {
    gap: 6,
  },
  localHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  localTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  tipoChip: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tipoChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  documentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  documentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder + '30',
  },
  metadataText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  viewDetailsButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  aprobarButton: {
    backgroundColor: '#10B981',
  },
  cambiarEstadoButton: {
    backgroundColor: '#3B82F6',
  },
  rechazarButton: {
    backgroundColor: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    marginBottom: 20,
  },
  modalText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
  },
  modalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  estadoOptions: {
    gap: 10,
    marginBottom: 12,
  },
  estadoOption: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    padding: 12,
  },
  estadoOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  estadoOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.cardBorder,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
