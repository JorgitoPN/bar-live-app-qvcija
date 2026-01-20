
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import SimpleImageViewer from '@/components/propiedad/SimpleImageViewer';

/**
 * ✅ SISTEMA COMPLETAMENTE NUEVO v2.0 - DETALLE DE SOLICITUD
 * 
 * Sistema reconstruido desde cero:
 * - Usa el nuevo componente SimpleImageViewer
 * - Código limpio sin dependencias del sistema anterior
 * - Visualización garantizada de imágenes
 * - Logs detallados para debugging
 * - Eliminación automática de imágenes
 */

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
  tipos_local_multiple?: string[];
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
  };
}

export default function SolicitudDetalleScreenV2() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const solicitudId = params.id as string;

  const [solicitud, setSolicitud] = useState<Solicitud | null>(null);
  const [loading, setLoading] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'aprobar' | 'denegar' | 'cambiar_estado' | null>(null);
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  const [notasAdmin, setNotasAdmin] = useState('');
  const [nuevoEstado, setNuevoEstado] = useState<'en_revision' | 'informacion_adicional'>('en_revision');

  console.log('[SolicitudDetalleV2] 🎬 Pantalla inicializada');
  console.log('[SolicitudDetalleV2] 📋 ID de solicitud:', solicitudId);

  const loadSolicitud = useCallback(async () => {
    try {
      console.log('[SolicitudDetalleV2] 📥 Cargando solicitud...');
      
      const { data, error } = await supabase
        .from('solicitudes_propietario')
        .select(`
          *,
          usuario:usuarios!solicitudes_propietario_usuario_id_fkey (
            nombre,
            email,
            avatar,
            username
          )
        `)
        .eq('id', solicitudId)
        .single();

      if (error) {
        console.error('[SolicitudDetalleV2] ❌ Error:', error);
        throw error;
      }

      console.log('[SolicitudDetalleV2] ✅ Solicitud cargada:', data.nombre_local);
      console.log('[SolicitudDetalleV2] 📄 Documento:', data.documento_propiedad_url ? 'Sí' : 'No');
      console.log('[SolicitudDetalleV2] 🖼️ Portada:', data.imagen_portada_url ? 'Sí' : 'No');
      console.log('[SolicitudDetalleV2] 🖼️ Galería:', data.galeria_urls?.length || 0);
      
      setSolicitud(data);
    } catch (error) {
      console.error('[SolicitudDetalleV2] ❌ Error:', error);
      Alert.alert('Error', 'No se pudo cargar la solicitud');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [solicitudId, router]);

  useEffect(() => {
    loadSolicitud();
  }, [loadSolicitud]);

  /**
   * ✅ NUEVO: Función simple para eliminar imágenes de Supabase Storage
   */
  const deleteImagesFromStorage = async (imageUrls: string[]) => {
    console.log('[SolicitudDetalleV2] 🗑️ Eliminando', imageUrls.length, 'imágenes');
    
    for (const url of imageUrls) {
      if (!url || typeof url !== 'string') continue;
      
      try {
        console.log('[SolicitudDetalleV2] 🗑️ Procesando:', url.substring(0, 60) + '...');
        
        let filePath = url;
        let bucket = 'documentos-propiedad';
        
        // Extraer path de URL completa
        if (url.includes('/storage/v1/object/public/')) {
          const parts = url.split('/storage/v1/object/public/');
          if (parts.length > 1) {
            const pathWithBucket = parts[1];
            const pathParts = pathWithBucket.split('/');
            
            if (pathParts[0] === 'locales') {
              bucket = 'locales';
            } else if (pathParts[0] === 'documentos-propiedad') {
              bucket = 'documentos-propiedad';
            }
            
            pathParts.shift();
            filePath = pathParts.join('/');
          }
        }
        
        filePath = filePath.replace(/^\/+/, '');
        
        console.log('[SolicitudDetalleV2] 🗑️ Bucket:', bucket, '| Path:', filePath);
        
        const { error } = await supabase.storage
          .from(bucket)
          .remove([filePath]);
        
        if (error) {
          console.error('[SolicitudDetalleV2] ❌ Error eliminando:', error);
        } else {
          console.log('[SolicitudDetalleV2] ✅ Imagen eliminada');
        }
      } catch (error) {
        console.error('[SolicitudDetalleV2] ❌ Error:', error);
      }
    }
    
    console.log('[SolicitudDetalleV2] ✅ Eliminación completada');
  };

  const executeAction = async () => {
    if (!solicitud) return;

    try {
      if (actionType === 'aprobar') {
        console.log('[SolicitudDetalleV2] ✅ Aprobando solicitud...');
        
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ estado: 'aprobada' })
          .eq('id', solicitud.id);

        if (updateError) throw updateError;

        const { error: roleError } = await supabase
          .from('usuarios')
          .update({ rol_app: 'propietario' })
          .eq('id', solicitud.usuario_id);

        if (roleError) throw roleError;

        if (solicitud.tipo_solicitud === 'reclamar_local' && solicitud.local_id) {
          const { error: localError } = await supabase
            .from('locales')
            .update({ propietario_id: solicitud.usuario_id })
            .eq('id', solicitud.local_id);

          if (localError) throw localError;

          const { error: propError } = await supabase
            .from('propietarios_locales')
            .insert({
              propietario_id: solicitud.usuario_id,
              local_id: solicitud.local_id,
              rol: 'propietario',
            });

          if (propError && propError.code !== '23505') {
            throw propError;
          }
        } else if (solicitud.tipo_solicitud === 'nuevo_local') {
          const { data: newLocal, error: createError } = await supabase
            .from('locales')
            .insert({
              nombre: solicitud.nombre_local,
              tipo: solicitud.tipo_local,
              descripcion: solicitud.descripcion,
              direccion: solicitud.direccion_local,
              ciudad: solicitud.ciudad_local,
              provincia: solicitud.provincia_local,
              codigo_postal: solicitud.codigo_postal_local,
              telefono: solicitud.telefono_local,
              email: solicitud.email_contacto,
              latitud: solicitud.latitud_local,
              longitud: solicitud.longitud_local,
              horarios_completos: solicitud.horarios_local,
              servicios: solicitud.servicios_local,
              imagen_url: solicitud.imagen_portada_url,
              galeria_urls: solicitud.galeria_urls,
              propietario_id: solicitud.usuario_id,
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
              propietario_id: solicitud.usuario_id,
              local_id: newLocal.id,
              rol: 'propietario',
            });

          if (propError && propError.code !== '23505') {
            throw propError;
          }
        }

        // Eliminar imágenes
        const imagesToDelete: string[] = [];
        if (solicitud.documento_propiedad_url) imagesToDelete.push(solicitud.documento_propiedad_url);
        if (solicitud.imagen_portada_url) imagesToDelete.push(solicitud.imagen_portada_url);
        if (solicitud.galeria_urls) imagesToDelete.push(...solicitud.galeria_urls);
        
        if (imagesToDelete.length > 0) {
          await deleteImagesFromStorage(imagesToDelete);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: solicitud.usuario_id,
          tipo: 'sistema',
          titulo: '🎉 Solicitud aprobada',
          mensaje: 'Tu solicitud ha sido aprobada.',
        });

        Alert.alert('✅ Éxito', 'Solicitud aprobada', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else if (actionType === 'denegar') {
        if (!motivoDenegacion.trim()) {
          Alert.alert('Error', 'Debes proporcionar un motivo');
          return;
        }

        console.log('[SolicitudDetalleV2] ❌ Denegando solicitud...');

        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: 'denegada',
            motivo_denegacion: motivoDenegacion,
          })
          .eq('id', solicitud.id);

        if (updateError) throw updateError;

        // Eliminar imágenes
        const imagesToDelete: string[] = [];
        if (solicitud.documento_propiedad_url) imagesToDelete.push(solicitud.documento_propiedad_url);
        if (solicitud.imagen_portada_url) imagesToDelete.push(solicitud.imagen_portada_url);
        if (solicitud.galeria_urls) imagesToDelete.push(...solicitud.galeria_urls);
        
        if (imagesToDelete.length > 0) {
          await deleteImagesFromStorage(imagesToDelete);
        }

        await supabase.from('notificaciones').insert({
          usuario_id: solicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Solicitud denegada',
          mensaje: `Motivo: ${motivoDenegacion}`,
        });

        Alert.alert('✅ Éxito', 'Solicitud denegada', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else if (actionType === 'cambiar_estado') {
        const { error: updateError } = await supabase
          .from('solicitudes_propietario')
          .update({ 
            estado: nuevoEstado,
            notas_admin: notasAdmin || null,
          })
          .eq('id', solicitud.id);

        if (updateError) throw updateError;

        await supabase.from('notificaciones').insert({
          usuario_id: solicitud.usuario_id,
          tipo: 'sistema',
          titulo: 'Estado actualizado',
          mensaje: `Tu solicitud está ${nuevoEstado === 'en_revision' ? 'en revisión' : 'requiere información adicional'}.`,
        });

        Alert.alert('✅ Éxito', 'Estado actualizado', [
          { text: 'OK', onPress: () => loadSolicitud() }
        ]);
      }

      setShowActionModal(false);
      setActionType(null);
      setMotivoDenegacion('');
      setNotasAdmin('');
    } catch (error) {
      console.error('[SolicitudDetalleV2] ❌ Error:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    }
  };

  const getEstadoConfig = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return { label: 'Pendiente', color: '#F59E0B', icon: 'schedule' };
      case 'en_revision':
        return { label: 'En Revisión', color: '#3B82F6', icon: 'search' };
      case 'informacion_adicional':
        return { label: 'Info Adicional', color: '#8B5CF6', icon: 'info' };
      case 'aprobada':
        return { label: 'Aprobada', color: '#10B981', icon: 'check_circle' };
      case 'denegada':
        return { label: 'Denegada', color: '#EF4444', icon: 'cancel' };
      default:
        return { label: estado, color: colors.textSecondary, icon: 'circle' };
    }
  };

  const getTipoDocumentoLabel = (tipo?: string) => {
    switch (tipo) {
      case 'factura_luz': return 'Factura de Luz';
      case 'factura_agua': return 'Factura de Agua';
      case 'contrato_alquiler': return 'Contrato de Alquiler';
      case 'escritura': return 'Escritura de Propiedad';
      case 'licencia_actividad': return 'Licencia de Actividad';
      case 'otro': return 'Otro Documento';
      default: return 'Documento';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando solicitud...</Text>
      </View>
    );
  }

  if (!solicitud) {
    return null;
  }

  const estadoConfig = getEstadoConfig(solicitud.estado);
  
  /**
   * ✅ NUEVO: Preparar array de imágenes para el visor
   */
  const allImages: string[] = [];
  
  if (solicitud.documento_propiedad_url) {
    console.log('[SolicitudDetalleV2] 📄 Añadiendo documento');
    allImages.push(solicitud.documento_propiedad_url);
  }
  
  if (solicitud.imagen_portada_url) {
    console.log('[SolicitudDetalleV2] 🖼️ Añadiendo portada');
    allImages.push(solicitud.imagen_portada_url);
  }
  
  if (solicitud.galeria_urls && Array.isArray(solicitud.galeria_urls)) {
    console.log('[SolicitudDetalleV2] 🖼️ Añadiendo galería:', solicitud.galeria_urls.length);
    allImages.push(...solicitud.galeria_urls);
  }

  console.log('[SolicitudDetalleV2] ✅ Total de imágenes:', allImages.length);

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
          <Text style={styles.headerTitle}>Detalles</Text>
          <Text style={styles.headerSubtitle}>
            {solicitud.tipo_solicitud === 'reclamar_local' ? 'Reclamar Local' : 'Nuevo Local'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: estadoConfig.color }]}>
          <IconSymbol 
            ios_icon_name={estadoConfig.icon} 
            android_material_icon_name={estadoConfig.icon} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.statusBannerText}>{estadoConfig.label}</Text>
        </View>

        {/* User */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Solicitante</Text>
          <View style={styles.userCard}>
            {solicitud.usuario?.avatar ? (
              <Image source={{ uri: solicitud.usuario.avatar }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.avatarPlaceholder]}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={28} color="#fff" />
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{solicitud.usuario?.nombre || 'Usuario'}</Text>
              {solicitud.usuario?.username && (
                <Text style={styles.userUsername}>@{solicitud.usuario.username}</Text>
              )}
              <TouchableOpacity 
                onPress={() => Linking.openURL(`mailto:${solicitud.usuario?.email}`)}
              >
                <Text style={styles.userEmail}>{solicitud.usuario?.email}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Local Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏪 Información del Local</Text>
          <View style={styles.localCard}>
            <Text style={styles.localName}>{solicitud.nombre_local}</Text>

            {solicitud.tipo_local && (
              <View style={styles.detailRow}>
                <IconSymbol ios_icon_name="tag.fill" android_material_icon_name="label" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{solicitud.tipo_local}</Text>
              </View>
            )}

            {solicitud.direccion_local && (
              <View style={styles.detailRow}>
                <IconSymbol ios_icon_name="mappin" android_material_icon_name="location_on" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>{solicitud.direccion_local}</Text>
              </View>
            )}

            {solicitud.ciudad_local && (
              <View style={styles.detailRow}>
                <IconSymbol ios_icon_name="building.2" android_material_icon_name="location_city" size={16} color={colors.textSecondary} />
                <Text style={styles.detailText}>
                  {solicitud.ciudad_local}, {solicitud.provincia_local}
                </Text>
              </View>
            )}

            {solicitud.telefono_contacto && (
              <TouchableOpacity 
                style={styles.detailRow}
                onPress={() => Linking.openURL(`tel:${solicitud.telefono_contacto}`)}
              >
                <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={16} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.primary }]}>{solicitud.telefono_contacto}</Text>
              </TouchableOpacity>
            )}

            {solicitud.mensaje && (
              <View style={styles.messageBox}>
                <Text style={styles.messageBoxLabel}>💬 Mensaje:</Text>
                <Text style={styles.messageBoxText}>{solicitud.mensaje}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ✅ NUEVO: Visor simple de imágenes */}
        {allImages.length > 0 && (
          <View style={styles.section}>
            <SimpleImageViewer
              images={allImages}
              title="🖼️ Imágenes"
              subtitle="Documento, portada y galería"
            />
          </View>
        )}

        {/* Map */}
        {solicitud.latitud_local && solicitud.longitud_local && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Ubicación</Text>
            <TouchableOpacity 
              style={styles.mapCard} 
              onPress={() => {
                const url = Platform.select({
                  ios: `maps:0,0?q=${solicitud.latitud_local},${solicitud.longitud_local}`,
                  android: `google.navigation:q=${solicitud.latitud_local},${solicitud.longitud_local}`,
                  default: `https://www.google.com/maps/search/?api=1&query=${solicitud.latitud_local},${solicitud.longitud_local}`
                });
                if (url) Linking.openURL(url);
              }}
            >
              <IconSymbol ios_icon_name="map.fill" android_material_icon_name="map" size={32} color={colors.primary} />
              <View style={styles.mapTextBox}>
                <Text style={styles.mapTitle}>Ver en Mapas</Text>
                <Text style={styles.mapCoords}>
                  {solicitud.latitud_local.toFixed(6)}, {solicitud.longitud_local.toFixed(6)}
                </Text>
              </View>
              <IconSymbol ios_icon_name="arrow.up.right" android_material_icon_name="open_in_new" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      {(solicitud.estado === 'pendiente' || solicitud.estado === 'en_revision' || solicitud.estado === 'informacion_adicional') && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#10B981' }]}
            onPress={() => {
              setActionType('aprobar');
              setShowActionModal(true);
            }}
          >
            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>Aprobar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => {
              setActionType('cambiar_estado');
              setShowActionModal(true);
            }}
          >
            <IconSymbol ios_icon_name="arrow.triangle.2.circlepath" android_material_icon_name="sync" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>Estado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              setActionType('denegar');
              setShowActionModal(true);
            }}
          >
            <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={20} color="#fff" />
            <Text style={styles.footerBtnText}>Denegar</Text>
          </TouchableOpacity>
        </View>
      )}

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
                {actionType === 'aprobar' && '✅ Aprobar'}
                {actionType === 'denegar' && '❌ Denegar'}
                {actionType === 'cambiar_estado' && '🔄 Cambiar Estado'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {actionType === 'aprobar' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalText}>¿Aprobar esta solicitud?</Text>
                <Text style={styles.actionModalSubtext}>
                  El usuario recibirá el rol de propietario.
                </Text>
                <Text style={styles.actionModalWarning}>
                  ⚠️ Las imágenes se eliminarán del sistema.
                </Text>
              </View>
            )}

            {actionType === 'denegar' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalLabel}>Motivo *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Explica el motivo..."
                  placeholderTextColor={colors.textSecondary}
                  value={motivoDenegacion}
                  onChangeText={setMotivoDenegacion}
                  multiline
                  numberOfLines={3}
                />
                <Text style={styles.actionModalWarning}>
                  ⚠️ Las imágenes se eliminarán del sistema.
                </Text>
              </View>
            )}

            {actionType === 'cambiar_estado' && (
              <View style={styles.actionModalBody}>
                <Text style={styles.actionModalLabel}>Nuevo estado:</Text>
                <View style={styles.stateOptions}>
                  <TouchableOpacity
                    style={[styles.stateOption, nuevoEstado === 'en_revision' && styles.stateOptionActive]}
                    onPress={() => setNuevoEstado('en_revision')}
                  >
                    <IconSymbol 
                      ios_icon_name="search" 
                      android_material_icon_name="search" 
                      size={20} 
                      color={nuevoEstado === 'en_revision' ? '#3B82F6' : colors.textSecondary} 
                    />
                    <Text style={[styles.stateOptionText, nuevoEstado === 'en_revision' && { color: '#3B82F6' }]}>
                      En Revisión
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stateOption, nuevoEstado === 'informacion_adicional' && styles.stateOptionActive]}
                    onPress={() => setNuevoEstado('informacion_adicional')}
                  >
                    <IconSymbol 
                      ios_icon_name="info" 
                      android_material_icon_name="info" 
                      size={20} 
                      color={nuevoEstado === 'informacion_adicional' ? '#8B5CF6' : colors.textSecondary} 
                    />
                    <Text style={[styles.stateOptionText, nuevoEstado === 'informacion_adicional' && { color: '#8B5CF6' }]}>
                      Info Adicional
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.actionModalLabel}>Notas (opcional):</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Notas..."
                  placeholderTextColor={colors.textSecondary}
                  value={notasAdmin}
                  onChangeText={setNotasAdmin}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            <View style={styles.actionModalFooter}>
              <TouchableOpacity style={styles.actionModalCancelBtn} onPress={() => setShowActionModal(false)}>
                <Text style={styles.actionModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionModalConfirmBtn} onPress={executeAction}>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
    fontWeight: '600',
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
    opacity: 0.9,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  userUsername: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  userEmail: {
    fontSize: 13,
    color: colors.primary,
  },
  localCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  localName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  messageBox: {
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginTop: 6,
  },
  messageBoxLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  messageBoxText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 14,
  },
  mapTextBox: {
    flex: 1,
  },
  mapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  mapCoords: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  footerBtnText: {
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
    borderRadius: 18,
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
    marginBottom: 6,
    fontWeight: '600',
  },
  actionModalSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  actionModalWarning: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    backgroundColor: '#F59E0B' + '15',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  modalTextArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  stateOptions: {
    gap: 10,
    marginBottom: 14,
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
    paddingVertical: 13,
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
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.headerText,
  },
});
