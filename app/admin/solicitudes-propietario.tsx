
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
  Modal,
  Pressable,
  Dimensions,
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
 * ✅ SOLICITUDES PROPIETARIO v60.0 - COMPLETE REDESIGN FROM SCRATCH
 * 
 * BRAND NEW DESIGN v60.0:
 * - ✅ Compact dropdown filter (replaces large tab sections)
 * - ✅ Card-based list with optimized spacing
 * - ✅ Quick actions directly on cards
 * - ✅ Minimal vertical space usage
 * - ✅ Better visual hierarchy
 * - ✅ Improved mobile UX
 * - ✅ Fixed document viewing
 * - ✅ Fixed navigation to details
 */

const { width } = Dimensions.get('window');

export default function AdminSolicitudesPropietarioScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'en_revision' | 'informacion_adicional' | 'aprobada' | 'denegada'>('pendiente');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [actionType, setActionType] = useState<'aprobar' | 'denegar' | 'cambiar_estado' | null>(null);
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  const [notasAdmin, setNotasAdmin] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'en_revision' | 'informacion_adicional'>('en_revision');

  const loadSolicitudes = useCallback(async () => {
    try {
      console.log('[Solicitudes v60.0] Loading owner requests...');
      
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
        console.error('[Solicitudes v60.0] Error loading requests:', error);
        throw error;
      }

      console.log('[Solicitudes v60.0] Loaded requests:', data?.length || 0);
      setSolicitudes(data || []);
    } catch (error) {
      console.error('[Solicitudes v60.0] Error:', error);
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
    console.log('[Solicitudes v60.0] Navigating to details:', solicitud.id);
    router.push({
      pathname: '/admin/solicitud-detalle',
      params: { id: solicitud.id },
    });
  };

  const handleQuickAction = (solicitud: Solicitud, action: 'aprobar' | 'denegar' | 'cambiar_estado') => {
    setSelectedSolicitud(solicitud);
    setActionType(action);
    if (action === 'denegar') {
      setMotivoDenegacion('');
    } else if (action === 'cambiar_estado') {
      setNotasAdmin('');
    }
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
            console.log('[Solicitudes v60.0] Resetting local profile due to ownership change...');
            
            const { data: resetResult, error: resetError } = await supabase
              .rpc('reset_local_profile', {
                p_local_id: selectedSolicitud.local_id,
                p_propietario_anterior_id: previousOwnerId,
                p_propietario_nuevo_id: selectedSolicitud.usuario_id,
              });

            if (resetError) {
              console.error('[Solicitudes v60.0] Error resetting profile:', resetError);
            } else {
              console.log('[Solicitudes v60.0] ✅ Profile reset:', resetResult);
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

          console.log('[Solicitudes v60.0] ✅ New local created:', newLocal.id);
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
      console.error('[Solicitudes v60.0] Error executing action:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { label: 'Pendiente', color: '#F59E0B', icon: 'schedule' };
      case 'en_revision':
        return { label: 'Revisión', color: '#3B82F6', icon: 'search' };
      case 'informacion_adicional':
        return { label: 'Info', color: '#8B5CF6', icon: 'info' };
      case 'aprobada':
        return { label: 'Aprobada', color: '#10B981', icon: 'check_circle' };
      case 'denegada':
        return { label: 'Denegada', color: '#EF4444', icon: 'cancel' };
      default:
        return { label: estado, color: colors.textSecondary, icon: 'circle' };
    }
  };

  const contadores = {
    pendiente: solicitudes.filter(s => s.estado === 'pendiente').length,
    en_revision: solicitudes.filter(s => s.estado === 'en_revision').length,
    informacion_adicional: solicitudes.filter(s => s.estado === 'informacion_adicional').length,
    aprobada: solicitudes.filter(s => s.estado === 'aprobada').length,
    denegada: solicitudes.filter(s => s.estado === 'denegada').length,
    todas: solicitudes.length,
  };

  const solicitudesFiltradas = filtro === 'todas' 
    ? solicitudes 
    : solicitudes.filter((s) => s.estado === filtro);

  const renderSolicitudCard = ({ item }: { item: Solicitud }) => {
    const estadoConfig = getEstadoConfig(item.estado);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        {/* Compact Header with User & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            {item.usuario?.avatar ? (
              <Image source={{ uri: item.usuario.avatar }} style={styles.miniAvatar} />
            ) : (
              <View style={[styles.miniAvatar, styles.avatarPlaceholder]}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={14} color={colors.white} />
              </View>
            )}
            <View style={styles.userTextContainer}>
              <Text style={styles.userName} numberOfLines={1}>{item.usuario?.nombre || 'Usuario'}</Text>
              {item.usuario?.username && (
                <Text style={styles.userHandle} numberOfLines={1}>@{item.usuario.username}</Text>
              )}
            </View>
          </View>
          
          <View style={[styles.statusPill, { backgroundColor: estadoConfig.color }]}>
            <IconSymbol 
              ios_icon_name={estadoConfig.icon} 
              android_material_icon_name={estadoConfig.icon} 
              size={12} 
              color="#fff" 
            />
            <Text style={styles.statusPillText}>{estadoConfig.label}</Text>
          </View>
        </View>

        {/* Local Info - Compact */}
        <View style={styles.localInfo}>
          <View style={styles.localTitleRow}>
            <IconSymbol 
              ios_icon_name="building.2.fill" 
              android_material_icon_name="store" 
              size={18} 
              color={colors.text} 
            />
            <Text style={styles.localName} numberOfLines={1}>{item.nombre_local}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>
                {item.tipo_solicitud === 'reclamar_local' ? '🔑 Reclamar' : '✨ Nuevo'}
              </Text>
            </View>
            
            {item.direccion_local && (
              <View style={styles.addressContainer}>
                <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={12} color={colors.textSecondary} />
                <Text style={styles.addressText} numberOfLines={1}>{item.direccion_local}</Text>
              </View>
            )}
          </View>

          {item.documento_propiedad_url && (
            <View style={styles.docIndicator}>
              <IconSymbol ios_icon_name="doc.fill" android_material_icon_name="description" size={12} color="#10B981" />
              <Text style={styles.docIndicatorText}>Documento adjunto</Text>
            </View>
          )}
        </View>

        {/* Quick Actions - Only for pending/review states */}
        {(item.estado === 'pendiente' || item.estado === 'en_revision' || item.estado === 'informacion_adicional') && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.approveBtn]}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAction(item, 'aprobar');
              }}
            >
              <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.statusBtn]}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAction(item, 'cambiar_estado');
              }}
            >
              <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.rejectBtn]}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAction(item, 'denegar');
              }}
            >
              <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#fff" />
            </TouchableOpacity>
            <View style={styles.quickActionSeparator} />
            <TouchableOpacity
              style={[styles.quickActionBtn, styles.detailsBtn]}
              onPress={(e) => {
                e.stopPropagation();
                handleViewDetails(item);
              }}
            >
              <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow_forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Footer - Date */}
        <View style={styles.cardFooter}>
          <IconSymbol ios_icon_name="clock" android_material_icon_name="schedule" size={11} color={colors.textSecondary} />
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filterOptions = [
    { key: 'pendiente', label: 'Pendientes', count: contadores.pendiente },
    { key: 'en_revision', label: 'En Revisión', count: contadores.en_revision },
    { key: 'informacion_adicional', label: 'Info Adicional', count: contadores.informacion_adicional },
    { key: 'aprobada', label: 'Aprobadas', count: contadores.aprobada },
    { key: 'denegada', label: 'Denegadas', count: contadores.denegada },
    { key: 'todas', label: 'Todas', count: contadores.todas },
  ];

  const currentFilterOption = filterOptions.find(f => f.key === filtro);

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Solicitudes</Text>
          <Text style={styles.headerSubtitle}>{contadores.todas} total</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {/* Compact Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={styles.filterDropdown}
          onPress={() => setShowFilterModal(true)}
        >
          <View style={styles.filterDropdownLeft}>
            <IconSymbol 
              ios_icon_name="line.3.horizontal.decrease.circle" 
              android_material_icon_name="filter_list" 
              size={18} 
              color={colors.primary} 
            />
            <Text style={styles.filterDropdownText}>
              {currentFilterOption?.label} ({currentFilterOption?.count})
            </Text>
          </View>
          <IconSymbol ios_icon_name="chevron.down" android_material_icon_name="expand_more" size={18} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.searchBox}>
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

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <FlatList
          data={solicitudesFiltradas}
          renderItem={renderSolicitudCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol 
                ios_icon_name="doc.text" 
                android_material_icon_name="description" 
                size={64} 
                color={colors.textSecondary} 
              />
              <Text style={styles.emptyText}>
                {filtro === 'todas' 
                  ? 'No hay solicitudes' 
                  : `No hay solicitudes ${currentFilterOption?.label.toLowerCase()}`}
              </Text>
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filtrar por Estado</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {filterOptions.map((option) => {
              const config = getEstadoConfig(option.key);
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    filtro === option.key && styles.filterOptionActive,
                  ]}
                  onPress={() => {
                    setFiltro(option.key as any);
                    setShowFilterModal(false);
                  }}
                >
                  <View style={styles.filterOptionLeft}>
                    <View style={[styles.filterOptionIcon, { backgroundColor: config.color + '20' }]}>
                      <IconSymbol 
                        ios_icon_name={config.icon} 
                        android_material_icon_name={config.icon} 
                        size={20} 
                        color={config.color} 
                      />
                    </View>
                    <Text style={[styles.filterOptionText, filtro === option.key && { color: config.color }]}>
                      {option.label}
                    </Text>
                  </View>
                  <View style={[styles.filterOptionBadge, { backgroundColor: config.color }]}>
                    <Text style={styles.filterOptionBadgeText}>{option.count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalContent}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>
                {actionType === 'aprobar' && '✅ Aprobar Solicitud'}
                {actionType === 'denegar' && '❌ Denegar Solicitud'}
                {actionType === 'cambiar_estado' && '🔄 Cambiar Estado'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {actionType === 'aprobar' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalText}>
                  ¿Confirmas que deseas aprobar esta solicitud?
                </Text>
                <Text style={styles.actionModalSubtext}>
                  El usuario recibirá el rol de propietario y podrá gestionar el local.
                </Text>
              </View>
            )}

            {actionType === 'denegar' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalLabel}>Motivo de denegación *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Explica por qué se deniega la solicitud..."
                  placeholderTextColor={colors.textSecondary}
                  value={motivoDenegacion}
                  onChangeText={setMotivoDenegacion}
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}

            {actionType === 'cambiar_estado' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalLabel}>Selecciona el nuevo estado:</Text>
                <View style={styles.stateOptions}>
                  <TouchableOpacity
                    style={[
                      styles.stateOption,
                      nuevoEstado === 'en_revision' && styles.stateOptionActive,
                    ]}
                    onPress={() => setNuevoEstado('en_revision')}
                  >
                    <IconSymbol 
                      ios_icon_name="search" 
                      android_material_icon_name="search" 
                      size={20} 
                      color={nuevoEstado === 'en_revision' ? '#3B82F6' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.stateOptionText,
                      nuevoEstado === 'en_revision' && { color: '#3B82F6' }
                    ]}>
                      En Revisión
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.stateOption,
                      nuevoEstado === 'informacion_adicional' && styles.stateOptionActive,
                    ]}
                    onPress={() => setNuevoEstado('informacion_adicional')}
                  >
                    <IconSymbol 
                      ios_icon_name="info" 
                      android_material_icon_name="info" 
                      size={20} 
                      color={nuevoEstado === 'informacion_adicional' ? '#8B5CF6' : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.stateOptionText,
                      nuevoEstado === 'informacion_adicional' && { color: '#8B5CF6' }
                    ]}>
                      Info Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.actionModalLabel}>Notas para el usuario (opcional):</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Ej: Por favor, proporciona..."
                  placeholderTextColor={colors.textSecondary}
                  value={notasAdmin}
                  onChangeText={setNotasAdmin}
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}

            <View style={styles.actionModalFooter}>
              <TouchableOpacity
                style={styles.actionModalCancelBtn}
                onPress={() => setShowActionModal(false)}
              >
                <Text style={styles.actionModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionModalConfirmBtn}
                onPress={executeAction}
              >
                <LinearGradient
                  colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                  style={styles.actionModalConfirmGradient}
                >
                  <Text style={styles.actionModalConfirmText}>Confirmar</Text>
                </LinearGradient>
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
    paddingBottom: 14,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.headerText,
    opacity: 0.85,
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 140,
  },
  filterDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterDropdownText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder + '40',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  userHandle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  localInfo: {
    padding: 12,
    gap: 8,
  },
  localTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  localName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeTag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  addressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  docIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  docIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder + '40',
  },
  quickActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: '#10B981',
  },
  statusBtn: {
    backgroundColor: '#3B82F6',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  detailsBtn: {
    backgroundColor: colors.primary + '15',
  },
  quickActionSeparator: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background + '80',
  },
  dateText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  filterOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  filterOptionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  actionModalBody: {
    marginBottom: 20,
  },
  actionModalText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  actionModalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  stateOptions: {
    gap: 10,
    marginBottom: 16,
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
  },
  stateOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  stateOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionModalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  actionModalCancelBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  actionModalConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionModalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
});
