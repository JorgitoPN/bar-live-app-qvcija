
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface LocalSolicitud {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  provincia: string;
  descripcion: string;
  imagen_url: string | null;
  galeria_urls: string[];
  propietario_id: string;
  estado_solicitud: 'pendiente' | 'en_revision' | 'aprobado' | 'denegado';
  fecha_solicitud: string;
  fecha_revision: string | null;
  motivo_denegacion: string | null;
  comentarios_admin: string | null;
  propietario: {
    nombre: string;
    email: string;
  };
}

export default function GestionarSolicitudesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<LocalSolicitud[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>('pendiente');
  const [selectedSolicitud, setSelectedSolicitud] = useState<LocalSolicitud | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'aprobar' | 'denegar' | 'revision' | 'eliminar'>('aprobar');
  const [comentarios, setComentarios] = useState('');
  const [motivoDenegacion, setMotivoDenegacion] = useState('');
  const [processing, setProcessing] = useState(false);

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Only show locales created by owners (propietario_id is not null)
      let query = supabase
        .from('locales')
        .select(`
          *,
          propietario:usuarios!propietario_id(nombre, email)
        `)
        .not('propietario_id', 'is', null)
        .order('fecha_solicitud', { ascending: false });

      if (filtroEstado !== 'todos') {
        query = query.eq('estado_solicitud', filtroEstado);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading solicitudes:', error);
        Alert.alert('Error', 'No se pudieron cargar las solicitudes');
        return;
      }

      console.log('[GestionarSolicitudes] ✅ Loaded locales created by owners:', data?.length || 0);
      setSolicitudes(data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  const handlePreview = (solicitud: LocalSolicitud) => {
    setSelectedSolicitud(solicitud);
    setShowPreviewModal(true);
  };

  const handleAction = (solicitud: LocalSolicitud, action: 'aprobar' | 'denegar' | 'revision' | 'eliminar') => {
    setSelectedSolicitud(solicitud);
    setActionType(action);
    setComentarios('');
    setMotivoDenegacion('');
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!selectedSolicitud) return;

    if (actionType === 'denegar' && !motivoDenegacion.trim()) {
      Alert.alert('Error', 'Debes indicar el motivo de la denegación');
      return;
    }

    setProcessing(true);
    try {
      if (actionType === 'eliminar') {
        // Delete local permanently
        const { error } = await supabase
          .from('locales')
          .delete()
          .eq('id', selectedSolicitud.id);

        if (error) throw error;

        Alert.alert('Éxito', 'Local eliminado correctamente');
      } else {
        // Update local status
        const updateData: any = {
          estado_solicitud: actionType === 'aprobar' ? 'aprobado' : actionType === 'denegar' ? 'denegado' : 'en_revision',
          fecha_revision: new Date().toISOString(),
          revisado_por: user?.id,
          comentarios_admin: comentarios.trim() || null,
          activo: actionType === 'aprobar',
        };

        if (actionType === 'denegar') {
          updateData.motivo_denegacion = motivoDenegacion.trim();
        }

        const { error } = await supabase
          .from('locales')
          .update(updateData)
          .eq('id', selectedSolicitud.id);

        if (error) throw error;

        // Send notification
        try {
          await supabase.functions.invoke('send-local-approval-notification', {
            body: {
              localId: selectedSolicitud.id,
              propietarioId: selectedSolicitud.propietario_id,
              tipo: actionType === 'aprobar' ? 'aprobado' : actionType === 'denegar' ? 'denegado' : 'en_revision',
              motivoDenegacion: actionType === 'denegar' ? motivoDenegacion.trim() : undefined,
              comentariosAdmin: comentarios.trim() || undefined,
            },
          });
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError);
        }

        Alert.alert(
          'Éxito',
          actionType === 'aprobar' 
            ? 'Local aprobado y publicado correctamente' 
            : actionType === 'denegar'
            ? 'Local denegado correctamente'
            : 'Estado actualizado correctamente'
        );
      }

      setShowActionModal(false);
      setShowPreviewModal(false);
      cargarSolicitudes();
    } catch (error) {
      console.error('Error executing action:', error);
      Alert.alert('Error', 'No se pudo completar la acción');
    } finally {
      setProcessing(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pendiente: { color: '#F59E0B', text: 'Pendiente' },
      en_revision: { color: '#3B82F6', text: 'En Revisión' },
      aprobado: { color: '#10B981', text: 'Aprobado' },
      denegado: { color: '#EF4444', text: 'Denegado' },
    };

    const badge = badges[estado] || badges.pendiente;

    return (
      <View style={[styles.badge, { backgroundColor: badge.color + '20' }]}>
        <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
      </View>
    );
  };

  const renderSolicitudCard = (solicitud: LocalSolicitud) => (
    <View key={solicitud.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {solicitud.imagen_url && (
            <Image source={{ uri: solicitud.imagen_url }} style={styles.cardImage} />
          )}
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{solicitud.nombre}</Text>
            <Text style={styles.cardSubtitle}>{solicitud.tipo} • {solicitud.provincia}</Text>
            <Text style={styles.cardDate}>
              Solicitado: {new Date(solicitud.fecha_solicitud).toLocaleDateString()}
            </Text>
          </View>
        </View>
        {getEstadoBadge(solicitud.estado_solicitud)}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {solicitud.descripcion || 'Sin descripción'}
        </Text>
        <Text style={styles.cardOwner}>
          Propietario: {solicitud.propietario?.nombre} ({solicitud.propietario?.email})
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.previewButton]}
          onPress={() => handlePreview(solicitud)}
        >
          <IconSymbol ios_icon_name="eye.fill" android_material_icon_name="visibility" size={18} color="#3B82F6" />
          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Vista Previa</Text>
        </TouchableOpacity>

        {solicitud.estado_solicitud === 'pendiente' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.revisionButton]}
              onPress={() => handleAction(solicitud, 'revision')}
            >
              <IconSymbol ios_icon_name="clock.fill" android_material_icon_name="schedule" size={18} color="#F59E0B" />
              <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>En Revisión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleAction(solicitud, 'aprobar')}
            >
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={18} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Aprobar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.denyButton]}
              onPress={() => handleAction(solicitud, 'denegar')}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Denegar</Text>
            </TouchableOpacity>
          </>
        )}

        {solicitud.estado_solicitud === 'en_revision' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleAction(solicitud, 'aprobar')}
            >
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={18} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Aprobar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.denyButton]}
              onPress={() => handleAction(solicitud, 'denegar')}
            >
              <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Denegar</Text>
            </TouchableOpacity>
          </>
        )}

        {solicitud.estado_solicitud === 'denegado' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleAction(solicitud, 'eliminar')}
          >
            <IconSymbol ios_icon_name="trash.fill" android_material_icon_name="delete" size={18} color="#EF4444" />
            <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestionar Solicitudes</Text>
        <TouchableOpacity onPress={cargarSolicitudes}>
          <IconSymbol ios_icon_name="arrow.clockwise" android_material_icon_name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['pendiente', 'en_revision', 'aprobado', 'denegado', 'todos'].map((estado) => (
            <TouchableOpacity
              key={estado}
              style={[styles.filterButton, filtroEstado === estado && styles.filterButtonActive]}
              onPress={() => setFiltroEstado(estado)}
            >
              <Text style={[styles.filterButtonText, filtroEstado === estado && styles.filterButtonTextActive]}>
                {estado === 'todos' ? 'Todos' : estado.charAt(0).toUpperCase() + estado.slice(1).replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : solicitudes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol ios_icon_name="tray.fill" android_material_icon_name="inbox" size={64} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No hay solicitudes {filtroEstado !== 'todos' ? `en estado "${filtroEstado}"` : ''}</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {solicitudes.map(renderSolicitudCard)}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Preview Modal */}
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vista Previa del Local</Text>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedSolicitud && (
              <ScrollView style={styles.modalBody}>
                {selectedSolicitud.imagen_url && (
                  <Image source={{ uri: selectedSolicitud.imagen_url }} style={styles.previewImage} />
                )}

                <View style={styles.previewSection}>
                  <Text style={styles.previewTitle}>{selectedSolicitud.nombre}</Text>
                  <Text style={styles.previewSubtitle}>{selectedSolicitud.tipo} • {selectedSolicitud.provincia}</Text>
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Descripción</Text>
                  <Text style={styles.previewText}>{selectedSolicitud.descripcion || 'Sin descripción'}</Text>
                </View>

                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Dirección</Text>
                  <Text style={styles.previewText}>{selectedSolicitud.direccion}</Text>
                </View>

                {selectedSolicitud.galeria_urls && selectedSolicitud.galeria_urls.length > 0 && (
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Galería ({selectedSolicitud.galeria_urls.length} imágenes)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedSolicitud.galeria_urls.map((url, index) => (
                        <Image key={index} source={{ uri: url }} style={styles.galleryPreviewImage} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.previewSection}>
                  <Text style={styles.previewLabel}>Propietario</Text>
                  <Text style={styles.previewText}>{selectedSolicitud.propietario?.nombre}</Text>
                  <Text style={styles.previewText}>{selectedSolicitud.propietario?.email}</Text>
                </View>

                {selectedSolicitud.motivo_denegacion && (
                  <View style={[styles.previewSection, { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8 }]}>
                    <Text style={[styles.previewLabel, { color: '#DC2626' }]}>Motivo de Denegación</Text>
                    <Text style={[styles.previewText, { color: '#DC2626' }]}>{selectedSolicitud.motivo_denegacion}</Text>
                  </View>
                )}

                {selectedSolicitud.comentarios_admin && (
                  <View style={[styles.previewSection, { backgroundColor: '#DBEAFE', padding: 12, borderRadius: 8 }]}>
                    <Text style={[styles.previewLabel, { color: '#1E40AF' }]}>Comentarios del Administrador</Text>
                    <Text style={[styles.previewText, { color: '#1E40AF' }]}>{selectedSolicitud.comentarios_admin}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {actionType === 'aprobar' && 'Aprobar Local'}
                {actionType === 'denegar' && 'Denegar Local'}
                {actionType === 'revision' && 'Marcar en Revisión'}
                {actionType === 'eliminar' && 'Eliminar Local'}
              </Text>
              <TouchableOpacity onPress={() => setShowActionModal(false)}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedSolicitud && (
                <View style={styles.actionModalContent}>
                  <Text style={styles.actionModalText}>
                    {actionType === 'aprobar' && `¿Estás seguro de que quieres aprobar el local "${selectedSolicitud.nombre}"? El local será publicado y visible para todos los usuarios.`}
                    {actionType === 'denegar' && `¿Estás seguro de que quieres denegar el local "${selectedSolicitud.nombre}"? El propietario recibirá una notificación con el motivo.`}
                    {actionType === 'revision' && `¿Estás seguro de que quieres marcar el local "${selectedSolicitud.nombre}" como en revisión? El propietario recibirá una notificación.`}
                    {actionType === 'eliminar' && `¿Estás seguro de que quieres eliminar permanentemente el local "${selectedSolicitud.nombre}"? Esta acción no se puede deshacer.`}
                  </Text>

                  {actionType === 'denegar' && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Motivo de la Denegación *</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Explica por qué se deniega el local..."
                        value={motivoDenegacion}
                        onChangeText={setMotivoDenegacion}
                        multiline
                        numberOfLines={4}
                      />
                    </View>
                  )}

                  {(actionType === 'aprobar' || actionType === 'denegar' || actionType === 'revision') && (
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Comentarios Adicionales (opcional)</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Añade comentarios adicionales..."
                        value={comentarios}
                        onChangeText={setComentarios}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  )}

                  <View style={styles.actionModalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowActionModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={executeAction}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.confirmButtonText}>
                          {actionType === 'aprobar' && 'Aprobar'}
                          {actionType === 'denegar' && 'Denegar'}
                          {actionType === 'revision' && 'Marcar'}
                          {actionType === 'eliminar' && 'Eliminar'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
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
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  filters: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...commonStyles.shadow,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.border,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  cardOwner: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  previewButton: {
    backgroundColor: '#DBEAFE',
  },
  revisionButton: {
    backgroundColor: '#FEF3C7',
  },
  approveButton: {
    backgroundColor: '#D1FAE5',
  },
  denyButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: colors.border,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  previewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  galleryPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: colors.border,
  },
  actionModalContent: {
    padding: 4,
  },
  actionModalText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
