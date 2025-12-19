
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
    username?: string;
  };
}

export default function AdminSolicitudesPropietarioScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('pendiente');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
            username
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

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return '#F59E0B';
      case 'aprobada':
        return '#10B981';
      case 'rechazada':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'clock.fill';
      case 'aprobada':
        return 'checkmark.circle.fill';
      case 'rechazada':
        return 'xmark.circle.fill';
      default:
        return 'questionmark.circle.fill';
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

      {/* ✅ IMPROVED: Search bar */}
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

      {/* ✅ IMPROVED: Filter tabs with better design */}
      <View style={styles.filters}>
        {[
          { key: 'pendiente', label: 'Pendientes', icon: 'clock.fill', color: '#F59E0B' },
          { key: 'aprobada', label: 'Aprobadas', icon: 'checkmark.circle.fill', color: '#10B981' },
          { key: 'rechazada', label: 'Rechazadas', icon: 'xmark.circle.fill', color: '#EF4444' },
          { key: 'todas', label: 'Todas', icon: 'list.bullet', color: colors.primary },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterButton, 
              filtro === f.key && styles.filterButtonActive,
              filtro === f.key && { borderColor: f.color }
            ]}
            onPress={() => setFiltro(f.key as any)}
          >
            <IconSymbol 
              ios_icon_name={f.icon as any} 
              android_material_icon_name={f.icon.replace('.', '_')} 
              size={18} 
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
      </View>

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
                {/* ✅ IMPROVED: Card header with user info */}
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
                      {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* ✅ IMPROVED: Local information section */}
                <View style={styles.localSection}>
                  <View style={styles.localSectionHeader}>
                    <IconSymbol ios_icon_name="building.2.fill" android_material_icon_name="store" size={18} color={colors.primary} />
                    <Text style={styles.localSectionTitle}>Información del Local</Text>
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
                  
                  {solicitud.telefono_local && (
                    <View style={styles.localInfoRow}>
                      <IconSymbol ios_icon_name="phone.fill" android_material_icon_name="phone" size={14} color={colors.textSecondary} />
                      <Text style={styles.localInfoValue}>{solicitud.telefono_local}</Text>
                    </View>
                  )}
                </View>

                {solicitud.descripcion && (
                  <View style={styles.descripcionContainer}>
                    <Text style={styles.descripcionLabel}>Descripción:</Text>
                    <Text style={styles.descripcionText}>{solicitud.descripcion}</Text>
                  </View>
                )}

                {/* ✅ IMPROVED: Metadata section */}
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

                {/* ✅ IMPROVED: Action buttons with better design */}
                {solicitud.estado === 'pendiente' && (
                  <View style={styles.actionsContainer}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.aprobarButton]}
                      onPress={() => handleAprobar(solicitud.id, solicitud.usuario_id)}
                    >
                      <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Aprobar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rechazarButton]}
                      onPress={() => handleRechazar(solicitud.id, solicitud.usuario_id)}
                    >
                      <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="cancel" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Rechazar</Text>
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
                  : `No hay solicitudes ${filtro}s`}
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
  // ✅ IMPROVED: Search section
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
  // ✅ IMPROVED: Filter tabs with icons
  filters: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.cardBackground,
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
  // ✅ IMPROVED: Solicitud card with better structure
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
  // ✅ IMPROVED: Local information section
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
  // ✅ IMPROVED: Action buttons
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aprobarButton: {
    backgroundColor: '#10B981',
  },
  rechazarButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 15,
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
});
