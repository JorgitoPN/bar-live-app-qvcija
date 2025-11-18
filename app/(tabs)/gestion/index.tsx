
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/utils/supabase';
import { useSelectedLocal } from '@/contexts/SelectedLocalContext';

interface LocalConSuscripcion {
  id: string;
  nombre: string;
  provincia: string;
  imagen_url?: string;
  destacado: boolean;
  suscripcion?: {
    id: string;
    plan_nombre: string;
    estado: string;
    eventos_usados_mes: number;
    eventos_disponibles: number;
    fecha_proximo_pago?: string;
    destacados_restantes: number;
  };
}

export default function GestionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { selectedLocalId, setSelectedLocalId, refreshLocales } = useSelectedLocal();
  const [locales, setLocales] = useState<LocalConSuscripcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingDestacado, setUpdatingDestacado] = useState<string | null>(null);

  const cargarLocales = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[GestionScreen] Loading locales for user:', user.id);
      
      // Get user's locals
      const { data: localesData, error: localesError } = await supabase
        .from('locales')
        .select('id, nombre, provincia, imagen_url, destacado')
        .eq('propietario_id', user.id)
        .eq('activo', true);

      if (localesError) {
        console.error('[GestionScreen] Error loading locales:', localesError);
        setLoading(false);
        return;
      }

      if (!localesData || localesData.length === 0) {
        console.log('[GestionScreen] No locales found for user');
        setLocales([]);
        setLoading(false);
        return;
      }

      console.log('[GestionScreen] Found', localesData.length, 'locales');

      // Get subscriptions for each local
      const localesConSuscripcion: LocalConSuscripcion[] = await Promise.all(
        localesData.map(async (local) => {
          const { data: suscripcion } = await supabase
            .from('suscripciones_locales')
            .select(`
              id,
              estado,
              eventos_usados_mes,
              fecha_proximo_pago,
              planes_suscripcion (
                nombre,
                eventos_mes,
                promos_destacadas
              )
            `)
            .eq('local_id', local.id)
            .eq('estado', 'activa')
            .single();

          return {
            ...local,
            suscripcion: suscripcion
              ? {
                  id: suscripcion.id,
                  plan_nombre: (suscripcion.planes_suscripcion as any)?.nombre || 'basico',
                  estado: suscripcion.estado,
                  eventos_usados_mes: suscripcion.eventos_usados_mes,
                  eventos_disponibles: (suscripcion.planes_suscripcion as any)?.eventos_mes || 0,
                  fecha_proximo_pago: suscripcion.fecha_proximo_pago,
                  destacados_restantes: (suscripcion.planes_suscripcion as any)?.promos_destacadas || 0,
                }
              : undefined,
          };
        })
      );

      setLocales(localesConSuscripcion);
      console.log('[GestionScreen] Locales loaded successfully');
    } catch (error) {
      console.error('[GestionScreen] Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      cargarLocales();
    } else {
      setLoading(false);
    }
  }, [user, cargarLocales]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarLocales();
  };

  const handleVerLocal = (localId: string) => {
    router.push(`/detalle/local?id=${localId}`);
  };

  const handleSelectLocal = async (localId: string) => {
    await setSelectedLocalId(localId);
    await refreshLocales();
    Alert.alert('Local Seleccionado', 'Ahora estás interactuando con este local');
  };

  const handleToggleDestacado = async (local: LocalConSuscripcion) => {
    if (updatingDestacado) return;

    // Check if the local can be featured
    if (!local.destacado && (!local.suscripcion || local.suscripcion.destacados_restantes <= 0)) {
      Alert.alert(
        'Sin Destacados Disponibles',
        `El plan ${local.suscripcion?.plan_nombre.toUpperCase() || 'BÁSICO'} no incluye destacados. Actualiza a un plan superior para destacar tu local.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ver Planes',
            onPress: () => router.push(`/gestion/planes-suscripcion?localId=${local.id}`),
          },
        ]
      );
      return;
    }

    try {
      setUpdatingDestacado(local.id);

      const newDestacadoValue = !local.destacado;

      const { error } = await supabase
        .from('locales')
        .update({ destacado: newDestacadoValue })
        .eq('id', local.id);

      if (error) {
        console.error('[GestionScreen] Error updating destacado:', error);
        Alert.alert('Error', 'No se pudo actualizar el estado destacado del local.');
        return;
      }

      // Reload locales to reflect changes
      await cargarLocales();
      await refreshLocales();

      Alert.alert(
        'Éxito',
        newDestacadoValue
          ? 'Local destacado activado correctamente.'
          : 'Local destacado desactivado correctamente.'
      );
    } catch (error) {
      console.error('[GestionScreen] Error:', error);
      Alert.alert('Error', 'Ocurrió un error al actualizar el local.');
    } finally {
      setUpdatingDestacado(null);
    }
  };

  const getPlanColor = (planNombre: string) => {
    switch (planNombre) {
      case 'premium':
        return '#EF4444';
      case 'estandar':
        return '#3B82F6';
      default:
        return '#10B981';
    }
  };

  const getPlanIcon = (planNombre: string) => {
    switch (planNombre) {
      case 'premium':
        return 'star.fill';
      case 'estandar':
        return 'bolt.fill';
      default:
        return 'checkmark.circle.fill';
    }
  };

  if (loading) {
    return (
      <View style={commonStyles.container}>
        <LinearGradient
          colors={[colors.headerGradientStart, colors.headerGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={commonStyles.headerGradient}
        >
          <Text style={commonStyles.headerTitle}>Gestión</Text>
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
        style={commonStyles.headerGradient}
      >
        <Text style={commonStyles.headerTitle}>Gestión de Locales</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>Mis Locales</Text>
          <Text style={styles.sectionSubtitle}>
            Gestiona tus locales y sus planes de suscripción
          </Text>
        </View>

        {/* Local Selector - Only show if user has multiple locals */}
        {locales.length > 1 && (
          <View style={styles.selectorContainer}>
            <Text style={styles.selectorTitle}>Local Activo</Text>
            <Text style={styles.selectorDescription}>
              Selecciona el local con el que deseas interactuar
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.selectorScroll}
              contentContainerStyle={styles.selectorScrollContent}
            >
              {locales.map((local) => (
                <TouchableOpacity
                  key={local.id}
                  style={[
                    styles.selectorCard,
                    selectedLocalId === local.id && styles.selectorCardActive,
                  ]}
                  onPress={() => handleSelectLocal(local.id)}
                >
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.selectorImage} />
                  ) : (
                    <View style={[styles.selectorImage, styles.selectorImagePlaceholder]}>
                      <IconSymbol name="building.2" size={32} color={colors.textSecondary} />
                    </View>
                  )}
                  <Text style={styles.selectorName} numberOfLines={1}>
                    {local.nombre}
                  </Text>
                  {selectedLocalId === local.id && (
                    <View style={styles.selectorBadge}>
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/gestion/mis-eventos')}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.quickActionGradient}
            >
              <IconSymbol name="calendar" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Mis Eventos</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              if (locales.length === 0) {
                Alert.alert(
                  'Sin Locales',
                  'Primero debes añadir un local para ver los planes disponibles.',
                  [{ text: 'OK' }]
                );
                return;
              }
              router.push(`/gestion/planes-suscripcion?localId=${locales[0].id}`);
            }}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.quickActionGradient}
            >
              <IconSymbol name="crown.fill" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Ver Planes</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/crear/local')}
          >
            <LinearGradient
              colors={[colors.headerGradientStart, colors.headerGradientEnd]}
              style={styles.quickActionGradient}
            >
              <IconSymbol name="plus.circle.fill" size={24} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Añadir Local</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Locales List */}
        {locales.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="building.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No tienes locales registrados</Text>
            <Text style={styles.emptyStateSubtext}>
              Añade tu primer local para empezar a gestionar tu negocio
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/crear/local')}
            >
              <LinearGradient
                colors={[colors.headerGradientStart, colors.headerGradientEnd]}
                style={styles.emptyStateButtonGradient}
              >
                <Text style={styles.emptyStateButtonText}>Añadir Local</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.localesList}>
            {locales.map((local) => (
              <View
                key={local.id}
                style={[commonStyles.card, commonStyles.cardShadow, styles.localCard]}
              >
                {/* Cover Photo */}
                <TouchableOpacity onPress={() => handleVerLocal(local.id)}>
                  {local.imagen_url ? (
                    <Image source={{ uri: local.imagen_url }} style={styles.localCoverImage} />
                  ) : (
                    <View style={[styles.localCoverImage, styles.localCoverImagePlaceholder]}>
                      <IconSymbol name="building.2" size={48} color={colors.textSecondary} />
                      <Text style={styles.localCoverImagePlaceholderText}>Sin imagen</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.localContent}>
                  {/* Header */}
                  <View style={styles.localHeader}>
                    <View style={styles.localInfo}>
                      <Text style={styles.localNombre}>{local.nombre}</Text>
                      <Text style={styles.localProvincia}>{local.provincia}</Text>
                    </View>
                    {local.suscripcion ? (
                      <View
                        style={[
                          styles.planBadge,
                          { backgroundColor: getPlanColor(local.suscripcion.plan_nombre) },
                        ]}
                      >
                        <IconSymbol
                          name={getPlanIcon(local.suscripcion.plan_nombre) as any}
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.planBadgeText}>
                          {local.suscripcion.plan_nombre.toUpperCase()}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.planBadge, { backgroundColor: '#6B7280' }]}>
                        <IconSymbol name="exclamationmark.triangle" size={14} color="#FFFFFF" />
                        <Text style={styles.planBadgeText}>SIN PLAN</Text>
                      </View>
                    )}
                  </View>

                  {/* Featured Management Section */}
                  <View style={styles.destacadoSection}>
                    <View style={styles.destacadoInfo}>
                      <View style={styles.destacadoHeader}>
                        <IconSymbol name="star.fill" size={18} color={colors.badgeDestacado} />
                        <Text style={styles.destacadoTitle}>Local Destacado</Text>
                      </View>
                      <Text style={styles.destacadoSubtitle}>
                        {local.suscripcion && local.suscripcion.destacados_restantes > 0
                          ? `${local.suscripcion.destacados_restantes} destacados disponibles`
                          : 'Sin destacados disponibles'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.destacadoButton,
                        local.destacado && styles.destacadoButtonActive,
                        updatingDestacado === local.id && styles.destacadoButtonDisabled,
                      ]}
                      onPress={() => handleToggleDestacado(local)}
                      disabled={updatingDestacado === local.id}
                    >
                      {updatingDestacado === local.id ? (
                        <ActivityIndicator size="small" color={colors.headerText} />
                      ) : (
                        <>
                          <IconSymbol
                            name={local.destacado ? 'star.fill' : 'star'}
                            size={20}
                            color={local.destacado ? '#FFFFFF' : colors.textSecondary}
                          />
                          <Text style={[
                            styles.destacadoButtonText,
                            local.destacado && styles.destacadoButtonTextActive
                          ]}>
                            {local.destacado ? 'Activo' : 'Activar'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Subscription Info */}
                  {local.suscripcion ? (
                    <View style={styles.suscripcionInfo}>
                      <View style={styles.suscripcionStat}>
                        <Text style={styles.suscripcionStatLabel}>Eventos este mes</Text>
                        <Text style={styles.suscripcionStatValue}>
                          {local.suscripcion.eventos_usados_mes} /{' '}
                          {local.suscripcion.eventos_disponibles === 0
                            ? '∞'
                            : local.suscripcion.eventos_disponibles}
                        </Text>
                      </View>
                      {local.suscripcion.plan_nombre !== 'basico' && (
                        <View style={styles.suscripcionStat}>
                          <Text style={styles.suscripcionStatLabel}>Próximo pago</Text>
                          <Text style={styles.suscripcionStatValue}>
                            {local.suscripcion.fecha_proximo_pago
                              ? new Date(local.suscripcion.fecha_proximo_pago).toLocaleDateString(
                                  'es-ES'
                                )
                              : 'N/A'}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noPlanContainer}>
                      <Text style={styles.noPlanText}>
                        Activa un plan para crear eventos y promociones
                      </Text>
                      <TouchableOpacity
                        style={styles.activarPlanButton}
                        onPress={() =>
                          router.push(`/gestion/planes-suscripcion?localId=${local.id}`)
                        }
                      >
                        <Text style={styles.activarPlanButtonText}>Activar Plan</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.localActions}>
                    <TouchableOpacity
                      style={styles.localActionButton}
                      onPress={() => router.push(`/perfil/local?localId=${local.id}`)}
                    >
                      <IconSymbol name="person.2.fill" size={18} color={colors.primary} />
                      <Text style={styles.localActionText}>Perfil Social</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.localActionButton}
                      onPress={() => router.push(`/editar/local?id=${local.id}`)}
                    >
                      <IconSymbol name="pencil" size={18} color={colors.primary} />
                      <Text style={styles.localActionText}>Editar Local</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.localActionButton}
                      onPress={() => router.push(`/crear/evento?localId=${local.id}`)}
                    >
                      <IconSymbol name="calendar.badge.plus" size={18} color={colors.primary} />
                      <Text style={styles.localActionText}>Crear Evento</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.localActionButton}
                      onPress={() => router.push(`/gestion/planes-suscripcion?localId=${local.id}`)}
                    >
                      <IconSymbol name="arrow.up.circle" size={18} color={colors.primary} />
                      <Text style={styles.localActionText}>Mejorar Plan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    padding: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  selectorContainer: {
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: 8,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  selectorDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  selectorScroll: {
    marginHorizontal: -16,
  },
  selectorScrollContent: {
    paddingHorizontal: 16,
  },
  selectorCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.background,
  },
  selectorCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  selectorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  selectorImagePlaceholder: {
    backgroundColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  selectorBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyStateButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyStateButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  localesList: {
    padding: 20,
    gap: 16,
  },
  localCard: {
    padding: 0,
    overflow: 'hidden',
  },
  localCoverImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.cardBorder,
  },
  localCoverImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  localCoverImagePlaceholderText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  localContent: {
    padding: 16,
  },
  localHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  localInfo: {
    flex: 1,
  },
  localNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  localProvincia: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  destacadoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  destacadoInfo: {
    flex: 1,
  },
  destacadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  destacadoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  destacadoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  destacadoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.cardBorder,
  },
  destacadoButtonActive: {
    backgroundColor: colors.badgeDestacado,
  },
  destacadoButtonDisabled: {
    opacity: 0.5,
  },
  destacadoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  destacadoButtonTextActive: {
    color: '#FFFFFF',
  },
  suscripcionInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  suscripcionStat: {
    flex: 1,
  },
  suscripcionStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  suscripcionStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  noPlanContainer: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 16,
  },
  noPlanText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 12,
    textAlign: 'center',
  },
  activarPlanButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activarPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  localActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 16,
  },
  localActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minWidth: '47%',
  },
  localActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
