
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
  telefono_contacto?: string;
  email_contacto?: string;
  mensaje?: string;
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
      console.log('[Solicitudes] Loading owner requests...');
      
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
        console.error('[Solicitudes] Error loading requests:', error);
        throw error;
      }

      console.log('[Solicitudes] Loaded requests:', data?.length || 0);
      setSolicitudes(data || []);
    } catch (error) {
      console.error('[Solicitudes] Error:', error);
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
        // Update request status
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ estado: 'aprobada' })
          .eq('id', selectedSolicitud.id);

        if (updateError) throw updateError;

        // Update user role to propietario
        const { error: roleError } = await supabase
          .from('usuarios')
          .update({ rol_app: 'propietario' })
          .eq('id', selectedSolicitud.usuario_id);

        if (roleError) throw roleError;

        // If claiming existing local, assign ownership
        if (selectedSolicitud.tipo_solicitud === 'reclamar_local' && selectedSolicitud.local_id) {
          // Check if local has previous owner
          const { data: localData } = await supabase
            .from('locales')
            .select('propietario_id')
            .eq('id', selectedSolicitud.local_id)
            .single();

          const previousOwnerId = localData?.propietario_id;

          // If there was a previous owner, reset the profile
          if (previousOwnerId && previousOwnerId !== selectedSolicitud.usuario_id) {
            console.log('[Solicitudes] Resetting local profile due to ownership change...');
            
            const { data: resetResult, error: resetError } = await supabase
              .rpc('reset_local_profile', {
                p_local_id: selectedSolicitud.local_id,
                p_propietario_anterior_id: previousOwnerId,
                p_propietario_nuevo_id: selectedSolicitud.usuario_id,
              });

            if (resetError) {
              console.error('[Solicitudes] Error resetting profile:', resetError);
            } else {
              console.log('[Solicitudes] ✅ Profile reset:', resetResult);
            }
          }

          // Update local owner
          const { error: localError } = await supabase
            .from('locales')
            .update({ propietario_id: selectedSolicitud.usuario_id })
            .eq('id', selectedSolicitud.local_id);

          if (localError) throw localError;

          // Create propietarios_locales entry
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
        }

        // Create approval notification
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

        // Update request status
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: 'denegada',
            motivo_denegacion: motivoDenegacion,
          })
          .eq('id', selectedSolicitud.id);

        if (updateError) throw updateError;

        // Create denial notification
        await supabase.from('notificaciones').insert({
          usuario_id: selectedSolicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Solicitud denegada',
          mensaje: `Tu solicitud para ser propietario ha sido denegada. Motivo: ${motivoDenegacion}`,
        });

        Alert.alert('✅ Éxito', 'Solicitud denegada. El usuario ha recibido una notificación.');
      } else if (actionType === 'cambiar_estado') {
        // Update request status
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: nuevoEstado,
            notas_admin: notasAdmin || null,
          })
          .eq('id', selectedSolicitud.id);

        if (updateError) throw updateError;

        // Create notification
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
      console.error('[Solicitudes] Error executing action:', error);
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

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'clock.fill';
      case 'en_revision':
        return 'eye.fill';
      case 'informacion_adicional':
        return 'doc.text.fill';
      case 'aprobada':
        return 'checkmark.circle.fill';
      case 'denegada':
        return 'xmark.circle.fill';
      default:
        return 'questionmark.circle.fill';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente';
      case 'en_revision':
        return 'En Revisión';
      case 'informacion_adicional':
        return 'Info. Adicional';
      case 'aprobada':
        return 'Aprobada';
      case 'denegada':
        return 'Denegada';
      default:
        return estado;
    }
  };

  const solicitudesFiltradas = filtro === 'todas' 
    ? solicitudes 
    : solicitudes.filter((s) => s.estado === filtro);

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
          <Text style={styles.headerTitle}>Solicitudes de Propietario</Text>
          <Text style={styles.headerSubtitle}>Gestiona las solicitudes de acceso</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <IconSymbol ios_icon_name="magnifyingglass" android_material_icon_name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre de local..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {[
          { key: 'pendiente', label: 'Pendientes', icon: 'clock.fill', color: '#F59E0B' },
          { key: 'en_revision', label: 'En Revisión', icon: 'eye.fill', color: '#3B82F6' },
          { key: 'informacion_adicional', label: 'Info. Adicional', icon: 'doc.text.fill', color: '#8B5CF6' },
          { key: 'aprobada', label: 'Aprobadas', icon: 'checkmark.circle.fill', color: '#10B981' },
          { key: 'denegada', label: 'Denegadas', icon: 'xmark.circle.fill', color: '#EF4444' },
          { key: 'todas', label: 'Todas', icon: 'list.bullet', color: colors.primary },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton, 
              filtro === f.key && styles.filterButtonActive,
              filtro === f.key && { borderColor: f.color, backgroundColor: f.color + '15' }
            ]}
            onPress={() => setFiltro(f.key as any)}
          >
            <IconSymbol 
              ios_icon_name={f.icon as any} 
              android_material_icon_name={f.icon.replace('.', '_')} 
              size={16} 
              color={filtro === f.key ? f.color : colors.textSecondary} 
            />
            <Text
              style={[
                styles.filterButtonText,
                filtro === f.key && styles.filterButtonTextActive,
                filtro === f.key && { color: f.color }
              ]}
            >
              {f.label}
            </Text>
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
              <View
                key={solicitud.id}
                style={styles.solicitudCard}
              >
                <View style={styles.solicitudHeader}>
                  <View style={styles.userSection}>
                    {solicitud.usuario?.avatar ? (
                      <Image source={{ uri: solicitud.usuario.avatar }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={28} color={colors.white} />
                      </View>
                    )}
                    <View style={styles.userInfo}>
                      <Text style={styles.nombre}>{solicitud.usuario?.nombre || 'Usuario'}</Text>
                      {solicitud.usuario?.username && (
                        <Text style={styles.username}>@{solicitud.usuario.username}</Text>
                      )}
                      <Text style={styles.email}>{solicitud.usuario?.email || 'Sin email'}</Text>
                      {solicitud.usuario?.rol_app && (
                        <View style={styles.rolBadge}>
                          <Text style={styles.rolBadgeText}>Rol: {solicitud.usuario.rol_app}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View
                    style={[
                      styles.estadoBadge,
                      { backgroundColor: getEstadoColor(solicitud.estado) + '20' }
                    ]}
                  >
                    <IconSymbol 
                      ios_icon_name={getEstadoIcon(solicitud.estado) as any} 
                      android_material_icon_name="info" 
                      size={14} 
                      color={getEstadoColor(solicitud.estado)} 
                    />
                    <Text style={[styles.estadoText, { color: getEstadoColor(solicitud.estado) }]}>
                      {getEstadoLabel(solicitud.estado)}
                    </Text>
                  </View>
                </View>

                <View style={styles.localSection}>
                  <View style={styles.localSectionHeader}>
                    <IconSymbol 
                      ios_icon_name={solicitud.tipo_solicitud === 'reclamar_local' ? 'building.2.fill' : 'plus.circle.fill'} 
                      android_material_icon_name="store" 
                      size={18} 
                      color={colors.primary} 
                    />
                    <Text style={styles.localSectionTitle}>
                      {solicitud.tipo_solicitud === 'reclamar_local' ? 'Reclamar Local Existente' : 'Crear Nuevo Local'}
                    </Text>
                  </View>
                  
                  <View style={styles.localInfoRow}>
                    <Text style={styles.localInfoLabel}>Nombre:</Text>
                    <Text style={styles.localInfoValue}>{solicitud.nombre_local}</Text>
                  </View>
                  
                  {solicitud.direccion_local && (
                    <View style={styles.localInfoRow}>
                      <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={14} color={colors.textSecondary} />
                      <Text style={styles.localInfoValue}>{solicitud.direccion_local}</Text>
                    </View>
                  )}
                  
                  {solicitud.telefono_contacto && (
                    <View style={styles.localInfoRow}>
                      <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={14} color={colors.textSecondary} />
                      <Text style={styles.localInfoValue}>{solicitud.telefono_contacto}</Text>
                    </View>
                  )}

                  {solicitud.email_contacto && (
                    <View style={styles.localInfoRow}>
                      <IconSymbol ios_icon_name="envelope.fill" android_material_icon_name="email" size={14} color={colors.textSecondary} />
                      <Text style={styles.localInfoValue}>{solicitud.email_contacto}</Text>
                    </View>
                  )}
                </View>

                {solicitud.mensaje && (
                  <View style={styles.descripcionContainer}>
                    <Text style={styles.descripcionLabel}>Mensaje del usuario:</Text>
                    <Text style={styles.descripcionText}>{solicitud.mensaje}</Text>
                  </View>
                )}

                {solicitud.notas_admin && (
                  <View style={styles.notasAdminContainer}>
                    <Text style={styles.notasAdminLabel}>Notas del administrador:</Text>
                    <Text style={styles.notasAdminText}>{solicitud.notas_admin}</Text>
                  </View>
                )}

                {solicitud.motivo_denegacion && (
                  <View style={styles.motivoDenegacionContainer}>
                    <Text style={styles.motivoDenegacionLabel}>Motivo de denegación:</Text>
                    <Text style={styles.motivoDenegacionText}>{solicitud.motivo_denegacion}</Text>
                  </View>
                )}

                <View style={styles.metadataSection}>
                  <View style={styles.metadataItem}>
                    <IconSymbol ios_icon_name="calendar" android_material_icon_name="event" size={14} color={colors.textSecondary} />
                    <Text style={styles.metadataText}>
                      {new Date(solicitud.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                {(solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision' || solicitud.estado === 'informacion_adicional') && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.aprobarButton]}
                      onPress={() => handleAprobar(solicitud)}
                    >
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cambiarEstadoButton]}
                      onPress={() => handleCambiarEstado(solicitud)}
                    >
                      <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Estado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rechazarButton]}
                      onPress={() => handleDenegar(solicitud)}
                    >
                      <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Denegar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol 
                ios_icon_name={filtro === 'pendiente' ? 'clock' : 'doc.text'} 
                android_material_icon_name="description" 
                size={64} 
                color={colors.textSecondary} 
              />
              <Text style={styles.emptyText}>
                {filtro === 'todas' 
                  ? 'No hay solicitudes' 
                  : `No hay solicitudes ${getEstadoLabel(filtro).toLowerCase()}s`}
              </Text>
              <Text style={styles.emptySubtext}>
                {filtro === 'pendiente' 
                  ? 'Las nuevas solicitudes aparecerán aquí' 
                  : 'Cambia el filtro para ver otras solicitudes'}
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
                {actionType === 'aprobar' && '✅ Aprobar Solicitud'}
                {actionType === 'denegar' && '❌ Denegar Solicitud'}
                {actionType === 'cambiar_estado' && '🔄 Cambiar Estado'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {actionType === 'aprobar' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  ¿Estás seguro de que quieres aprobar esta solicitud?
                </Text>
                <Text style={styles.modalSubtext}>
                  El usuario recibirá el rol de propietario y una notificación de aprobación.
                </Text>
              </View>
            )}

            {actionType === 'denegar' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>
                  Proporciona un motivo de denegación:
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ej: No se pudo verificar la propiedad del local..."
                  placeholderTextColor={colors.textSecondary}
                  value={motivoDenegacion}
                  onChangeText={setMotivoDenegacion}
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}

            {actionType === 'cambiar_estado' && (
              <View style={styles.modalBody}>
                <Text style={styles.modalText}>Selecciona el nuevo estado:</Text>
                <View style={styles.estadoOptions}>
                  <TouchableOpacity
                    style={[
                      styles.estadoOption,
                      nuevoEstado === 'en_revision' && styles.estadoOptionActive,
                    ]}
                    onPress={() => setNuevoEstado('en_revision')}
                  >
                    <IconSymbol 
                      ios_icon_name="eye.fill" 
                      android_material_icon_name="visibility" 
                      size={20} 
                      color={nuevoEstado === 'en_revision' ? '#3B82F6' : colors.textSecondary} 
                    />
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
                    <IconSymbol 
                      ios_icon_name="doc.text.fill" 
                      android_material_icon_name="description" 
                      size={20} 
                      color={nuevoEstado === 'informacion_adicional' ? '#8B5CF6' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.estadoOptionText,
                      nuevoEstado === 'informacion_adicional' && { color: '#8B5CF6' }
                    ]}>
                      Información Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalText}>Notas (opcional):</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ej: Necesitamos verificar la documentación..."
                  placeholderTextColor={colors.textSecondary}
                  value={notasAdmin}
                  onChangeText={setNotasAdmin}
                  multiline
                  numberOfLines={3}
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
    paddingBottom: 20,
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
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.headerText,
    opacity: 0.9,
    marginTop: 2,
  },
  searchSection: {
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  filtersScroll: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filters: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  filterButtonActive: {
    borderWidth: 2,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
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
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...commonStyles.cardShadow,
  },
  solicitudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rolBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rolBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  localSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  localSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  localSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  localInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  localInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 70,
  },
  localInfoValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  descripcionContainer: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  descripcionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  descripcionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  notasAdminContainer: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#3B82F6' + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6' + '30',
  },
  notasAdminLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 8,
  },
  notasAdminText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  motivoDenegacionContainer: {
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#EF4444' + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444' + '30',
  },
  motivoDenegacionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
  },
  motivoDenegacionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  metadataSection: {
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
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
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 24,
  },
  modalSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  estadoOptions: {
    gap: 12,
    marginBottom: 16,
  },
  estadoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
  },
  estadoOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  estadoOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
