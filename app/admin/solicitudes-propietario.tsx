
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { supabase } from '@/utils/supabase';

interface Solicitud {
  id: string;
  usuario_id: string;
  nombre_local: string;
  direccion_local?: string;
  telefono_local?: string;
  descripcion?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  created_at: string;
  usuario?: {
    nombre: string;
    email: string;
    avatar?: string;
  };
}

export default function AdminSolicitudesPropietarioScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('todas');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
            avatar
          )
        `)
        .order('created_at', { ascending: false });

      if (filtro !== 'todas') {
        query = query.eq('estado', filtro);
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
      Alert.alert('Error', 'No se pudieron cargar las solicitudes. Verifica que la tabla solicitudes_propietario exista en Supabase.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro]);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSolicitudes();
  };

  const handleAprobar = async (solicitudId: string, usuarioId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('solicitudes_propietario')
        .update({ estado: 'aprobada' })
        .eq('id', solicitudId);

      if (updateError) throw updateError;

      // Update user role to propietario
      const { error: roleError } = await supabase
        .from('usuarios')
        .update({ rol_app: 'propietario' })
        .eq('id', usuarioId);

      if (roleError) throw roleError;

      // Create notification
      await supabase.from('notificaciones').insert({
        usuario_id: usuarioId,
        tipo: 'sistema',
        titulo: 'Solicitud aprobada',
        mensaje: 'Tu solicitud para ser propietario ha sido aprobada. Ahora puedes gestionar tu local.',
      });

      Alert.alert('Éxito', 'Solicitud aprobada correctamente');
      loadSolicitudes();
    } catch (error) {
      console.error('[Solicitudes] Error approving request:', error);
      Alert.alert('Error', 'No se pudo aprobar la solicitud');
    }
  };

  const handleRechazar = async (solicitudId: string, usuarioId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('solicitudes_propietario')
        .update({ estado: 'rechazada' })
        .eq('id', solicitudId);

      if (updateError) throw updateError;

      // Create notification
      await supabase.from('notificaciones').insert({
        usuario_id: usuarioId,
        tipo: 'sistema',
        titulo: 'Solicitud rechazada',
        mensaje: 'Tu solicitud para ser propietario ha sido rechazada. Contacta con soporte para más información.',
      });

      Alert.alert('Éxito', 'Solicitud rechazada');
      loadSolicitudes();
    } catch (error) {
      console.error('[Solicitudes] Error rejecting request:', error);
      Alert.alert('Error', 'No se pudo rechazar la solicitud');
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
          <IconSymbol name="chevron.left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes de Propietario</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.filters}>
        {['todas', 'pendiente', 'aprobada', 'rechazada'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filtro === f && styles.filterButtonActive]}
            onPress={() => setFiltro(f as any)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filtro === f && styles.filterButtonTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {solicitudesFiltradas.length > 0 ? (
            solicitudesFiltradas.map((solicitud) => (
              <View
                key={solicitud.id}
                style={[commonStyles.card, commonStyles.cardShadow, styles.solicitudCard]}
              >
                <View style={styles.solicitudHeader}>
                  {solicitud.usuario?.avatar ? (
                    <Image source={{ uri: solicitud.usuario.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <IconSymbol name="person.fill" size={24} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={styles.solicitudInfo}>
                    <Text style={styles.nombre}>{solicitud.usuario?.nombre || 'Usuario'}</Text>
                    <Text style={styles.email}>{solicitud.usuario?.email || 'Sin email'}</Text>
                    <Text style={styles.local}>{solicitud.nombre_local}</Text>
                    {solicitud.direccion_local && (
                      <Text style={styles.direccion}>{solicitud.direccion_local}</Text>
                    )}
                    <Text style={styles.fecha}>
                      {new Date(solicitud.created_at).toLocaleDateString('es-ES')}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.estadoBadge,
                      solicitud.estado === 'pendiente' && styles.estadoPendiente,
                      solicitud.estado === 'aprobada' && styles.estadoAprobada,
                      solicitud.estado === 'rechazada' && styles.estadoRechazada,
                    ]}
                  >
                    <Text style={styles.estadoText}>
                      {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                    </Text>
                  </View>
                </View>

                {solicitud.descripcion && (
                  <View style={styles.descripcionContainer}>
                    <Text style={styles.descripcionLabel}>Descripción:</Text>
                    <Text style={styles.descripcionText}>{solicitud.descripcion}</Text>
                  </View>
                )}

                {solicitud.estado === 'pendiente' && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.aprobarButton]}
                      onPress={() => handleAprobar(solicitud.id, solicitud.usuario_id)}
                    >
                      <IconSymbol name="checkmark.circle.fill" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rechazarButton]}
                      onPress={() => handleRechazar(solicitud.id, solicitud.usuario_id)}
                    >
                      <IconSymbol name="xmark.circle.fill" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <IconSymbol name="doc.text" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>
                {filtro === 'todas' 
                  ? 'No hay solicitudes' 
                  : `No hay solicitudes ${filtro}s`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.headerText,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.headerText,
  },
  content: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
    padding: 16,
  },
  solicitudHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  solicitudInfo: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  local: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  direccion: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  fecha: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  estadoBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  estadoPendiente: {
    backgroundColor: colors.badgeDestacado,
  },
  estadoAprobada: {
    backgroundColor: '#10B981',
  },
  estadoRechazada: {
    backgroundColor: colors.badgeNuevo,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.headerText,
  },
  descripcionContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  descripcionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  descripcionText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  aprobarButton: {
    backgroundColor: '#10B981',
  },
  rechazarButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
  },
});
