
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import LoginRequiredModal from '@/components/common/LoginRequiredModal';

interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  hora: string;
  precio?: number;
  imagen_url?: string;
  local_id?: string;
  propietario_id?: string;
  provincia?: string;
  destacado: boolean;
  activo: boolean;
  created_at: string;
  locales?: {
    nombre: string;
    provincia: string;
  };
}

export default function MisEventosScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<Evento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadEventos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[MisEventos] Loading events for user:', user.id);

      const { data, error } = await supabase
        .from('eventos')
        .select(`
          *,
          locales:local_id (
            nombre,
            provincia
          )
        `)
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('fecha', { ascending: true });

      if (error) {
        console.error('[MisEventos] Error loading events:', error);
        Alert.alert('Error', 'No se pudieron cargar los eventos');
        return;
      }

      console.log('[MisEventos] Loaded events:', data?.length || 0);
      setEventos(data || []);
    } catch (error) {
      console.error('[MisEventos] Unexpected error:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    } else {
      loadEventos();
    }
  }, [user, loadEventos]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEventos();
  };

  const handleEditEvento = (eventoId: string) => {
    router.push(`/crear/evento?id=${eventoId}`);
  };

  const confirmDeleteEvento = (evento: Evento) => {
    setEventoToDelete(evento);
    setShowDeleteModal(true);
  };

  const handleDeleteEvento = async () => {
    if (!eventoToDelete || !user) {
      console.error('[MisEventos] Missing evento or user');
      return;
    }

    try {
      setDeleting(true);

      console.log('[MisEventos] ========================================');
      console.log('[MisEventos] Starting event deletion process');
      console.log('[MisEventos] Event ID:', eventoToDelete.id);
      console.log('[MisEventos] Event Title:', eventoToDelete.titulo);
      console.log('[MisEventos] Event Owner ID:', eventoToDelete.propietario_id);
      console.log('[MisEventos] Current User ID:', user.id);
      console.log('[MisEventos] ========================================');

      // Verify ownership
      if (eventoToDelete.propietario_id !== user.id) {
        console.error('[MisEventos] Ownership mismatch!');
        throw new Error('No tienes permiso para eliminar este evento');
      }

      // Optimistically remove from UI
      const eventIdToDelete = eventoToDelete.id;
      setEventos(prev => prev.filter(e => e.id !== eventIdToDelete));

      // Perform deletion
      console.log('[MisEventos] Executing DELETE query...');
      const { error: deleteError, data: deleteData } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventIdToDelete)
        .eq('propietario_id', user.id)
        .select();

      if (deleteError) {
        console.error('[MisEventos] Delete error:', deleteError);
        console.error('[MisEventos] Error code:', deleteError.code);
        console.error('[MisEventos] Error message:', deleteError.message);
        console.error('[MisEventos] Error details:', deleteError.details);
        console.error('[MisEventos] Error hint:', deleteError.hint);
        
        // Rollback optimistic update
        setEventos(prev => [...prev, eventoToDelete].sort((a, b) => 
          new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        ));
        
        throw deleteError;
      }

      console.log('[MisEventos] Delete successful!');
      console.log('[MisEventos] Deleted data:', deleteData);
      console.log('[MisEventos] ========================================');

      Alert.alert('Éxito', 'Evento eliminado correctamente');
      setShowDeleteModal(false);
      setEventoToDelete(null);
    } catch (error: any) {
      console.error('[MisEventos] Error in deletion process:', error);
      
      let errorMessage = 'No se pudo eliminar el evento';
      
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      if (error.code === 'PGRST301') {
        errorMessage = 'No tienes permiso para eliminar este evento. Verifica que seas el propietario.';
      } else if (error.code === '42501') {
        errorMessage = 'Permisos insuficientes. Contacta con el administrador.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (fecha: string): string => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calcularDiasRestantes = (fecha: string): number => {
    const fechaEvento = new Date(fecha);
    const hoy = new Date();
    const diff = fechaEvento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (!user) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol 
                name="chevron.left" 
                size={24} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Eventos</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <LoginRequiredModal
          visible={showLoginModal}
          onClose={() => {
            setShowLoginModal(false);
            router.back();
          }}
          message="Para gestionar eventos necesitas registrarte en BarLive"
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol 
                name="chevron.left" 
                size={24} 
                color={colors.headerText} 
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Eventos</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando eventos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={commonStyles.container}>
      <LinearGradient
        colors={[colors.headerGradientStart, colors.headerGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol 
              name="chevron.left" 
              size={24} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Eventos</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/crear/evento')}
          >
            <IconSymbol 
              name="plus" 
              size={24} 
              color={colors.headerText} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {eventos.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol 
              name="calendar" 
              size={64} 
              color={colors.textSecondary} 
            />
            <Text style={styles.emptyText}>No tienes eventos creados</Text>
            <Text style={styles.emptySubtext}>
              Crea tu primer evento para promocionar tu local
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/crear/evento')}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.createButtonGradient}
              >
                <IconSymbol 
                  name="plus" 
                  size={20} 
                  color={colors.white} 
                />
                <Text style={styles.createButtonText}>Crear Evento</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          eventos.map((evento) => {
            const diasRestantes = calcularDiasRestantes(evento.fecha);
            const isPast = diasRestantes < 0;

            return (
              <View key={evento.id} style={styles.eventoCard}>
                {evento.imagen_url && (
                  <Image source={{ uri: evento.imagen_url }} style={styles.eventoImagen} />
                )}

                {evento.destacado && (
                  <View style={styles.badgeDestacado}>
                    <Text style={styles.badgeDestacadoText}>⭐ Destacado</Text>
                  </View>
                )}

                <View style={styles.eventoInfo}>
                  <Text style={styles.eventoTitulo} numberOfLines={2}>
                    {evento.titulo}
                  </Text>

                  {evento.locales && (
                    <Text style={styles.eventoLocal}>{evento.locales.nombre}</Text>
                  )}

                  {evento.descripcion && (
                    <Text style={styles.eventoDescripcion} numberOfLines={2}>
                      {evento.descripcion}
                    </Text>
                  )}

                  <View style={styles.eventoDetalles}>
                    <View style={styles.detalleItem}>
                      <IconSymbol 
                        name="calendar" 
                        size={16} 
                        color={colors.primary} 
                      />
                      <Text style={styles.detalleTexto}>{formatDate(evento.fecha)}</Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <IconSymbol 
                        name="clock" 
                        size={16} 
                        color={colors.primary} 
                      />
                      <Text style={styles.detalleTexto}>{evento.hora}</Text>
                    </View>
                    {evento.precio !== null && evento.precio !== undefined && (
                      <View style={styles.detalleItem}>
                        <IconSymbol 
                          name="eurosign.circle" 
                          size={16} 
                          color={colors.primary} 
                        />
                        <Text style={styles.detalleTexto}>
                          {evento.precio === 0 ? 'Gratis' : `${evento.precio}€`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!isPast && (
                    <View style={styles.diasRestantesContainer}>
                      <Text style={styles.diasRestantesTexto}>
                        {diasRestantes === 0
                          ? 'Hoy'
                          : diasRestantes === 1
                          ? 'Mañana'
                          : `${diasRestantes} días restantes`}
                      </Text>
                    </View>
                  )}

                  <View style={styles.eventoActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditEvento(evento.id)}
                    >
                      <IconSymbol 
                        name="pencil" 
                        size={18} 
                        color={colors.primary} 
                      />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteActionButton]}
                      onPress={() => confirmDeleteEvento(evento)}
                    >
                      <IconSymbol 
                        name="trash" 
                        size={18} 
                        color="#EF4444" 
                      />
                      <Text style={[styles.actionButtonText, styles.deleteActionButtonText]}>
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !deleting && setShowDeleteModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => !deleting && setShowDeleteModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <IconSymbol 
                name="exclamationmark.triangle.fill" 
                size={48} 
                color="#EF4444" 
              />
            </View>

            <Text style={styles.modalTitle}>Eliminar Evento</Text>
            <Text style={styles.modalMessage}>
              ¿Estás seguro de que quieres eliminar &quot;{eventoToDelete?.titulo}&quot;? Esta acción no se puede deshacer.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowDeleteModal(false)}
                style={[styles.modalButton, styles.modalButtonCancel]}
                disabled={deleting}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteEvento}
                style={[styles.modalButton, styles.modalButtonDelete]}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonTextDelete}>Eliminar</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.headerText,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  createButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  eventoCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventoImagen: {
    width: '100%',
    height: 200,
    backgroundColor: colors.cardBorder,
  },
  badgeDestacado: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.badgeDestacado,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeDestacadoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.badgeDestacadoText,
  },
  eventoInfo: {
    padding: 16,
  },
  eventoTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  eventoLocal: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  eventoDescripcion: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventoDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detalleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detalleTexto: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  diasRestantesContainer: {
    marginBottom: 16,
  },
  diasRestantesTexto: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  eventoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  deleteActionButton: {
    borderColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteActionButtonText: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalButtonCancel: {
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalButtonDelete: {
    backgroundColor: '#EF4444',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextDelete: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
