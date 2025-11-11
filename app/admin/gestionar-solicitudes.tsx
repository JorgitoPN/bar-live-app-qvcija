
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';
import { sendEmail } from '@/utils/email';

interface PropietarioRequest {
  id: string;
  usuario_id: string;
  tipo_solicitud: string;
  nombre_local: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  descripcion: string;
  estado: string;
  estado_detalle: string;
  created_at: string;
  updated_at: string;
  usuario_nombre: string;
  usuario_email: string;
  usuario_avatar: string;
  status_changes_count: number;
}

const ESTADOS = [
  { value: 'pendiente', label: 'Pendiente', color: '#F59E0B' },
  { value: 'en_revision', label: 'En Revisión', color: '#3B82F6' },
  { value: 'documentacion_solicitada', label: 'Doc. Solicitada', color: '#8B5CF6' },
  { value: 'documentacion_recibida', label: 'Doc. Recibida', color: '#10B981' },
  { value: 'aprobada', label: 'Aprobada', color: '#10B981' },
  { value: 'rechazada', label: 'Rechazada', color: '#EF4444' },
];

export default function GestionarSolicitudesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState<PropietarioRequest[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<PropietarioRequest[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');
  const [selectedRequest, setSelectedRequest] = useState<PropietarioRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadSolicitudes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pending_propietario_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading requests:', error);
        throw error;
      }

      setSolicitudes(data || []);
      setFilteredSolicitudes(data || []);
    } catch (error) {
      console.error('Error in loadSolicitudes:', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  useEffect(() => {
    let filtered = solicitudes;

    // Filter by search
    if (busqueda) {
      filtered = filtered.filter(
        (s) =>
          s.usuario_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
          s.usuario_email.toLowerCase().includes(busqueda.toLowerCase()) ||
          s.nombre_local.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filter by status
    if (filtroEstado !== 'todas') {
      filtered = filtered.filter((s) => s.estado === filtroEstado);
    }

    setFilteredSolicitudes(filtered);
  }, [busqueda, filtroEstado, solicitudes]);

  const handleUpdateStatus = async () => {
    if (!selectedRequest || !newStatus) return;

    if (newStatus === 'rechazada' && !rejectReason.trim()) {
      Alert.alert('Error', 'Debes proporcionar una razón para el rechazo');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('propietario_requests')
        .update({
          estado: newStatus,
          estado_detalle: statusMessage || null,
          razon_rechazo: newStatus === 'rechazada' ? rejectReason : null,
          fecha_revision: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (error) {
        console.error('Error updating status:', error);
        throw error;
      }

      // Send email notification
      try {
        const emailSubject =
          newStatus === 'aprobada'
            ? '¡Tu solicitud de modo propietario ha sido aprobada!'
            : newStatus === 'rechazada'
            ? 'Actualización sobre tu solicitud de modo propietario'
            : 'Actualización de tu solicitud de modo propietario';

        const emailBody =
          newStatus === 'aprobada'
            ? `Hola ${selectedRequest.usuario_nombre},\n\n¡Buenas noticias! Tu solicitud para convertirte en propietario en BarLive ha sido aprobada.\n\nAhora puedes:\n- Gestionar tu local\n- Publicar eventos y promociones\n- Acceder a estadísticas\n- Y mucho más\n\nInicia sesión en BarLive para comenzar.\n\nSaludos,\nEl equipo de BarLive`
            : newStatus === 'rechazada'
            ? `Hola ${selectedRequest.usuario_nombre},\n\nLamentamos informarte que tu solicitud de modo propietario ha sido rechazada.\n\nRazón: ${rejectReason}\n\nSi tienes preguntas, no dudes en contactarnos.\n\nSaludos,\nEl equipo de BarLive`
            : `Hola ${selectedRequest.usuario_nombre},\n\nTu solicitud de modo propietario ha sido actualizada.\n\nEstado: ${ESTADOS.find((e) => e.value === newStatus)?.label}\n${statusMessage ? `\nMensaje: ${statusMessage}` : ''}\n\nSaludos,\nEl equipo de BarLive`;

        await sendEmail(selectedRequest.usuario_email, emailSubject, emailBody);
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail the whole operation if email fails
      }

      Alert.alert('Éxito', 'Estado actualizado correctamente');
      setShowStatusModal(false);
      setShowDetailModal(false);
      setNewStatus('');
      setStatusMessage('');
      setRejectReason('');
      loadSolicitudes();
    } catch (error) {
      console.error('Error in handleUpdateStatus:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    } finally {
      setUpdating(false);
    }
  };

  const openDetailModal = (request: PropietarioRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const openStatusModal = () => {
    setShowDetailModal(false);
    setShowStatusModal(true);
  };

  const getStatusColor = (estado: string) => {
    return ESTADOS.find((e) => e.value === estado)?.color || colors.textSecondary;
  };

  const getStatusLabel = (estado: string) => {
    return ESTADOS.find((e) => e.value === estado)?.label || estado;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderSolicitud = ({ item }: { item: PropietarioRequest }) => (
    <TouchableOpacity
      style={[commonStyles.card, styles.solicitudCard]}
      onPress={() => openDetailModal(item)}
    >
      <View style={styles.solicitudHeader}>
        <Image
          source={{
            uri: item.usuario_avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
          }}
          style={styles.avatar}
        />
        <View style={styles.solicitudInfo}>
          <Text style={styles.userName}>{item.usuario_nombre}</Text>
          <Text style={styles.userEmail}>{item.usuario_email}</Text>
          <Text style={styles.localName}>{item.nombre_local}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.estado) }]}>
          <Text style={styles.statusBadgeText}>{getStatusLabel(item.estado)}</Text>
        </View>
      </View>

      <View style={styles.solicitudDetails}>
        <View style={styles.detailRow}>
          <IconSymbol name="mappin.circle.fill" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {item.ciudad}, {item.provincia}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
          <Text style={styles.detailText}>{formatDate(item.created_at)}</Text>
        </View>
        {item.status_changes_count > 0 && (
          <View style={styles.detailRow}>
            <IconSymbol name="clock.arrow.circlepath" size={16} color={colors.textSecondary} />
            <Text style={styles.detailText}>{item.status_changes_count} cambios</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando solicitudes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes Propietario</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.filters}>
        <View style={styles.searchContainer}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre, email o local..."
            placeholderTextColor={colors.textSecondary}
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
          <TouchableOpacity
            style={[styles.filterChip, filtroEstado === 'todas' && styles.filterChipActive]}
            onPress={() => setFiltroEstado('todas')}
          >
            <Text
              style={[
                styles.filterChipText,
                filtroEstado === 'todas' && styles.filterChipTextActive,
              ]}
            >
              Todas ({solicitudes.length})
            </Text>
          </TouchableOpacity>
          {ESTADOS.map((estado) => {
            const count = solicitudes.filter((s) => s.estado === estado.value).length;
            return (
              <TouchableOpacity
                key={estado.value}
                style={[
                  styles.filterChip,
                  filtroEstado === estado.value && styles.filterChipActive,
                ]}
                onPress={() => setFiltroEstado(estado.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filtroEstado === estado.value && styles.filterChipTextActive,
                  ]}
                >
                  {estado.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredSolicitudes}
        renderItem={renderSolicitud}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconSymbol name="doc.text" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No hay solicitudes</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Solicitud</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedRequest && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Usuario</Text>
                    <View style={styles.userInfo}>
                      <Image
                        source={{
                          uri:
                            selectedRequest.usuario_avatar ||
                            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
                        }}
                        style={styles.modalAvatar}
                      />
                      <View>
                        <Text style={styles.modalUserName}>{selectedRequest.usuario_nombre}</Text>
                        <Text style={styles.modalUserEmail}>{selectedRequest.usuario_email}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Local</Text>
                    <Text style={styles.modalLabel}>Nombre</Text>
                    <Text style={styles.modalValue}>{selectedRequest.nombre_local}</Text>
                    <Text style={styles.modalLabel}>Dirección</Text>
                    <Text style={styles.modalValue}>{selectedRequest.direccion}</Text>
                    <Text style={styles.modalLabel}>Ciudad</Text>
                    <Text style={styles.modalValue}>{selectedRequest.ciudad}</Text>
                    <Text style={styles.modalLabel}>Provincia</Text>
                    <Text style={styles.modalValue}>{selectedRequest.provincia}</Text>
                    {selectedRequest.telefono && (
                      <>
                        <Text style={styles.modalLabel}>Teléfono</Text>
                        <Text style={styles.modalValue}>{selectedRequest.telefono}</Text>
                      </>
                    )}
                    {selectedRequest.descripcion && (
                      <>
                        <Text style={styles.modalLabel}>Descripción</Text>
                        <Text style={styles.modalValue}>{selectedRequest.descripcion}</Text>
                      </>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Estado</Text>
                    <View
                      style={[
                        styles.modalStatusBadge,
                        { backgroundColor: getStatusColor(selectedRequest.estado) },
                      ]}
                    >
                      <Text style={styles.modalStatusText}>
                        {getStatusLabel(selectedRequest.estado)}
                      </Text>
                    </View>
                    {selectedRequest.estado_detalle && (
                      <>
                        <Text style={styles.modalLabel}>Mensaje</Text>
                        <Text style={styles.modalValue}>{selectedRequest.estado_detalle}</Text>
                      </>
                    )}
                  </View>

                  <TouchableOpacity style={styles.updateButton} onPress={openStatusModal}>
                    <Text style={styles.updateButtonText}>Actualizar Estado</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Actualizar Estado</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <IconSymbol name="xmark" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalLabel}>Nuevo Estado</Text>
              {ESTADOS.map((estado) => (
                <TouchableOpacity
                  key={estado.value}
                  style={[
                    styles.statusOption,
                    newStatus === estado.value && styles.statusOptionActive,
                  ]}
                  onPress={() => setNewStatus(estado.value)}
                >
                  <View
                    style={[styles.statusOptionDot, { backgroundColor: estado.color }]}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      newStatus === estado.value && styles.statusOptionTextActive,
                    ]}
                  >
                    {estado.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={[styles.modalLabel, { marginTop: 16 }]}>Mensaje para el usuario</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Mensaje opcional..."
                placeholderTextColor={colors.textSecondary}
                value={statusMessage}
                onChangeText={setStatusMessage}
                multiline
                numberOfLines={3}
              />

              {newStatus === 'rechazada' && (
                <>
                  <Text style={[styles.modalLabel, { marginTop: 16 }]}>
                    Razón del rechazo *
                  </Text>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Explica por qué se rechaza la solicitud..."
                    placeholderTextColor={colors.textSecondary}
                    value={rejectReason}
                    onChangeText={setRejectReason}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.submitButton, updating && styles.submitButtonDisabled]}
                onPress={handleUpdateStatus}
                disabled={updating || !newStatus}
              >
                {updating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Actualizar</Text>
                )}
              </TouchableOpacity>
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  filters: {
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  statusFilters: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: 8,
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
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  solicitudCard: {
    marginBottom: 16,
  },
  solicitudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  solicitudInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  localName: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  solicitudDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  modalUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalUserEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    color: colors.text,
  },
  modalStatusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updateButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
    gap: 12,
  },
  statusOptionActive: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  statusOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  statusOptionTextActive: {
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
