
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  precio?: number;
  imagen_url?: string;
  provincia?: string;
  local?: {
    nombre: string;
  };
  destacado: boolean;
  activo: boolean;
}

export default function MisEventosScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarEventos = useCallback(async () => {
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
            nombre
          )
        `)
        .eq('propietario_id', user.id)
        .eq('activo', true)
        .order('fecha', { ascending: true });

      if (error) {
        console.error('[MisEventos] Error loading events:', error);
        return;
      }

      console.log('[MisEventos] Events loaded:', data?.length || 0);
      setEventos(data || []);
    } catch (error) {
      console.error('[MisEventos] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarEventos();
  };

  const handleEditEvent = (eventoId: string) => {
    router.push(`/crear/evento?id=${eventoId}`);
  };

  const handleDeleteEvent = (eventoId: string) => {
    Alert.alert(
      'Eliminar Evento',
      '¿Estás seguro de que quieres eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('eventos')
                .update({ activo: false })
                .eq('id', eventoId);

              if (error) throw error;

              Alert.alert('Éxito', 'Evento eliminado correctamente');
              await cargarEventos();
            } catch (error) {
              console.error('[MisEventos] Error deleting event:', error);
              Alert.alert('Error', 'No se pudo eliminar el evento');
            }
          },
        },
      ]
    );
  };

  const calcularDiasRestantes = (fecha: string): number => {
    const fechaEvento = new Date(fecha);
    const hoy = new Date();
    const diff = fechaEvento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

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
              <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mis Eventos</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
            <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Eventos</Text>
          <TouchableOpacity 
            onPress={() => router.push('/crear/evento')}
            style={styles.addButton}
          >
            <IconSymbol name="plus" size={24} color={colors.headerText} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {eventos.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="calendar" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No tienes eventos creados</Text>
            <Text style={styles.emptySubtext}>
              Crea tu primer evento para promocionar tu local
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/crear/evento')}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.createButtonGradient}
              >
                <Text style={styles.createButtonText}>Crear Evento</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          eventos.map((evento) => {
            const diasRestantes = calcularDiasRestantes(evento.fecha);
            
            return (
              <View key={evento.id} style={[commonStyles.card, commonStyles.cardShadow, styles.eventoCard]}>
                {evento.imagen_url && (
                  <Image source={{ uri: evento.imagen_url }} style={styles.eventoImagen} />
                )}
                
                {evento.destacado && (
                  <View style={styles.badgeDestacado}>
                    <Text style={styles.badgeText}>⭐ Destacado</Text>
                  </View>
                )}

                <View style={styles.eventoContent}>
                  <Text style={styles.eventoTitulo}>{evento.titulo}</Text>
                  {evento.local && (
                    <Text style={styles.eventoLocal}>{evento.local.nombre}</Text>
                  )}
                  
                  <View style={styles.eventoDetalles}>
                    <View style={styles.detalleItem}>
                      <IconSymbol name="calendar" size={16} color={colors.primary} />
                      <Text style={styles.detalleTexto}>
                        {new Date(evento.fecha).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <View style={styles.detalleItem}>
                      <IconSymbol name="clock" size={16} color={colors.primary} />
                      <Text style={styles.detalleTexto}>{evento.hora}</Text>
                    </View>
                    {evento.provincia && (
                      <View style={styles.detalleItem}>
                        <IconSymbol name="mappin" size={16} color={colors.primary} />
                        <Text style={styles.detalleTexto}>{evento.provincia}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.diasRestantesContainer}>
                    <Text style={styles.diasRestantesTexto}>
                      {diasRestantes > 0 ? `${diasRestantes} días restantes` : diasRestantes === 0 ? 'Hoy' : 'Finalizado'}
                    </Text>
                  </View>

                  <View style={styles.eventoActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/detalle/evento?id=${evento.id}`)}
                    >
                      <IconSymbol name="eye" size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Ver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditEvent(evento.id)}
                    >
                      <IconSymbol name="pencil" size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteActionButton]}
                      onPress={() => handleDeleteEvent(evento.id)}
                    >
                      <IconSymbol name="trash" size={18} color="#EF4444" />
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  content: {
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
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventoCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  eventoImagen: {
    width: '100%',
    height: 180,
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
  badgeText: {
    color: colors.badgeDestacadoText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventoContent: {
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
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  deleteActionButton: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});
